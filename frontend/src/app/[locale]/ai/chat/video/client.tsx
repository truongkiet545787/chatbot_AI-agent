'use client';

import React, { useState, useRef, useEffect } from 'react';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import AiSubheaderPartial from '@/app/[locale]/ai/_partial/AiSubheader.partial';
import Container from '@/components/layouts/Container/Container';
import Button from '@/components/ui/Button';
import Icon from '@/components/icon/Icon';
import Input from '@/components/form/Input';
import LoaderDotsCommon from '@/components/LoaderDots.common';

interface TaskStatusResponse {
	status: string;
	audio_url?: string;
	vtt_url?: string;
	srt_filename?: string;
	original_video_url?: string;
	segments?: any[];
	error?: string;
}

const ChatVideoClient = () => {
	// Trạng thái input
	const [videoFile, setVideoFile] = useState<File | null>(null);
	const [videoUrl, setVideoUrl] = useState<string>('');
	const [voice, setVoice] = useState<string>('diem_trinh');
	const [originalVolume, setOriginalVolume] = useState<number>(10); // Âm lượng gốc (mặc định 10%)
	
	// Trạng thái xử lý
	const [taskId, setTaskId] = useState<string>('');
	const [status, setStatus] = useState<string>('idle'); // idle, pending, processing, completed, failed
	const [progressText, setProgressText] = useState<string>('');
	const [errorText, setErrorText] = useState<string>('');
	
	// Trạng thái kết quả
	const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string>('');
	const [vttUrl, setVttUrl] = useState<string>('');
	const [srtFilename, setSrtFilename] = useState<string>('');
	const [segments, setSegments] = useState<any[]>([]);
	const [currentTime, setCurrentTime] = useState<number>(0);
	
	// Trạng thái cập nhật phụ đề & lồng tiếng
	const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
	
	// Đường dẫn phát video cục bộ ở Client
	const [localVideoSrc, setLocalVideoSrc] = useState<string>('');
	const [embedError, setEmbedError] = useState<boolean>(false);
	
	// Refs phục vụ đồng bộ phát kép
	const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
	const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
	const ytPlayerRef = useRef<any>(null);
	const isSeekingRef = useRef<boolean>(false);
	const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// Trích xuất YouTube Video ID từ link
	const getYoutubeId = (url: string) => {
		if (!url) return null;
		const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
		const match = url.match(regExp);
		return (match && match[2].length === 11) ? match[2] : null;
	};

	// 1. Tạo URL tạm thời để hiển thị video preview khi upload file
	useEffect(() => {
		if (videoFile) {
			const objectUrl = URL.createObjectURL(videoFile);
			setLocalVideoSrc(objectUrl);
			setVideoUrl(''); // Reset url nếu tải file
			return () => URL.revokeObjectURL(objectUrl);
		}
	}, [videoFile]);

	// 2. Nạp thư viện YouTube Iframe API
	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (!(window as any).YT) {
			const tag = document.createElement('script');
			tag.src = 'https://www.youtube.com/iframe_api';
			const firstScriptTag = document.getElementsByTagName('script')[0];
			firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
		}
	}, []);

	// 3. Khởi tạo/Hủy YouTube Player khi localVideoSrc thay đổi
	useEffect(() => {
		const ytId = getYoutubeId(localVideoSrc);
		if (!ytId) {
			if (ytPlayerRef.current) {
				try {
					ytPlayerRef.current.destroy();
				} catch (e) {}
				ytPlayerRef.current = null;
			}
			return;
		}

		const checkYTAndInit = () => {
			if ((window as any).YT && (window as any).YT.Player) {
				if (ytPlayerRef.current) {
					try {
						ytPlayerRef.current.destroy();
					} catch (e) {}
				}
				
				ytPlayerRef.current = new (window as any).YT.Player('youtube-player', {
					height: '100%',
					width: '100%',
					videoId: ytId,
					playerVars: {
						controls: 1,
						mute: 1, // Tắt tiếng gốc mặc định để nghe tiếng thuyết minh
						rel: 0,
						modestbranding: 1
					},
					events: {
						onReady: () => {
							if (ytPlayerRef.current && ytPlayerRef.current.setVolume) {
								ytPlayerRef.current.setVolume(originalVolume);
								if (originalVolume > 0) {
									ytPlayerRef.current.unMute();
								} else {
									ytPlayerRef.current.mute();
								}
							}
						},
						onStateChange: (event: any) => {
							const YT_PLAYING = 1;
							const YT_PAUSED = 2;
							
							if (event.data === YT_PLAYING) {
								if (audioPlayerRef.current && audioPlayerRef.current.paused) {
									audioPlayerRef.current.play().catch(() => {});
								}
							} else if (event.data === YT_PAUSED) {
								if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
									audioPlayerRef.current.pause();
								}
							}
						},
						onError: (event: any) => {
							if (event.data === 101 || event.data === 150) {
								setEmbedError(true);
							}
						}
					}
				});
			} else {
				setTimeout(checkYTAndInit, 500);
			}
		};

		checkYTAndInit();
		
		return () => {
			if (ytPlayerRef.current) {
				try {
					ytPlayerRef.current.destroy();
				} catch (e) {}
				ytPlayerRef.current = null;
			}
		};
	}, [localVideoSrc]);

	// 4. Đồng bộ âm lượng tiếng gốc (Ducking)
	useEffect(() => {
		if (ytPlayerRef.current && ytPlayerRef.current.setVolume) {
			ytPlayerRef.current.setVolume(originalVolume);
			if (originalVolume > 0) {
				ytPlayerRef.current.unMute();
			} else {
				ytPlayerRef.current.mute();
			}
		} else if (videoPlayerRef.current) {
			videoPlayerRef.current.volume = originalVolume / 100;
		}
	}, [originalVolume, localVideoSrc]);

	// 5. Đồng bộ hóa vòng lặp thời gian phát (Tua/Tạm dừng/Phát)
	useEffect(() => {
		const syncInterval = setInterval(() => {
			if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime && audioPlayerRef.current) {
				try {
					const ytTime = ytPlayerRef.current.getCurrentTime();
					const audioTime = audioPlayerRef.current.currentTime;
					const ytState = ytPlayerRef.current.getPlayerState();
					
					// Đồng bộ Play/Pause
					if (ytState === 1) { // Playing
						if (audioPlayerRef.current.paused) {
							audioPlayerRef.current.play().catch(() => {});
						}
					} else { // Paused
						if (!audioPlayerRef.current.paused) {
							audioPlayerRef.current.pause();
						}
					}
					
					// Đồng bộ tua (nếu lệch quá 0.5s)
					if (Math.abs(ytTime - audioTime) > 0.5) {
						audioPlayerRef.current.currentTime = ytTime;
					}
					setCurrentTime(ytTime);
				} catch (e) {}
			}
			else if (videoPlayerRef.current && audioPlayerRef.current) {
				const videoTime = videoPlayerRef.current.currentTime;
				const audioTime = audioPlayerRef.current.currentTime;
				
				if (Math.abs(videoTime - audioTime) > 0.5) {
					audioPlayerRef.current.currentTime = videoTime;
				}
				setCurrentTime(videoTime);
			}
		}, 250);

		return () => clearInterval(syncInterval);
	}, []);

	// 6. Đồng bộ sự kiện trực tiếp cho trình phát video thẻ HTML5
	useEffect(() => {
		const video = videoPlayerRef.current;
		const audio = audioPlayerRef.current;

		if (!video || !audio) return;

		const handlePlay = () => {
			audio.play().catch((err) => console.log('Audio play blocked:', err));
		};
		video.addEventListener('play', handlePlay);

		const handlePause = () => {
			audio.pause();
		};
		video.addEventListener('pause', handlePause);

		const handleSeeking = () => {
			if (!isSeekingRef.current) {
				isSeekingRef.current = true;
				audio.currentTime = video.currentTime;
				setTimeout(() => {
					isSeekingRef.current = false;
				}, 100);
			}
		};
		video.addEventListener('seeking', handleSeeking);
		video.addEventListener('seeked', handleSeeking);

		const handleRateChange = () => {
			audio.playbackRate = video.playbackRate;
		};
		video.addEventListener('ratechange', handleRateChange);

		return () => {
			video.removeEventListener('play', handlePlay);
			video.removeEventListener('pause', handlePause);
			video.removeEventListener('seeking', handleSeeking);
			video.removeEventListener('seeked', handleSeeking);
			video.removeEventListener('ratechange', handleRateChange);
		};
	}, [localVideoSrc, dubbedAudioUrl]);

	// Xử lý khi bắt đầu dịch thuật
	const handleStartTranslation = async () => {
		if (!videoFile && !videoUrl) {
			alert('Vui lòng chọn 1 file video để tải lên hoặc dán link video!');
			return;
		}

		setStatus('pending');
		setProgressText('Đang tải thông tin lên máy chủ...');
		setErrorText('');
		setDubbedAudioUrl('');
		setVttUrl('');
		setSrtFilename('');
		setSegments([]);
		setCurrentTime(0);

		const formData = new FormData();
		formData.append('voice', voice);
		if (videoFile) {
			formData.append('file', videoFile);
		} else {
			formData.append('url', videoUrl);
		}

		try {
			const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
			const response = await fetch(`${apiBase}/api/video/translate`, {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errData = await response.json();
				throw new Error(errData.detail || 'Lỗi không xác định khi gọi API');
			}

			const data = await response.json();
			setTaskId(data.task_id);
			setStatus('processing');
			setProgressText('Yêu cầu đã được tiếp nhận. Đang xử lý âm thanh...');
			
			// Bắt đầu vòng lặp hỏi thăm trạng thái (Polling)
			startPolling(data.task_id);
		} catch (err: any) {
			setStatus('failed');
			setErrorText(err.message || 'Có lỗi xảy ra trong quá trình kết nối.');
		}
	};

	// Vòng lặp hỏi thăm trạng thái (Polling)
	const startPolling = (tid: string) => {
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
		}

		const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
		
		pollingIntervalRef.current = setInterval(async () => {
			try {
				const res = await fetch(`${apiBase}/api/video/status/${tid}`);
				if (!res.ok) throw new Error('Không thể kiểm tra trạng thái task.');
				
				const data: TaskStatusResponse = await res.json();
				
				if (data.status === 'processing') {
					setProgressText('Đang xử lý: Tách nhạc, nhận dạng giọng nói và dịch thuật...');
				} else if (data.status === 'completed') {
					clearInterval(pollingIntervalRef.current!);
					setStatus('completed');
					setDubbedAudioUrl(data.audio_url ? `${apiBase}${data.audio_url}` : '');
					setVttUrl(data.vtt_url ? `${apiBase}${data.vtt_url}` : '');
					setSrtFilename(data.srt_filename || '');
					setSegments(data.segments || []);
					
					if (data.original_video_url) {
						setLocalVideoSrc(data.original_video_url);
					} else if (videoUrl && !videoFile) {
						setLocalVideoSrc(videoUrl);
					}
				} else if (data.status === 'failed') {
					clearInterval(pollingIntervalRef.current!);
					setStatus('failed');
					setErrorText(data.error || 'Quá trình dịch video chạy ngầm thất bại.');
				}
			} catch (err: any) {
				clearInterval(pollingIntervalRef.current!);
				setStatus('failed');
				setErrorText(err.message || 'Lỗi kiểm tra trạng thái.');
			}
		}, 3000);
	};

	// Dọn dẹp polling khi unmount
	useEffect(() => {
		return () => {
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
			}
		};
	}, []);

	// Hủy bỏ / reset
	const handleReset = () => {
		setVideoFile(null);
		setVideoUrl('');
		setLocalVideoSrc('');
		setTaskId('');
		setStatus('idle');
		setProgressText('');
		setErrorText('');
		setDubbedAudioUrl('');
		setVttUrl('');
		setSrtFilename('');
		setSegments([]);
		setCurrentTime(0);
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
		}
		if (ytPlayerRef.current) {
			try {
				ytPlayerRef.current.destroy();
			} catch (e) {}
			ytPlayerRef.current = null;
		}
	};

	// Endpoint tải video đã ghép tiếng Việt về
	const getDownloadUrl = () => {
		const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
		return `${apiBase}/api/video/download/${taskId}`;
	};

	// Tải file phụ đề VTT/SRT về
	const getSubtitleDownloadUrl = () => {
		const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
		return `${apiBase}/static/video_translation/${srtFilename}`;
	};

	// Xử lý chỉnh sửa văn bản từng phân đoạn
	const handleSegmentTextChange = (index: number, newText: string) => {
		setSegments((prev) => {
			const updated = [...prev];
			updated[index] = { ...updated[index], translated_text: newText };
			return updated;
		});
	};

	// Gọi API để cập nhật giọng lồng tiếng theo câu thoại đã sửa
	const handleUpdateDubbing = async () => {
		setIsRegenerating(true);
		try {
			const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
			const response = await fetch(`${apiBase}/api/video/regenerate-dub`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					task_id: taskId,
					voice: voice,
					segments: segments,
				}),
			});

			if (!response.ok) {
				const errData = await response.json();
				throw new Error(errData.detail || 'Lỗi cập nhật lồng tiếng');
			}

			const data = await response.json();
			// Cập nhật lại đường dẫn audio lồng tiếng và phụ đề vtt mới
			setDubbedAudioUrl(`${apiBase}${data.audio_url}`);
			setVttUrl(`${apiBase}${data.vtt_url}`);
			setSrtFilename(data.srt_filename || '');
			setSegments(data.segments);
			
			// Buộc nạp lại file audio và phát lại đồng bộ
			if (audioPlayerRef.current) {
				audioPlayerRef.current.load();
				if (videoPlayerRef.current && !videoPlayerRef.current.paused) {
					audioPlayerRef.current.play().catch(() => {});
				}
			}
			
			alert('Cập nhật giọng thuyết minh & phụ đề thành công!');
		} catch (err: any) {
			alert(`Không thể cập nhật: ${err.message}`);
		} finally {
			setIsRegenerating(false);
		}
	};

	const activeSegment = segments.find(seg => currentTime >= seg.start && currentTime <= seg.end);

	return (
		<PageWrapper>
			<AiSubheaderPartial />
			<Container className='flex shrink-0 grow basis-auto flex-col pb-8'>
				<div className='grid grid-cols-12 gap-6'>
					
					{/* CỘT TRÁI - CẤU HÌNH & XỬ LÝ */}
					<div className='col-span-12 lg:col-span-5 flex flex-col gap-6'>
						
						{/* Card tải lên / dán link */}
						<div className='rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
							<h3 className='mb-4 text-lg font-semibold flex items-center gap-2'>
								<Icon icon='HeroFilm' className='h-5 w-5 text-indigo-500' />
								Nguồn Video Đầu Vào
							</h3>
							
							{status === 'idle' ? (
								<div className='flex flex-col gap-4'>
									{/* Dán URL */}
									<div>
										<label className='mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-400'>
											Dán link video (Hỗ trợ Youtube hoặc link MP4 trực tiếp)
										</label>
										<Input
											placeholder='https://www.youtube.com/watch?v=...'
											value={videoUrl}
											onChange={(e: any) => {
												setVideoUrl(e.target.value);
												setVideoFile(null);
											}}
										/>
									</div>

									<div className='flex items-center my-1'>
										<div className='flex-grow border-t border-zinc-200 dark:border-zinc-800'></div>
										<span className='px-3 text-xs text-zinc-400 font-medium'>HOẶC</span>
										<div className='flex-grow border-t border-zinc-200 dark:border-zinc-800'></div>
									</div>

									{/* Tải File */}
									<div>
										<label className='mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-400'>
											Tải file video lên từ máy tính
										</label>
										<div className='flex items-center justify-center w-full'>
											<label className='flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-300 rounded-lg cursor-pointer bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition'>
												<div className='flex flex-col items-center justify-center pt-5 pb-6'>
													<Icon icon='HeroArrowUpTray' className='w-8 h-8 mb-2 text-zinc-400' />
													<p className='text-xs text-zinc-500'>
														{videoFile ? videoFile.name : 'Chọn file MP4, WEBM, MKV...'}
													</p>
												</div>
												<input
													type='file'
													className='hidden'
													accept='video/*'
													onChange={(e) => {
														if (e.target.files && e.target.files[0]) {
															setVideoFile(e.target.files[0]);
														}
													}}
												/>
											</label>
										</div>
									</div>
								</div>
							) : (
								<div className='rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'>
									<div className='flex justify-between items-center mb-2'>
										<span className='text-sm font-medium text-zinc-500'>Trạng thái:</span>
										<span className={`text-xs font-semibold px-2 py-1 rounded ${
											status === 'completed' ? 'bg-green-100 text-green-700' :
											status === 'failed' ? 'bg-red-100 text-red-700' :
											'bg-indigo-100 text-indigo-700 animate-pulse'
										}`}>
											{status === 'pending' || status === 'processing' ? 'Đang dịch...' :
											 status === 'completed' ? 'Đã hoàn thành' :
											 status === 'failed' ? 'Lỗi hệ thống' : status}
										</span>
									</div>
									<p className='text-sm text-zinc-700 dark:text-zinc-300'>{progressText}</p>
									{errorText && <p className='mt-2 text-xs text-red-500 font-medium'>{errorText}</p>}
								</div>
							)}
						</div>

						{/* Card cấu hình giọng nói & âm lượng */}
						<div className='rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
							<h3 className='mb-4 text-lg font-semibold flex items-center gap-2'>
								<Icon icon='HeroAdjustmentsHorizontal' className='h-5 w-5 text-indigo-500' />
								Cấu Hìn Dịch & Lồng Tiếng
							</h3>
							
							<div className='flex flex-col gap-5'>
								{/* Chọn giọng thuyết minh */}
								<div>
									<label className='mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-400'>
										Chọn giọng thuyết minh tiếng Việt
									</label>
									<select
										disabled={status !== 'idle'}
										value={voice}
										onChange={(e) => setVoice(e.target.value)}
										className='w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'>
										<option value='diem_trinh'>Diễm Trinh (Nữ - Truyền cảm)</option>
										<option value='hung_thinh'>Hùng Thịnh (Nam - Ấm áp)</option>
										<option value='mai_linh'>Mai Linh (Nữ - Trong trẻo)</option>
										<option value='manh_dung'>Mạnh Dũng (Nam - Review phim)</option>
										<option value='ngoc_huyen'>Ngọc Huyền (Nữ - Kể chuyện)</option>
										<option value='tuan_ngoc'>Tuấn Ngọc (Nam - Bản tin)</option>
									</select>
								</div>

								{/* Thanh chỉnh âm lượng tiếng gốc */}
								<div>
									<div className='flex justify-between mb-2'>
										<label className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
											Âm lượng nhạc nền gốc (Ducking)
										</label>
										<span className='text-xs font-semibold text-indigo-600 dark:text-indigo-400'>{originalVolume}%</span>
									</div>
									<input
										type='range'
										min='0'
										max='50'
										step='5'
										value={originalVolume}
										onChange={(e) => setOriginalVolume(Number(e.target.value))}
										className='w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800 accent-indigo-500'
									/>
									<span className='text-[10px] text-zinc-400 block mt-1'>
										Hạ nhỏ tiếng nói gốc trong video để làm nổi bật giọng thuyết minh tiếng Việt.
									</span>
								</div>

								{/* Các nút bấm hành động */}
								<div className='flex gap-3 mt-2'>
									{status === 'idle' ? (
										<Button
											variant='solid'
											color='indigo'
											className='w-full py-2.5 flex justify-center items-center gap-2'
											onClick={handleStartTranslation}>
											<Icon icon='HeroLanguage' className='h-5 w-5' />
											Bắt đầu Dịch & Lồng tiếng
										</Button>
									) : (
										<Button
											variant='outline'
											color='zinc'
											className='w-full py-2.5 flex justify-center items-center gap-2'
											disabled={isRegenerating}
											onClick={handleReset}>
											<Icon icon='HeroArrowPath' className='h-5 w-5' />
											Reset / Dịch video mới
										</Button>
									)}
								</div>
							</div>
						</div>

						{/* Card Bảng Chỉnh Sửa Phụ Đề & Thuyết Minh (Chỉ hiển thị khi đã hoàn thành) */}
						{status === 'completed' && segments.length > 0 && (
							<div className='rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col'>
								<h3 className='mb-4 text-lg font-semibold flex items-center gap-2'>
									<Icon icon='HeroLanguage' className='h-5 w-5 text-indigo-500' />
									Bảng Chỉnh Sửa Câu Thoại
								</h3>
								
								<div className='flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1 no-scrollbar'>
									{segments.map((seg, idx) => (
										<div key={idx} className='p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1'>
											<div className='flex justify-between items-center text-[10px] text-zinc-400 font-semibold'>
												<span>Câu {idx + 1} ({seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s)</span>
												<button
													onClick={() => {
														if (ytPlayerRef.current && ytPlayerRef.current.seekTo) {
															ytPlayerRef.current.seekTo(seg.start, true);
														} else if (videoPlayerRef.current) {
															videoPlayerRef.current.currentTime = seg.start;
														}
													}}
													className='flex items-center gap-1 px-1.5 py-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-indigo-500 rounded transition-colors'
													title='Phát thử đoạn video này'>
													<Icon icon='HeroPlay' size='text-[10px]' />
													<span>Nghe gốc</span>
												</button>
											</div>
											<input
												type='text'
												value={seg.translated_text || ''}
												onChange={(e) => handleSegmentTextChange(idx, e.target.value)}
												className='w-full rounded-md border border-zinc-250 bg-white dark:bg-zinc-950 p-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:text-zinc-100 mt-1'
											/>
										</div>
									))}
								</div>
								
								<Button
									variant='solid'
									color='indigo'
									className='w-full py-2.5 flex justify-center items-center gap-2 mt-4'
									disabled={isRegenerating}
									onClick={handleUpdateDubbing}>
									{isRegenerating ? (
										<>
											<LoaderDotsCommon />
											<span className='ml-2'>Đang xử lý giọng thuyết minh mới...</span>
										</>
									) : (
										<>
											<Icon icon='HeroCheck' className='h-5 w-5' />
											<span>Cập nhật giọng thuyết minh</span>
										</>
									)}
								</Button>
							</div>
						)}
					</div>

					{/* CỘT PHẢI - TRÌNH PHÁT VIDEO DUAL-PLAYER */}
					<div className='col-span-12 lg:col-span-7 flex flex-col gap-6'>
						<div className='rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col h-full justify-between'>
							<div>
								<h3 className='mb-4 text-lg font-semibold flex items-center gap-2'>
									<Icon icon='HeroPlayCircle' className='h-5 w-5 text-indigo-500' />
									Màn Hình Trình Chiếu
								</h3>
								
								{localVideoSrc ? (
									<div className='relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800'>
										{/* Nếu là link YouTube, nhúng trình phát Iframe trực tiếp */}
										{getYoutubeId(localVideoSrc) ? (
											<div className='w-full h-full flex items-center justify-center relative'>
												{embedError ? (
													<div className='flex flex-col items-center justify-center text-center p-6 bg-zinc-900 w-full h-full text-white'>
														<Icon icon='HeroVideoCameraSlash' className='h-12 w-12 text-zinc-500 mb-2' />
														<p className='font-semibold text-lg text-zinc-300'>Video chặn phát trên trang web khác</p>
														<p className='text-sm text-zinc-500 mt-2'>Chủ kênh đã tắt tính năng nhúng (Embed). Tuy nhiên, bạn vẫn có thể tải video lồng tiếng bên dưới để xem bình thường.</p>
													</div>
												) : (
													<div id='youtube-player' className='w-full h-full' />
												)}
											</div>
										) : (
											/* Trình phát Video gốc (Local/Direct URL) */
											<video
												ref={videoPlayerRef}
												src={localVideoSrc}
												controls
												className='w-full h-full'
												crossOrigin='anonymous'
											/>
										)}

										{/* Khung hiển thị phụ đề nổi đè lên trên player */}
										{activeSegment && !embedError && (
											<div className='absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/85 text-white px-4 py-2 rounded-lg text-sm md:text-base font-semibold max-w-[85%] text-center pointer-events-none z-30 shadow-lg border border-white/10'>
												{activeSegment.translated_text}
											</div>
										)}

										{/* Trình phát Audio lồng tiếng ẩn */}
										{dubbedAudioUrl && (
											<audio
												ref={audioPlayerRef}
												src={dubbedAudioUrl}
												className='hidden'
											/>
										)}
									</div>
								) : (
									<div className='flex flex-col items-center justify-center w-full aspect-video bg-zinc-50 border border-dashed border-zinc-200 rounded-lg dark:bg-zinc-900 dark:border-zinc-800'>
										<Icon icon='HeroVideoCamera' className='h-16 w-16 text-zinc-300 dark:text-zinc-700 mb-2' />
										<p className='text-sm text-zinc-400'>Chưa có video được tải lên.</p>
									</div>
								)}
							</div>

							{/* Section nút bấm tải kết quả */}
							{status === 'completed' && (
								<div className='mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-6 flex flex-wrap gap-4'>
									{/* Tải video đã ghép tiếng Việt về */}
									<a
										href={getDownloadUrl()}
										download
										className='inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 transition shadow-sm'>
										<Icon icon='HeroArrowDownTray' className='h-5 w-5' />
										Tải Video Lồng Tiếng (.mp4)
									</a>
									
									{/* Tải phụ đề srt */}
									<a
										href={getSubtitleDownloadUrl()}
										download
										className='inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 font-medium rounded-lg text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition border border-zinc-200 dark:border-zinc-700'>
										<Icon icon='HeroDocumentText' className='h-5 w-5' />
										Tải Phụ Đề (.srt)
									</a>
								</div>
							)}
						</div>
					</div>

				</div>
			</Container>
		</PageWrapper>
	);
};

export default ChatVideoClient;
