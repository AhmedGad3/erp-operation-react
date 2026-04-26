import { createContext, useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";

export const AuthContext = createContext(null);

export default function AuthContextProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load token once
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    setToken(savedToken);
    setLoading(false);
  }, []);

  // Fetch user when token exists
  useEffect(() => {
    if (!token) return;
    fetchMe();
  }, [token]);

  const fetchMe = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/me");
      setUser(data);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = (tk) => {
    localStorage.setItem("token", tk);
    setToken(tk);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ token, user, setUser, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}
