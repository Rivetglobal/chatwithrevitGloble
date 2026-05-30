import axios from 'axios';
import authService from './authService';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || '/api'}/admin`;

function authHeader() {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const adminService = {
  getLlmKeys: async () => {
    const r = await axios.get(`${API_BASE_URL}/llm-keys`, { headers: authHeader() });
    return r.data;
  },
  updateLlmKeys: async (payload) => {
    const r = await axios.put(`${API_BASE_URL}/llm-keys`, payload, { headers: authHeader() });
    return r.data;
  },
  getIntegrations: async () => {
    const r = await axios.get(`${API_BASE_URL}/integrations`, { headers: authHeader() });
    return r.data;
  },
  updateIntegrations: async (payload) => {
    const r = await axios.put(`${API_BASE_URL}/integrations`, payload, { headers: authHeader() });
    return r.data;
  },
};

export default adminService;
