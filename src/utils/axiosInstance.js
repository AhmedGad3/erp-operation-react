import axios from "axios";
import { toast } from "react-toastify";

const API = "https://erp-operations.vercel.app/admin";

const axiosInstance = axios.create({
  baseURL: API,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!config.skipLang) {
      try {
        const stored = localStorage.getItem("lang");
        const lang = stored || "ar";
        if (config.params) {
          config.params.lang = config.params.lang || lang;
        } else {
          config.params = { lang };
        }
      } catch {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      toast.info("Session expired, please login again");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = "Something went wrong") {
  const data = error?.response?.data;
  if (!data) return fallback;

  if (Array.isArray(data.message)) return data.message.join("، ");
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return fallback;
}

export default axiosInstance;