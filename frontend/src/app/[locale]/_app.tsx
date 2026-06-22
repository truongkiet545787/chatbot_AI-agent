'use client';

import React, { ReactNode } from 'react';
import useFontSize from '@/hooks/useFontSize';
import useMounted from '@/hooks/useMounted';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import getOS from '@/utils/getOS.util';

const AppWrapper = ({ children }: { children: ReactNode }) => {
	const { fontSize } = useFontSize();
	const { mounted } = useMounted();
	dayjs.extend(localizedFormat);

	getOS();

	return (
		<>
			{mounted && <style>{`:root {font-size: ${fontSize}px}`}</style>}
			{children}
		</>
	);
};

export default AppWrapper;
