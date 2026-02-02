import React, { createContext, useContext, useState, useEffect } from 'react';
import { Staff } from '../types';
import { supabase } from '../supabaseClient';

interface AuthContextType {
    user: Staff | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    checkPermission: (path: string, level?: 'view' | 'edit') => boolean;
    isLoading: boolean;
    updateUserSession: (updatedUser: Staff) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default admin user for initialization
const DEFAULT_ADMIN: Staff = {
    id: 'admin-001',
    name: 'Administrador',
    role: 'SuperAdmin',
    status: 'Activo',
    location: 'Central',
    avatar: 'https://ui-avatars.com/api/?name=Admin+Sowic&background=f97316&color=fff',
    assignedAssets: [],
    email: 'admin@sowic.com',
    auth: {
        username: 'Admin',
        password: 'Admin',
        role: 'SuperAdmin',
        permissions: {}, // SuperAdmin has implicit access to everything
        canManageUsers: true,
    }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Staff | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize from localStorage
    useEffect(() => {
        const storedSession = localStorage.getItem('sowic_session');
        if (storedSession) {
            setUser(JSON.parse(storedSession));
        }
        setIsLoading(false);
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (error || !data) {
                console.error("Login verification failed:", error);
                return false;
            }

            const authenticatedUser: Staff = {
                ...data,
                auth: {
                    username: data.username,
                    password: data.password,
                    role: (data.auth_role as any) || (['SuperAdmin', 'Admin', 'User', 'Viewer'].includes(data.role) ? data.role : 'User'), // Fallback for transition
                    permissions: data.permissions || {},
                    canManageUsers: data.auth_role === 'SuperAdmin' || data.auth_role === 'Admin' || data.role === 'SuperAdmin'
                }
            };

            setUser(authenticatedUser);
            localStorage.setItem('sowic_session', JSON.stringify(authenticatedUser));
            return true;
        } catch (error) {
            console.error("Login Error", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('sowic_session');
    };

    const updateUserSession = (updatedUser: Staff) => {
        if (user && user.id === updatedUser.id) {
            setUser(updatedUser);
            localStorage.setItem('sowic_session', JSON.stringify(updatedUser));
        }
    };

    const checkPermission = (path: string, level: 'view' | 'edit' = 'view'): boolean => {
        if (!user || !user.auth) return false;

        // SuperAdmin has access to everything
        if (user.auth.role === 'SuperAdmin') return true;

        // Normalize path to remove trailing slashes or sub-routes
        // e.g., /maintenance/ot/123 -> /maintenance
        const rootPath = '/' + path.split('/')[1];

        // Always allow dashboard
        if (rootPath === '/' || path === '/') return true;

        // Check specific module access
        const permission = user.auth.permissions[rootPath] || user.auth.permissions[path];

        if (!permission) return false;

        // If 'view' is requested, any permission ('view' or 'edit') is sufficient
        if (level === 'view') return true;

        // If 'edit' is requested, must have 'edit' permission
        return permission === 'edit';
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, checkPermission, isLoading, updateUserSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
