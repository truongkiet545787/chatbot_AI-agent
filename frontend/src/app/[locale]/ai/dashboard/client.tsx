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
import { motion } from 'framer-motion';

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
			<Container className='flex shrink-0 grow basis-auto flex-col pb-0 relative overflow-hidden min-h-[calc(100vh-140px)]'>
				
				{/* Drifting Aurora / Neon gradient blobs */}
				<div className='absolute inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-30 z-0'>
					<motion.div
						animate={{
							x: [0, 80, -40, 0],
							y: [0, -60, 40, 0],
							scale: [1, 1.15, 0.9, 1],
						}}
						transition={{
							duration: 20,
							repeat: Infinity,
							ease: 'easeInOut',
						}}
						className='absolute -top-20 -left-20 w-96 h-96 rounded-full bg-indigo-500/25 blur-3xl'
					/>
					<motion.div
						animate={{
							x: [0, -100, 60, 0],
							y: [0, 70, -50, 0],
							scale: [1, 0.9, 1.1, 1],
						}}
						transition={{
							duration: 25,
							repeat: Infinity,
							ease: 'easeInOut',
						}}
						className='absolute -bottom-20 -right-20 w-[450px] h-[450px] rounded-full bg-blue-500/20 blur-3xl'
					/>
					<motion.div
						animate={{
							x: [0, 60, -60, 0],
							y: [0, 80, -70, 0],
						}}
						transition={{
							duration: 18,
							repeat: Infinity,
							ease: 'easeInOut',
						}}
						className='absolute top-1/3 left-1/3 w-80 h-80 rounded-full bg-purple-500/15 blur-3xl'
					/>
				</div>

				<AIChatContainerCommon className='relative z-10'>
					<div className='col-span-12 my-12 flex flex-col items-center justify-center text-center relative z-10'>
						
						{/* Animated sparkles icon */}
						<motion.div 
							initial={{ opacity: 0, scale: 0.3, rotate: -45 }}
							animate={{ opacity: 1, scale: 1, rotate: 0 }}
							transition={{ type: 'spring', stiffness: 200, damping: 15 }}
							className='w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6'>
							<Icon icon='HeroSparkles' size='text-4xl' className='text-white' />
						</motion.div>
						
						{/* Fade-in Header text */}
						<motion.h1 
							initial={{ opacity: 0, y: -15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, ease: 'easeOut' }}
							className='mb-6 text-center text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight'>
							<span className='bg-gradient-to-r bg-clip-text text-transparent from-indigo-500 via-purple-500 to-pink-500 hover:from-sky-400 hover:via-indigo-500 hover:to-amber-500 transition-colors duration-500'>
								✨ Khai Phá Sức Mạnh Trí Tuệ Nhân Tạo
							</span>
							<br />
							<span className='text-zinc-800 dark:text-zinc-100 text-3xl md:text-4xl lg:text-5xl mt-2 block font-bold'>
								Cùng Kinal AI
							</span>
						</motion.h1>

						{/* Fade-in subtext */}
						<motion.p 
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
							className='text-center text-base md:text-lg text-zinc-550 dark:text-zinc-400 max-w-2xl leading-relaxed'>
							💡 Trải nghiệm đột phá với hệ sinh thái AI thông minh thế hệ mới — Kết nối ý tưởng, tối ưu hiệu suất và kiến tạo tương lai của bạn.
						</motion.p>

						{/* Shimmer search input bar */}
						<motion.div 
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
							className='w-full max-w-2xl mt-8 mb-4 relative flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/80 rounded-2xl focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:shadow-indigo-500/5 transition-all duration-300 p-2 shadow-lg'>
							
							{/* Icon search/sparkles */}
							<div className='p-2.5 text-indigo-500 dark:text-indigo-400 shrink-0'>
								<Icon icon='HeroSparkles' size='text-xl' />
							</div>

							{/* Textfield nhập liệu */}
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
										className='flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-indigo-600/20'>
										<Icon icon='HeroPaperAirplane' size='text-base' />
										<span>Hỏi Chatbot</span>
									</button>
									<button
										type='button'
										onClick={handleSendToPhoto}
										className='flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-500 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-amber-500/20'>
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
						</motion.div>
					</div>
					
					{/* Staggered waterfall cards mounting */}

					{/* Card 1: Chat Bot AI */}
					<motion.div 
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
						className='col-span-12 lg:col-span-6'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.chatBotPage?.to}`}>
							<div className='group relative rounded-2xl border-2 border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-8 shadow-sm hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden'>
								<div className='absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								<div className='flex items-center gap-6 relative z-10'>
									<div className='flex-shrink-0 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 p-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300'>
										<Icon icon='DuoChat6' size='text-5xl' />
									</div>
									<div className='grow'>
										<div className='text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200'>
											Trợ lý Chatbot
										</div>
										<div className='text-sm text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed'>
											Hội thoại thông minh kết nối trí tuệ nhân tạo, hỗ trợ trả lời mọi câu hỏi nhanh chóng.
										</div>
									</div>
								</div>
							</div>
						</Link>
					</motion.div>

					{/* Card 2: Chat Bot RAG */}
					<motion.div 
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.55, ease: 'easeOut' }}
						className='col-span-12 lg:col-span-6'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.chatBotPage?.to}`}>
							<div className='group relative rounded-2xl border-2 border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-8 shadow-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:border-indigo-500/60 dark:hover:border-indigo-500/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden'>
								<div className='absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								<div className='flex items-center gap-6 relative z-10'>
									<div className='flex-shrink-0 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 p-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300'>
										<Icon icon='DuoChat6' size='text-5xl' />
									</div>
									<div className='grow'>
										<div className='text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200'>
											Chatbot RAG
										</div>
										<div className='text-sm text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed'>
											Hỏi đáp & Tra cứu tài liệu thông minh tự động trích xuất nội dung từ PDF/Word.
										</div>
									</div>
								</div>
							</div>
						</Link>
					</motion.div>

					{/* Card 3: Photo editing */}
					<motion.div 
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
						className='col-span-12 md:col-span-6 lg:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.photoPage?.to}`}>
							<div className='group relative rounded-2xl border-2 border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-500/60 dark:hover:border-amber-500/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden'>
								<div className='absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								<div className='flex items-center gap-4 relative z-10'>
									<div className='flex-shrink-0 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 p-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300'>
										<Icon icon='HeroPhoto' size='text-5xl' />
									</div>
									<div className='grow'>
										<div className='text-lg font-bold text-zinc-850 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-200'>
											Chỉnh sửa ảnh
										</div>
										<div className='text-xs text-zinc-450 dark:text-zinc-500 mt-1'>
											Xử lý ảnh bằng AI chuyên sâu
										</div>
									</div>
								</div>
							</div>
						</Link>
					</motion.div>

					{/* Card 4: Sketch to Image */}
					<motion.div 
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.65, ease: 'easeOut' }}
						className='col-span-12 md:col-span-6 lg:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.photoDrawPage?.to}`}>
							<div className='group relative rounded-2xl border-2 border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] hover:border-rose-500/60 dark:hover:border-rose-500/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden'>
								<div className='absolute inset-0 bg-gradient-to-tr from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								<div className='flex items-center gap-4 relative z-10'>
									<div className='flex-shrink-0 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 p-4 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform duration-300'>
										<Icon icon='HeroPencil' size='text-5xl' />
									</div>
									<div className='grow'>
										<div className='text-lg font-bold text-zinc-850 dark:text-zinc-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors duration-200'>
											Bản phác thảo
										</div>
										<div className='text-xs text-zinc-450 dark:text-zinc-500 mt-1'>
											Tạo ảnh nghệ thuật từ nét vẽ
										</div>
									</div>
								</div>
							</div>
						</Link>
					</motion.div>

					{/* Card 5: Text to Speech */}
					<motion.div 
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.7, ease: 'easeOut' }}
						className='col-span-12 md:col-span-6 lg:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.audioPage?.to}`}>
							<div className='group relative rounded-2xl border-2 border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:border-violet-500/60 dark:hover:border-violet-500/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden'>
								<div className='absolute inset-0 bg-gradient-to-tr from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								<div className='flex items-center gap-4 relative z-10'>
									<div className='flex-shrink-0 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 p-4 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform duration-300'>
										<Icon icon='HeroMusicalNote' size='text-5xl' />
									</div>
									<div className='grow'>
										<div className='text-lg font-bold text-zinc-855 dark:text-zinc-100 group-hover:text-violet-650 dark:group-hover:text-violet-400 transition-colors duration-200'>
											Văn bản ➜ Giọng nói
										</div>
										<div className='text-xs text-zinc-450 dark:text-zinc-500 mt-1'>
											Tạo giọng nói AI tự nhiên
										</div>
									</div>
								</div>
							</div>
						</Link>
					</motion.div>

					{/* Card 6: Speech Recognition */}
					<motion.div 
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.75, ease: 'easeOut' }}
						className='col-span-12 md:col-span-6 lg:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.speechRecognitionPage?.to}`}>
							<div className='group relative rounded-2xl border-2 border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:border-blue-500/60 dark:hover:border-blue-500/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden'>
								<div className='absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								<div className='flex items-center gap-4 relative z-10'>
									<div className='flex-shrink-0 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 p-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300'>
										<Icon icon='HeroMicrophone' size='text-5xl' />
									</div>
									<div className='grow'>
										<div className='text-lg font-bold text-zinc-855 dark:text-zinc-100 group-hover:text-blue-650 dark:group-hover:text-blue-400 transition-colors duration-200'>
											Giọng nói ➜ Văn bản
										</div>
										<div className='text-xs text-zinc-450 dark:text-zinc-500 mt-1'>
											Chuyển đổi âm thanh thành chữ
										</div>
									</div>
								</div>
							</div>
						</Link>
					</motion.div>

				</AIChatContainerCommon>
			</Container>
		</PageWrapper>
	);
};

export default AiDashboardClient;
