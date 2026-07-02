import axios from 'axios';
import { HOST } from '@/constant';

export function uploadRAGApiCall(formData: FormData) {
	return axios({
		method: 'post',
		url: `${HOST}/api/rag/upload`,
		data: formData,
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	});
}

export function clearRAGApiCall(data: { sessionId: string }) {
	return axios({
		method: 'post',
		url: `${HOST}/api/rag/clear`,
		data: {
			sessionId: data.sessionId,
		},
	});
}
