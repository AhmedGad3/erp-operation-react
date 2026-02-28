import axios from "axios";
import { toast } from "react-toastify";
import { getErrorMessage as extractErrorMessage } from "./errorHandler";

const API = "https://erp-operations.vercel.app/admin";

const axiosInstance = axios.create({
  baseURL: API,
});

let isRedirectingToLogin = false;

function getResponseMessage(error) {
  const data = error?.response?.data;
  if (!data) return "";
  if (Array.isArray(data.message)) return data.message.join(" ").toLowerCase();
  if (typeof data.message === "string") return data.message.toLowerCase();
  if (typeof data.error === "string") return data.error.toLowerCase();
  return "";
}

function shouldLogoutOnUnauthorized(error) {
  const msg = getResponseMessage(error);
  return (
    msg.includes("expired") ||
    msg.includes("jwt") ||
    msg.includes("token") ||
    msg.includes("signature") ||
    msg.includes("malformed")
  );
}

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
      const token = localStorage.getItem("token");
      if (token && shouldLogoutOnUnauthorized(error) && !isRedirectingToLogin) {
        isRedirectingToLogin = true;
        localStorage.removeItem("token");
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