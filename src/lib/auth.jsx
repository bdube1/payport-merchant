import { createContext, useContext, useState } from 'react';
import { authApi, authStorage, getCurrentUser } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(getCurrentUser());

    const login = async (email, password, rememberMe = true) => {
        const res = await authApi.login(email, password);
        const data = res.data?.data || res.data;
        authStorage.setItem('pm_token', data.token, rememberMe);
        authStorage.setItem('pm_user', JSON.stringify(data.user), rememberMe);
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        authStorage.removeItem('pm_token');
        authStorage.removeItem('pm_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
