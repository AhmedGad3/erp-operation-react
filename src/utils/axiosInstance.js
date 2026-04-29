import axios from "axios";
import { toast } from "react-toastify";
import { getErrorMessage as extractErrorMessage } from "./errorHandler";

const API = "https://erp-operations.vercel.app/admin";

const axiosInstance = axios.create({
  baseURL: API,
});

let isRedirectingToLogin = false;

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
      } catch (langError) {
        void langError;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem("token");
      if (token && !isRedirectingToLogin) {
        isRedirectingToLogin = true;
        localStorage.removeItem("token");
        localStorage.removeItem("user_profile");
        toast.info("Session expired, please login again");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);
      }
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = "Something went wrong") {
  return extractErrorMessage(error, fallback);
}

export default axiosInstance;
