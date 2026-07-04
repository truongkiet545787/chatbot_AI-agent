import os
import re
import subprocess
import json
import asyncio
import tempfile
import logging
import time
from typing import Dict, Any, List
from openai import OpenAI
from pydub import AudioSegment

logger = logging.getLogger(__name__)

def get_video_duration(video_path: str) -> float:
    """Sử dụng ffprobe để lấy chính xác thời lượng của video tính bằng giây."""
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", video_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    return float(res.stdout.strip())

def extract_audio(video_path: str, audio_path: str):
    """Sử dụng FFmpeg để trích xuất âm thanh từ video sang định dạng WAV 16kHz mono."""
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        audio_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def format_time_srt(seconds: float) -> str:
    """Chuyển đổi giây sang định dạng thời gian của SRT (HH:MM:SS,mmm)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def format_time_vtt(seconds: float) -> str:
    """Chuyển đổi giây sang định dạng thời gian của WebVTT (HH:MM:SS.mmm)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"

def clean_text_for_tts(text: str) -> str:
    """Loại bỏ chữ cái CJK (Hàn/Trung/Nhật) và các ký tự lạ để tránh lỗi Edge-TTS."""
    # Xóa các ký tự CJK (Chinese, Japanese, Korean)
    cleaned = re.sub(r'[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]', '', text)
    # Loại bỏ khoảng trắng thừa
    return cleaned.strip()

