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

// Get judge's own scores for an event
export const getMyScores = async (eventId) => {
    const response = await api.get(`/scores/${eventId}/my-scores`);
    return response.data;
};

// Update an existing score
export const updateScore = async (scoreId, data) => {
    const response = await api.put(`/scores/${scoreId}`, data);
    return response.data;
};

// Get results for an event
export const getResults = async (eventId) => {
    const response = await api.get(`/scores/${eventId}/results`);
    return response.data;
};
