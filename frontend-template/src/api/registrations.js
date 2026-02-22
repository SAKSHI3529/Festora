import api from './axios';

export const createRegistration = async (data) => {
    const response = await api.post('/registrations/', data);
    return response.data;
};

export const getMyRegistrations = async () => {
    const response = await api.get('/registrations/my');
    return response.data;
};

export const cancelRegistration = async (id) => {
    const response = await api.delete(`/registrations/${id}`);
    return response.data;
};

export const getMyTeams = async () => {
    const response = await api.get('/registrations/my-teams');
    return response.data;
};

export const getEventParticipants = async (eventId) => {
    const response = await api.get(`/events/${eventId}/participants`);
    return response.data;
};

export const approveRegistration = async (id) => {
    const response = await api.put(`/registrations/${id}/approve`);
    return response.data;
};

export const rejectRegistration = async (id) => {
    const response = await api.put(`/registrations/${id}/reject`);
    return response.data;
};

