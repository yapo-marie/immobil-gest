import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_IDLE_MAX = 60 * 60 * 1000; // 1h d'inactivité

function parseJwt(token: string | null) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        const payload = JSON.parse(atob(parts[1]));
        return payload;
    } catch {
        return null;
    }
}

function setSessionCookie(enabled: boolean) {
    if (enabled) {
        document.cookie = `locatus_session=1; Max-Age=${60 * 60}; path=/`;
    } else {
        document.cookie = 'locatus_session=; Max-Age=0; path=/';
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [lastActivity, setLastActivity] = useState<number>(Date.now());

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const payload = parseJwt(storedToken);
        const expMs = payload?.exp ? payload.exp * 1000 : null;
        if (expMs && expMs < Date.now()) {
            logout();
            return;
        }
        if (storedToken) {
            setToken(storedToken);
            setSessionCookie(true);
            fetchUser();
        }
    }, [token]);

    useEffect(() => {
        const handleActivity = () => {
            setLastActivity(Date.now());
        };
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        const interval = setInterval(() => {
            const payload = parseJwt(token);
            const expMs = payload?.exp ? payload.exp * 1000 : null;
            if ((expMs && expMs < Date.now()) || Date.now() - lastActivity > SESSION_IDLE_MAX) {
                logout();
            }
        }, 30000);
        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            clearInterval(interval);
        };
    }, [token, lastActivity]);

    const fetchUser = async () => {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            logout();
        }
    };

    const login = async (email: string, password: string) => {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const response = await api.post('/auth/login', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        const { access_token } = response.data;
        localStorage.setItem('token', access_token);
        setToken(access_token);
        setSessionCookie(true);
        setLastActivity(Date.now());
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setSessionCookie(false);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
