import axios from 'axios';
import { AI_DEMOS_URI, HOST } from '@/constant';

export function replaceObjectApiCall(data) {
    const { dataToPost } = data;
    return axios({
        method: 'post',
        url: `${HOST}/replace-object`,
        data: dataToPost,
    });
}