import axios from "axios";
import authService from "./authService";

const API_BASE = `${import.meta.env.VITE_API_URL || "/api"}/activity`;

function authHeader() {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const activityService = {
  heartbeat: async (tool, seconds) => {
    const token = authService.getToken();
    if (!token || !tool || !seconds) return;
    try {
      await axios.post(
        `${API_BASE}/heartbeat`,
        { tool, seconds },
        { headers: authHeader(), timeout: 8000 },
      );
    } catch {
      /* ignore — analytics must never block the app */
    }
  },
};

export default activityService;
