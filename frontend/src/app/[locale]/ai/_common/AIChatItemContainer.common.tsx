import React, { FC, HTMLAttributes, ReactNode } from 'react';
import classNames from 'classnames';
import Avatar from '@/components/Avatar';
import { UserBrainThumb } from '@/assets/images';
import { StaticImageData } from 'next/image';
import MdViewer from '@/components/MdViewer';

interface IAIChatItemContainerCommonProps extends HTMLAttributes<HTMLDivElement> {
	children?: ReactNode;
	className?: string;
	isAnswer?: boolean;
	userImage?: string | StaticImageData;
	userName?: string;
	content?: string;
}

const AIChatItemContainerCommon: FC<IAIChatItemContainerCommonProps> = (props) => {
	const {
		content,
		children,
		className,
		isAnswer = false,
		userImage,
		userName = 'AI',
		...rest
	} = props;

	return (
		<div
			className={classNames(
				'col-span-12 w-full flex items-start gap-4 mb-6',
				{ 'justify-end': !isAnswer, 'justify-start': isAnswer },
				className,
			)}
			{...rest}>
			
			{/* AI Avatar (Hiển thị bên trái nếu là AI) */}
			{isAnswer && (
				<div className='w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shrink-0 border border-indigo-400/20'>
					<Avatar
						src={UserBrainThumb}
						className='w-full h-full'
						name={userName}
						rounded='rounded-xl'
					/>
				</div>
			)}

			{/* Bong bóng tin nhắn */}
			<div
				className={classNames(
					'max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed transition-all duration-300',
					{
						// Nền và chữ cho User
						'bg-indigo-600 dark:bg-indigo-700 text-white rounded-tr-none shadow-indigo-900/10': !isAnswer,
						// Nền và chữ cho AI (Glassmorphic)
						'bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-850 rounded-tl-none': isAnswer,
					}
				)}>
				
				{/* Nội dung tin nhắn (hỗ trợ Markdown) */}
				{content && (
					<MdViewer 
						mdFile={content} 
						className={classNames(
							'whitespace-pre-wrap markdown-body',
							{
								'text-white prose-invert': !isAnswer,
								'text-zinc-800 dark:text-zinc-200': isAnswer
							}
						)} 
					/>
				)}
				{children}
			</div>

			{/* User Avatar (Hiển thị bên phải nếu là User) */}
			{!isAnswer && (
				<div className='w-9 h-9 rounded-xl bg-slate-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-300/30 dark:border-zinc-700/30'>
					<Avatar
						src={userImage}
						className='w-full h-full'
						name={userName}
						rounded='rounded-xl'
					/>
				</div>
			)}

		</div>
	);
};

export default AIChatItemContainerCommon;
