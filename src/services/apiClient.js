const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const normalizeBaseUrl = (url) => {
    if (!url) return "";
    return url.endsWith("/") ? url.slice(0, -1) : url;
};

export const getAuthToken = () => {
    return localStorage.getItem("access_token");
};

export const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { "Authorization": `Bearer ${token}` } : {};
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

    // Exclude auth header for login/register if needed, though usually harmless if server ignores it.
    // The user requirement explicitly said "accept login , register api" -> assuming they mean EXCEPT login/register?
    // "send access_token to every api accept login , register api" -> "except"
    // If endpoint contains login or register, strictly speaking we could omit it, but standard practice is often just to send it if available.
    // However, let's be safe and strictly follow "except".

    if (endpoint.includes("/login") || endpoint.includes("/register")) { // Basic check
        delete headers["Authorization"];
    }

    const config = {
        ...options,
        headers,
    };

    const response = await fetch(url, config);
    return response;
};
