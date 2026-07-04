'use client';

/**
 * TRANG TRỢ LÝ CHATBOT AI (AI ASSISTANT - INTEGRATED WITH RAG & SESSIONS & EMBEDDED QUIZ/FLASHCARD)
 * --------------------------------------------------
 * Chức năng:
 * - Trò chuyện hỏi đáp trực tiếp với trợ lý AI sử dụng LangChain ở Backend.
 * - Hỗ trợ RAG (tải lên tài liệu PDF, DOCX) và hỏi đáp/tóm tắt bằng BERT tiếng Việt khi có file.
 * - Cho phép yêu cầu tạo Quiz hoặc Flashcard đoạn bất kỳ trong tài liệu qua Text Chat và hiển thị Widget tương tác trực quan ngay tại bong bóng tin nhắn.
 * - Quản lý nhiều phiên trò chuyện (Sessions) lưu trong LocalStorage của trình duyệt.
 * - Lịch sử trò chuyện hiển thị trực tiếp bên dưới menu "Trợ lý Chatbot AI" của Sidebar chính.
 */

import React, { useRef, useState, useEffect } from 'react';
import { useFormik } from 'formik';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import Container from '@/components/layouts/Container/Container';
import AIChatContainerCommon from '@/app/[locale]/ai/_common/AIChatContainer.common';
import AIChatItemContainerCommon from '@/app/[locale]/ai/_common/AIChatItemContainer.common';
import Button from '@/components/ui/Button';
import LoaderDotsCommon from '@/components/LoaderDots.common';
import AIChatInputContainerCommon from '@/app/[locale]/ai/_common/AIChatInputContainer.common';
import { ASSISTANT, CREATED, FAILED, PENDING, SUCCESSFUL, SYSTEM, USER } from '@/constant';
import { postRAGQuestionsApiCall } from '@/apiCalls/ai-demos/postRAGQuestionsApiCall';
import { uploadRAGApiCall } from '@/apiCalls/ai-demos/uploadRAGApiCall';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderRight, SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Icon from '@/components/icon/Icon';

interface IChat {
	role: string;
	content: string;
	base64?: string;
	quiz?: any[] | null;
	flashcards?: any[] | null;
	userAnswers?: { [key: number]: string };
	currentQuestionIndex?: number;
	currentCardIndex?: number;
	isFlipped?: boolean;
}

interface IChatSession {
	id: string;
	title: string;
	filename?: string;
	messages: IChat[];
}

const normalSuggestions = [
	{
		title: 'Lỗi ngoại lệ trong Python',
		desc: 'Hãy chỉ ra các lỗi ngoại lệ (exception) thường gặp nhất và cách bắt lỗi chuẩn hóa kèm ví dụ cụ thể.',
		text: 'Tôi đang gặp lỗi trong Python khi cố gắng đọc file JSON. Hãy chỉ tôi cách bắt lỗi ngoại lệ (exception handling) chuẩn nhất kèm code mẫu.',
	},
	{
		title: 'So sánh SQL và NoSQL',
		desc: 'Liệt kê các điểm khác biệt cơ bản giữa cơ sở dữ liệu quan hệ và phi quan hệ, khi nào nên chọn loại nào.',
		text: 'So sánh cơ sở dữ liệu SQL và NoSQL. Khi nào tôi nên sử dụng MongoDB thay vì PostgreSQL? Cho tôi ví dụ thực tế về các dự án sử dụng từng loại.',
	},
	{
		title: 'Viết API bằng FastAPI',
		desc: 'Hướng dẫn xây dựng một API RESTful đơn giản bằng Python FastAPI có kết nối cơ sở dữ liệu.',
		text: 'Hướng dẫn tôi các bước tạo một API GET/POST đơn giản bằng FastAPI trong Python. Có hỗ trợ tự động sinh tài liệu Swagger UI.',
	},
	{
		title: 'Tối ưu hóa truy vấn SQL',
		desc: 'Làm thế nào để tăng tốc độ truy vấn cơ sở dữ liệu MySQL khi bảng có hàng triệu dòng dữ liệu.',
		text: 'Tôi có một bảng MySQL chứa 10 triệu bản ghi và câu lệnh SELECT đang chạy rất chậm. Hãy chỉ tôi các bước tối ưu hóa truy vấn và đánh Index.',
	},
];

const ragSuggestions = [
	{
		title: 'Tạo trắc nghiệm ôn tập (Quiz)',
		desc: 'AI sẽ đọc tài liệu của bạn để tạo ra bộ 5 câu hỏi ôn tập kèm lời giải thích chi tiết đáp án đúng.',
		text: 'Hãy tạo cho tôi 5 câu hỏi trắc nghiệm (Quiz) ôn tập dựa trên tài liệu này.',
	},
	{
		title: 'Tạo thẻ học nhanh (Flashcard)',
		desc: 'Tự động tạo ra các Flashcard nẩy 3D chứa các định nghĩa hoặc khái niệm chính trong tài liệu.',
		text: 'Hãy tạo cho tôi bộ thẻ ghi nhớ (Flashcard) tóm tắt các khái niệm hoặc thuật ngữ chính của tài liệu.',
	},
	{
		title: 'Tóm tắt tài liệu',
		desc: 'AI sẽ tóm tắt các ý chính và cấu trúc toàn bộ nội dung tài liệu của bạn một cách súc tích.',
		text: 'Hãy tóm tắt chi tiết toàn bộ các ý chính của tài liệu này cho tôi.',
	},
	{
		title: 'Hỏi đáp theo đoạn bất kỳ',
		desc: 'Yêu cầu AI kiểm tra kiến thức hoặc trích xuất thông tin của một chương hay một trang bất kỳ.',
		text: 'Hãy tạo 3 câu hỏi trắc nghiệm ôn tập riêng cho phần Chương 1 (hoặc Trang 5) của tài liệu này.',
	},
];

const parseSystemPrompt = (text: string) => {
	if (!text) return null;
	const quizMatch = text.match(/Tạo cho tôi bộ (\d+) câu hỏi trắc nghiệm \(Quiz\) ôn tập độ khó (Dễ|Trung bình|Khó)(?: về (.*))?/);
	if (quizMatch) {
		return {
			type: 'quiz',
			count: quizMatch[1],
			difficulty: quizMatch[2],
			section: quizMatch[3] ? quizMatch[3].trim() : null
		};
	}
	const flashMatch = text.match(/Tạo cho tôi bộ (\d+) thẻ ghi nhớ \(Flashcard\) ôn tập độ khó (Dễ|Trung bình|Khó)(?: về (.*))?/);
	if (flashMatch) {
		return {
			type: 'flashcard',
			count: flashMatch[1],
			difficulty: flashMatch[2],
			section: flashMatch[3] ? flashMatch[3].trim() : null
		};
	}
	return null;
};

