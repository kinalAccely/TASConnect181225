import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';

export default function AuthPage() {
    const [activeTab, setActiveTab] = useState('login');
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register, isLoading, error, clearError, isAuthenticated } = useAuth();

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

    const handleRegister = async (userData) => {
        try {
            await register(userData);
            navigate(from, { replace: true });
        } catch (err) {
            // Error is handled by context
            console.error('Registration failed:', err);
        }
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        clearError();
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[var(--brand-lighter)] via-zinc-50 to-white px-4 py-12">
            <div className="w-full max-w-md">
                {/* Logo/Brand */}
                <div className="mb-8 text-center fade-slide-in">
                    <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand)] shadow-lg shadow-[var(--brand-shadow-strong)]">
                        <span className="text-2xl font-bold text-white">TAS</span>
                    </div>
                    <h1 className="text-3xl font-bold text-zinc-900">TAS Connect</h1>
                    <p className="mt-2 text-sm text-zinc-600">
                        {activeTab === 'login'
                            ? 'Welcome back! Sign in to continue.'
                            : 'Create your account to get started.'}
                    </p>
                </div>

                {/* Auth Card */}
                <div className="rounded-2xl bg-white p-8 shadow-xl shadow-zinc-200/50 fade-slide-in">
                    {/* Tabs */}
                    <div className="mb-6 flex rounded-lg bg-zinc-100 p-1">
                        <button
                            onClick={() => switchTab('login')}
                            className={`flex-1 rounded-md px-4 py-2.5 text-sm font-semibold transition-all ${activeTab === 'login'
                                ? 'bg-white text-[var(--brand)] shadow-sm'
                                : 'text-zinc-600 hover:text-zinc-900'
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => switchTab('register')}
                            className={`flex-1 rounded-md px-4 py-2.5 text-sm font-semibold transition-all ${activeTab === 'register'
                                ? 'bg-white text-[var(--brand)] shadow-sm'
                                : 'text-zinc-600 hover:text-zinc-900'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Forms */}
                    <div className="fade-slide-in">
                        {activeTab === 'login' ? (
                            <LoginForm
                                onSubmit={handleLogin}
                                isLoading={isLoading}
                                error={error}
                            />
                        ) : (
                            <RegisterForm
                                onSubmit={handleRegister}
                                isLoading={isLoading}
                                error={error}
                            />
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center text-sm text-zinc-600">
                        {activeTab === 'login' ? (
                            <p>
                                Don't have an account?{' '}
                                <button
                                    onClick={() => switchTab('register')}
                                    className="font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors"
                                >
                                    Sign up
                                </button>
                            </p>
                        ) : (
                            <p>
                                Already have an account?{' '}
                                <button
                                    onClick={() => switchTab('login')}
                                    className="font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors"
                                >
                                    Sign in
                                </button>
                            </p>
                        )}
                    </div>
                </div>

                {/* Additional Info */}
                <p className="mt-6 text-center text-xs text-zinc-500">
                    By continuing, you agree to TAS Connect's Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
}
