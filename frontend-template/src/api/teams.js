import api from './axios';

export const getTeam = async (id) => {
    const response = await api.get(`/teams/${id}`);
    return response.data;
};

export const getEventTeams = async (eventId) => {
    const response = await api.get(`/teams/events/${eventId}`);
    return response.data;
};
export const approveTeam = async (id) => {
    const response = await api.put(`/teams/${id}/approve`);
    return response.data;
};

export const rejectTeam = async (id) => {
    const response = await api.put(`/teams/${id}/reject`);
    return response.data;
};
