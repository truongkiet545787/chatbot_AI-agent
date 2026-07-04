import os
import uuid
import logging
import shutil
import tempfile
import subprocess
import time
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from fastapi import APIRouter, File, UploadFile, Form, BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse
import httpx
import yt_dlp
from app.services.video_translation_service import VideoTranslationService, format_time_srt, format_time_vtt

logger = logging.getLogger(__name__)
router = APIRouter()
translation_service = VideoTranslationService()

# Bộ nhớ tạm thời lưu trạng thái các task xử lý video
tasks_store: Dict[str, Dict[str, Any]] = {}

# Thư mục lưu trữ các file sau khi xử lý thành công
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static")
OUTPUT_DIR = os.path.join(STATIC_DIR, "video_translation")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def download_direct_video(url: str, output_path: str):
    """Tải trực tiếp video từ đường dẫn URL dạng file mp4."""
    with httpx.Client(timeout=120.0) as client:
        response = client.get(url)
        response.raise_for_status()
        with open(output_path, "wb") as f:
            f.write(response.content)

def download_youtube_audio(url: str, output_path: str):
    """Sử dụng yt-dlp để chỉ tải phần âm thanh từ link YouTube (rất nhanh)."""
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_path.replace('.wav', ''), # yt-dlp tự thêm extension
        'noplaylist': True,  # Bỏ qua playlist, chỉ tải video đơn lẻ
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        'quiet': True,
        'no_warnings': True
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    
    # yt-dlp ghi file ra output_path + .wav, ta di chuyển về đúng output_path nếu cần
    actual_path = output_path.replace('.wav', '') + '.wav'
    if os.path.exists(actual_path) and actual_path != output_path:
        shutil.move(actual_path, output_path)

