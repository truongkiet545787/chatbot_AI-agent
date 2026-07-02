import axios from 'axios';
import { HOST } from '@/constant';

export interface IChat {
	role: string;
	content: string;
}

export function postRAGQuestionsApiCall(data: {
	dataToPost: {
		sessionId?: string;
		message?: IChat;
		messages?: IChat[];
	};
}) {
	const { dataToPost } = data;
	return axios({
		method: 'post',
		url: `${HOST}/api/rag/chat`,
		data: dataToPost,
	});
}
