import api from './axios';

export const getDashboardStats = async () => {
    const response = await api.get('/reports/dashboard');
    return response.data;
};

export const getEventAnalytics = async (eventId) => {
    const response = await api.get(`/reports/events/${eventId}/analytics`);
    return response.data;
};

export const exportParticipants = async (eventId) => {
    const response = await api.get(`/reports/events/${eventId}/participants/export`, {
        responseType: 'blob', // Important for file download
    });
    return response.data;
};

export const exportResults = async (eventId) => {
    const response = await api.get(`/reports/events/${eventId}/results/export`, {
        responseType: 'blob',
    });
    return response.data;
};
