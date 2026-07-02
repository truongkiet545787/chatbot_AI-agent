'use client';

/**
 * TRANG TRỢ LÝ CHATBOT AI (AI ASSISTANT - INTEGRATED WITH RAG & SESSIONS)
 * --------------------------------------------------
 * Chức năng:
 * - Trò chuyện hỏi đáp trực tiếp với trợ lý AI sử dụng LangChain ở Backend.
 * - Hỗ trợ RAG (tải lên tài liệu PDF, DOCX) và hỏi đáp/tóm tắt bằng BERT tiếng Việt khi có file.
 * - Quản lý nhiều phiên trò chuyện (Sessions) lưu trong LocalStorage của trình duyệt.
 * - Lịch sử trò chuyện hiển thị trực tiếp bên dưới menu "Trợ lý Chatbot AI" của Sidebar chính.
 * - Khóa nhập liệu tạm thời khi API đang xử lý.
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
}

interface IChatSession {
	id: string;
	title: string;
	messages: IChat[];
	fileName?: string;
	createdAt: string;
}

const cleanContent = (content: string) => {
	if (!content) return '';
	try {
		let clean = content;
		const timePrefixRegex = /^\d{2}:\d{2}:\d{2}\.\d{6},\s*(Assistant|User|System):\s*/i;
		if (timePrefixRegex.test(clean)) {
			clean = clean.replace(timePrefixRegex, '');
		}
		
		const trimmed = clean.trim();
		if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
			const parsed = JSON.parse(trimmed);
			if (Array.isArray(parsed)) {
				return parsed.map((item: any) => {
					if (typeof item === 'object' && item !== null) {
						return item.text || item.content || JSON.stringify(item);
					}
					return String(item);
				}).join('\n');
			} else if (typeof parsed === 'object' && parsed !== null) {
				return parsed.text || parsed.content || JSON.stringify(parsed);
			}
		}
		return clean;
	} catch (e) {
		// Fallback
	}
	return content;
};

