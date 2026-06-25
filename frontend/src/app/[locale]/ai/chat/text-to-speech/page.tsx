'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ChatAudioClient = dynamic(() => import('@/app/[locale]/ai/chat/text-to-speech/client'), {
	ssr: false,
});

const ChatPage = () => {
	return <ChatAudioClient />;
};

export default ChatPage;