class VideoTranslationService:
    def __init__(self):
        # Nạp các khóa API từ biến môi trường
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openrouter_api_key = os.getenv("OPENAI_API_KEY") # Sử dụng chung OPENAI_API_KEY cho OpenRouter

    def _get_whisper_client(self):
        """Khởi tạo client Whisper. Ưu tiên Groq API (free & fast), sau đó là OpenAI API."""
        if self.groq_api_key:
            logger.info("Using Groq API for Whisper Speech-to-Text")
            return OpenAI(
                api_key=self.groq_api_key,
                base_url="https://api.groq.com/openai/v1"
            ), "whisper-large-v3", True
        elif self.openai_api_key:
            logger.info("Using OpenAI API for Whisper Speech-to-Text")
            return OpenAI(api_key=self.openai_api_key), "whisper-1", False
        else:
            raise ValueError("Không tìm thấy GROQ_API_KEY hoặc OPENAI_API_KEY trong file .env")

    def _get_llm_client(self) -> OpenAI:
        """Khởi tạo client LLM kết nối trực tiếp Groq Cloud, Google Gemini hoặc OpenRouter."""
        # Ưu tiên 1: Groq Cloud (Miễn phí, cực nhanh, cực ổn định)
        if self.groq_api_key:
            print("[VIDEO_DUBBING] Đang kết nối tới Groq Cloud (Mô hình Llama 3.3 70B siêu tốc)...")
            return OpenAI(
                api_key=self.groq_api_key,
                base_url="https://api.groq.com/openai/v1",
                timeout=25.0
            )

        gemini_key = os.environ.get("GEMINI_API_KEY")
        if gemini_key:
            # Ưu tiên 2: Kết nối trực tiếp tới Google Gemini API
            print("[VIDEO_DUBBING] Đang kết nối TRỰC TIẾP tới Google Gemini API...")
            return OpenAI(
                api_key=gemini_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                timeout=25.0
            )
        
        # Fallback về OpenRouter nếu không có GEMINI_API_KEY và GROQ_API_KEY
        if self.openrouter_api_key:
            print("[VIDEO_DUBBING] Đang kết nối tới OpenRouter (do chưa có GEMINI/GROQ API_KEY)...")
            return OpenAI(
                api_key=self.openrouter_api_key,
                base_url="https://openrouter.ai/api/v1",
                timeout=25.0
            )
        
        raise ValueError("Vui lòng cấu hình GEMINI_API_KEY, GROQ_API_KEY hoặc OPENAI_API_KEY trong file .env để kết nối trực tiếp với LLM!")

    def _get_kokoro_instance(self, voice: str):
        if not hasattr(self, "kokoro_instances"):
            self.kokoro_instances = {}
        if voice not in self.kokoro_instances:
            from kokoro_vietnamese import KokoroVietnamese
            self.kokoro_instances[voice] = KokoroVietnamese(voice=voice, device="cpu")
        return self.kokoro_instances[voice]

    def _generate_kokoro_file(self, text: str, voice: str, output_path: str):
        import soundfile as sf
        kokoro = self._get_kokoro_instance(voice)
        audio, _ = kokoro.synthesize(text)
        sf.write(output_path, audio, 24000)

    async def run_tts_segment(self, text: str, voice: str, output_path: str):
        """Sinh giọng thuyết minh tiếng Việt cho một câu thông qua mô hình offline Kokoro-Vietnamese."""
        # Nhận trực tiếp giọng đọc Kokoro. Nếu không khớp, ánh xạ ngược từ giọng cũ để giữ an toàn.
        from kokoro_vietnamese import VOICES
        kokoro_voice = voice or "diem_trinh"
        if kokoro_voice not in VOICES:
            if "nam" in kokoro_voice.lower() or "minh" in kokoro_voice.lower():
                kokoro_voice = "manh_dung"
            else:
                kokoro_voice = "diem_trinh"
        
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self._generate_kokoro_file, text, kokoro_voice, output_path)

    def translate_segments_llm(self, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sử dụng LLM (Gemini 1.5 Flash) để dịch danh sách các câu sang tiếng Việt theo từng nhóm nhỏ (chunk)."""
        client = self._get_llm_client()
        
        # Gán mặc định tiếng Anh gốc cho tất cả các câu trước
        for seg in segments:
            seg["translated_text"] = seg.get("text", "")
            
        system_prompt = (
            "You are an expert English-to-Vietnamese video translator and dubbing assistant.\n"
            "Your ONLY task is to translate the 'text' field of the following JSON array from English into Vietnamese.\n\n"
            "CRITICAL RULES:\n"
            "1. You MUST TRANSLATE the text into Vietnamese. DO NOT just copy the English text.\n"
            "2. Translate naturally and accurately according to the context.\n"
            "3. The translated Vietnamese text MUST be concise and match the original English spoken length.\n"
            "4. Return the output STRICTLY as a JSON array matching the input structure, with the exact same 'id' values.\n"
            "5. Output ONLY the raw JSON array. No markdown, no explanations, no code blocks.\n\n"
            "EXAMPLE INPUT:\n"
            '[{"id": 0, "text": "Hello, my name is John."}, {"id": 1, "text": "Today we are learning English."}]\n'
            "EXAMPLE OUTPUT:\n"
            '[{"id": 0, "text": "Xin chào, tên tôi là John."}, {"id": 1, "text": "Hôm nay chúng ta sẽ học tiếng Anh."}]'
        )

        chunk_size = 25
        total_segments = len(segments)
        
        for i in range(0, total_segments, chunk_size):
            chunk = segments[i:i+chunk_size]
            chunk_input = [{"id": i + idx, "text": seg["text"]} for idx, seg in enumerate(chunk)]
            
            print(f"[VIDEO_DUBBING] -> Đang dịch đoạn từ câu {i} đến {min(i+chunk_size, total_segments)}...")
            
            try:
                # Xác định tên model tương ứng với endpoint sử dụng
                if "googleapis.com" in str(client.base_url):
                    model_name = "gemini-3.5-flash"  # Đổi sang bản 3.5 Flash để dùng Free Tier
                elif "api.groq.com" in str(client.base_url):
                    model_name = "llama-3.3-70b-versatile"  # Dịch qua Groq (Llama 3.3 70B mới nhất) cực kỳ thông minh
                elif "openrouter.ai" in str(client.base_url):
                    model_name = "google/gemini-3.5-flash:free"  # Đổi sang bản 3.5 Flash free trên OpenRouter
                else:
                    model_name = "gpt-4o-mini"
                    
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": json.dumps(chunk_input, ensure_ascii=False)}
                    ],
                    temperature=0.3,
                    max_tokens=2048
                )
                
                content = response.choices[0].message.content.strip()
                
                # Khử markdown code block
                if content.startswith("```"):
                    lines = content.splitlines()
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines[-1].startswith("```"):
                        lines = lines[:-1]
                    content = "\n".join(lines).strip()
                
                try:
                    translated_data = json.loads(content)
                    translated_dict = {int(item["id"]): item["text"] for item in translated_data if "id" in item and "text" in item}
                    
                    # Cập nhật kết quả dịch
                    for item in chunk_input:
                        seg_id = item["id"]
                        segments[seg_id]["translated_text"] = translated_dict.get(seg_id, segments[seg_id]["text"])
                except Exception as json_err:
                    print(f"[VIDEO_DUBBING] Lỗi parse JSON phản hồi: {json_err}. Nội dung nhận được: '{content}'")
                    raise json_err
                    
            except Exception as e:
                logger.error(f"Error translating chunk {i}-{i+chunk_size}: {e}. Falling back to original text.")
                print(f"[VIDEO_DUBBING] Lỗi dịch nhóm câu {i}-{i+chunk_size}: {e}. Sẽ giữ nguyên tiếng Anh gốc.")
            
            # Cooldown để tránh kích hoạt giới hạn tần suất gọi (Rate Limits) của OpenRouter Free
            if i + chunk_size < total_segments:
                print("[VIDEO_DUBBING] Chờ 3 giây để tránh bị giới hạn tần suất (Rate Limit)...")
                time.sleep(3.0)
                
        return segments

    async def generate_all_tts(self, segments: List[Dict[str, Any]], voice: str, temp_dir: str) -> Dict[int, str]:
        """Sinh giọng thuyết minh tuần tự cho tất cả các segment bằng mô hình offline Kokoro-Vietnamese."""
        tts_files = {}
        consecutive_failures = 0
        
        for idx, seg in enumerate(segments):
            text_vi = seg.get("translated_text", "")
            text_vi = clean_text_for_tts(text_vi)
            if not text_vi.strip() or not any(c.isalnum() for c in text_vi):
                continue
            
            seg_audio_path = os.path.join(temp_dir, f"seg_{idx}.mp3")
            
            # Thử gọi TTS tối đa 3 lần cho mỗi câu
            max_retries = 3
            success = False
            
            for attempt in range(max_retries):
                try:
                    await self.run_tts_segment(text_vi, voice, seg_audio_path)
                    if os.path.exists(seg_audio_path):
                        tts_files[idx] = seg_audio_path
                        consecutive_failures = 0  # Reset nếu thành công
                        success = True
                        break  # Thoát vòng lặp retry nếu thành công
                except Exception as e:
                    backoff_time = 1.0 * (attempt + 1)
                    print(f"[VIDEO_DUBBING] Thử lại lần {attempt + 1}/{max_retries} sinh TTS câu {idx} bị lỗi: {e}. Chờ {backoff_time}s...")
                    await asyncio.sleep(backoff_time)
            
            if not success:
                consecutive_failures += 1
                logger.warning(f"Failed to generate TTS for segment {idx} ('{text_vi}'). Skipping.")
                print(f"[VIDEO_DUBBING] Bỏ qua câu {idx} do lỗi TTS liên tục.")
                
                if consecutive_failures >= 5:
                    print("[VIDEO_DUBBING] Phát hiện 5 câu liên tiếp bị lỗi TTS. Dừng quá trình lồng tiếng.")
                    raise RuntimeError("Lỗi tạo giọng đọc offline liên tiếp. Vui lòng kiểm tra lại cấu hình mô hình.")
            
            # Mô hình chạy offline cục bộ nên không cần sleep để tránh Rate Limit
            await asyncio.sleep(0.01)
        return tts_files

    def process_translation(self, video_path: str, voice: str, output_audio_dir: str, orig_wav_path: str = None) -> Dict[str, Any]:
        """
        Quy trình xử lý dịch video:
        1. Lấy thời lượng video.
        2. Tách âm thanh wav.
        3. Chạy Whisper nhận dạng + lấy mốc thời gian.
        4. Dịch thuật bằng LLM.
        5. Sinh giọng đọc thuyết minh qua edge-tts.
        6. Ghép file âm thanh thuyết minh đồng bộ qua pydub.
        7. Ghi file phụ đề SRT & WebVTT.
        """
        # 1. Lấy thời lượng video
        print(f"[VIDEO_DUBBING] 1. Đang lấy thời lượng video: {video_path}")
        video_duration = get_video_duration(video_path)
        print(f"[VIDEO_DUBBING] Thời lượng video: {video_duration} giây")

        # Tạo thư mục tạm để lưu các file trung gian
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_audio_path = os.path.join(temp_dir, "extracted.wav")
            
            # 2. Tách âm thanh wav
            print("[VIDEO_DUBBING] 2. Đang tách âm thanh WAV bằng FFmpeg...")
            extract_audio(video_path, temp_audio_path)
            print("[VIDEO_DUBBING] Tách âm thanh thành công.")
            
            if orig_wav_path:
                import shutil
                shutil.copyfile(temp_audio_path, orig_wav_path)
                print(f"[VIDEO_DUBBING] Đã lưu bản sao WAV gốc vào: {orig_wav_path}")

            # 3. Chạy Whisper
            print(f"[VIDEO_DUBBING] 3. Đang gọi Whisper STT ({'Groq' if self.groq_api_key else 'OpenAI'})...")
            client, model, is_groq = self._get_whisper_client()
            with open(temp_audio_path, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    file=audio_file,
                    model=model,
                    response_format="verbose_json",
                    language="en",
                    temperature=0.0
                )
            
            # Convert response sang dictionary
            data = transcription.model_dump() if hasattr(transcription, "model_dump") else transcription
            segments = data.get("segments", [])
            
            # Lọc bỏ các đoạn nghi ngờ ảo giác hoặc không có giọng nói thực tế (no_speech_prob > 0.6)
            filtered_segments = []
            for seg in segments:
                no_speech_prob = seg.get("no_speech_prob", 0.0)
                avg_logprob = seg.get("avg_logprob", 0.0)
                # Bỏ qua nếu xác suất không thoại cao (> 0.6) hoặc chất lượng nhận dạng quá thấp (avg_logprob < -1.0)
                if no_speech_prob > 0.6 or avg_logprob < -1.0:
                    print(f"[VIDEO_DUBBING] Bỏ qua đoạn nghi ảo giác (no_speech_prob={no_speech_prob:.2f}, avg_logprob={avg_logprob:.2f}): '{seg.get('text', '')}'")
                    continue
                filtered_segments.append(seg)
            segments = filtered_segments
            
            # Đánh lại ID tăng dần từ 0 cho các câu còn lại
            for idx, seg in enumerate(segments):
                seg["id"] = idx
                
            print(f"[VIDEO_DUBBING] Nhận diện giọng nói thành công (Sau lọc còn {len(segments)} segments).")

            if not segments:
                logger.warning("No speech segments detected in the video.")
                # Trả về kết quả rỗng nếu không có giọng nói
                return {
                    "vtt_content": "WEBVTT\n\n",
                    "srt_content": "",
                    "segments": []
                }

            # 4. Dịch thuật bằng LLM
            print("[VIDEO_DUBBING] 4. Đang gọi LLM (OpenRouter) để dịch transcript...")
            segments = self.translate_segments_llm(segments)
            print("[VIDEO_DUBBING] Dịch transcript thành công.")

            # 5. Sinh giọng thuyết minh tiếng Việt cho từng segment
            print(f"[VIDEO_DUBBING] 5. Đang sinh giọng đọc thuyết minh qua Edge-TTS ({voice})...")
            tts_files = asyncio.run(self.generate_all_tts(segments, voice, temp_dir))
            print(f"[VIDEO_DUBBING] Đã tạo xong {len(tts_files)} file TTS.")

            # 6. Ghép đồng bộ âm thanh bằng pydub (Có Ducking giữ nhạc nền gốc)
            print("[VIDEO_DUBBING] 6. Đang ghép luồng âm thanh đồng bộ (pydub)...")
            try:
                # Nạp âm thanh gốc và giảm âm lượng xuống (ducking ~ 5-10%)
                original_audio = AudioSegment.from_file(temp_audio_path)
                combined_audio = original_audio - 20  # Giảm 20dB
            except Exception as e:
                print(f"[VIDEO_DUBBING] Không thể nạp âm thanh gốc để Ducking: {e}. Sẽ dùng âm thanh trống.")
                duration_ms = int(video_duration * 1000)
                combined_audio = AudioSegment.silent(duration=duration_ms)

            for idx, seg in enumerate(segments):
                if idx not in tts_files:
                    continue
                
                start_ms = int(seg["start"] * 1000)
                seg_audio = AudioSegment.from_file(tts_files[idx])
                
                # Overlay đoạn tts vào đúng giây bắt đầu
                combined_audio = combined_audio.overlay(seg_audio, position=start_ms)

            # Xuất file âm thanh thuyết minh cuối cùng
            os.makedirs(output_audio_dir, exist_ok=True)
            output_audio_name = f"dubbed_{os.path.basename(video_path)}.mp3"
            output_audio_path = os.path.join(output_audio_dir, output_audio_name)
            
            combined_audio.export(output_audio_path, format="mp3")
            print(f"[VIDEO_DUBBING] Đã xuất file âm thanh thành phẩm: {output_audio_path}")
            logger.info(f"Final dubbed audio exported to: {output_audio_path}")

        # 7. Ghi file phụ đề SRT & WebVTT
        vtt_lines = ["WEBVTT", ""]
        srt_lines = []

        for idx, seg in enumerate(segments):
            start = seg["start"]
            end = seg["end"]
            text = seg.get("translated_text", "")

            # Format SRT
            srt_lines.append(str(idx + 1))
            srt_lines.append(f"{format_time_srt(start)} --> {format_time_srt(end)}")
            srt_lines.append(text)
            srt_lines.append("")

            # Format WebVTT
            vtt_lines.append(str(idx + 1))
            vtt_lines.append(f"{format_time_vtt(start)} --> {format_time_vtt(end)}")
            vtt_lines.append(text)
            vtt_lines.append("")

        vtt_content = "\n".join(vtt_lines)
        srt_content = "\n".join(srt_lines)

        return {
            "dubbed_audio_filename": output_audio_name,
            "vtt_content": vtt_content,
            "srt_content": srt_content,
            "segments": segments
        }
