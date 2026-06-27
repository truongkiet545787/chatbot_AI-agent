'use client';

import axios from 'axios';

if (typeof window !== 'undefined') {
	axios.interceptors.request.use((config) => {
		if (config.headers) {
			(config.headers as any)['X-Pinggy-No-Screen'] = 'true';
		}
		return config;
	}, (error) => {
		return Promise.reject(error);
	});
}


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
