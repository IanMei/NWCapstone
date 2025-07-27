import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount: check token from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token && token !== "undefined");
    setLoading(false);
  }, []);

  // Called when user logs in successfully
  const login = (token: string) => {
    if (token && token !== "undefined") {
      localStorage.setItem("token", token);
      setIsAuthenticated(true); // 🔄 Triggers rerender
    } else {
      console.warn("Invalid token passed to login()");
    }
  };

  // Called when user logs out
  const logout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false); // 🔄 Triggers rerender
  };

  // Prevent app from rendering before auth check is done
  if (loading) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access context safely
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
