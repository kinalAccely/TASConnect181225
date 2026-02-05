/**
 * Form Validation Utilities
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and message
 */
export function validatePassword(password) {
    if (!password) {
        return { isValid: false, message: 'Password is required' };
    }

    if (password.length < 8) {
        return { isValid: false, message: 'Password must be at least 8 characters' };
    }

    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'Password must contain lowercase letters' };
    }

    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'Password must contain uppercase letters' };
    }

    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: 'Password must contain numbers' };
    }

    return { isValid: true, message: 'Strong password' };
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {Object} Validation result
 */
export function validateUsername(username) {
    if (!username) {
        return { isValid: false, message: 'Username is required' };
    }

    if (username.length < 3) {
        return { isValid: false, message: 'Username must be at least 3 characters' };
    }

    if (username.length > 20) {
        return { isValid: false, message: 'Username must be less than 20 characters' };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }

    return { isValid: true, message: '' };
}

/**
 * Validate required field
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of the field
 * @returns {Object} Validation result
 */
export function validateRequired(value, fieldName = 'This field') {
    if (!value || value.trim() === '') {
        return { isValid: false, message: `${fieldName} is required` };
    }
    return { isValid: true, message: '' };
}
