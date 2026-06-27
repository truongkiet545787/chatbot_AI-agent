import React, { FC, HTMLAttributes, ReactNode, memo } from 'react';
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

const AIChatItemContainerCommon: FC<IAIChatItemContainerCommonProps> = memo((props) => {
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
				'col-span-12 w-full flex items-start gap-4 mb-6 animate-chat-entry',
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
						// Nền và chữ cho User (Premium Gradient)
						'bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-550 hover:to-violet-550 text-white rounded-tr-none shadow-md shadow-indigo-500/10 hover:shadow-lg hover:shadow-indigo-500/15 duration-200': !isAnswer,
						// Nền và chữ cho AI (Glassmorphic soft zinc)
						'bg-zinc-50/90 dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-zinc-800/80 rounded-tl-none shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700/80 duration-200': isAnswer,
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
						showLineNumbers={false}
					/>
				)}
				{children}
			</div>

			{/* User Avatar (Hiển thị bên phải nếu là User - Premium Gradient Border) */}
			{!isAnswer && (
				<div className='w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center shrink-0 shadow-md border border-sky-400/20'>
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
});

AIChatItemContainerCommon.displayName = 'AIChatItemContainerCommon';

export default AIChatItemContainerCommon;
