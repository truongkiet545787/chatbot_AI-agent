'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const SpeechRecognitionClient = dynamic(() => import('./client'), {
	ssr: false,
});

const SpeechRecognitionPage = () => {
	return <SpeechRecognitionClient />;
};

export default SpeechRecognitionPage;
