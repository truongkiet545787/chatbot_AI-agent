import axios from 'axios';
import { AI_DEMOS_URI, HOST } from '@/constant';

export function generateAudioApiCall(data: {
	dataToPost: {
		question: string;
		model?: string;
		voice?: string;
	};
}) {
	const { dataToPost } = data;
	return axios({
		method: 'post',
		url: `${HOST}${AI_DEMOS_URI}/audio`,
		data: dataToPost,
	});
}
