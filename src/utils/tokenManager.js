/**
 * Token Manager - Handles secure storage and retrieval of auth tokens
 */

const ACCESS_TOKEN_KEY = 'tas_access_token';
const REFRESH_TOKEN_KEY = 'tas_refresh_token';
const USER_KEY = 'tas_user';

/**
 * Store authentication tokens
 * @param {Object} tokens - Token object containing access_token and refresh_token
 * @param {boolean} rememberMe - Whether to use localStorage (true) or sessionStorage (false)
 */
export function storeTokens({ access_token, refresh_token }, rememberMe = false) {
  const storage = localStorage;

  if (access_token) {
    storage.setItem(ACCESS_TOKEN_KEY, access_token);
    storage.setItem('access_token', access_token); // Duplicate for legacy/external compatibility
  }

  if (refresh_token) {
    storage.setItem(REFRESH_TOKEN_KEY, refresh_token);
  }
}

/**
 * Store user information
 * @param {Object} user - User object
 * @param {boolean} rememberMe - Whether to use localStorage or sessionStorage
 */
export function storeUser(user, rememberMe = false) {
  const storage = localStorage;
  storage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get access token from storage
 * @returns {string|null} Access token or null if not found
 */
export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token from storage
 * @returns {string|null} Refresh token or null if not found
 */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Get stored user information
 * @returns {Object|null} User object or null if not found
 */
export function getUser() {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Failed to parse user data:', error);
    return null;
  }
}

export function clearTokens() {
  // Clear from both storages
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem('access_token');
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if access token exists
 */
export function isAuthenticated() {
  return !!getAccessToken();
}
