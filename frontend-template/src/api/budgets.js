import api from './axios';

export const getBudgets = async () => {
    const response = await api.get('/budgets/');
    return response.data;
};

export const createBudget = async (data) => {
    const response = await api.post('/budgets/', data);
    return response.data;
};

export const getBudgetSummary = async (eventId) => {
    const response = await api.get(`/budgets/events/${eventId}/summary`);
    return response.data;
};

// Admin only usually, but good to have in wrapper
export const approveBudget = async (id, amount) => {
    const response = await api.put(`/budgets/${id}/approve`, { approved_amount: amount });
    return response.data;
};

export const rejectBudget = async (id) => {
    const response = await api.put(`/budgets/${id}/reject`);
    return response.data;
};
