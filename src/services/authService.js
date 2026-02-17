/**
 * Authentication Service - Handles all auth-related API calls
 */

import { storeTokens, storeUser, getAccessToken, getRefreshToken, clearTokens } from '../utils/tokenManager';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Normalize base URL (remove trailing slash)
 */
const normalizeBaseUrl = (url) => {
    if (!url) return '';
    return url.endsWith('/') ? url.slice(0, -1) : url;
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Response with user data and tokens
 */
export async function register({ username, display_name, email, password, org_id }) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('display_name', display_name);
    formData.append('password', password);

    if (email) {
        formData.append('email', email);
    }

    if (org_id) {
        formData.append('org_id', org_id);
    }

    const response = await fetch(`${normalizeBaseUrl(API_BASE_URL)}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(error.detail || error.message || 'Registration failed');
    }

    const data = await response.json();
    console.log('📝 Registration API Response:', data);

    // Store tokens
    if (data.access_token && data.refresh_token) {
        storeTokens({
            access_token: data.access_token,
            refresh_token: data.refresh_token,

        }, true); // Default to remember me for registration

        // Use the form data we sent since API doesn't return user info
        const userData = {
            user_id: data.user_id || data.id || null,
            username: username,  // Use the username from form
            display_name: display_name,  // Use the display_name from form
            email: email || null
        };

        console.log('👤 Storing user data:', userData);
        storeUser(userData, true);
    }

    return data;
}

/**
 * Login user
 * @param {Object} credentials - Login credentials
 * @returns {Promise<Object>} Response with user data and tokens
 */
export async function login({ login_id, password, remember_me = false }) {
    const formData = new URLSearchParams();
    formData.append('login_id', login_id);
    formData.append('password', password);
    formData.append('remember_me', remember_me.toString());

    const response = await fetch(`${normalizeBaseUrl(API_BASE_URL)}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'TASConnect/1.0',
        },
        body: formData.toString(),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(error.detail || error.message || 'Invalid credentials');
    }

    const data = await response.json();
    console.log('🔐 Login API Response:', data);

    // Store tokens and user data
    if (data.access_token && data.refresh_token) {
        storeTokens({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            display_name: data.username
        }, remember_me);

        // Extract user data - could be nested or at root level
        const userData = data.user || {
            user_id: data.user_id || data.id || null,
            username: data.username || login_id, // Fallback to login_id
            display_name: data.display_name || login_id, // Fallback to login_id
            email: data.email || (login_id.includes('@') ? login_id : null)
        };

        console.log('👤 Storing user data:', userData);
        storeUser(userData, remember_me);
    }

    return data;
}

/**
 * Refresh access token
 * @returns {Promise<string>} New access token
 */
export async function refreshAccessToken() {
    const refresh_token = getRefreshToken();

    if (!refresh_token) {
        throw new Error('No refresh token available');
    }

    const formData = new URLSearchParams();
    formData.append('refresh_token', refresh_token);

    const response = await fetch(`${normalizeBaseUrl(API_BASE_URL)}/refresh-token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'TASConnect/1.0',
        },
        body: formData.toString(),
    });

    if (!response.ok) {
        clearTokens(); // Clear invalid tokens
        throw new Error('Token refresh failed');
    }

    const data = await response.json();

    // Update stored tokens
    if (data.access_token && data.refresh_token) {
        const rememberMe = !!localStorage.getItem('access_token'); // Check if using localStorage
        storeTokens({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
        }, rememberMe);
    }

    return data.access_token;
}

/**
 * Logout user
 * @param {boolean} invalidateAll - Invalidate all sessions
 * @returns {Promise<void>}
 */
export async function logout(invalidateAll = false) {
    const token = getAccessToken();

    if (token) {
        const formData = new URLSearchParams();
        formData.append('invalidate_all', invalidateAll.toString());

        try {
            await fetch(`${normalizeBaseUrl(API_BASE_URL)}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${token}`,
                },
                body: formData.toString(),
            });
        } catch (error) {
            console.error('Logout request failed:', error);
            // Continue with local cleanup even if API call fails
        }
    }

    // Always clear local tokens
    clearTokens();
}

/**
 * Get current user from storage
 * @returns {Object|null} User object or null
 */
export function getCurrentUser() {
    const userStr = localStorage.getItem('tas_user');
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch (error) {
        return null;
    }
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated() {
    return !!getAccessToken();
}
