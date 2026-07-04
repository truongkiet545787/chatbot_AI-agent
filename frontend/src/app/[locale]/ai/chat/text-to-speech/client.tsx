'use client';

/**
 * TRANG VĂN BẢN THÀNH GIỌNG NÓI (TEXT-TO-SPEECH)
 * --------------------------------------------------
 * Chức năng:
 * - Tiếp nhận đầu vào là một chuỗi văn bản do người dùng nhập.
 * - Sử dụng mô hình offline Kokoro-Vietnamese để sinh giọng đọc tự nhiên.
 * - Trình phát âm thanh (WaveSurfer Player) cho phép nghe trực quan.
 */

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
import Select from '@/components/form/Select';
import { ASSISTANT, CREATED, FAILED, PENDING, SUCCESSFUL, SYSTEM, USER } from '@/constant';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import { generateAudioApiCall } from '@/apiCalls/ai-demos/generateAudioApiCall';
import WaveSurferPlayer from '@/components/WaveSurferPlayer';

// Hàm giải mã chuỗi Base64 trả về từ API thành Blob nhị phân để phát Audio
const base64ToBlob = (base64String: string, mimeType = 'audio/wav') => {
	try {
		const byteCharacters = atob(base64String);
		const byteNumbers = new Array(byteCharacters.length);
		for (let i = 0; i < byteCharacters.length; i++) {
			byteNumbers[i] = byteCharacters.charCodeAt(i);
		}
		const byteArray = new Uint8Array(byteNumbers);
		return new Blob([byteArray], { type: mimeType });
	} catch (e) {
		console.error("Lỗi giải mã base64:", e);
		return null;
	}
};

