import { createContext, useEffect, useState } from "react";
import { getAuthUser, isTokenExpired } from "../utils/authToken";
import axiosInstance from "../utils/axiosInstance";

export const AuthContext = createContext(null);

function extractUserFromMeResponse(data) {
  return data?.result?.user || data?.result || data?.user || data || null;
}

async function fetchCurrentUser() {
  const { data } = await axiosInstance.get("/me", { skipLang: true });
  return extractUserFromMeResponse(data);
}

export default function AuthContextProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");

    // مفيش token
    if (!savedToken) {
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    // الـ token منتهي
    if (isTokenExpired(savedToken)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user_profile");
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    // جيب الـ user من الـ token + user_profile في localStorage
    const localUser = getAuthUser(savedToken);
    setToken(savedToken);
    setUser(localUser);

    // لو عنده role من الـ localStorage، منعملش loading إضافي
    if (localUser?.role) {
      setLoading(false);
      // بعدين بنحدث البيانات من الـ API في الخلفية من غير ما نوقف الـ UI
      fetchCurrentUser()
        .then((apiUser) => {
          if (apiUser && typeof apiUser === "object") {
            localStorage.setItem("user_profile", JSON.stringify(apiUser));
            setUser(getAuthUser(savedToken));
          }
        })
        .catch((err) => {
          if (err?.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user_profile");
            setToken(null);
            setUser(null);
          }
        });
    } else {
      // مفيش role محلي — لازم ننتظر الـ API
      setLoading(true);
      fetchCurrentUser()
        .then((apiUser) => {
          if (apiUser && typeof apiUser === "object") {
            localStorage.setItem("user_profile", JSON.stringify(apiUser));
          }
          setUser(getAuthUser(savedToken));
        })
        .catch((err) => {
          if (err?.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user_profile");
            setToken(null);
            setUser(null);
          } else {
            setUser(localUser);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  const login = (tk, profile = null) => {
    localStorage.setItem("token", tk);
    if (profile && typeof profile === "object") {
      localStorage.setItem("user_profile", JSON.stringify(profile));
    }
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
