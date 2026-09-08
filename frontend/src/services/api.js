import axios from "axios";

const TOKEN_KEY = "risklens_token";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000",
});

/* ================================
   Token storage
   ================================ */

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/* ================================
   Interceptors
   ================================ */

api.interceptors.request.use((config) => {
    const token = getToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

let unauthorizedHandler = null;

// Lets App return to the login screen when a token stops being accepted
export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = handler;
};

const isLoginRequest = (config) =>
    Boolean(config?.url?.endsWith("/api/auth/login"));

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // A rejected token is never usable again, so drop it. A failed login
        // attempt is a different thing and must not look like an expiry.
        if (
            error.response?.status === 401 &&
            !isLoginRequest(error.config)
        ) {
            clearToken();

            if (unauthorizedHandler) {
                unauthorizedHandler();
            }
        }

        return Promise.reject(error);
    }
);

/* ================================
   Authentication
   ================================ */

export const login = async (email, password) => {
    const response = await api.post("/api/auth/login", {
        email,
        password,
    });

    localStorage.setItem(TOKEN_KEY, response.data.access_token);

    return response.data.user;
};

export const getCurrentUser = async () => {
    const response = await api.get("/api/auth/me");
    return response.data;
};

export const logout = () => {
    clearToken();
};

/* ================================
   Risks
   ================================ */

export const getRisks = async () => {
    const response = await api.get("/api/risks/");
    return response.data;
};

export const getRisk = async (riskId) => {
    const response = await api.get(`/api/risks/${riskId}`);
    return response.data;
};

// The reviewer is taken from the authenticated token server-side and must
// never be sent from here.
export const updateRiskStatus = async (riskId, status) => {
    const response = await api.patch(
        `/api/risks/${riskId}/status`,
        { status }
    );

    return response.data;
};

export const getRiskSummary = async () => {
    const response = await api.get("/api/risks/summary");
    return response.data;
};

export default api;
