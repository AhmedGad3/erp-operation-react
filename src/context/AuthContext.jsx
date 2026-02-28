import { createContext, useEffect, useState } from "react";
import { getAuthUser, isTokenExpired } from "../utils/authToken";
import axios from "axios";
import axiosInstance from "../utils/axiosInstance";

export const AuthContext = createContext(null);
const AUTH_ME_URL = "https://erp-operations.vercel.app/auth/me";

function extractUserFromMeResponse(data) {
  return data?.result?.user || data?.result || data?.user || data || null;
}

async function fetchCurrentUser(token) {
  try {
    const { data } = await axios.get(AUTH_ME_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return extractUserFromMeResponse(data);
  } catch (authErr) {
    const { data } = await axiosInstance.get("/me", { skipLang: true });
    return extractUserFromMeResponse(data);
  }
}

export default function AuthContextProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load token once
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (!savedToken) {
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    if (isTokenExpired(savedToken)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user_profile");
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    setToken(savedToken);
    setUser(getAuthUser(savedToken));
    setLoading(true);
  }, []);

  // Refresh user snapshot when token changes
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const localUser = getAuthUser(token);
    setUser(localUser);
    setLoading(true);

    fetchCurrentUser(token)
      .then((apiUser) => {
        if (!isMounted) return;
        if (apiUser && typeof apiUser === "object") {
          localStorage.setItem("user_profile", JSON.stringify(apiUser));
        }
        setUser(getAuthUser(token));
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err?.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user_profile");
          setToken(null);
          setUser(null);
          return;
        }
        setUser(localUser);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = (tk, profile = null) => {
    localStorage.setItem("token", tk);
    if (profile && typeof profile === "object") {
      localStorage.setItem("user_profile", JSON.stringify(profile));
    }
    setLoading(true);
    setToken(tk);
    setUser(getAuthUser(tk));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_profile");
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
