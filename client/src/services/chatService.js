import axios from 'axios';
import authService from './authService';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || '/api'}/chat`;

const authHeader = () => {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const chatService = {
  sendMessage: async (message, conversationId = null, extra = {}) => {
    const response = await axios.post(`${API_BASE_URL}/send`, { message, conversationId, ...extra }, {
      headers: authHeader(),
    });
    return response.data;
  },

  getChatHistory: async (conversationId, limit = 50, skip = 0) => {
    const response = await axios.get(`${API_BASE_URL}/history`, {
      params: { conversationId, limit, skip },
      headers: authHeader(),
    });
    return response.data;
  },

  deleteChat: async (chatId) => {
    await axios.delete(`${API_BASE_URL}/${chatId}`, { headers: authHeader() });
  },

  clearChatHistory: async () => {
    await axios.delete(`${API_BASE_URL}`, { headers: authHeader() });
  },

  regenerateResponse: async (chatId) => {
    const response = await axios.post(`${API_BASE_URL}/${chatId}/regenerate`, {}, {
      headers: authHeader(),
    });
    return response.data;
  },
};

export default chatService;
