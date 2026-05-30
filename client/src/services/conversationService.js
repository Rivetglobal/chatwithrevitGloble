import axios from 'axios';
import authService from './authService';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || '/api'}/conversations`;

const authHeader = () => {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const conversationService = {
  createConversation: async (title) => {
    const response = await axios.post(API_BASE_URL, { title }, { headers: authHeader() });
    return response.data;
  },

  getConversations: async (limit = 50, skip = 0) => {
    const response = await axios.get(API_BASE_URL, {
      params: { limit, skip },
      headers: authHeader(),
    });
    return response.data;
  },

  getConversation: async (conversationId) => {
    const response = await axios.get(`${API_BASE_URL}/${conversationId}`, { headers: authHeader() });
    return response.data;
  },

  updateConversationTitle: async (conversationId, title) => {
    const response = await axios.put(`${API_BASE_URL}/${conversationId}`, { title }, { headers: authHeader() });
    return response.data;
  },

  deleteConversation: async (conversationId) => {
    await axios.delete(`${API_BASE_URL}/${conversationId}`, { headers: authHeader() });
  },
};

export default conversationService;
