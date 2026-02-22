import api from './axios';

// Submit a score
export const submitScore = async (data) => {
    const response = await api.post('/scores/', data);
    return response.data;
};

// Get participants for scoring
export const getEventParticipants = async (eventId) => {
    const response = await api.get(`/events/${eventId}/participants`);
    return response.data;
};

// Get teams for scoring
export const getEventTeams = async (eventId) => {
    const response = await api.get(`/teams/events/${eventId}`);
    return response.data;
};
