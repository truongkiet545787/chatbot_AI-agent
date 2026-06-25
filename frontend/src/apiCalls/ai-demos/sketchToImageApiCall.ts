import axios from 'axios';
import { AI_DEMOS_URI, HOST } from '@/constant';

export function sketchToImageApiCall(data) {
    const { dataToPost } = data;
    return axios({
        method: 'post',
        url: `${HOST}/sketch-to-image`,
        data: dataToPost,
    });
}