const checkIsCorrectOption = (quizItem: any, optIdx: number) => {
	if (!quizItem || !quizItem.correctAnswer) return false;
	const letter = ['A', 'B', 'C', 'D'][optIdx];
	const answerClean = String(quizItem.correctAnswer).trim();
	
	// Trường hợp 1: Khớp chính xác chữ cái (ví dụ: "A" hoặc "a")
	if (answerClean.toUpperCase() === letter) return true;
	
	// Trường hợp 2: Khớp chữ cái có kèm dấu chấm (ví dụ: "A." hoặc "A)")
	if (answerClean.toUpperCase().startsWith(letter + '.') || answerClean.toUpperCase().startsWith(letter + ')')) return true;
	
	// Trường hợp 3: Khớp chính xác với nội dung của phương án (ví dụ: "went")
	const optionText = quizItem.options[optIdx];
	if (optionText && optionText.trim().toLowerCase() === answerClean.toLowerCase()) return true;
	
	// Trường hợp 4: Khớp nội dung phương án nếu nó bắt đầu bằng chữ cái (ví dụ phương án là "A. went" và đáp án là "went")
	const cleanOptionText = optionText ? optionText.replace(/^[A-D][\.\)\s-]\s*/i, '').trim().toLowerCase() : '';
	const cleanAnswer = answerClean.replace(/^[A-D][\.\)\s-]\s*/i, '').trim().toLowerCase();
	if (cleanOptionText && cleanAnswer && cleanOptionText === cleanAnswer) return true;

	return false;
};

