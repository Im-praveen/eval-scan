import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const client = axios.create({
    baseURL: API_BASE
});

// Attach JWT on every request
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('eval_token');
    if (token) {
        if (config.headers && typeof config.headers.set === 'function') {
            config.headers.set('Authorization', `Bearer ${token}`);
        } else {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Auto logout on 401
client.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('eval_token');
            localStorage.removeItem('eval_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default client;
