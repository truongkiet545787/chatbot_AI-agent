'use client';

/**
 * TRANG CHỈNH SỬA ẢNH (PHOTO EDITING)
 * --------------------------------------------------
 * Chức năng:
 * - Tiếp nhận mô tả prompt từ người dùng để sinh ảnh mới từ AI.
 * - Cho phép tải ảnh lên và tạo phiên bản biến thể ảnh (variation) khác biệt.
 * - Hỗ trợ tải ảnh kết quả về thiết bị cá nhân.
 * Trạng thái: ĐANG PHÁT TRIỂN - UPDATE SAU (Chưa hoàn thiện phần API xử lý hình ảnh ở Backend)
 */

import React, { useRef, useState, useEffect } from 'react';
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
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import { generateImageApiCall } from '@/apiCalls/ai-demos/generateImageApiCall';
import Image from 'next/image';
import { generateImageVariationApiCall } from '@/apiCalls/ai-demos/generateImageVariationApiCall';
import Icon from '@/components/icon/Icon';


const ChatPhotoClient = () => {
	const [listQuestions, setListQuestions] = useState([
		{
			role: SYSTEM,
			content: 'What would you like me to draw?',
			base64: '',
		},
	] as IChatImage[]);

	const [askGptApiStatus, setAskGptApiStatus] = useState(CREATED);
	const stopGeneratingRef = useRef(false);

	const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
	const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const formik = useFormik({
		onSubmit(): void | Promise<never> {
			return undefined;
		},
		initialValues: {
			textField: '',
		},
	});

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			const initialPrompt = params.get('prompt');
			if (initialPrompt) {
				const newUrl = window.location.pathname;
				window.history.replaceState({}, '', newUrl);
				sendQuestionOnClick(initialPrompt);
			}
		}
	}, []);

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (event) => {
				const result = event.target?.result as string;
				setUploadedImagePreview(result);
				const base64Str = result.split(',')[1];
				setUploadedImageBase64(base64Str);
			};
			reader.readAsDataURL(file);
		}
	};

	const generateVariationOnClick = async (base64: string, prompt?: string) => {
		try {
			stopGeneratingRef.current = false;
			if (base64) {
				const displayPrompt = prompt || 'Create variation';
				setListQuestions((prev) => {
					return [
						...prev,
						{
							role: USER,
							content: `Create variation of: "${displayPrompt}"`,
						},
					];
				});
				setAskGptApiStatus(PENDING);
				generateImageVariationApiCall({
					dataToPost: {
						base64,
						prompt: displayPrompt,
					},
				})
					.then((res) => {
						if (res?.status === 200) {
							setAskGptApiStatus(SUCCESSFUL);
							setListQuestions((prev) => {
								return [
									...prev,
									{
										role: ASSISTANT,
										base64: res?.data?.b64_json,
									} as IChatImage,
								];
							});
						}
					})
					.catch((e) => {
						setAskGptApiStatus(FAILED);
					});
			}
		} catch {
			setAskGptApiStatus(FAILED);
		}
	};

	const sendQuestionOnClick = (question: string) => {
		try {
			stopGeneratingRef.current = false;
			if (question) {
				formik.resetForm();
				setAskGptApiStatus(PENDING);
				
				const imageToSend = uploadedImageBase64;
				setListQuestions([
					...listQuestions,
					{
						role: USER,
						content: question,
						base64: imageToSend || '',
					},
				]);

				setUploadedImagePreview(null);
				setUploadedImageBase64(null);
				if (fileInputRef.current) fileInputRef.current.value = '';

				if (imageToSend) {
					generateImageVariationApiCall({
						dataToPost: {
							base64: imageToSend,
							prompt: question,
						},
					})
						.then((res) => {
							if (res?.status === 200) {
								setAskGptApiStatus(SUCCESSFUL);
								if (!stopGeneratingRef.current) {
									setListQuestions((prev) => {
										return [
											...prev,
											{
												role: ASSISTANT,
												base64: res?.data?.b64_json,
											} as IChatImage,
										];
									});
								}
							}
						})
						.catch((e) => {
							setAskGptApiStatus(FAILED);
						});
				} else {
					generateImageApiCall({
						dataToPost: {
							prompt: question,
						},
					})
						.then((res) => {
							if (res?.status === 200) {
								setAskGptApiStatus(SUCCESSFUL);
								if (!stopGeneratingRef.current) {
									setListQuestions((prev) => {
										return [
											...prev,
											{
												role: ASSISTANT,
												base64: res?.data?.b64_json,
											} as IChatImage,
										];
									});
								}
							}
						})
						.catch((e) => {
							setAskGptApiStatus(FAILED);
						});
				}
			}
		} catch {
			// FIXME
		}
	};

	const handleDownloadImage = (base64: string) => {
		try {
			const link = document.createElement('a');
			link.href = `data:image/jpeg;base64,${base64}`;
			link.download = 'image.jpg';
			link.click();
		} catch (e) {
			// FIXME
		}
	};

	const generateChat = (questions: IChatImage[]) => {
		let content = <div />;
		if (questions && questions?.length > 0) {
			content = (
				<AIChatContainerCommon>
					{questions?.map((question, index) => {
						return (
							<AIChatItemContainerCommon
								key={`${question?.role}-${index}`}
								content={question?.content}
								userName={question?.role === USER ? 'You' : 'AI'}
								isAnswer={
									question?.role === SYSTEM || question?.role === ASSISTANT
								}>
								{question?.base64 && (
									<div className='grid grid-cols-12 gap-4'>
										<div className='col-span-12 lg:col-span-8'>
											<div className='col-span-12 lg:col-span-8'>
												<Image
													src={`data:image/jpeg;base64,${question?.base64}`}
													alt='ai-image'
													className='rounded-lg'
													width={256}
													height={256}
												/>
											</div>
										</div>
										<div className='col-span-full flex flex-wrap gap-4'>
											<Button
												icon='HeroArrowDownTray'
												variant='solid'
												onClick={() =>
													handleDownloadImage(question?.base64 as string)
												}>
												Export
											</Button>
											<Button
												icon='HeroDocumentDuplicate'
												variant='solid'
												onClick={() => {
													const originalPrompt = index > 0 ? questions[index - 1]?.content : '';
													generateVariationOnClick(
														question?.base64 as string,
														originalPrompt
													);
												}}
												color='zinc'>
												Create variation
											</Button>
											{/* <Button
												icon='HeroAdjustmentsHorizontal'
												variant='solid'
												color='zinc'>
												Adjust
											</Button>
											<Button
												icon='HeroArrowsPointingOut'
												variant='solid'
												color='zinc'>
												Enhance
											</Button> */}
										</div>
									</div>
								)}
							</AIChatItemContainerCommon>
						);
					})}
					{askGptApiStatus === PENDING && !stopGeneratingRef.current && (
						<AIChatItemContainerCommon isAnswer>
							<div className='grid grid-cols-12 items-center'>
								<div className='col-auto flex'>
									<LoaderDotsCommon />
								</div>
								<div className='col-auto flex'>
									<Button
										className='whitespace-nowrap !px-0'
										size='xs'
										color='red'
										onClick={() => {
											stopGeneratingRef.current = true;
											setAskGptApiStatus(FAILED);
										}}
										icon='HeroStop'>
										Stop Generating
									</Button>
								</div>
							</div>
						</AIChatItemContainerCommon>
					)}
				</AIChatContainerCommon>
			);
		}
		return content;
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
						Chỉnh sửa ảnh
						<span className='text-xs font-normal px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/25'>
							Đang phát triển - Update sau
						</span>
					</span>
				</SubheaderLeft>
				<SubheaderRight>
					<button
						onClick={() =>
							setListQuestions([
								{
									role: SYSTEM,
									content: 'What would you like me to draw?',
								},
							])
						}
						className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white text-sm font-semibold rounded-xl shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
						<Icon icon='HeroPlus' size='text-lg' />
						<span>New Chat</span>
					</button>
				</SubheaderRight>
			</Subheader>
			<Container className='flex shrink-0 grow basis-auto flex-col pb-0'>
				{generateChat(listQuestions)}
				<AIChatInputContainerCommon>
					{uploadedImagePreview && (
						<div className="relative flex items-center gap-2 mb-3 p-2 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 w-fit">
							<div className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700">
								<img src={uploadedImagePreview} alt="Upload preview" className="w-full h-full object-cover" />
							</div>
							<button
								type="button"
								onClick={() => {
									setUploadedImagePreview(null);
									setUploadedImageBase64(null);
									if (fileInputRef.current) fileInputRef.current.value = '';
								}}
								className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-all shadow-md animate-none">
								<Icon icon="HeroXMark" size="text-xs" />
							</button>
						</div>
					)}
					<div className='relative flex items-center w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:shadow-indigo-500/5 transition-all duration-300 p-2 shadow-lg'>
						{/* Nút cộng tải tệp lên cực đẹp */}
						<input
							type="file"
							ref={fileInputRef}
							accept="image/*"
							onChange={handleFileUpload}
							className="hidden"
						/>
						<button
							type='button'
							aria-label='Tải tệp lên'
							onClick={() => fileInputRef.current?.click()}
							className='p-2.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30 text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 rounded-xl transition-all duration-200 flex items-center justify-center hover:scale-[1.03] active:scale-[0.97] shrink-0 shadow-sm'>
							<Icon icon='HeroPlus' size='text-xl' />
						</button>

						{/* Textfield nhập liệu đẹp đẽ, phóng khoáng */}
						<input
							id='textField'
							name='textField'
							placeholder={askGptApiStatus === PENDING ? 'AI đang tạo ảnh... Vui lòng đợi' : 'Mô tả hình ảnh bạn muốn tạo...'}
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

export default ChatPhotoClient;