// Hàm sinh ID ngẫu nhiên cho Session
const generateId = () => 'session_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

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
	
	const fileInputRef = useRef<HTMLInputElement>(null);
	const stopGeneratingRef = useRef(false);

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
		// Dispatch event để Sidebar chính (DefaultAsideTemplate) cập nhật lại danh sách ngay lập tức
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
					
					// Nếu trên URL có sessionId, ưu tiên tải session đó
					if (querySessionId) {
						const found = parsed.find((s) => s.id === querySessionId);
						if (found) {
							setActiveSessionId(querySessionId);
							setListQuestions(found.messages);
							setUploadedFileName(found.fileName || '');
							return;
						}
					}
					
					if (parsed.length > 0) {
						// Nếu không có URL param, chọn session đầu tiên
						setActiveSessionId(parsed[0].id);
						setListQuestions(parsed[0].messages);
						setUploadedFileName(parsed[0].fileName || '');
						router.replace(`/${locale}/ai/chat/chat-bot?sessionId=${parsed[0].id}`);
					} else {
						createNewSession();
					}
				} catch (e) {
					createNewSession();
				}
			} else {
				createNewSession();
			}
		}
	}, []);

	// 2. Lắng nghe thay đổi sessionId trên thanh URL (Khi click từ Sidebar chính)
	useEffect(() => {
		if (querySessionId && sessions.length > 0) {
			// Chỉ chạy khi người dùng thực sự chuyển đổi phiên chat khác trên URL
			if (querySessionId !== activeSessionId) {
				const found = sessions.find((s) => s.id === querySessionId);
				if (found) {
					setActiveSessionId(querySessionId);
					setListQuestions(found.messages);
					setUploadedFileName(found.fileName || '');
					setAskGptApiStatus(CREATED);
					setUploadStatus(CREATED);
				}
			}
		}
	}, [querySessionId, sessions, activeSessionId]);

	// 3. Tạo Session mới (New Chat)
	const createNewSession = () => {
		const newId = generateId();
		const newSession: IChatSession = {
			id: newId,
			title: 'Đoạn chat mới',
			messages: [
				{
					role: SYSTEM,
					content: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay? Bạn có thể tải tệp PDF hoặc Word lên bằng nút "+" để cùng tôi thảo luận.',
				},
			],
			createdAt: new Date().toLocaleString('vi-VN'),
		};

		const updated = [newSession, ...sessions];
		saveSessions(updated);
		setActiveSessionId(newId);
		setListQuestions(newSession.messages);
		setUploadedFileName('');
		setAskGptApiStatus(CREATED);
		setUploadStatus(CREATED);
		
		// Đổi URL của trang
		router.push(`/${locale}/ai/chat/chat-bot?sessionId=${newId}`);
	};

	// Xử lý khi chọn file và tải lên RAG
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploadStatus(PENDING);
		
		const formData = new FormData();
		formData.append('sessionId', activeSessionId);
		formData.append('file', file);

		uploadRAGApiCall(formData)
			.then((res) => {
				if (res.status === 200) {
					setUploadStatus(SUCCESSFUL);
					setUploadedFileName(file.name);
					
					// Thêm tin nhắn hệ thống báo RAG thành công
					const systemMessage: IChat = {
						role: SYSTEM,
						content: `📎 Đã tải lên và học thành công tài liệu: **${file.name}** (${res.data.chunks} phân đoạn). Bây giờ bạn có thể đặt câu hỏi hoặc yêu cầu tóm tắt liên quan tới tài liệu này!`,
					};
					
					const newMessages = [...listQuestions, systemMessage];
					setListQuestions(newMessages);

					const updatedSessions = sessions.map((s) => {
						if (s.id === activeSessionId) {
							const title = s.title === 'Đoạn chat mới' ? `Tài liệu: ${file.name.substring(0, 15)}...` : s.title;
							return {
								...s,
								title,
								messages: newMessages,
								fileName: file.name,
							};
						}
						return s;
					});
					setSessions(updatedSessions);
					localStorage.setItem('kinal_chat_sessions', JSON.stringify(updatedSessions));
					// Dispatch để Sidebar cập nhật ngay tiêu đề tài liệu
					window.dispatchEvent(new Event('kinal_sessions_updated'));
				}
			})
			.catch((err) => {
				console.error(err);
				setUploadStatus(FAILED);
				const errorMessage: IChat = {
					role: SYSTEM,
					content: `❌ Lỗi khi tải lên hoặc phân tích tài liệu: ${err?.response?.data?.detail || err.message}. Vui lòng kiểm tra lại.`,
				};
				setListQuestions((prev) => [...prev, errorMessage]);
			});
	};

	const suggestions = [
		{
			title: 'Viết email xin nghỉ phép',
			desc: 'Tạo một email xin nghỉ ngắn hạn gửi sếp chuyên nghiệp.',
			text: 'Hãy soạn giúp tôi một email gửi sếp xin nghỉ phép 2 ngày để giải quyết việc cá nhân, giọng văn trang trọng và chuyên nghiệp.',
			color: 'amber',
			icon: 'HeroPaperAirplane',
		},
		{
			title: 'Sửa lỗi code Python',
			desc: 'Tìm và sửa lỗi lô-gích hoặc cú pháp trong đoạn code.',
			text: 'Tôi đang gặp lỗi trong Python khi cố gắng đọc file JSON. Hãy chỉ tôi cách bắt lỗi ngoại lệ (exception handling) chuẩn nhất kèm code mẫu.',
			color: 'violet',
			icon: 'HeroCommandLine',
		},
		{
			title: 'Giải thích khái niệm',
			desc: 'Tóm tắt các kiến thức phức tạp theo cách dễ hiểu nhất.',
			text: 'Giải thích giúp tôi khái niệm Trí tuệ Nhân tạo Tạo sinh (Generative AI) cho một học sinh trung học dễ hiểu nhất.',
			color: 'blue',
			icon: 'HeroAcademicCap',
		},
		{
			title: 'Lập dàn ý bài viết',
			desc: 'Phác thảo cấu trúc bài viết chuẩn SEO hoặc báo cáo chuyên sâu.',
			text: 'Lập dàn ý chi tiết cho bài viết blog chủ đề: "Tầm quan trọng của việc học lập trình trong kỷ nguyên AI".',
			color: 'emerald',
			icon: 'HeroDocumentText',
		},
	];

	const sendQuestionOnClick = (question: string) => {
		try {
			stopGeneratingRef.current = false;
			if (question) {
				formik.resetForm();
				setAskGptApiStatus(PENDING);
				
				// Thêm tin nhắn của user vào state
				const userMessage: IChat = {
					role: USER,
					content: question,
				};
				const newQuestions = [...listQuestions, userMessage];
				setListQuestions(newQuestions);

				const updatedSessions = sessions.map((s) => {
					if (s.id === activeSessionId) {
						const title = s.title === 'Đoạn chat mới' ? (question.length > 20 ? question.substring(0, 20) + '...' : question) : s.title;
						return { ...s, title, messages: newQuestions };
					}
					return s;
				});
				setSessions(updatedSessions);
				localStorage.setItem('kinal_chat_sessions', JSON.stringify(updatedSessions));
				window.dispatchEvent(new Event('kinal_sessions_updated'));

				// Gọi API thống nhất (Hỗ trợ tự động RAG hoặc Chat thường)
				postRAGQuestionsApiCall({
					dataToPost: {
						sessionId: activeSessionId,
						message: userMessage,
					},
				})
					.then((res) => {
						if (res?.status === 200) {
							setAskGptApiStatus(SUCCESSFUL);
							if (!stopGeneratingRef.current) {
								const aiMessage = res?.data as IChat;
								
								const finalQuestions = [...newQuestions, aiMessage];
								setListQuestions(finalQuestions);

								const finalSessions = updatedSessions.map((s) => {
									if (s.id === activeSessionId) {
										return { ...s, messages: finalQuestions };
									}
									return s;
								});
								setSessions(finalSessions);
								localStorage.setItem('kinal_chat_sessions', JSON.stringify(finalSessions));
								window.dispatchEvent(new Event('kinal_sessions_updated'));
							}
						}
					})
					.catch((e) => {
						console.error('API call failed:', e);
						setAskGptApiStatus(FAILED);
					});
			}
		} catch (error) {
			console.error('Error sending question:', error);
		}
	};

	const generateChat = (questions: IChat[]) => {
		const displayQuestions = questions.filter((q) => q.role !== SYSTEM);

		if (displayQuestions.length === 0) {
			return (
				<div className='flex flex-1 flex-col items-center justify-center py-10 text-center max-w-2xl mx-auto w-full'>
					<div className='w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6 animate-bounce'>
						<Icon icon='HeroSparkles' size='text-4xl' className='text-white' />
					</div>
					<h2 className='text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-2'>
						Kinal AI Assistant (Tích hợp RAG)
					</h2>
					<p className='text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-md'>
						Hỗ trợ tạo prompt vẽ ảnh nghệ thuật, chat thông minh hoặc upload tài liệu PDF/Word để tra cứu thông tin.
					</p>
					
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left'>
						{suggestions.map((s, index) => (
							<div
								key={index}
								onClick={() => sendQuestionOnClick(s.text)}
								className='group p-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-[1px]'>
								<h3 className='text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5'>
									<span>{s.title}</span>
								</h3>
								<p className='text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-normal'>
									{s.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			);
		}

		return (
			<AIChatContainerCommon>
				{questions?.map((question, index) => {
					const isSystem = question?.role === SYSTEM;
					return (
						<AIChatItemContainerCommon
							key={index}
							content={cleanContent(question?.content)}
							userName={isSystem ? 'Hệ thống' : (question?.role === USER ? 'Bạn' : 'AI')}
							isAnswer={isSystem || question?.role === ASSISTANT || question?.role === "model"}
						/>
					);
				})}
				{uploadStatus === PENDING && (
					<AIChatItemContainerCommon isAnswer>
						<div className='flex items-center gap-3 py-2'>
							<LoaderDotsCommon />
							<span className='text-xs text-zinc-500 animate-pulse'>Đang đọc và nhúng tài liệu bằng BERT... Vui lòng đợi</span>
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

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e?.key === 'Enter' && !e?.shiftKey && formik.values?.textField) {
			sendQuestionOnClick(formik.values?.textField);
		}
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
					<Button
						variant='solid'
						onClick={createNewSession}
						icon='HeroPlus'>
						Đoạn chat mới
					</Button>
				</SubheaderRight>
			</Subheader>

			{/* File Input ẩn */}
			<input
				type='file'
				ref={fileInputRef}
				onChange={handleFileChange}
				accept='.pdf,.docx'
				style={{ display: 'none' }}
			/>
			
			<div className='flex flex-1 overflow-hidden h-[calc(100vh-140px)]'>
				{/* KHUNG CHAT CHÍNH */}
				<Container className='flex-grow flex flex-col pb-0 h-full justify-between bg-zinc-100/50 dark:bg-zinc-900/10 px-4'>
					<div className='flex-1 overflow-y-auto pr-1 no-scrollbar py-4'>
						{generateChat(listQuestions)}
					</div>
					<AIChatInputContainerCommon>
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
										? `Đặt câu hỏi liên quan đến tài liệu: ${uploadedFileName}` 
										: 'Hỏi Kinal AI bất cứ điều gì...'
								}
								onChange={formik.handleChange}
								value={formik.values.textField}
								onKeyDown={handleKeyDown}
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
				</Container>
			</div>
		</PageWrapper>
	);
};

export default ChatBotClient;
