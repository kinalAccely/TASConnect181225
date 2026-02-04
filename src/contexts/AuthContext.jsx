import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as loginService, register as registerService, logout as logoutService, getCurrentUser, isAuthenticated as checkAuth } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check authentication status on mount
    useEffect(() => {
        const initAuth = () => {
            const authenticated = checkAuth();
            setIsAuthenticated(authenticated);

            if (authenticated) {
                const currentUser = getCurrentUser();
                console.log('🚀 AuthContext - Initial user load:', currentUser);
                setUser(currentUser);
            }

            setIsLoading(false);
        };

        initAuth();
    }, []);

    /**
     * Login user
     */
    const login = async (credentials) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await loginService(credentials);

            // Always get user from storage after login
            const currentUser = getCurrentUser();
            console.log('🔑 AuthContext - User after login:', currentUser);
            setUser(currentUser);
            setIsAuthenticated(true);

            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Register new user
     */
    const register = async (userData) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await registerService(userData);

            // Always get user from storage after registration
            const currentUser = getCurrentUser();
            console.log('📝 AuthContext - User after registration:', currentUser);
            setUser(currentUser);
            setIsAuthenticated(true);

            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Logout user
     */
    const logout = async (invalidateAll = false) => {
        setIsLoading(true);
        setError(null);

        try {
            await logoutService(invalidateAll);

            setUser(null);
            setIsAuthenticated(false);
        } catch (err) {
            setError(err.message);
            // Still clear local state even if API call fails
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Clear error
     */
    const clearError = () => {
        setError(null);
    };

    const value = {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}
