import axios from 'axios';
import { AI_DEMOS_URI, HOST } from '@/constant';

export function postQuestionsApiCall(data: {
	dataToPost: {
		messages: IChat[];
	};
}) {
	const { dataToPost } = data;
	return axios({
		method: 'post',
		url: `${HOST}/chat`,
		data: dataToPost,
	});
}
