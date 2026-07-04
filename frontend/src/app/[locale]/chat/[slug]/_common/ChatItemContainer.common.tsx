import React, { FC, HTMLAttributes, ReactNode } from 'react';
import classNames from 'classnames';
import Card, { CardBody, CardFooter, CardFooterChild } from '@/components/ui/Card';
import Avatar from '@/components/Avatar';
import { StaticImageData } from 'next/image';
import { motion } from 'framer-motion';

interface IChatItemContainerCommonProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	className?: string;
	isAnswer?: boolean;
	userImage?: string | StaticImageData;
	userName: string;
}
const ChatItemContainerCommon: FC<IChatItemContainerCommonProps> = (props) => {
	const { children, className, isAnswer = false, userImage, userName, ...rest } = props;
	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ type: 'spring', stiffness: 200, damping: 22 }}
			className={classNames('col-span-8 flex flex-col', { 'col-start-5 items-end': !isAnswer }, className)}
			{...rest}>
			<Card
				className={classNames('w-full border-2 transition-all duration-300 shadow-sm', {
					'!bg-zinc-100 dark:!bg-zinc-800/60 !border-zinc-200 dark:!border-zinc-700/60 rounded-2xl rounded-tl-none text-zinc-800 dark:text-zinc-200': isAnswer,
					'!bg-blue-500 dark:!bg-blue-600 !border-blue-600/30 rounded-2xl rounded-tr-none text-white shadow-md shadow-blue-500/10': !isAnswer,
				})}>
				<CardBody className='pb-8 pt-4 px-4 font-normal text-sm leading-relaxed'>{children}</CardBody>
				<CardFooter className='relative !p-0'>
					<CardFooterChild />
					<CardFooterChild>
						<Avatar
							src={userImage}
							className={classNames('absolute -top-6 border-2 border-white dark:border-zinc-900 shadow-md', {
								'start-6': isAnswer,
								'end-6': !isAnswer,
							})}
							name={userName}
							rounded='rounded-xl'
						/>
					</CardFooterChild>
				</CardFooter>
			</Card>
		</motion.div>
	);
};

export default ChatItemContainerCommon;
