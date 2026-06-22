'use client';

import React, { useRef, useState } from 'react';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import { useFormik } from 'formik';
import Container from '@/components/layouts/Container/Container';
import AIChatContainerCommon from '@/app/[locale]/ai/_common/AIChatContainer.common';
import AIChatItemContainerCommon from '@/app/[locale]/ai/_common/AIChatItemContainer.common';
import Button from '@/components/ui/Button';
import LoaderDotsCommon from '@/components/LoaderDots.common';
import AIChatInputContainerCommon from '@/app/[locale]/ai/_common/AIChatInputContainer.common';
import FieldWrap from '@/components/form/FieldWrap';
import Input from '@/components/form/Input';
import { ASSISTANT, CREATED, FAILED, PENDING, SUCCESSFUL, SYSTEM, USER } from '@/constant';
import { postQuestionsApiCall } from '@/apiCalls/ai-demos/postQuestionsApiCall';
import Subheader, { SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Icon from '@/components/icon/Icon';

interface IChat {
	role: string;
	content: string;
}

const ChatBotClient = () => {
	const [listQuestions, setListQuestions] = useState([
		{
			role: SYSTEM,
			content: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
		},
	] as IChat[]);

	const [askGptApiStatus, setAskGptApiStatus] = useState(CREATED);
	const stopGeneratingRef = useRef(false);

	const formik = useFormik({
		onSubmit(): void | Promise<never> {
			return undefined;
		},
		initialValues: {
			textField: '',
		},
	});

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
				
				const newQuestions = [
					...listQuestions,
					{
						role: USER,
						content: question,
					},
				];
				setListQuestions(newQuestions);

				postQuestionsApiCall({
					dataToPost: {
						messages: newQuestions,
					},
				})
					.then((res) => {
						if (res?.status === 200) {
							setAskGptApiStatus(SUCCESSFUL);
							if (!stopGeneratingRef.current) {
								setListQuestions((prev) => {
									return [...prev, res?.data] as IChat[];
								});
							}
						}
					})
					.catch((e) => {
						setAskGptApiStatus(FAILED);
					});
			}
		} catch {
			// FIXME
		}
	};

	const generateChat = (questions: IChat[]) => {
		// Lọc các tin nhắn khác ngoài system
		const displayQuestions = questions.filter((q) => q.role !== SYSTEM);

		if (displayQuestions.length === 0) {
			// Hiển thị màn hình gợi ý
			return (
				<div className='flex flex-1 flex-col items-center justify-center py-10 text-center max-w-2xl mx-auto w-full'>
					<div className='w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6'>
						<Icon icon='HeroSparkles' size='text-4xl' className='text-white' />
					</div>
					<h2 className='text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-2'>
						Kinal AI Assistant
					</h2>
					<p className='text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-md'>
						Trợ lý ngôn ngữ đa năng sẵn sàng hỗ trợ bạn viết lách, giải đáp thắc mắc và lập trình hiệu quả hơn.
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
					if (question?.role === SYSTEM) return null;
					return (
						<AIChatItemContainerCommon
							key={index}
							content={question?.content}
							userName={question?.role === USER ? 'Bạn' : 'AI'}
							isAnswer={question?.role === SYSTEM || question?.role === ASSISTANT}
						/>
					);
				})}
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
				<SubheaderRight>
					<Button
						variant='solid'
						onClick={() => {
							setListQuestions([
								{
									role: SYSTEM,
									content: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
								},
							]);
							setAskGptApiStatus(CREATED);
						}}
						icon='HeroPlus'>
						Đoạn chat mới
					</Button>
				</SubheaderRight>
			</Subheader>
			<Container className='flex shrink-0 grow basis-auto flex-col pb-0 h-[calc(100vh-140px)] justify-between'>
				<div className='flex-1 overflow-y-auto pr-1 no-scrollbar'>
					{generateChat(listQuestions)}
				</div>
				<AIChatInputContainerCommon>
					<div className='relative flex items-center w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:shadow-indigo-500/5 transition-all duration-300 p-2 shadow-lg'>
						{/* Nút cộng tải tệp lên cực đẹp */}
						<button
							type='button'
							aria-label='Tải tệp lên'
							className='p-2.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30 text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 rounded-xl transition-all duration-200 flex items-center justify-center hover:scale-[1.03] active:scale-[0.97] shrink-0 shadow-sm'>
							<Icon icon='HeroPlus' size='text-xl' />
						</button>

						{/* Textfield nhập liệu đẹp đẽ, phóng khoáng */}
						<input
							id='textField'
							name='textField'
							placeholder={askGptApiStatus === PENDING ? 'AI đang phản hồi... Vui lòng đợi' : 'Hỏi Kinal AI bất cứ điều gì...'}
							onChange={formik.handleChange}
							value={formik.values.textField}
							onKeyDown={handleKeyDown}
							autoComplete='off'
							disabled={askGptApiStatus === PENDING}
							className='flex-1 bg-transparent border-0 outline-none focus:outline-none focus:border-transparent focus:ring-0 text-zinc-850 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm py-2.5 px-4 leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed'
						/>

						{/* Nút Gửi / Microphone / Dừng phản hồi */}
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
								className='p-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-650 text-white rounded-xl shadow-md transition-all duration-200 flex items-center justify-center hover:scale-[1.03] active:scale-[0.97] shrink-0 border border-indigo-600/20'>
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
		</PageWrapper>
	);
};

export default ChatBotClient;
