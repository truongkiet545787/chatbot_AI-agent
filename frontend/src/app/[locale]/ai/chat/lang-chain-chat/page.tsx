import React from 'react';
import ChatBotClient from '@/app/[locale]/ai/chat/lang-chain-chat/client';

export const dynamic = 'force-dynamic';

const ChatPage = () => {
	return <ChatBotClient />;
};

export default ChatPage;

