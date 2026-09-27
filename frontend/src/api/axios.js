import axios from "axios";

// In dev, Vite proxies "/api" to the local backend (see vite.config.js).
// In production (Vercel), set VITE_API_URL to your deployed backend's
// base URL, e.g. https://your-backend.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
