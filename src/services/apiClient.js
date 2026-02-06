import { getAccessToken, clearTokens } from "../utils/tokenManager";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const normalizeBaseUrl = (url) => {
    if (!url) return "";
    return url.endsWith("/") ? url.slice(0, -1) : url;
}; // Existing code ... re-declaring imports mainly.

// Adapting the existing file content structure
// Note: The previous view_file showed existing exports. I need to be careful not to double declare.
// I will rewrite the file to include the imports and the new logic.

export const getAuthToken = () => {
    return getAccessToken();
};

export const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { "Authorization": `Bearer ${token}` } : {};
};

// New Helper
export const handleAuthError = (response) => {
    if (response.status === 401) {
        clearTokens();
        window.location.href = "/login";
        // We might want to throw or return a rejected promise to stop further execution, 
        // but returning the response allows individual callers to handle it if they really want, 
        // though the redirect will happen. 
        // Usually throwing is better to stop downstream logic that expects success/data.
        // However, existing logic checks response.ok.
    }
    return response;
};

export const fetchWithAuth = async (endpoint, options = {}) => {
    const url = endpoint.startsWith("http")
        ? endpoint
        : `${normalizeBaseUrl(API_BASE_URL)}${endpoint}`;

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
        ...getAuthHeaders(),
    };

    if (endpoint.includes("/login") || endpoint.includes("/register")) {
        delete headers["Authorization"];
    }

    const config = {
        ...options,
        headers,
    };

    const response = await fetch(url, config);
    return handleAuthError(response);
};

