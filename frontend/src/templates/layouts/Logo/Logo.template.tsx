import React, { FC, HTMLAttributes } from 'react';

type ILogoTemplateProps = HTMLAttributes<HTMLOrSVGElement>;
const LogoTemplate: FC<ILogoTemplateProps> = (props) => {
	const { ...rest } = props;
	return (
		<div {...rest} className={`flex items-center justify-start ${props.className || ''}`}>
			<span className='font-extrabold text-2xl tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400'>
				Kinal
			</span>
		</div>
	);
};

export default LogoTemplate;
