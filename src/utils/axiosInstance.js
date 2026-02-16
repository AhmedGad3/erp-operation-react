import axios from "axios";
import { toast } from "react-toastify";

const API = "https://erp-operations.vercel.app/admin";

const axiosInstance = axios.create({
  baseURL: API,
});

/* ✅ Request interceptor → إضافة التوكن */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ✅ Response interceptor → التعامل مع 401 */
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

export default axiosInstance;
