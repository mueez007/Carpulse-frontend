import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("accessToken");
    if (saved) {
      setToken(saved);
    }
  }, []);

  const login = (accessToken) => {
    setToken(accessToken);
    window.localStorage.setItem("accessToken", accessToken);
  };

  const logout = () => {
    setToken(null);
    window.localStorage.removeItem("accessToken");
  };

  const value = {
    token,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