def extract_audio_from_url(url: str, output_path: str):
    """Sử dụng FFmpeg để trích xuất trực tiếp luồng âm thanh từ URL video mạng mà không tải video."""
    print(f"[VIDEO_DUBBING] Đang tách luồng âm thanh trực tiếp từ URL: {url}...")
    cmd = [
        "ffmpeg", "-y", "-i", url, "-vn",
        "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        output_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def download_youtube_video(url: str, output_path: str):
    """Tải toàn bộ video YouTube (hình + tiếng) phiên bản nhẹ (<=480p) để phục vụ ghép tải xuống."""
    ydl_opts = {
        'format': 'best[height<=480][ext=mp4]/best[ext=mp4]/best',
        'outtmpl': output_path,
        'noplaylist': True,  # Bỏ qua playlist, chỉ tải video đơn lẻ
        'quiet': True,
        'no_warnings': True
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

def remux_audio_video(video_path: str, audio_path: str, output_path: str):
    """Ghép luồng âm thanh tiếng Việt vào video gốc mà không cần render lại hình ảnh (Remuxing)."""
    cmd = [
        "ffmpeg", "-y", "-i", video_path, "-i", audio_path,
        "-c:v", "copy", "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0",
        output_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def run_translation_background(task_id: str, video_source_path: str, voice: str, is_youtube: bool = False, original_url: Optional[str] = None):
    """Hàm chạy ngầm xử lý dịch thuật và lồng tiếng video (Không tải video trên server)."""
    tasks_store[task_id]["status"] = "processing"
    print(f"\n[VIDEO_DUBBING] === BẮT ĐẦU XỬ LÝ TASK {task_id} ===")
    
    temp_media_dir = None
    try:
        if original_url:
            # Nếu nguồn từ URL (YouTube hoặc Link trực tiếp), ta chỉ tải/tách duy nhất luồng âm thanh thô
            temp_media_dir = tempfile.TemporaryDirectory()
            temp_audio_wav = os.path.join(temp_media_dir.name, "extracted.wav")
            
            if is_youtube:
                print(f"[VIDEO_DUBBING] Chỉ tải âm thanh từ link YouTube (Tối ưu tốc độ): {original_url}")
                download_youtube_audio(original_url, temp_audio_wav)
            else:
                print(f"[VIDEO_DUBBING] Chỉ tách luồng âm thanh từ URL trực tiếp (Tối ưu tốc độ): {original_url}")
                extract_audio_from_url(original_url, temp_audio_wav)
                
            print(f"[VIDEO_DUBBING] Đã có file âm thanh gốc. Bắt đầu dịch thuật...")
            # Gọi dịch thuật trực tiếp trên file âm thanh gốc và lưu bản sao WAV gốc
            result = translation_service.process_translation(
                temp_audio_wav, 
                voice, 
                OUTPUT_DIR, 
                orig_wav_path=os.path.join(OUTPUT_DIR, f"orig_{task_id}.wav")
            )
        else:
            # Xử lý video upload offline
            print(f"[VIDEO_DUBBING] Bắt đầu xử lý file video upload: {video_source_path}")
            result = translation_service.process_translation(
                video_source_path, 
                voice, 
                OUTPUT_DIR, 
                orig_wav_path=os.path.join(OUTPUT_DIR, f"orig_{task_id}.wav")
            )
            
        print(f"[VIDEO_DUBBING] Đang lưu file phụ đề...")
        vtt_filename = f"sub_{task_id}.vtt"
        srt_filename = f"sub_{task_id}.srt"
        vtt_path = os.path.join(OUTPUT_DIR, vtt_filename)
        srt_path = os.path.join(OUTPUT_DIR, srt_filename)
        
        with open(vtt_path, "w", encoding="utf-8") as f:
            f.write(result["vtt_content"])
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(result["srt_content"])

        # Cập nhật thông tin hoàn thành task
        task_update = {
            "status": "completed",
            "audio_url": f"/static/video_translation/{result['dubbed_audio_filename']}",
            "vtt_url": f"/static/video_translation/{vtt_filename}",
            "srt_filename": srt_filename,
            "audio_local_path": os.path.join(OUTPUT_DIR, result["dubbed_audio_filename"]),
            "original_video_url": original_url if original_url else None,
            "segments": result.get("segments", [])
        }
        
        tasks_store[task_id].update(task_update)
        print(f"[VIDEO_DUBBING] === HOÀN TẤT TASK {task_id} THÀNH CÔNG ===\n")
        
    except Exception as e:
        print(f"[VIDEO_DUBBING] !!! TASK {task_id} THẤT BẠI !!! Lỗi: {e}")
        logger.error(f"Task {task_id} failed with error: {e}", exc_info=True)
        tasks_store[task_id].update({
            "status": "failed",
            "error": str(e)
        })
    finally:
        # Dọn dẹp thư mục tạm của âm thanh online nếu có
        if temp_media_dir:
            try:
                temp_media_dir.cleanup()
            except Exception:
                pass
        # Xóa file video gốc tạm thời lưu trên server (CHỈ xóa nếu là file UPLOAD)
        if not original_url and video_source_path and os.path.exists(video_source_path):
            try:
                os.remove(video_source_path)
            except Exception:
                pass

@router.post("/api/video/translate")
async def translate_video(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    voice: str = Form("vi-VN-HoaiMyNeural")
):
    """Endpoint chính tiếp nhận yêu cầu dịch video."""
    if not file and not url:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp file video tải lên hoặc đường dẫn link video.")

    task_id = uuid.uuid4().hex
    tasks_store[task_id] = {
        "status": "pending",
        "voice": voice,
        "is_youtube": False,
        "original_url": url,
        "local_video_path": None
    }

    temp_dir = tempfile.gettempdir()
    
    try:
        if file:
            # Lưu file video upload lên thành file tạm
            ext = os.path.splitext(file.filename)[1].lower()
            if ext not in [".mp4", ".avi", ".mov", ".mkv", ".webm"]:
                raise HTTPException(status_code=400, detail="Định dạng video không hỗ trợ.")
                
            temp_video_path = os.path.join(temp_dir, f"{task_id}{ext}")
            with open(temp_video_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            tasks_store[task_id]["local_video_path"] = temp_video_path
            
            # Kích hoạt background task
            background_tasks.add_task(
                run_translation_background, 
                task_id=task_id, 
                video_source_path=temp_video_path, 
                voice=voice,
                is_youtube=False
            )
            
        elif url:
            # Nhận dạng nếu là link YouTube
            is_yt = "youtube.com" in url or "youtu.be" in url
            tasks_store[task_id]["is_youtube"] = is_yt
            
            # Đẩy trực tiếp vào background task xử lý online không cần tải trước
            background_tasks.add_task(
                run_translation_background, 
                task_id=task_id, 
                video_source_path="", 
                voice=voice,
                is_youtube=is_yt,
                original_url=url
            )

        return {
            "status": "success",
            "task_id": task_id,
            "message": "Yêu cầu đã được tiếp nhận và đang xử lý ngầm dưới nền."
        }
        
    except Exception as e:
        tasks_store.pop(task_id, None)
        raise HTTPException(status_code=500, detail=f"Lỗi khởi tạo dịch video: {str(e)}")

@router.get("/api/video/status/{task_id}")
async def get_task_status(task_id: str):
    """Endpoint để Client định kỳ check trạng thái xử lý (Polling)."""
    if task_id not in tasks_store:
        raise HTTPException(status_code=404, detail="Không tìm thấy task tương ứng.")
        
    task_info = tasks_store[task_id]
    response = {
        "status": task_info["status"]
    }
    
    if task_info["status"] == "completed":
        response.update({
            "audio_url": task_info["audio_url"],
            "vtt_url": task_info["vtt_url"],
            "srt_filename": task_info["srt_filename"],
            "segments": task_info.get("segments", [])
        })
        if "original_video_url" in task_info:
            response["original_video_url"] = task_info["original_video_url"]
    elif task_info["status"] == "failed":
        response.update({
            "error": task_info.get("error", "Lỗi không xác định")
        })
        
    return response

@router.get("/api/video/download/{task_id}")
async def download_dubbed_video(task_id: str):
    """
    Endpoint sinh video thành phẩm (Remuxing tiếng Việt mới) và cho tải xuống.
    Quá trình này chỉ ghép luồng audio nên chạy cực nhanh (1-2s).
    """
    if task_id not in tasks_store or tasks_store[task_id]["status"] != "completed":
        raise HTTPException(status_code=400, detail="Task chưa hoàn thành hoặc không hợp lệ.")
        
    task_info = tasks_store[task_id]
    audio_path = task_info["audio_local_path"]
    
    output_video_filename = f"final_{task_id}.mp4"
    output_video_path = os.path.join(OUTPUT_DIR, output_video_filename)
    
    # Tránh remux lại nếu file đã tồn tại sẵn trên server
    if os.path.exists(output_video_path):
        return FileResponse(output_video_path, media_type="video/mp4", filename="kinal_dubbed_video.mp4")

    # Tạo thư mục tạm để xử lý
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_video_source = os.path.join(temp_dir, "source.mp4")
        
        try:
            if task_info["is_youtube"]:
                # Nếu là YouTube, ta tải video gốc (cả hình cả tiếng) về thư mục tạm
                logger.info(f"Downloading original YouTube video for remuxing: {task_info['original_url']}")
                download_youtube_video(task_info["original_url"], temp_video_source)
            elif task_info["local_video_path"] and os.path.exists(task_info["local_video_path"]):
                # File video upload vẫn còn lưu tạm (chỉ xóa khi task thất bại, hoặc nếu thành công thì giữ lại tạm)
                temp_video_source = task_info["local_video_path"]
            elif task_info["original_url"]:
                # Tải lại link direct video nếu file tạm đã bị xóa
                download_direct_video(task_info["original_url"], temp_video_source)
            else:
                raise ValueError("Không tìm thấy nguồn video gốc để ghép âm thanh.")

            # Tiến hành remuxing ghép âm thanh mới
            logger.info("Remuxing new dubbed audio with original video...")
            remux_audio_video(temp_video_source, audio_path, output_path=output_video_path)
            
            return FileResponse(output_video_path, media_type="video/mp4", filename="kinal_dubbed_video.mp4")
            
        except Exception as e:
            logger.error(f"Error remuxing video for task {task_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Lỗi tạo file tải xuống: {str(e)}")

class RegenerateDubRequest(BaseModel):
    task_id: str
    voice: str
    segments: List[Dict[str, Any]]

@router.post("/api/video/regenerate-dub")
async def regenerate_dub(request: RegenerateDubRequest):
    task_id = request.task_id
    voice = request.voice
    segments = request.segments

    if task_id not in tasks_store:
        raise HTTPException(status_code=404, detail="Không tìm thấy task.")

    orig_wav_path = os.path.join(OUTPUT_DIR, f"orig_{task_id}.wav")
    if not os.path.exists(orig_wav_path):
        raise HTTPException(status_code=400, detail="Không tìm thấy file âm thanh gốc của video này.")

    # 1. Sinh thuyết minh mới & ghép
    try:
        # Đường dẫn xuất file audio thành phẩm mới
        dubbed_filename = f"dubbed_{task_id}.mp3"
        output_audio_path = os.path.join(OUTPUT_DIR, dubbed_filename)
        
        # Sinh giọng thuyết minh cho từng segment mới
        with tempfile.TemporaryDirectory() as temp_dir:
            tts_files = await translation_service.generate_all_tts(segments, voice, temp_dir)
            
            # Ghép âm thanh với pydub
            from pydub import AudioSegment
            original_audio = AudioSegment.from_file(orig_wav_path)
            combined_audio = original_audio - 20 # Ducking nhạc nền gốc
            
            for idx, seg in enumerate(segments):
                if idx not in tts_files:
                    continue
                start_ms = int(seg["start"] * 1000)
                seg_audio = AudioSegment.from_file(tts_files[idx])
                combined_audio = combined_audio.overlay(seg_audio, position=start_ms)
                
            combined_audio.export(output_audio_path, format="mp3")

        # 2. Ghi lại phụ đề SRT & WebVTT mới
        vtt_filename = f"sub_{task_id}.vtt"
        srt_filename = f"sub_{task_id}.srt"
        vtt_path = os.path.join(OUTPUT_DIR, vtt_filename)
        srt_path = os.path.join(OUTPUT_DIR, srt_filename)
        
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
            
        with open(vtt_path, "w", encoding="utf-8") as f:
            f.write("\n".join(vtt_lines))
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write("\n".join(srt_lines))

        # 3. Cập nhật tasks_store (thêm tham số timestamp t để tránh cache trình duyệt trên FE)
        timestamp = int(time.time())
        tasks_store[task_id].update({
            "audio_url": f"/static/video_translation/{dubbed_filename}?t={timestamp}",
            "vtt_url": f"/static/video_translation/{vtt_filename}?t={timestamp}",
            "srt_filename": srt_filename,
            "audio_local_path": output_audio_path,
            "segments": segments
        })
        
        # Nếu có file video thành phẩm cũ (final_.mp4) thì xóa đi để khi download sẽ ghép (remux) mới hoàn toàn theo tiếng Việt vừa cập nhật
        final_video_path = os.path.join(OUTPUT_DIR, f"final_{task_id}.mp4")
        if os.path.exists(final_video_path):
            try:
                os.remove(final_video_path)
            except Exception:
                pass
        
        return {
            "status": "success",
            "audio_url": tasks_store[task_id]["audio_url"],
            "vtt_url": tasks_store[task_id]["vtt_url"],
            "srt_filename": srt_filename,
            "segments": segments
        }
        
    except Exception as e:
        logger.error(f"Lỗi khi cập nhật giọng đọc: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Không thể cập nhật lồng tiếng: {str(e)}")

@router.post("/api/video/whisper-test")
async def whisper_test(
    file: UploadFile = File(...)
):
    """Endpoint thử nghiệm nhận dạng giọng nói bằng mô hình Whisper thuần."""
    # Kiểm tra phần mở rộng file
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".wav", ".mp3", ".m4a", ".webm", ".ogg", ".aac", ".flac"]:
        raise HTTPException(status_code=400, detail="Định dạng âm thanh không hỗ trợ.")

    # Lưu file tạm
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, f"whisper_test_{uuid.uuid4().hex}{ext}")
    
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Khởi tạo client Whisper
        client, model, is_groq = translation_service._get_whisper_client()
        
        with open(temp_file_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=audio_file,
                model=model,
                response_format="verbose_json"
            )
            
        # Parse kết quả
        data = transcription.model_dump() if hasattr(transcription, "model_dump") else transcription
        segments = data.get("segments", [])
        text = data.get("text", "")
        language = data.get("language", "unknown")
        
        return {
            "text": text,
            "language": language,
            "segments": [
                {
                    "id": seg.get("id"),
                    "start": seg.get("start"),
                    "end": seg.get("end"),
                    "text": seg.get("text"),
                    "no_speech_prob": seg.get("no_speech_prob", 0.0),
                    "avg_logprob": seg.get("avg_logprob", 0.0),
                    "compression_ratio": seg.get("compression_ratio", 0.0)
                }
                for seg in segments
            ]
        }
    except Exception as e:
        logger.error(f"Lỗi thử nghiệm Whisper STT: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lỗi nhận dạng giọng nói: {str(e)}")
    finally:
        # Xóa file tạm
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass

# ==========================================
# ==========================================
# TEXT-TO-SPEECH (TTS) DEMO & COMPARISON ENDPOINTS
# ==========================================
import sys
import io
import base64
import soundfile as sf

from kokoro_vietnamese import KokoroVietnamese

# Khai báo biến toàn cục để cache các instance model cục bộ tránh khởi tạo lại nhiều lần
kokoro_instances = {}

def get_kokoro_instance(voice: str = "diem_trinh"):
    global kokoro_instances
    if voice not in kokoro_instances:
        try:
            kokoro_instances[voice] = KokoroVietnamese(voice=voice, device="cpu")
        except Exception as e:
            logger.error(f"Không thể khởi tạo KokoroVietnamese (voice={voice}): {e}", exc_info=True)
            raise e
    return kokoro_instances[voice]

def generate_kokoro_tts(text: str, voice: Optional[str] = None) -> str:
    v = voice or "diem_trinh"
    from kokoro_vietnamese import VOICES
    if v not in VOICES:
        v = "diem_trinh"
    kokoro = get_kokoro_instance(v)
    audio, _ = kokoro.synthesize(text)
    
    buffer = io.BytesIO()
    sf.write(buffer, audio, 24000, format='WAV')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")

class TTSRequest(BaseModel):
    question: str
    model: Optional[str] = "kokoro"
    voice: Optional[str] = None

@router.post("/ai-demos/audio")
async def tts_demo(request: TTSRequest):
    text = request.question
    voice = request.voice or "diem_trinh"
    
    if not text.strip():
        raise HTTPException(status_code=400, detail="Văn bản đầu vào không được để trống.")
        
    try:
        audio_b64 = generate_kokoro_tts(text, voice)
        return {"audio": audio_b64}
    except Exception as e:
        logger.error(f"Kokoro-Vietnamese failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lỗi tạo TTS offline: {str(e)}")

@router.post("/api/video/tts-test")
async def tts_test_endpoint(request: TTSRequest):
    """Endpoint thử nghiệm model offline."""
    return await tts_demo(request)

