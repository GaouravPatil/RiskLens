import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000",
    headers: {
        "Content-Type": "application/json",
    },
});

export const getRisks = async () => {
    const response = await api.get("/api/risks/");
    return response.data;
};

export const getRisk = async (riskId) => {
    const response = await api.get(`/api/risks/${riskId}`);
    return response.data;
};

export default api;