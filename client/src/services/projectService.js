import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || '/api'}/projects`;

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const projectService = {
  list: async () => {
    const { data } = await axios.get(API_BASE_URL, { headers: authHeader() });
    return data;
  },

  create: async (name, description = '') => {
    const { data } = await axios.post(API_BASE_URL, { name, description }, { headers: authHeader() });
    return data;
  },

  get: async (id) => {
    const { data } = await axios.get(`${API_BASE_URL}/${id}`, { headers: authHeader() });
    return data;
  },

  update: async (id, patch) => {
    const { data } = await axios.put(`${API_BASE_URL}/${id}`, patch, { headers: authHeader() });
    return data;
  },

  remove: async (id) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${id}`, { headers: authHeader() });
    return data;
  },

  uploadSource: async (id, file) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await axios.post(`${API_BASE_URL}/${id}/sources`, form, {
      headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  addSourceLink: async (id, url) => {
    const { data } = await axios.post(`${API_BASE_URL}/${id}/sources/link`, { url }, { headers: authHeader() });
    return data;
  },

  deleteSource: async (id, sourceId) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${id}/sources/${sourceId}`, { headers: authHeader() });
    return data;
  },

  chat: async (id, message, history = [], conversationId = null) => {
    const body = { message, history };
    if (conversationId) body.conversationId = conversationId;
    const { data } = await axios.post(`${API_BASE_URL}/${id}/chat`, body, { headers: authHeader() });
    return data;
  },

  listConversations: async (id) => {
    const { data } = await axios.get(`${API_BASE_URL}/${id}/conversations`, { headers: authHeader() });
    return data;
  },

  getConversation: async (id, convId) => {
    const { data } = await axios.get(`${API_BASE_URL}/${id}/conversations/${convId}`, { headers: authHeader() });
    return data;
  },

  renameConversation: async (id, convId, title) => {
    const { data } = await axios.put(`${API_BASE_URL}/${id}/conversations/${convId}`, { title }, { headers: authHeader() });
    return data;
  },

  deleteConversation: async (id, convId) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${id}/conversations/${convId}`, { headers: authHeader() });
    return data;
  },

  getBookingInfo: async (id) => {
    const { data } = await axios.get(`${API_BASE_URL}/${id}/booking`, { headers: authHeader() });
    return data;
  },

  linkBookingSheet: async (id, url, opts = {}) => {
    const body = { url };
    if (opts.autoProvision) body.autoProvision = true;
    const { data } = await axios.post(`${API_BASE_URL}/${id}/booking/link`, body, { headers: authHeader() });
    return data;
  },

  getBookingRows: async (id) => {
    const { data } = await axios.get(`${API_BASE_URL}/${id}/booking/rows`, { headers: authHeader() });
    return data;
  },

  unlinkBookingSheet: async (id) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${id}/booking/link`, { headers: authHeader() });
    return data;
  },
};

export default projectService;
