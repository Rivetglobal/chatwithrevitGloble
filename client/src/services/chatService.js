import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || '/api'}/chat`;

const chatService = {
  sendMessage: async (message, conversationId = null) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/send`, { message, conversationId }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  getChatHistory: async (conversationId, limit = 50, skip = 0) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/history`, {
      params: { conversationId, limit, skip },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  deleteChat: async (chatId) => {
    const token = localStorage.getItem('token');
    await axios.delete(`${API_BASE_URL}/${chatId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  },

  clearChatHistory: async () => {
    const token = localStorage.getItem('token');
    await axios.delete(`${API_BASE_URL}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  },

  regenerateResponse: async (chatId) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/${chatId}/regenerate`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
};

export default chatService;
