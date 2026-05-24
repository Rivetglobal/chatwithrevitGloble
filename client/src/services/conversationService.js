import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || '/api'}/conversations`;

const conversationService = {
  createConversation: async (title) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(API_BASE_URL, { title }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  getConversations: async (limit = 50, skip = 0) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(API_BASE_URL, {
      params: { limit, skip },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  getConversation: async (conversationId) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/${conversationId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  updateConversationTitle: async (conversationId, title) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_BASE_URL}/${conversationId}`, { title }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  deleteConversation: async (conversationId) => {
    const token = localStorage.getItem('token');
    await axios.delete(`${API_BASE_URL}/${conversationId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }
};

export default conversationService;
