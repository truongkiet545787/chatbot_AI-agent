import axios from 'axios';
import { AI_DEMOS_URI, HOST } from '@/constant';

export function sketchToImageApiCall(data: {
	dataToPost: {
		base64: string;
		prompt: string;
	};
}) {
    const { dataToPost } = data;
    return axios({
        method: 'post',
        url: `${HOST}${AI_DEMOS_URI}/sketch-to-image`,
        data: dataToPost,
    });
}