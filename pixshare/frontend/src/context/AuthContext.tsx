// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount: trust only the token in localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token && token !== "undefined");
    setLoading(false);
  }, []);

  // Keep auth state in sync across tabs/windows (still header-only)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token") {
        const token = localStorage.getItem("token");
        setIsAuthenticated(!!token && token !== "undefined");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Called when user logs in successfully
  const login = (token: string) => {
    if (token && token !== "undefined") {
      localStorage.setItem("token", token); // used by your fetch helpers
      setIsAuthenticated(true);
    } else {
      console.warn("Invalid token passed to login()");
    }
  };

  // Called when user logs out — clear server cookie if any (safe), then local token
  const logout = async () => {
    try {
      // Optional: clear any old cookie on server; harmless if cookies are disabled
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.warn("Logout request failed; clearing client state anyway.", err);
    } finally {
      localStorage.removeItem("token");
      setIsAuthenticated(false);
    }
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
