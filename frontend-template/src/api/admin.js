import api from './axios';

export const getDashboardStats = async () => {
    const response = await api.get('/reports/dashboard');
    return response.data;
};

// Users
export const getUsers = async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
};

export const createUser = async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
};

// Event Related (Fetching users by role for assignments)
export const getUsersByRole = async (role) => {
    const response = await api.get('/users');
    return response.data.filter(u => u.role === role);
};

export const deleteUser = async (userId) => {
    await api.delete(`/users/${userId}`);
};

