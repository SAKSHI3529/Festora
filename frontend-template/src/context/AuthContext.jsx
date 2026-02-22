import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';

export const AuthContext = createContext(null);

/**
 * Normalize a role value to a clean lowercase string.
 * Handles all formats the backend might return:
 *   "admin", "ADMIN", "UserRole.ADMIN", "UserRole.admin"
 */
const normalizeRole = (rawRole) => {
    if (!rawRole) return '';
    const s = String(rawRole).toLowerCase().trim();
    // Strip any "userrole." prefix that Pydantic enum repr might produce
    return s.replace(/^userrole\./, '');
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Helper: normalize role on whatever user object we store
    const normalizeUser = (u) => {
        if (!u) return null;
        return { ...u, role: normalizeRole(u.role) };
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 < Date.now()) {
                    // Expired
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                } else {
                    // Prefer saved full user from /auth/me over JWT payload
                    const saved = localStorage.getItem('user');
                    if (saved) {
                        setUser(normalizeUser(JSON.parse(saved)));
                    } else {
                        // Fallback: fetch fresh from /auth/me
                        api.get('/auth/me', {
                            headers: { Authorization: `Bearer ${token}` }
                        })
                        .then(res => {
                            const u = normalizeUser(res.data);
                            localStorage.setItem('user', JSON.stringify(u));
                            setUser(u);
                        })
                        .catch(() => {
                            localStorage.removeItem('token');
                        })
                        .finally(() => setLoading(false));
                        return; // loading will be set inside .finally
                    }
                }
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const tokenResponse = await api.post('/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const { access_token } = tokenResponse.data;
        localStorage.setItem('token', access_token);

        // ALWAYS fetch /auth/me for the authoritative user profile including role
        const meResponse = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const userData = normalizeUser(meResponse.data);

        console.log('[AuthContext] /auth/me raw:', meResponse.data);
        console.log('[AuthContext] normalized user:', userData);

        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