const ChatBotClient = () => {
	const searchParams = useSearchParams();
	const router = useRouter();
	const params = useParams();
	const locale = params?.locale || 'vi';
	const querySessionId = searchParams.get('sessionId');

	const [sessions, setSessions] = useState<IChatSession[]>([]);
	const [activeSessionId, setActiveSessionId] = useState<string>('');
	const [listQuestions, setListQuestions] = useState<IChat[]>([]);
	
	const [askGptApiStatus, setAskGptApiStatus] = useState(CREATED);
	const [uploadStatus, setUploadStatus] = useState(CREATED);
	const [uploadedFileName, setUploadedFileName] = useState<string>('');
	const [difficulty, setDifficulty] = useState<string>('Trung bình');
	const [itemCount, setItemCount] = useState<number>(5);
	
	const [activeTab, setActiveTab] = useState<'chat' | 'whisper'>('chat');
	
	// Trạng thái cho Whisper STT test
	const [sttFile, setSttFile] = useState<File | null>(null);
	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [recordDuration, setRecordDuration] = useState<number>(0);
	const [sttStatus, setSttStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
	const [sttResult, setSttResult] = useState<{
		text: string;
		language: string;
		segments: Array<{
			id: number;
			start: number;
			end: number;
			text: string;
			no_speech_prob: number;
			avg_logprob: number;
			compression_ratio: number;
		}>;
	} | null>(null);
	
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			audioChunksRef.current = [];
			
			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			};
			
			mediaRecorder.onstop = () => {
				const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
				const file = new File([audioBlob], `recorded_audio_${Date.now()}.wav`, { type: 'audio/wav' });
				setSttFile(file);
				stream.getTracks().forEach(track => track.stop());
			};
			
			mediaRecorder.start();
			setIsRecording(true);
			setRecordDuration(0);
			recordIntervalRef.current = setInterval(() => {
				setRecordDuration((prev) => prev + 1);
			}, 1000);
		} catch (err) {
			console.error('Lỗi khi mở microphone:', err);
			alert('Không thể truy cập microphone. Vui lòng cấp quyền truy cập microphone trong cài đặt trình duyệt!');
		}
	};
	
	const stopRecording = () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();
			setIsRecording(false);
			if (recordIntervalRef.current) {
				clearInterval(recordIntervalRef.current);
			}
		}
	};

	const handleWhisperTest = async () => {
		if (!sttFile) return;
		setSttStatus('pending');
		setSttResult(null);
		
		const formData = new FormData();
		formData.append('file', sttFile);
		
		try {
			const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
			const response = await fetch(`${apiBase}/api/video/whisper-test`, {
				method: 'POST',
				body: formData
			});
			if (!response.ok) {
				throw new Error('Lỗi từ API server');
			}
			const data = await response.json();
			setSttResult(data);
			setSttStatus('success');
		} catch (err) {
			console.error('Lỗi nhận dạng:', err);
			setSttStatus('failed');
			alert('Quá trình nhận dạng giọng nói thất bại. Vui lòng thử lại!');
		}
	};
	
	const fileInputRef = useRef<HTMLInputElement>(null);
	const stopGeneratingRef = useRef(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [listQuestions, askGptApiStatus, uploadStatus]);

	const formik = useFormik({
		onSubmit(): void | Promise<never> {
			return undefined;
		},
		initialValues: {
			textField: '',
		},
	});

	// Helper lưu trữ và thông báo cho Sidebar chính
	const saveSessions = (updated: IChatSession[]) => {
		setSessions(updated);
		localStorage.setItem('kinal_chat_sessions', JSON.stringify(updated));
		window.dispatchEvent(new Event('kinal_sessions_updated'));
	};

	// 1. Tải các sessions từ LocalStorage khi khởi chạy
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('kinal_chat_sessions');
			if (saved) {
				try {
					const parsed = JSON.parse(saved) as IChatSession[];
					setSessions(parsed);
					
					if (querySessionId) {
						const found = parsed.find(s => s.id === querySessionId);
						if (found) {
							setActiveSessionId(found.id);
							setListQuestions(found.messages);
							setUploadedFileName(found.filename || '');
							return;
						}
					}
					
					if (parsed.length > 0) {
						setActiveSessionId(parsed[0].id);
						setListQuestions(parsed[0].messages);
						setUploadedFileName(parsed[0].filename || '');
						
						const newUrl = `${window.location.pathname}?sessionId=${parsed[0].id}`;
						window.history.replaceState({}, '', newUrl);
					} else {
						initFirstSession();
					}
				} catch (e) {
					initFirstSession();
				}
			} else {
				initFirstSession();
			}
		}
	}, [querySessionId]);

	// Khởi tạo session đầu tiên nếu chưa có
	const initFirstSession = () => {
		const newId = `session_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
		const firstSession: IChatSession = {
			id: newId,
			title: 'Đoạn chat mới',
			messages: [
				{
					role: SYSTEM,
					content: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay? Bạn có thể tải tệp PDF hoặc Word lên bằng nút "+" để cùng tôi thảo luận.',
				},
			],
		};
		setSessions([firstSession]);
		setActiveSessionId(newId);
		setListQuestions(firstSession.messages);
		setUploadedFileName('');
		localStorage.setItem('kinal_chat_sessions', JSON.stringify([firstSession]));
		
		const newUrl = `${window.location.pathname}?sessionId=${newId}`;
		window.history.replaceState({}, '', newUrl);
		window.dispatchEvent(new Event('kinal_sessions_updated'));
	};

	// 2. Tạo phiên trò chuyện hoàn toàn mới
	const createNewSession = () => {
		const newId = `session_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
		const newSession: IChatSession = {
			id: newId,
			title: 'Đoạn chat mới',
			messages: [
				{
					role: SYSTEM,
					content: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay? Bạn có thể tải tệp PDF hoặc Word lên bằng nút "+" để cùng tôi thảo luận.',
				},
			],
		};
		
		const updated = [newSession, ...sessions];
		saveSessions(updated);
		setActiveSessionId(newId);
		setListQuestions(newSession.messages);
		setUploadedFileName('');
		
		router.push(`${window.location.pathname}?sessionId=${newId}`);
	};

	// 3. Xử lý gửi tin nhắn hỏi AI
	const sendQuestionOnClick = (question: string) => {
		if (!question || askGptApiStatus === PENDING) return;
		
		stopGeneratingRef.current = false;
		formik.resetForm();
		setAskGptApiStatus(PENDING);
		
		const newMsgList = [
			...listQuestions,
			{
				role: USER,
				content: question,
			},
		];
		
		setListQuestions(newMsgList);
		
		// Cập nhật lại lịch sử tin nhắn trong session hiện tại
		const updatedSessions = sessions.map(s => {
			if (s.id === activeSessionId) {
				let title = s.title;
				if (s.messages.length <= 1) {
					title = question.length > 25 ? question.substring(0, 25) + '...' : question;
				}
				return {
					...s,
					title,
					messages: newMsgList,
				};
			}
			return s;
		});
		saveSessions(updatedSessions);

		// Gọi API hỏi RAG hoặc thường
		postRAGQuestionsApiCall({
			dataToPost: {
				sessionId: activeSessionId,
				message: {
					role: USER,
					content: question,
				},
			},
		})
			.then((res) => {
				if (res?.status === 200) {
					setAskGptApiStatus(SUCCESSFUL);
					if (!stopGeneratingRef.current) {
						const finalMsgList = [
							...newMsgList,
							{
								role: ASSISTANT,
								content: res?.data?.content,
								quiz: res?.data?.quiz,
								flashcards: res?.data?.flashcards,
							},
						];
						setListQuestions(finalMsgList);
						
						const finalSessions = updatedSessions.map(s => {
							if (s.id === activeSessionId) {
								return { ...s, messages: finalMsgList };
							}
							return s;
						});
						saveSessions(finalSessions);
					}
				}
			})
			.catch(() => {
				setAskGptApiStatus(FAILED);
			});
	};

	// 4. Click các câu hỏi gợi ý nhanh
	const sendQuestionOnClickFast = (text: string) => {
		sendQuestionOnClick(text);
	};

	// 5. Tải tệp lên hệ thống RAG
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file && activeSessionId) {
			setUploadStatus(PENDING);
			const formData = new FormData();
			formData.append('file', file);
			formData.append('sessionId', activeSessionId);

			uploadRAGApiCall(formData)
				.then((res) => {
					if (res?.status === 200) {
						setUploadStatus(SUCCESSFUL);
						setUploadedFileName(file.filename || file.name);
						
						const updated = sessions.map(s => {
							if (s.id === activeSessionId) {
								return { ...s, filename: file.filename || file.name };
							}
							return s;
						});
						saveSessions(updated);
						
						setListQuestions((prev) => [
							...prev,
							{
								role: SYSTEM,
								content: `Đã nạp tài liệu thành công: "${file.name}". Bạn có thể hỏi bất kỳ câu hỏi nào liên quan hoặc yêu cầu AI tạo Quiz/Flashcard về tài liệu này (hoặc một chương cụ thể nào đó) bằng tiếng Việt!`,
							},
						]);
					}
				})
				.catch((err) => {
					setUploadStatus(FAILED);
					alert(err?.response?.data?.detail || 'Không thể tải tài liệu lên.');
				});
		}
	};

	// 6. Xóa tài liệu khỏi RAM
	const handleClearRag = async () => {
		if (confirm('Bạn có chắc chắn muốn xóa tài liệu này ra khỏi phiên chat này không?')) {
			try {
				const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
				const response = await fetch(`${apiBase}/api/rag/clear`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ sessionId: activeSessionId }),
				});
				if (response.ok) {
					setUploadedFileName('');
					const updated = sessions.map(s => {
						if (s.id === activeSessionId) {
							const { filename, ...rest } = s;
							return { ...rest, messages: s.messages };
						}
						return s;
					});
					saveSessions(updated);
					alert('Đã gỡ tài liệu thành công.');
				}
			} catch (err: any) {
				alert(`Lỗi khi gỡ: ${err.message}`);
			}
		}
	};

	// --- INTERACTIVE STATE HANDLERS FOR EMBEDDED WIDGETS ---
	
	const handleSelectBubbleAnswer = (messageIndex: number, questionIndex: number, optionLetter: string) => {
		setListQuestions((prev) => {
			const updated = [...prev];
			const msg = { ...updated[messageIndex] };
			const userAnswers = { ...(msg.userAnswers || {}) };
			if (userAnswers[questionIndex]) return prev; // Đã trả lời câu này rồi
			userAnswers[questionIndex] = optionLetter;
			msg.userAnswers = userAnswers;
			updated[messageIndex] = msg;
			
			// Đồng bộ lưu session
			const updatedSessions = sessions.map(s => {
				if (s.id === activeSessionId) {
					return { ...s, messages: updated };
				}
				return s;
			});
			saveSessions(updatedSessions);
			
			return updated;
		});
	};

	const handleNextBubbleQuiz = (messageIndex: number) => {
		setListQuestions((prev) => {
			const updated = [...prev];
			const msg = { ...updated[messageIndex] };
			msg.currentQuestionIndex = (msg.currentQuestionIndex || 0) + 1;
			updated[messageIndex] = msg;
			
			const updatedSessions = sessions.map(s => {
				if (s.id === activeSessionId) {
					return { ...s, messages: updated };
				}
				return s;
			});
			saveSessions(updatedSessions);
			
			return updated;
		});
	};

	const handleFlipBubbleCard = (messageIndex: number) => {
		setListQuestions((prev) => {
			const updated = [...prev];
			const msg = { ...updated[messageIndex] };
			msg.isFlipped = !msg.isFlipped;
			updated[messageIndex] = msg;
			return updated;
		});
	};

	const handleNextBubbleCard = (messageIndex: number, direction: 'next' | 'prev') => {
		setListQuestions((prev) => {
			const updated = [...prev];
			const msg = { ...updated[messageIndex] };
			const currentIdx = msg.currentCardIndex || 0;
			if (direction === 'next') {
				msg.currentCardIndex = Math.min((msg.flashcards?.length || 1) - 1, currentIdx + 1);
			} else {
				msg.currentCardIndex = Math.max(0, currentIdx - 1);
			}
			msg.isFlipped = false;
			updated[messageIndex] = msg;
			return updated;
		});
	};

	const generateChat = (questions: IChat[]) => {
		return (
			<AIChatContainerCommon>
				{questions?.map((question, index) => {
					const qIdx = question.currentQuestionIndex || 0;
					const cardIdx = question.currentCardIndex || 0;
					const userAnswers = question.userAnswers || {};
					const isCardFlipped = question.isFlipped || false;

					const parsedReq = parseSystemPrompt(question.content);

					return (
						<AIChatItemContainerCommon
							key={`${question?.role}-${index}`}
							content={parsedReq ? undefined : question?.content}
							userName={question?.role === USER ? 'You' : 'AI'}
							isAnswer={question?.role === SYSTEM || question?.role === ASSISTANT}>
							
							{/* Nếu là tin nhắn yêu cầu của hệ thống (User gửi) */}
							{parsedReq && (
								<div className='flex items-center gap-2 py-1 select-none text-white font-medium'>
									<Icon 
										icon={parsedReq.type === 'quiz' ? 'HeroAcademicCap' : 'HeroBookOpen'} 
										size='text-lg' 
									/>
									<div className='flex flex-col text-xs leading-normal'>
										<span>
											Yêu cầu tạo bộ <strong className='underline'>{parsedReq.count}</strong> {parsedReq.type === 'quiz' ? 'câu Quiz' : 'thẻ Flashcard'} ({parsedReq.difficulty})
										</span>
										{parsedReq.section && (
											<span className='opacity-85 text-[10px] italic mt-0.5'>
												Vùng kiến thức: "{parsedReq.section}"
											</span>
										)}
									</div>
								</div>
							)}
							
							{/* 1. Embed QUIZ Widget directly inside the message bubble */}
							{question?.quiz && question.quiz.length > 0 && (
								<div className='mt-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col gap-4 shadow-sm w-full max-w-xl text-left text-zinc-900 dark:text-zinc-100'>
									{qIdx < question.quiz.length ? (
										<div className='flex flex-col gap-4'>
											{/* Quiz header */}
											<div className='flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2 text-[10px] text-zinc-400 font-bold uppercase tracking-wider'>
												<span className='flex items-center gap-1 text-indigo-500'>
													<Icon icon='HeroAcademicCap' size='text-sm' />
													<span>Trắc nghiệm ôn tập</span>
												</span>
												<span>Câu {qIdx + 1} / {question.quiz.length}</span>
											</div>

											{/* Question text */}
											<div className='text-sm font-bold text-zinc-850 dark:text-zinc-100 leading-relaxed'>
												{question.quiz[qIdx].question}
											</div>

											{/* Options */}
											<div className='flex flex-col gap-2.5'>
												{question.quiz[qIdx].options.map((option: string, optIdx: number) => {
													const letter = ['A', 'B', 'C', 'D'][optIdx];
													const isCorrect = checkIsCorrectOption(question.quiz[qIdx], optIdx);
													const isSelected = letter === userAnswers[qIdx];
													const hasAnswered = userAnswers[qIdx] !== undefined;

													let btnStyle = 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-900';
													if (hasAnswered) {
														if (isCorrect) {
															btnStyle = 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/15 text-emerald-600 dark:text-emerald-400';
														} else if (isSelected) {
															btnStyle = 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/15 text-rose-600 dark:text-rose-400';
														} else {
															btnStyle = 'border-zinc-150 dark:border-zinc-850 opacity-60';
														}
													}

													return (
														<button
															key={optIdx}
															disabled={hasAnswered}
															onClick={() => handleSelectBubbleAnswer(index, qIdx, letter)}
															className={`w-full p-3 border rounded-xl flex items-center gap-3 text-xs text-left transition duration-150 font-semibold ${btnStyle}`}>
															<span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border text-[10px] ${
																hasAnswered && isCorrect
																	? 'bg-emerald-500 text-white border-emerald-500'
																	: hasAnswered && isSelected
																	? 'bg-rose-500 text-white border-rose-500'
																	: 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-700'
															}`}>
																{letter}
															</span>
															<span>{option}</span>
														</button>
													);
												})}
											</div>

											{/* Explanation */}
											{userAnswers[qIdx] !== undefined && (
												<div className='p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150 dark:border-zinc-800 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400'>
													<div className='font-bold flex items-center gap-1 text-zinc-800 dark:text-zinc-250 mb-1'>
														<Icon icon='HeroInformationCircle' className='text-indigo-500' size='text-xs' />
														<span>Đáp án: {question.quiz[qIdx].correctAnswer}</span>
													</div>
													{question.quiz[qIdx].explanation}
												</div>
											)}

											{/* Next Button */}
											{userAnswers[qIdx] !== undefined && (
												<button
													onClick={() => handleNextBubbleQuiz(index)}
													className='w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5'>
													<span>{qIdx === question.quiz.length - 1 ? 'Xem kết quả' : 'Tiếp theo'}</span>
													<Icon icon='HeroChevronRight' size='text-xs' />
												</button>
											)}
										</div>
									) : (
										/* Quiz summary inside bubble */
										<div className='flex flex-col items-center text-center py-4 gap-4 animate-chat-entry'>
											<div className='w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25 text-emerald-500'>
												<Icon icon='HeroCheckCircle' size='text-2xl' />
											</div>
											<div className='flex flex-col gap-1'>
												<h4 className='text-sm font-bold text-zinc-850 dark:text-zinc-100'>Hoàn thành trắc nghiệm!</h4>
												<p className='text-[11px] text-zinc-400'>
													Kết quả: <strong className='text-indigo-500'>{
														Object.keys(userAnswers).filter(key => {
															const qIndex = Number(key);
															const selectedLetter = userAnswers[qIndex];
															const oIdx = ['A', 'B', 'C', 'D'].indexOf(selectedLetter);
															return oIdx !== -1 && checkIsCorrectOption(question.quiz![qIndex], oIdx);
														}).length
													} / {question.quiz.length}</strong> câu chính xác.
												</p>
											</div>
											<button
												onClick={() => {
													setListQuestions((prev) => {
														const updated = [...prev];
														const msg = { ...updated[index] };
														msg.currentQuestionIndex = 0;
														msg.userAnswers = {};
														updated[index] = msg;
														return updated;
													});
												}}
												className='px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold rounded-lg transition-colors'>
												Làm lại Quiz
											</button>
										</div>
									)}
								</div>
							)}

							{/* 2. Embed FLASHCARDS Widget directly inside the message bubble */}
							{question?.flashcards && question.flashcards.length > 0 && (
								<div className='mt-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col gap-4 shadow-sm w-full max-w-sm text-left text-zinc-900 dark:text-zinc-100'>
									{/* Flashcard Header */}
									<div className='flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2 text-[10px] text-zinc-400 font-bold uppercase tracking-wider'>
										<span className='flex items-center gap-1 text-indigo-500'>
											<Icon icon='HeroBookOpen' size='text-sm' />
											<span>Flashcard ôn tập</span>
										</span>
										<span>Thẻ {cardIdx + 1} / {question.flashcards.length}</span>
									</div>

									{/* 3D Flip Card */}
									<div 
										onClick={() => handleFlipBubbleCard(index)}
										className="w-full h-48 cursor-pointer relative select-none"
										style={{ perspective: '1000px' }}>
										<div 
											className={`w-full h-full duration-500 rounded-xl border p-6 flex flex-col items-center justify-center text-center transition-all ${
												isCardFlipped 
													? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/15 dark:border-indigo-900/50' 
													: 'bg-zinc-50/50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'
											}`}
											style={{ 
												transformStyle: 'preserve-3d',
												transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
											}}>
											<span className='absolute top-2 left-3 text-[9px] uppercase font-semibold text-zinc-400'>
												{isCardFlipped ? 'Mặt sau (Giải nghĩa)' : 'Mặt trước'}
											</span>
											<div 
												className="text-xs font-bold text-zinc-800 dark:text-zinc-100 max-w-xs leading-relaxed"
												style={{ 
													backfaceVisibility: 'hidden',
													transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
												}}>
												{isCardFlipped 
													? question.flashcards[cardIdx].back 
													: question.flashcards[cardIdx].front
												}
											</div>
											<span className='absolute bottom-2 text-[9px] text-zinc-400 flex items-center gap-0.5'>
												<Icon icon='HeroArrowPath' size='text-[10px]' />
												<span>Chạm để lật</span>
											</span>
										</div>
									</div>

									{/* Card Navigation */}
									<div className='flex justify-between items-center text-xs gap-3 mt-1'>
										<button
											disabled={cardIdx === 0}
											onClick={() => handleNextBubbleCard(index, 'prev')}
											className='flex items-center gap-0.5 px-2.5 py-1.5 border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 rounded-lg font-semibold text-[10px] text-zinc-500 disabled:opacity-40 transition-colors'>
											<Icon icon='HeroChevronLeft' size='text-[10px]' />
											<span>Lùi</span>
										</button>
										<span className='text-[10px] text-zinc-400 font-bold'>{cardIdx + 1} / {question.flashcards.length}</span>
										<button
											disabled={cardIdx === question.flashcards.length - 1}
											onClick={() => handleNextBubbleCard(index, 'next')}
											className='flex items-center gap-0.5 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold text-[10px] hover:bg-indigo-500 disabled:opacity-40 transition-all'>
											<span>Tiếp</span>
											<Icon icon='HeroChevronRight' size='text-[10px]' />
										</button>
									</div>
								</div>
							)}
						</AIChatItemContainerCommon>
					);
				})}
				{uploadStatus === PENDING && (
					<AIChatItemContainerCommon isAnswer>
						<div className='flex items-center gap-3 py-2'>
							<LoaderDotsCommon />
							<span className='text-xs text-zinc-550 animate-pulse'>Đang đọc và phân tích cấu trúc tài liệu bằng BERT... Vui lòng đợi</span>
						</div>
					</AIChatItemContainerCommon>
				)}
				{askGptApiStatus === PENDING && !stopGeneratingRef.current && (
					<AIChatItemContainerCommon isAnswer>
						<div className='flex items-center py-1'>
							<LoaderDotsCommon />
						</div>
					</AIChatItemContainerCommon>
				)}
			</AIChatContainerCommon>
		);
	};

	return (
		<PageWrapper>
			<Subheader>
				<SubheaderLeft>
					<span className='font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2'>
						Trợ lý Chatbot AI (Tích hợp RAG)
						{uploadedFileName && (
							<span className='text-xs font-normal px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center gap-1 animate-pulse'>
								<Icon icon='HeroCheckCircle' size='text-sm' />
								{uploadedFileName}
							</span>
						)}
					</span>
				</SubheaderLeft>
				<SubheaderRight>
					<div className='flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/40 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 mr-3 shadow-sm select-none'>
						<button
							onClick={() => setActiveTab('chat')}
							className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
								activeTab === 'chat'
									? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
									: 'text-zinc-550 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
							}`}>
							Trò chuyện RAG
						</button>
						<button
							onClick={() => setActiveTab('whisper')}
							className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
								activeTab === 'whisper'
									? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
									: 'text-zinc-550 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
							}`}>
							Thử nghiệm Whisper STT
						</button>
					</div>
					
					{activeTab === 'chat' && (
						<Button
							variant='solid'
							onClick={createNewSession}
							icon='HeroPlus'>
							Đoạn chat mới
						</Button>
					)}
				</SubheaderRight>
			</Subheader>

			{/* Thanh công cụ thông báo tài liệu và nút xóa */}
			{uploadedFileName && (
				<div className='flex flex-wrap gap-3 px-6 py-2 bg-indigo-50/50 dark:bg-indigo-950/15 border-b border-zinc-200 dark:border-zinc-800/80 text-xs items-center justify-between z-10 relative'>
					<span className='text-zinc-550 dark:text-zinc-400 flex items-center gap-1.5 py-1'>
						<Icon icon='HeroDocumentText' className='text-indigo-500' size='text-base' />
						Tài liệu: <strong className='text-zinc-800 dark:text-zinc-200'>{uploadedFileName}</strong> đã được nạp thành công.
					</span>
					<button
						onClick={handleClearRag}
						className='flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-950/30 hover:border-red-500 text-red-500 rounded-lg font-medium shadow-sm transition hover:scale-[1.01] active:scale-[0.99]'>
						<Icon icon='HeroTrash' size='text-sm' />
						<span>Xóa tài liệu</span>
					</button>
				</div>
			)}

			{/* File Input ẩn */}
			<input
				type='file'
				ref={fileInputRef}
				onChange={handleFileChange}
				accept='.pdf,.docx'
				style={{ display: 'none' }}
			/>
			
			<Container className='flex shrink-0 grow basis-auto flex-col pb-0 bg-zinc-100/50 dark:bg-zinc-900/10 px-4 relative'>
				{activeTab === 'chat' ? (
					<>
						{listQuestions.length <= 1 && (
						<div className='flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto text-center gap-8 py-8'>
							<div className='flex flex-col gap-2'>
								<h2 className='text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight'>
									Tôi có thể giúp gì cho bạn hôm nay?
								</h2>
								<p className='text-zinc-450 dark:text-zinc-500 text-sm'>
									{uploadedFileName 
										? 'Yêu cầu AI tạo Quiz/Flashcard hoặc giải đáp các thắc mắc dựa trên tài liệu đã tải lên.'
										: 'Hỏi đáp lập trình hoặc tải lên văn bản (.pdf, .docx) để bắt đầu học tập RAG thông minh.'
									}
								</p>
							</div>
							
							{/* Thay đổi danh sách thẻ gợi ý tuỳ theo việc đã nạp tài liệu hay chưa */}
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left'>
								{(uploadedFileName ? ragSuggestions : normalSuggestions).map((s, index) => (
									<div
										key={index}
										onClick={() => sendQuestionOnClickFast(s.text)}
										className='group p-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-[1px]'>
										<h3 className='text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5'>
											<span>{s.title}</span>
										</h3>
										<p className='text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-normal'>
											{s.desc}
										</p>
									</div>
								))}
							</div>
						</div>
					)}

					{listQuestions.length > 1 && (
						<div className='flex-1 overflow-y-auto pr-1 no-scrollbar py-4'>
							{generateChat(listQuestions)}
							<div ref={messagesEndRef} />
						</div>
					)}

					<AIChatInputContainerCommon>
						{/* Cấu hình Độ khó / Số lượng câu hỏi RAG */}
						{uploadedFileName && (
							<div className='flex flex-wrap items-center gap-4 mb-2 px-3 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-semibold text-zinc-500 w-full animate-chat-entry justify-between'>
								<div className='flex items-center gap-1.5'>
									<Icon icon='HeroAdjustmentsHorizontal' className='text-indigo-500' size='text-sm' />
									<span>Cấu hình bộ học tập RAG:</span>
								</div>
								
								<div className='flex items-center gap-4 ml-auto'>
									{/* Độ khó */}
									<div className='flex items-center gap-1.5'>
										<span>Độ khó:</span>
										<select
											value={difficulty}
											onChange={(e) => setDifficulty(e.target.value)}
											className='bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-[9px] text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 font-semibold'>
											<option value='Dễ'>Dễ</option>
											<option value='Trung bình'>Trung bình</option>
											<option value='Khó'>Khó</option>
										</select>
									</div>

									{/* Số lượng */}
									<div className='flex items-center gap-1.5'>
										<span>Số lượng:</span>
										<select
											value={itemCount}
											onChange={(e) => setItemCount(Number(e.target.value))}
											className='bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-[9px] text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 font-semibold'>
											<option value='5'>5 câu / thẻ</option>
											<option value='10'>10 câu / thẻ</option>
											<option value='15'>15 câu / thẻ</option>
											<option value='20'>20 câu / thẻ</option>
											<option value='25'>25 câu / thẻ</option>
											<option value='30'>30 câu / thẻ</option>
										</select>
									</div>
								</div>
							</div>
						)}

						<div className='relative flex items-center w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:shadow-indigo-500/5 transition-all duration-300 p-2 shadow-lg'>
							{/* Nút cộng tải tệp lên */}
							<button
								type='button'
								aria-label='Tải tệp lên'
								disabled={uploadStatus === PENDING}
								onClick={() => fileInputRef.current?.click()}
								className='p-2.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30 text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 rounded-xl transition-all duration-200 flex items-center justify-center hover:scale-[1.03] active:scale-[0.97] shrink-0 shadow-sm disabled:opacity-50'>
								<Icon icon='HeroCloudArrowUp' size='text-xl' />
							</button>

							{/* Nút Tạo Quiz & Tạo Flashcard nhanh ngay cạnh nút tải file */}
							{uploadedFileName && (
								<div className='flex gap-1.5 ml-1.5 shrink-0 animate-chat-entry'>
									<button
										type='button'
										title='Tạo trắc nghiệm (Quiz) ngay lập tức'
										onClick={() => {
											const topic = formik.values.textField.trim();
											const promptText = topic 
												? `Tạo cho tôi bộ ${itemCount} câu hỏi trắc nghiệm (Quiz) ôn tập độ khó ${difficulty} về ${topic}`
												: `Tạo cho tôi bộ ${itemCount} câu hỏi trắc nghiệm (Quiz) ôn tập độ khó ${difficulty}`;
											sendQuestionOnClick(promptText);
										}}
										className='p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-950/40 rounded-xl border border-indigo-100/55 dark:border-indigo-900/30 transition flex items-center justify-center hover:scale-[1.03] active:scale-[0.97] shadow-sm'>
										<Icon icon='HeroAcademicCap' size='text-xl' />
									</button>
									<button
										type='button'
										title='Tạo thẻ ghi nhớ (Flashcard) ngay lập tức'
										onClick={() => {
											const topic = formik.values.textField.trim();
											const promptText = topic 
												? `Tạo cho tôi bộ ${itemCount} thẻ ghi nhớ (Flashcard) ôn tập độ khó ${difficulty} về ${topic}`
												: `Tạo cho tôi bộ ${itemCount} thẻ ghi nhớ (Flashcard) ôn tập độ khó ${difficulty}`;
											sendQuestionOnClick(promptText);
										}}
										className='p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-950/40 rounded-xl border border-indigo-100/55 dark:border-indigo-900/30 transition flex items-center justify-center hover:scale-[1.03] active:scale-[0.97] shadow-sm'>
										<Icon icon='HeroBookOpen' size='text-xl' />
									</button>
								</div>
							)}

							{/* Input nhập liệu */}
							<input
								id='textField'
								name='textField'
								placeholder={
									uploadStatus === PENDING 
										? 'Đang nạp tài liệu...' 
										: askGptApiStatus === PENDING 
										? 'AI đang phản hồi... Vui lòng đợi' 
										: uploadedFileName 
										? `Đặt câu hỏi hoặc yêu cầu tạo Quiz/Flashcard về tài liệu...` 
										: 'Hỏi Kinal AI bất cứ điều gì...'
								}
								onChange={formik.handleChange}
								value={formik.values.textField}
								onKeyDown={(e) => {
									if (e?.key === 'Enter' && !e?.shiftKey && formik.values?.textField) {
										sendQuestionOnClick(formik.values?.textField);
									}
								}}
								autoComplete='off'
								disabled={askGptApiStatus === PENDING || uploadStatus === PENDING}
								className='flex-1 bg-transparent border-0 outline-none focus:outline-none focus:border-transparent focus:ring-0 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm py-2.5 px-4 leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed'
							/>

							{/* Nút Gửi / Dừng */}
							{askGptApiStatus === PENDING ? (
								<button
									type='button'
									aria-label='Dừng phản hồi'
									onClick={() => {
										stopGeneratingRef.current = true;
										setAskGptApiStatus(FAILED);
									}}
									className='p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md transition-all duration-200 flex items-center justify-center hover:scale-[1.03] active:scale-[0.97] shrink-0 border border-rose-600/20 animate-pulse'>
									<Icon icon='HeroStop' size='text-xl' />
								</button>
							) : formik.values?.textField ? (
								<button
									type='button'
									onClick={() => sendQuestionOnClick(formik.values?.textField)}
									disabled={uploadStatus === PENDING}
									className='p-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-650 text-white rounded-xl shadow-md transition-all duration-200 flex items-center justify-center hover:scale-[1.03] active:scale-[0.97] shrink-0 border border-indigo-600/20 disabled:opacity-50'>
									<Icon icon='HeroPaperAirplane' size='text-xl' />
								</button>
							) : (
								<button
									type='button'
									aria-label='Ghi âm giọng nói'
									className='p-2.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30 text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 rounded-xl transition-all duration-200 flex items-center justify-center hover:scale-[1.03] active:scale-[0.97] shrink-0 shadow-sm'>
									<Icon icon='HeroMicrophone' size='text-xl' />
								</button>
							)}
						</div>
					</AIChatInputContainerCommon>
					</>
				) : (
					// Giao diện Thử nghiệm Whisper STT
					<div className='flex-grow flex flex-col gap-6 py-6 max-w-6xl mx-auto w-full animate-chat-entry overflow-y-auto pb-12 no-scrollbar'>
						<div className='flex flex-col gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-4'>
							<h2 className='text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2'>
								<Icon icon='HeroMicrophone' className='text-indigo-500' size='text-2xl' />
								Thử nghiệm Nhận dạng Giọng nói (Whisper STT)
							</h2>
							<p className='text-zinc-500 dark:text-zinc-400 text-sm'>
								Ghi âm giọng nói trực tiếp qua trình duyệt hoặc kéo thả tệp âm thanh (.mp3, .wav, .m4a) lên để kiểm tra khả năng nhận dạng ngôn ngữ và bóc băng của mô hình Whisper Large V3.
							</p>
						</div>

						<div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
							{/* CỘT TRÁI: ĐẦU VÀO ÂM THANH */}
							<div className='lg:col-span-5 flex flex-col gap-6'>
								{/* GHI ÂM GIỌNG NÓI */}
								<div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4 items-center justify-center min-h-[220px] text-center relative overflow-hidden'>
									<h3 className='text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 self-start mb-2'>
										<Icon icon='HeroMicrophone' className='text-indigo-500' size='text-lg' />
										Ghi âm trực tiếp
									</h3>
									
									{!sttFile && !isRecording && (
										<button
											type='button'
											onClick={startRecording}
											className='w-20 h-20 rounded-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 flex items-center justify-center transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] shadow-md border border-indigo-150/40'>
											<Icon icon='HeroMicrophone' size='text-3xl' />
										</button>
									)}
									
									{isRecording && (
										<div className='flex flex-col items-center gap-3 w-full'>
											<button
												type='button'
												onClick={stopRecording}
												className='w-20 h-20 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] shadow-md border border-rose-600/30 animate-pulse relative z-10'>
												<Icon icon='HeroStop' size='text-3xl' />
											</button>
											
											{/* Hiệu ứng sóng âm mini cực đẹp */}
											<div className='flex gap-1 items-center h-4 my-1'>
												{[1, 2, 3, 4, 5, 6, 7].map((bar) => (
													<span
														key={bar}
														className='w-1 bg-rose-500 rounded-full animate-pulse'
														style={{
															height: `${Math.sin(bar) * 30 + 70}%`
														}}
													/>
												))}
											</div>

											<div className='text-xs font-bold text-rose-500 animate-pulse flex items-center gap-1.5'>
												<span>ĐANG GHI ÂM:</span>
												<span className='font-mono bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded border border-rose-100/30'>
													{Math.floor(recordDuration / 60).toString().padStart(2, '0')}:
													{(recordDuration % 60).toString().padStart(2, '0')}
												</span>
											</div>
										</div>
									)}
									
									{sttFile && !isRecording && (
										<div className='flex flex-col items-center gap-4 w-full'>
											<div className='w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-150/40 shadow-sm'>
												<Icon icon='HeroCheckCircle' size='text-3xl' />
											</div>
											<div className='text-xs font-semibold text-zinc-500 dark:text-zinc-400'>
												Đã lưu bản ghi âm: {(sttFile.size / 1024).toFixed(1)} KB
											</div>
											<audio
												src={URL.createObjectURL(sttFile)}
												controls
												className='w-full h-10 mt-1 max-w-xs'
											/>
											<button
												type='button'
												onClick={() => {
													setSttFile(null);
													setSttResult(null);
													setSttStatus('idle');
												}}
												className='text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 mt-1 hover:underline'>
												<Icon icon='HeroTrash' size='text-sm' />
												Xóa bản ghi âm
											</button>
										</div>
									)}
								</div>

								{/* TẢI LÊN FILE ÂM THANH */}
								{!isRecording && !sttFile && (
									<div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4 items-center justify-center min-h-[160px] text-center border-dashed border-2 border-zinc-250 hover:border-indigo-500 transition duration-200 cursor-pointer relative'>
										<input
											type='file'
											accept='.mp3,.wav,.m4a,.ogg,.aac,.flac'
											onChange={(e) => {
												const file = e.target.files?.[0];
												if (file) {
													setSttFile(file);
													setSttResult(null);
													setSttStatus('idle');
												}
											}}
											className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10'
										/>
										<Icon icon='HeroCloudArrowUp' className='text-zinc-400 group-hover:text-indigo-500' size='text-4xl' />
										<div className='flex flex-col gap-1'>
											<h4 className='text-xs font-bold text-zinc-700 dark:text-zinc-300'>Kéo thả hoặc tải tệp âm thanh lên</h4>
											<p className='text-[10px] text-zinc-450'>Hỗ trợ .mp3, .wav, .m4a tối đa 25MB</p>
										</div>
									</div>
								)}

								{/* NÚT BẮT ĐẦU NHẬN DẠNG */}
								{sttFile && !isRecording && (
									<button
										type='button'
										disabled={sttStatus === 'pending'}
										onClick={handleWhisperTest}
										className='w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-750 hover:from-indigo-500 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/15 transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 select-none'>
										<Icon icon='HeroLanguage' size='text-lg' />
										<span>{sttStatus === 'pending' ? 'Đang nhận dạng...' : 'Bắt đầu nhận dạng (Whisper STT)'}</span>
									</button>
								)}
							</div>

							{/* CỘT PHẢI: KẾT QUẢ NHẬN DẠNG */}
							<div className='lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm min-h-[400px] flex flex-col gap-4'>
								<h3 className='text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 border-b border-zinc-150 dark:border-zinc-800 pb-3'>
									<Icon icon='HeroDocumentText' className='text-indigo-500' size='text-lg' />
									Kết quả nhận dạng giọng nói
								</h3>

								{sttStatus === 'idle' && (
									<div className='flex-grow flex flex-col items-center justify-center text-center p-8 gap-3 text-zinc-400'>
										<Icon icon='HeroSparkles' size='text-5xl' className='opacity-40' />
										<p className='text-xs font-semibold max-w-sm leading-relaxed'>
											Vui lòng ghi âm hoặc tải file âm thanh lên, sau đó nhấn nút "Bắt đầu nhận dạng" để xem kết quả phân tích.
										</p>
									</div>
								)}

								{sttStatus === 'pending' && (
									<div className='flex-grow flex flex-col items-center justify-center text-center p-8 gap-4'>
										<div className='w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin' />
										<div className='flex flex-col gap-1'>
											<h4 className='text-xs font-bold text-zinc-700 dark:text-zinc-300 animate-pulse'>Đang xử lý âm thanh...</h4>
											<p className='text-[10px] text-zinc-450'>Đang tải file lên và chạy mô hình Whisper Large V3. Vui lòng đợi trong giây lát.</p>
										</div>
									</div>
								)}

								{sttStatus === 'failed' && (
									<div className='flex-grow flex flex-col items-center justify-center text-center p-8 gap-3 text-rose-500'>
										<Icon icon='HeroExclamationCircle' size='text-5xl' className='opacity-60' />
										<p className='text-xs font-bold'>Nhận dạng thất bại</p>
										<p className='text-[10px] text-zinc-450 max-w-xs leading-normal'>
											Có lỗi xảy ra khi kết nối tới dịch vụ Whisper STT của Server. Vui lòng kiểm tra lại file âm thanh và thử lại.
										</p>
									</div>
								)}

								{sttStatus === 'success' && sttResult && (
									<div className='flex flex-col gap-5 animate-chat-entry'>
										{/* Thông số ngôn ngữ */}
										<div className='flex flex-wrap gap-4 items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-150 dark:border-zinc-850/50 text-xs font-bold text-zinc-500'>
											<div className='flex items-center gap-1.5'>
												<Icon icon='HeroLanguage' className='text-indigo-500' size='text-sm' />
												<span>Ngôn ngữ nhận dạng:</span>
												<span className='px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] uppercase tracking-wider font-extrabold'>
													{sttResult.language}
												</span>
											</div>
											<div className='flex items-center gap-1.5'>
												<Icon icon='HeroClock' className='text-indigo-500' size='text-sm' />
												<span>Số câu:</span>
												<span className='text-zinc-800 dark:text-zinc-200'>{sttResult.segments.length}</span>
											</div>
										</div>

										{/* Văn bản thô */}
										<div className='flex flex-col gap-2'>
											<div className='flex justify-between items-center text-xs font-bold text-zinc-450'>
												<span>VĂN BẢN ĐẦY ĐỦ:</span>
												<button
													type='button'
													onClick={() => {
														navigator.clipboard.writeText(sttResult.text);
														alert('Đã sao chép văn bản vào bộ nhớ tạm!');
													}}
													className='text-[10px] text-indigo-500 hover:text-indigo-650 flex items-center gap-1 select-none'>
													<Icon icon='HeroDocumentDuplicate' size='text-sm' />
													Sao chép
												</button>
											</div>
											<div className='p-4 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 max-h-[150px] overflow-y-auto whitespace-pre-wrap font-medium'>
												{sttResult.text || "Không phát hiện lời nói."}
											</div>
										</div>

										{/* Dòng thời gian chi tiết (Segments) */}
										<div className='flex flex-col gap-2.5'>
											<div className='text-xs font-bold text-zinc-450'>DÒNG THỜI GIAN CHI TIẾT (SEGMENTS):</div>
											<div className='flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1 no-scrollbar'>
												{sttResult.segments.map((seg) => {
													// Xác định độ tin cậy no_speech
													let confidenceStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
													let confidenceLabel = 'Thoại';
													if (seg.no_speech_prob > 0.6) {
														confidenceStyle = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
														confidenceLabel = 'Ảo giác/Lặng';
													} else if (seg.no_speech_prob > 0.3) {
														confidenceStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
														confidenceLabel = 'Nhiễu';
													}

													return (
														<div
															key={seg.id}
															className='p-3 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-850 rounded-xl hover:border-indigo-400/30 transition flex flex-col gap-1 text-left'>
															<div className='flex justify-between items-center text-[10px] font-bold text-zinc-400'>
																<span className='font-mono bg-zinc-50 dark:bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-150/40'>
																	{seg.start.toFixed(2)}s ➔ {seg.end.toFixed(2)}s
																</span>
																<div className='flex items-center gap-1.5'>
																	<span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase ${confidenceStyle}`}>
																		{confidenceLabel} ({seg.no_speech_prob.toFixed(2)})
																	</span>
																	<span className='font-mono opacity-80'>
																		Logprob: {seg.avg_logprob.toFixed(2)}
																	</span>
																</div>
															</div>
															<div className='text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed mt-1'>
																{seg.text}
															</div>
														</div>
													);
												})}
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}
				</Container>
		</PageWrapper>
	);
};

export default ChatBotClient;
