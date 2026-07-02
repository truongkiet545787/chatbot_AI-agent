import axios from 'axios';
import { AI_DEMOS_URI, HOST } from '@/constant';

export interface IChat {
	role: string;
	content: string;
}

export function postQuestionsApiCall(data: {
	dataToPost: {
		sessionId?: string;
		message?: IChat;
		messages?: IChat[];
	};
}) {
	const { dataToPost } = data;
	return axios({
		method: 'post',
		url: `${HOST}/chat`,
		data: dataToPost,
	});
}

