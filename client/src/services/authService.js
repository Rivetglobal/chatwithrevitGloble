import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || '/api'}/auth`;
const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const REMEMBER_KEY = 'rememberMe';

function parseJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

const authService = {
  setSession(token, user, { remember = true } = {}) {
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  },

  getToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || isTokenExpired(token)) {
      if (token) this.clearSession();
      return null;
    }
    return token;
  },

  getStoredUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  register: async (userData) => {
    const response = await axios.post(`${API_BASE_URL}/register`, {
      ...userData,
      rememberMe: true,
    });
    return response.data;
  },

  login: async (credentials, rememberMe = true) => {
    const response = await axios.post(`${API_BASE_URL}/login`, {
      ...credentials,
      rememberMe,
    });
    return response.data;
  },

  logout: async () => {
    const token = this.getToken();
    try {
      if (token) {
        await axios.post(`${API_BASE_URL}/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      /* ignore — still clear local session */
    }
    this.clearSession();
  },

  getProfile: async () => {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    const response = await axios.get(`${API_BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.user;
  },

  forgotPassword: async (email) => {
    const response = await axios.post(`${API_BASE_URL}/forgot-password`, { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await axios.post(`${API_BASE_URL}/reset-password`, { token, password });
    return response.data;
  },

  verifyResetToken: async (token) => {
    const response = await axios.get(`${API_BASE_URL}/verify-reset-token`, { params: { token } });
    return response.data;
  },
};

export default authService;
