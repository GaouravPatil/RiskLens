import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000",
});

export const getRisks = async () => {
    const response = await api.get("/api/risks/");
    return response.data;
};

export const getRisk = async (riskId) => {
    const response = await api.get(`/api/risks/${riskId}`);
    return response.data;
};

export const updateRiskStatus = async (riskId, status, reviewedBy) => {
    const response = await api.patch(
        `/api/risks/${riskId}/status`,
        {
            status,
            reviewed_by: reviewedBy,
        }
    );

    return response.data;
};

export const getRiskSummary = async () => {
    const response = await api.get("/api/risks/summary");
    return response.data;
};

export default api;