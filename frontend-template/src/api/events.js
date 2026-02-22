import api from './axios';

export const getEvents = async () => {
    const response = await api.get('/events/');
    return response.data;
};

export const getEvent = async (id) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
};


export const createEvent = async (eventData) => {
    const response = await api.post('/events/', eventData);
    return response.data;
};

// Results
export const getEventResults = async (eventId) => {
    const response = await api.get(`/scores/${eventId}/results`);
    return response.data;
};

// Participants & Attendance
export const getParticipants = async (eventId, department = null) => {
    let url = `/events/${eventId}/participants`;
    if (department) url += `?department=${encodeURIComponent(department)}`;
    const response = await api.get(url);
    return response.data;
};

export const markAttendance = async (eventId, studentId, status) => {
    const response = await api.post(`/events/${eventId}/attendance`, { student_id: studentId, status });
    return response.data;
};

export const getAttendance = async (eventId) => {
    const response = await api.get(`/events/${eventId}/attendance`);
    return response.data;
};

export const updateEvent = async (id, eventData) => {
    const response = await api.put(`/events/${id}`, eventData);
    return response.data;
};

export const deleteEvent = async (id) => {
    await api.delete(`/events/${id}`);
};

export const uploadRulebook = async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/events/${id}/upload-rulebook`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};
