import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/auth/LoginForm';

import logo from '../assets/TASConnect_Logo.png';

export default function AuthPage() {

    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading, error, isAuthenticated } = useAuth();

    const from = location.state?.from?.pathname || '/chat';

    // Redirect if already authenticated
    React.useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    const handleLogin = async (credentials) => {
        try {
            await login(credentials);
            navigate(from, { replace: true });
        } catch (err) {
            // Error is handled by context
            console.error('Login failed:', err);
        }
    };



    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[var(--brand-lighter)] via-zinc-50 to-white px-4 py-12">
            <div className="w-full max-w-md">
                {/* Logo/Brand */}
                <div className="mb-4 text-center fade-slide-in">
                    <img
                        src={logo}
                        alt="TAS Connect"
                        className="mx-auto h-12 w-auto"
                    />
                    <p className="text-sm text-zinc-600">
                        Welcome back! Sign in to continue.
                    </p>
                </div>

                {/* Auth Card */}
                <div className="rounded-2xl bg-white p-8 shadow-xl shadow-zinc-200/50 fade-slide-in">
                    {/* Forms */}
                    <div className="fade-slide-in max-h-[50vh] overflow-y-auto px-1 custom-scrollbar">
                        <LoginForm
                            onSubmit={handleLogin}
                            isLoading={isLoading}
                            error={error}
                        />
                    </div>
                </div>

                {/* Additional Info */}
                <p className="mt-4 text-center text-xs text-zinc-500">
                    By continuing, you agree to TAS Connect's Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
}
