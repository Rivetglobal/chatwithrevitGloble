import axios from 'axios';
import authService from './authService';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || '/api'}/voice`;

function authHeader() {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const voiceService = {
  getStatus: async () => {
    const r = await axios.get(`${API_BASE_URL}/status`, { headers: authHeader() });
    return r.data;
  },
  createSession: async () => {
    const r = await axios.post(`${API_BASE_URL}/session`, {}, { headers: authHeader() });
    return r.data;
  },
};

export default voiceService;
