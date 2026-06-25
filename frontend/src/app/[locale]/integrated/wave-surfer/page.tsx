'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const WaveSurferClient = dynamic(() => import('@/app/[locale]/integrated/wave-surfer/client'), {
	ssr: false,
});

const WaveSurferPage = () => {
	return <WaveSurferClient />;
};

export default WaveSurferPage;