const ChatAudioClient = () => {
	const [listQuestions, setListQuestions] = useState([
		{
			role: SYSTEM,
			content: 'Chào mừng bạn! Nhập văn bản tiếng Việt bên dưới để tạo giọng nói AI offline với mô hình Kokoro-Vietnamese.',
		},
	] as IChatAudio[]);

	const [askGptApiStatus, setAskGptApiStatus] = useState(CREATED);
	const [selectedVoice, setSelectedVoice] = useState<string>('diem_trinh');
	const stopGeneratingRef = useRef(false);

	const formik = useFormik({
		onSubmit(): void | Promise<never> {
			return undefined;
		},
		initialValues: {
			textField: '',
		},
	});

	const sendQuestionOnClick = (question: string) => {
		try {
			stopGeneratingRef.current = false;
			if (question) {
				formik.resetForm();
				setAskGptApiStatus(PENDING);
				setListQuestions([
					...listQuestions,
					{
						role: USER,
						content: question,
					},
				]);
				
				generateAudioApiCall({
					dataToPost: {
						question,
						model: 'kokoro',
						voice: selectedVoice,
					},
				})
					.then((res) => {
						if (res?.status === 200 && !stopGeneratingRef.current) {
							const response = res?.data;
							setAskGptApiStatus(SUCCESSFUL);
							
							const audioBlob = response?.audio ? base64ToBlob(response.audio, 'audio/wav') : null;
							const url = audioBlob ? URL.createObjectURL(audioBlob) : undefined;
							
							setListQuestions((prev) => [
								...prev,
								{
									role: ASSISTANT,
									url,
								},
							]);
						}
					})
					.catch((e) => {
						console.error("Lỗi API TTS:", e);
						setAskGptApiStatus(FAILED);
					});
			}
		} catch (err) {
			console.error(err);
			setAskGptApiStatus(FAILED);
		}
	};

	const getVoiceLabel = (voiceKey: string) => {
		const mapping: Record<string, string> = {
			diem_trinh: 'Diễm Trinh (Nữ - Truyền cảm)',
			hung_thinh: 'Hùng Thịnh (Nam)',
			mai_linh: 'Mai Linh (Nữ)',
			manh_dung: 'Mạnh Dũng (Nam - Review phim)',
			ngoc_huyen: 'Ngọc Huyền (Nữ - Kể chuyện)',
			tuan_ngoc: 'Tuấn Ngọc (Nam)',
		};
		return mapping[voiceKey] || voiceKey;
	};

	const generateChat = (questions: IChatAudio[]) => {
		let content = <div />;
		if (questions && questions?.length > 0) {
			content = (
				<AIChatContainerCommon>
					{questions?.map((question, index) => {
						const isSystemOrAssistant = question?.role === SYSTEM || question?.role === ASSISTANT;
						
						return (
							<AIChatItemContainerCommon
								key={`${question?.role}-${index}`}
								content={question?.content}
								userName={question?.role === USER ? 'You' : 'AI'}
								isAnswer={isSystemOrAssistant}>
								
								{question?.url && (
									<div className='flex flex-col gap-3 mt-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 w-full max-w-2xl'>
										<span className='text-xs font-semibold text-zinc-400 flex items-center gap-1.5'>
											<span className='w-2 h-2 rounded-full bg-purple-500 animate-pulse'></span>
											Giọng đọc: {getVoiceLabel(selectedVoice)} (Offline 82M)
										</span>
										<div className='w-full'>
											<WaveSurferPlayer url={question?.url} container={`wave-${index}`} />
										</div>
									</div>
								)}
							</AIChatItemContainerCommon>
						);
					})}
					{askGptApiStatus === PENDING && !stopGeneratingRef.current && (
						<AIChatItemContainerCommon isAnswer>
							<div className='grid grid-cols-12 items-center gap-4'>
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
										Dừng tạo
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
						Văn bản thành giọng nói (Text-To-Speech)
						<span className='text-xs font-normal px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/25'>
							Chạy Offline 100%
						</span>
					</span>
				</SubheaderLeft>
				<SubheaderRight>
					<Button
						variant='solid'
						onClick={() => {
							setListQuestions([
								{
									role: SYSTEM,
									content: 'Chào mừng bạn! Nhập văn bản tiếng Việt bên dưới để tạo giọng nói AI offline với mô hình Kokoro-Vietnamese.',
								},
							]);
							setAskGptApiStatus(CREATED);
						}}
						icon='HeroPlus'>
						Bắt đầu lại
					</Button>
				</SubheaderRight>
			</Subheader>
			<Container className='flex shrink-0 grow basis-auto flex-col pb-0'>
				
				{/* Bộ chọn giọng đọc */}
				<div className='flex flex-col sm:flex-row gap-4 p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl mb-4 max-w-2xl'>
					<div className='flex-1'>
						<label className='block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5'>
							Lựa chọn giọng nói AI (Kokoro Offline)
						</label>
						<Select
							name='selectedVoice'
							value={selectedVoice}
							onChange={(e) => setSelectedVoice(e.target.value)}
							dimension='sm'
						>
							<option value='diem_trinh'>Diễm Trinh (Nữ - Giọng chuẩn, truyền cảm)</option>
							<option value='hung_thinh'>Hùng Thịnh (Nam - Ấm áp)</option>
							<option value='mai_linh'>Mai Linh (Nữ - Trong trẻo)</option>
							<option value='manh_dung'>Mạnh Dũng (Nam - Review phim)</option>
							<option value='ngoc_huyen'>Ngọc Huyền (Nữ - Kể chuyện)</option>
							<option value='tuan_ngoc'>Tuấn Ngọc (Nam - Bản tin)</option>
						</Select>
					</div>
				</div>

				{generateChat(listQuestions)}
				
				<AIChatInputContainerCommon>
					<FieldWrap
						firstSuffix={
							<Button
								icon='HeroPlus'
								variant={formik.values?.textField ? 'default' : 'solid'}
								rounded='rounded'
								className='me-2'
								aria-label='Upload file'
							/>
						}
						lastSuffix={
							formik.values?.textField ? (
								<Button
									className='ms-2'
									variant='solid'
									onClick={() => sendQuestionOnClick(formik.values?.textField)}
									rounded='rounded'
									icon='HeroPaperAirplane'>
									Gửi
								</Button>
							) : (
								<Button
									className='ms-2'
									icon='HeroMicrophone'
									aria-label='Speaking'
								/>
							)
						}>
						<Input
							id='textField'
							name='textField'
							dimension='xl'
							placeholder='Nhập văn bản cần thuyết minh bằng tiếng Việt...'
							onChange={formik.handleChange}
							value={formik.values.textField}
							onKeyDown={handleKeyDown}
						/>
					</FieldWrap>
				</AIChatInputContainerCommon>
			</Container>
		</PageWrapper>
	);
};

export default ChatAudioClient;
