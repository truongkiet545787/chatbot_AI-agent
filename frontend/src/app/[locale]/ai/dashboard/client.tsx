'use client';

/**
 * TRANG BẢNG ĐIỀU KHIỂN AI (AI DASHBOARD)
 * --------------------------------------------------
 * Chức năng:
 * - Đóng vai trò là trang chủ chào mừng của phân hệ AI.
 * - Hiển thị danh sách các ứng dụng AI khả dụng dưới dạng các thẻ (Card) trực quan.
 * - Hỗ trợ thanh tìm kiếm/nhập nhanh để người dùng chuyển hướng nhanh.
 * Trạng thái: ĐÃ HOÀN THÀNH - ĐANG HOẠT ĐỘNG
 */

import React from 'react';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import { useFormik } from 'formik';
import Container from '@/components/layouts/Container/Container';
import AIChatContainerCommon from '@/app/[locale]/ai/_common/AIChatContainer.common';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { appPages } from '@/config/pages.config';
import Icon from '@/components/icon/Icon';
import AIChatInputContainerCommon from '@/app/[locale]/ai/_common/AIChatInputContainer.common';
import AiSubheaderPartial from '../_partial/AiSubheader.partial';

const AiDashboardClient = () => {
	const router = useRouter();

	const formik = useFormik({
		onSubmit(): void | Promise<never> {
			return undefined;
		},
		initialValues: {
			textField: '',
		},
	});

	const handleSendToChat = () => {
		if (formik.values.textField) {
			router.push(`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.chatBotPage?.to}?prompt=${encodeURIComponent(formik.values.textField)}`);
		}
	};

	const handleSendToPhoto = () => {
		if (formik.values.textField) {
			router.push(`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.photoPage?.to}?prompt=${encodeURIComponent(formik.values.textField)}`);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e?.key === 'Enter' && !e?.shiftKey && formik.values?.textField) {
			handleSendToChat();
		}
	};

	return (
		<PageWrapper>
			<AiSubheaderPartial />
			<Container className='flex shrink-0 grow basis-auto flex-col pb-0'>
				<AIChatContainerCommon>
					<div className='col-span-12 my-12 flex flex-col items-center justify-center text-center'>
						<div className='w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6 animate-pulse'>
							<Icon icon='HeroSparkles' size='text-4xl' className='text-white' />
						</div>
						<h1 className='mb-6 text-center text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight'>
							<span className='bg-gradient-to-r bg-clip-text text-transparent from-indigo-500 via-purple-500 to-pink-500 hover:from-sky-400 hover:via-indigo-500 hover:to-amber-500 transition-colors duration-500'>
								✨ Khai Phá Sức Mạnh Trí Tuệ Nhân Tạo
							</span>
							<br />
							<span className='text-zinc-800 dark:text-zinc-100 text-3xl md:text-4xl lg:text-5xl mt-2 block font-bold'>
								Cùng Kinal AI
							</span>
						</h1>
						<p className='text-center text-base md:text-lg text-zinc-500 dark:text-zinc-455 max-w-2xl leading-relaxed'>
							💡 Trải nghiệm đột phá với hệ sinh thái AI thông minh thế hệ mới — Kết nối ý tưởng, tối ưu hiệu suất và kiến tạo tương lai của bạn.
						</p>
					</div>
					
					{/* Card 1: Chat Bot AI */}
					<div className='col-span-12 md:col-span-6 xl:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.chatBotPage?.to}`}>
							<div className='group relative rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-md hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden'>
								<div className='absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								<div className='flex items-center gap-4 relative z-10'>
									<div className='flex-shrink-0 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 p-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300'>
										<Icon icon='DuoChat6' size='text-5xl' />
									</div>
									<div className='grow'>
										<div className='text-lg font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200'>
											Trợ lý Chatbot
										</div>
										<div className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
											Hội thoại thông minh
										</div>
									</div>
								</div>
							</div>
						</Link>
					</div>

					{/* Card 2: Chat Bot RAG */}
					<div className='col-span-12 md:col-span-6 xl:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.ragPage?.to}`}>
							<div className='group relative rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-md hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden'>
								<div className='absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								<div className='flex items-center gap-4 relative z-10'>
									<div className='flex-shrink-0 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 p-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300'>
										<Icon icon='DuoChat6' size='text-5xl' />
									</div>
									<div className='grow'>
										<div className='text-lg font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200'>
											Chatbot RAG
										</div>
										<div className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
											Truy vấn tài liệu riêng
										</div>
									</div>
								</div>
							</div>
						</Link>
					</div>

					{/* Card 3: Photo editing */}
					<div className='col-span-12 md:col-span-6 xl:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.photoPage?.to}`}>
							<div className='group relative rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-md hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden'>
								<div className='absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								<div className='flex items-center gap-4 relative z-10'>
									<div className='flex-shrink-0 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 p-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300'>
										<Icon icon='HeroPhoto' size='text-5xl' />
									</div>
									<div className='grow'>
										<div className='text-lg font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-200'>
											Chỉnh sửa ảnh
										</div>
										<div className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
											Xử lý ảnh bằng AI
										</div>
									</div>
								</div>
							</div>
						</Link>
					</div>

					{/* Card 4: Text to Speech */}
					<div className='col-span-12 md:col-span-6 xl:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.audioPage?.to}`}>
							<div className='group relative rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-md hover:border-violet-500/30 dark:hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden'>
								<div className='absolute inset-0 bg-gradient-to-tr from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								<div className='flex items-center gap-4 relative z-10'>
									<div className='flex-shrink-0 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 p-4 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform duration-300'>
										<Icon icon='HeroMusicalNote' size='text-5xl' />
									</div>
									<div className='grow'>
										<div className='text-lg font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-200'>
											Văn bản ➜ Giọng nói
										</div>
										<div className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
											Tạo giọng nói AI tự nhiên
										</div>
									</div>
								</div>
							</div>
						</Link>
					</div>

					{/* Card 5: Speech Recognition */}
					<div className='col-span-12 md:col-span-6 xl:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.speechRecognitionPage?.to}`}>
							<div className='group relative rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-md hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden'>
								<div className='absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								<div className='flex items-center gap-4 relative z-10'>
									<div className='flex-shrink-0 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 p-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300'>
										<Icon icon='HeroMicrophone' size='text-5xl' />
									</div>
									<div className='grow'>
										<div className='text-lg font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200'>
											Nhận dạng giọng nói
										</div>
										<div className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>
											Chuyển âm thanh thành chữ
										</div>
									</div>
								</div>
							</div>
						</Link>
					</div>

				</AIChatContainerCommon>
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
							placeholder='Bạn muốn làm gì? Nhập câu hỏi hoặc mô tả hình ảnh...'
							onChange={formik.handleChange}
							value={formik.values.textField}
							onKeyDown={handleKeyDown}
							autoComplete='off'
							className='flex-1 bg-transparent border-0 outline-none focus:outline-none focus:border-transparent focus:ring-0 text-zinc-850 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm py-2.5 px-4 leading-relaxed'
						/>

						{/* Nút Gửi sang Chatbot / Tạo ảnh */}
						{formik.values?.textField ? (
							<div className='flex gap-2 shrink-0'>
								<button
									type='button'
									onClick={handleSendToChat}
									className='flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-indigo-750 hover:from-indigo-550 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-indigo-600/20'>
									<Icon icon='HeroPaperAirplane' size='text-base' />
									<span>Hỏi Chatbot</span>
								</button>
								<button
									type='button'
									onClick={handleSendToPhoto}
									className='flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-550 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-amber-500/20'>
									<Icon icon='HeroPhoto' size='text-base' />
									<span>Tạo ảnh</span>
								</button>
							</div>
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

export default AiDashboardClient;

