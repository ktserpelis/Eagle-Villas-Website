import axios from "axios";

// In production (Vercel), set VITE_API_URL = https://your-backend.onrender.com
// In development, leave VITE_API_URL empty and rely on Vite proxy for /api
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, 
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      delete api.defaults.headers.common["Authorization"];

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
