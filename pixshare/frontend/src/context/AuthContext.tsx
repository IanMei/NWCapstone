import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const getValidToken = () => {
    const token = localStorage.getItem("token");
    return token && token !== "undefined";
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getValidToken());

  const login = (token: string) => {
    if (token && token !== "undefined") {
      localStorage.setItem("token", token);
      setIsAuthenticated(true);
    } else {
      console.warn("Invalid token passed to login()");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (!getValidToken()) {
      localStorage.removeItem("token"); // Clean up just in case
      setIsAuthenticated(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
