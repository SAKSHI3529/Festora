import api from './axios';

export const generateCertificates = async (eventId) => {
    const response = await api.post(`/certificates/events/${eventId}/generate`);
    return response.data;
};

export const getMyCertificates = async () => {
    const response = await api.get('/certificates/my');
    return response.data;
};

export const getEventCertificates = async (eventId) => {
    const response = await api.get(`/certificates/events/${eventId}`);
    return response.data;
};
