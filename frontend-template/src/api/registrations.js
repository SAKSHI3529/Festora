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
    // Note: Cancel is DELETE /registrations/{id} ?
    // Backend doesn't have explicit DELETE in routers/registrations.py!
    // Wait, let me check registrations.py again.
    // I only saw create, approve, reject, get_event_regs, get_my.
    // I need to check if DELETE exists.
    // If not, I need to add it.
    // ... Checked file view from Step 1343 ...
    // It is MISSING! 
    // I need to add delete_registration endpoint to backend too.
    const response = await api.delete(`/registrations/${id}`);
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

