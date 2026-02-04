import React, { useState } from 'react';
import { IoMail, IoLockClosed, IoEye, IoEyeOff } from 'react-icons/io5';
import { validateRequired, isValidEmail } from '../../utils/validators';

export default function LoginForm({ onSubmit, isLoading, error }) {
    const [formData, setFormData] = useState({
        login_id: '',
        password: '',
        remember_me: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        // Validate login_id
        const loginIdValidation = validateRequired(formData.login_id, 'Email or Username');
        if (!loginIdValidation.isValid) {
            newErrors.login_id = loginIdValidation.message;
        }

        // Validate password
        const passwordValidation = validateRequired(formData.password, 'Password');
        if (!passwordValidation.isValid) {
            newErrors.password = passwordValidation.message;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validate()) {
            onSubmit(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email or Username */}
            <div>
                <label htmlFor="login_id" className="mb-2 block text-sm font-medium text-zinc-700">
                    Email or Username
                </label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <IoMail className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                        type="text"
                        id="login_id"
                        name="login_id"
                        value={formData.login_id}
                        onChange={handleChange}
                        className={`block w-full rounded-lg border ${errors.login_id ? 'border-red-500' : 'border-zinc-300'
                            } bg-white py-3 pl-10 pr-4 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-shadow-soft)]`}
                        placeholder="Enter your email or username"
                        disabled={isLoading}
                    />
                </div>
                {errors.login_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.login_id}</p>
                )}
            </div>

            {/* Password */}
            <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-700">
                    Password
                </label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <IoLockClosed className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`block w-full rounded-lg border ${errors.password ? 'border-red-500' : 'border-zinc-300'
                            } bg-white py-3 pl-10 pr-12 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-shadow-soft)]`}
                        placeholder="Enter your password"
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600"
                        disabled={isLoading}
                    >
                        {showPassword ? <IoEyeOff className="h-5 w-5" /> : <IoEye className="h-5 w-5" />}
                    </button>
                </div>
                {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        name="remember_me"
                        checked={formData.remember_me}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-zinc-300 text-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-shadow-soft)]"
                        disabled={isLoading}
                    />
                    <span className="ml-2 text-sm text-zinc-600">Remember me</span>
                </label>
                <button
                    type="button"
                    className="text-sm font-medium text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors"
                    disabled={isLoading}
                >
                    Forgot password?
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-[var(--brand)] px-4 py-3 font-semibold text-white shadow-lg shadow-[var(--brand-shadow-soft)] transition-all hover:bg-[var(--brand-dark)] hover:shadow-xl hover:shadow-[var(--brand-shadow-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isLoading ? (
                    <span className="flex items-center justify-center">
                        <svg className="mr-2 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                    </span>
                ) : (
                    'Sign In'
                )}
            </button>
        </form>
    );
}
