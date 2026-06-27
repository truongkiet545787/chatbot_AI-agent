import axios from 'axios';
import { AI_DEMOS_URI, HOST } from '@/constant';

export function segmentSamApiCall(data: {
	dataToPost: {
		image: string;
		x: number;
		y: number;
		display_width: number;
		display_height: number;
	};
}) {
	const { dataToPost } = data;
	return axios({
		method: 'post',
		url: `${HOST}${AI_DEMOS_URI}/segment-sam`,
		data: dataToPost,
	});
}
