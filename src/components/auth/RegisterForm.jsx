import React, { useState } from 'react';
import { IoMail, IoLockClosed, IoPerson, IoEye, IoEyeOff, IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';
import { validateRequired, isValidEmail, validateUsername, validatePassword } from '../../utils/validators';

export default function RegisterForm({ onSubmit, isLoading, error }) {
    const [formData, setFormData] = useState({
        username: '',
        display_name: '',
        email: '',
        password: '',
        confirm_password: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [passwordStrength, setPasswordStrength] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

        // Update password strength indicator
        if (name === 'password') {
            const strength = validatePassword(value);
            setPasswordStrength(strength);
        }
    };

    const validate = () => {
        const newErrors = {};

        // Validate username
        const usernameValidation = validateUsername(formData.username);
        if (!usernameValidation.isValid) {
            newErrors.username = usernameValidation.message;
        }

        // Validate display name
        const displayNameValidation = validateRequired(formData.display_name, 'Display name');
        if (!displayNameValidation.isValid) {
            newErrors.display_name = displayNameValidation.message;
        }

        // Validate email (optional but must be valid if provided)
        if (formData.email && !isValidEmail(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Validate password
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
            newErrors.password = passwordValidation.message;
        }

        // Validate password confirmation
        if (formData.password !== formData.confirm_password) {
            newErrors.confirm_password = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validate()) {
            // Remove confirm_password before sending to API
            const { confirm_password, ...submitData } = formData;
            onSubmit(submitData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
                <label htmlFor="username" className="mb-2 block text-sm font-medium text-zinc-700">
                    Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <IoPerson className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className={`block w-full rounded-lg border ${errors.username ? 'border-red-500' : 'border-zinc-300'
                            } bg-white py-2.5 pl-10 pr-4 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-shadow-soft)]`}
                        placeholder="Choose a username"
                        disabled={isLoading}
                    />
                </div>
                {errors.username && (
                    <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
            </div>

            {/* Display Name */}
            <div>
                <label htmlFor="display_name" className="mb-2 block text-sm font-medium text-zinc-700">
                    Display Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <IoPerson className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                        type="text"
                        id="display_name"
                        name="display_name"
                        value={formData.display_name}
                        onChange={handleChange}
                        className={`block w-full rounded-lg border ${errors.display_name ? 'border-red-500' : 'border-zinc-300'
                            } bg-white py-2.5 pl-10 pr-4 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-shadow-soft)]`}
                        placeholder="Your full name"
                        disabled={isLoading}
                    />
                </div>
                {errors.display_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>
                )}
            </div>

            {/* Email */}
            <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-700">
                    Email <span className="text-zinc-400 text-xs">(optional)</span>
                </label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <IoMail className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`block w-full rounded-lg border ${errors.email ? 'border-red-500' : 'border-zinc-300'
                            } bg-white py-2.5 pl-10 pr-4 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-shadow-soft)]`}
                        placeholder="your.email@example.com"
                        disabled={isLoading}
                    />
                </div>
                {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
            </div>

            {/* Password */}
            <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-700">
                    Password <span className="text-red-500">*</span>
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
                            } bg-white py-2.5 pl-10 pr-12 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-shadow-soft)]`}
                        placeholder="Create a strong password"
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
                {passwordStrength && formData.password && (
                    <div className="mt-1 flex items-center text-xs">
                        {passwordStrength.isValid ? (
                            <IoCheckmarkCircle className="mr-1 h-4 w-4 text-green-600" />
                        ) : (
                            <IoCloseCircle className="mr-1 h-4 w-4 text-red-600" />
                        )}
                        <span className={passwordStrength.isValid ? 'text-green-600' : 'text-red-600'}>
                            {passwordStrength.message}
                        </span>
                    </div>
                )}
                {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
            </div>

            {/* Confirm Password */}
            <div>
                <label htmlFor="confirm_password" className="mb-2 block text-sm font-medium text-zinc-700">
                    Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <IoLockClosed className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirm_password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        className={`block w-full rounded-lg border ${errors.confirm_password ? 'border-red-500' : 'border-zinc-300'
                            } bg-white py-2.5 pl-10 pr-12 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-shadow-soft)]`}
                        placeholder="Confirm your password"
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600"
                        disabled={isLoading}
                    >
                        {showConfirmPassword ? <IoEyeOff className="h-5 w-5" /> : <IoEye className="h-5 w-5" />}
                    </button>
                </div>
                {errors.confirm_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
                )}
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
                        Creating account...
                    </span>
                ) : (
                    'Create Account'
                )}
            </button>
        </form>
    );
}
