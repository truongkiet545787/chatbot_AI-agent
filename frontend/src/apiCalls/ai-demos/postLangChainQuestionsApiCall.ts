import axios from 'axios';
import { AI_DEMOS_URI, HOST } from '@/constant';

export function postLangChainQuestionsApiCall(data: {
	dataToPost: {
		sessionId?: string;
		message: {
			role: string;
			content: string;
		};
	};
}) {
	const { dataToPost } = data;
	return axios({
		method: 'post',
		url: `${HOST}/chat`,
		data: dataToPost,
	});
}

