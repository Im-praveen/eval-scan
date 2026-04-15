import { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('eval_user');
            return stored ? JSON.parse(stored) : null;
        } catch { return null; }
    });
    const [loading, setLoading] = useState(false);

    const login = async (email, password) => {
        setLoading(true);
        try {
            const { data } = await client.post('/auth/login', { email, password });
            localStorage.setItem('eval_token', data.token);
            localStorage.setItem('eval_user', JSON.stringify(data.user));
            setUser(data.user);
            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.error || 'Login failed';
            return { success: false, error: msg };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('eval_token');
        localStorage.removeItem('eval_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
