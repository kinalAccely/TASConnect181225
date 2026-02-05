import { fetchWithAuth } from "./apiClient";

export async function login(loginId, password) {
    // Construct query parameters or form body
    // User example: login_id=string23%60&password=sdsad
    // This looks like query params or x-www-form-urlencoded

    const params = new URLSearchParams();
    // params.append('login_id', loginId);
    // params.append('password', password);

    // We'll try passing as query params first since the example looked like a query string
    // If that fails, we might need to send as body. 
    // Given the example "http://.../login" and the string, it could be POST /login?login_id=...

    // Let's assume standard POST with query params based on the user provided string structure which resembles a query string directly.
    try {
        const formData = new URLSearchParams();
        formData.append('login_id', loginId);
        formData.append('password', password);
        // formData.append('remember_me', 'false'); 


        const response = await fetchWithAuth(`/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || errorData.message || 'Login failed');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
}
