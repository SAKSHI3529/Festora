import api from './axios';

// Get all audit logs (Admin)
// Supports filtering by query params: ?module=X&user_id=Y&action=Z
export const getAuditLogs = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.module) params.append('module', filters.module);
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.action) params.append('action', filters.action);
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    
    // Note: backend currently supports module and user_id. 
    // If backend doesn't support other filters yet, we might need to filter client-side 
    // or update backend. Let's start with what backend has and filter rest client side if needed.
    
    const response = await api.get(`/audit/?${params.toString()}`);
    return response.data;
};

export const getMyAuditLogs = async () => {
    const response = await api.get('/audit/my');
    return response.data;
};

export const getEventAuditLogs = async (eventId) => {
    const response = await api.get(`/audit/events/${eventId}`);
    return response.data;
};
