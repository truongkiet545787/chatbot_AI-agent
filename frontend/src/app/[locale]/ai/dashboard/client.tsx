'use client';

import React from 'react';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import { useFormik } from 'formik';
import Container from '@/components/layouts/Container/Container';
import FieldWrap from '@/components/form/FieldWrap';
import Button from '@/components/ui/Button';
import Input from '@/components/form/Input';
import AIChatContainerCommon from '@/app/[locale]/ai/_common/AIChatContainer.common';
import classNames from 'classnames';
import Link from 'next/link';
import { appPages } from '@/config/pages.config';
import Card, { CardBody } from '@/components/ui/Card';
import Icon from '@/components/icon/Icon';
import AIChatInputContainerCommon from '@/app/[locale]/ai/_common/AIChatInputContainer.common';
import AiSubheaderPartial from '../_partial/AiSubheader.partial';

const AiDashboardClient = () => {
	const formik = useFormik({
		onSubmit(): void | Promise<never> {
			return undefined;
		},
		initialValues: {
			textField: '',
		},
	});

	return (
		<PageWrapper>
			<AiSubheaderPartial />
			<Container className='flex shrink-0 grow basis-auto flex-col pb-0'>
				<AIChatContainerCommon>
					<div className='col-span-12 my-20'>
						<div className='mb-4 text-center text-5xl md:text-6xl font-semibold'>
							<span
								className={classNames(
									'animate-pulse bg-gradient-to-r bg-clip-text text-transparent',
									'from-indigo-500 via-purple-500 to-pink-500',
									'hover:from-sky-500 hover:via-violet-500 hover:to-amber-500',
									'transition duration-1000 ease-in-out',
								)}>
								⚡️ Vượt qua giới hạn cùng Kinal AI
							</span>
						</div>
						<div className='text-center text-xl md:text-2xl text-zinc-500 dark:text-zinc-400'>
							Trò chuyện với trợ lý thông minh - Trải nghiệm kỷ nguyên công nghệ mới
						</div>
					</div>
					
					{/* Card 1: Chat Bot AI */}
					<div className='col-span-12 md:col-span-6 xl:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.chatBotPage?.to}`}>
							<Card className='hover:scale-[1.02] transition-transform duration-300'>
								<CardBody>
									<div className='flex items-center gap-4'>
										<div className='flex-shrink-0 rounded-lg bg-emerald-500/25 p-6'>
											<Icon icon='DuoChat6' size='text-6xl' color='emerald' />
										</div>
										<div className='grow'>
											<div className='text-xl font-bold text-zinc-800 dark:text-white'>
												Trợ lý Chatbot
											</div>
											<div className='text-xs text-zinc-400 mt-1'>
												Hội thoại thông minh
											</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</Link>
					</div>

					{/* Card 2: Chat Bot RAG */}
					<div className='col-span-12 md:col-span-6 xl:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.ragPage?.to}`}>
							<Card className='hover:scale-[1.02] transition-transform duration-300'>
								<CardBody>
									<div className='flex items-center gap-4'>
										<div className='flex-shrink-0 rounded-lg bg-indigo-500/25 p-6'>
											<Icon icon='DuoChat6' size='text-6xl' color='indigo' />
										</div>
										<div className='grow'>
											<div className='text-xl font-bold text-zinc-800 dark:text-white'>
												Chatbot RAG
											</div>
											<div className='text-xs text-zinc-400 mt-1'>
												Truy vấn tài liệu riêng
											</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</Link>
					</div>

					{/* Card 3: Photo editing */}
					<div className='col-span-12 md:col-span-6 xl:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.photoPage?.to}`}>
							<Card className='hover:scale-[1.02] transition-transform duration-300'>
								<CardBody>
									<div className='flex items-center gap-4'>
										<div className='flex-shrink-0 rounded-lg bg-amber-500/25 p-6'>
											<Icon icon='HeroPhoto' size='text-6xl' color='amber' />
										</div>
										<div className='grow'>
											<div className='text-xl font-bold text-zinc-800 dark:text-white'>
												Chỉnh sửa ảnh
											</div>
											<div className='text-xs text-zinc-400 mt-1'>
												Xử lý ảnh bằng AI
											</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</Link>
					</div>

					{/* Card 4: Text to Speech */}
					<div className='col-span-12 md:col-span-6 xl:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.audioPage?.to}`}>
							<Card className='hover:scale-[1.02] transition-transform duration-300'>
								<CardBody>
									<div className='flex items-center gap-4'>
										<div className='flex-shrink-0 rounded-lg bg-violet-500/25 p-6'>
											<Icon
												icon='HeroMusicalNote'
												size='text-6xl'
												color='violet'
											/>
										</div>
										<div className='grow'>
											<div className='text-xl font-bold text-zinc-800 dark:text-white'>
												Văn bản ➜ Giọng nói
											</div>
											<div className='text-xs text-zinc-400 mt-1'>
												Tạo giọng nói AI tự nhiên
											</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</Link>
					</div>

					{/* Card 5: Speech Recognition */}
					<div className='col-span-12 md:col-span-6 xl:col-span-3'>
						<Link
							href={`${appPages?.aiAppPages?.subPages?.chatPages?.subPages?.speechRecognitionPage?.to}`}>
							<Card className='hover:scale-[1.02] transition-transform duration-300'>
								<CardBody>
									<div className='flex items-center gap-4'>
										<div className='flex-shrink-0 rounded-lg bg-blue-500/25 p-6'>
											<Icon
												icon='HeroMicrophone'
												size='text-6xl'
												color='blue'
											/>
										</div>
										<div className='grow'>
											<div className='text-xl font-bold text-zinc-800 dark:text-white'>
												Nhận dạng giọng nói
											</div>
											<div className='text-xs text-zinc-400 mt-1'>
												Chuyển âm thanh thành chữ
											</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</Link>
					</div>

				</AIChatContainerCommon>
				<AIChatInputContainerCommon>
					<FieldWrap
						firstSuffix={
							<Button
								icon='HeroPlus'
								variant={formik.values.textField ? 'default' : 'solid'}
								rounded='rounded'
								className='me-2'
								aria-label='Tải tệp lên'
							/>
						}
						lastSuffix={
							formik.values.textField ? (
								<Button
									className='ms-2'
									variant='solid'
									rounded='rounded'
									icon='HeroPaperAirplane'>
									Gửi
								</Button>
							) : (
								<Button
									className='ms-2'
									icon='HeroMicrophone'
									aria-label='Nói chuyện'
								/>
							)
						}>
						<Input
							name='textField'
							dimension='xl'
							placeholder='Nhập câu hỏi tại đây...'
							onChange={formik.handleChange}
							value={formik.values.textField}
						/>
					</FieldWrap>
				</AIChatInputContainerCommon>
			</Container>
		</PageWrapper>
	);
};

export default AiDashboardClient;
