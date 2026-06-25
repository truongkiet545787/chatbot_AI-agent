import axios from 'axios';
import { AI_DEMOS_URI, HOST } from '@/constant';

export function replaceObjectApiCall(data: {
	dataToPost: {
		base64Original: string;
		base64Masked: string;
		prompt: string;
	};
}) {
    const { dataToPost } = data;
    return axios({
        method: 'post',
        url: `${HOST}${AI_DEMOS_URI}/replace-object`,
        data: dataToPost,
    });
}