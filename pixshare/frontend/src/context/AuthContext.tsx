import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Flask-JWT-Extended default cookie name for access tokens
const ACCESS_COOKIE_NAME = "access_token_cookie";

function hasJwtCookie(): boolean {
  // Simple cookie presence check (not validating token)
  return typeof document !== "undefined" && document.cookie.includes(`${ACCESS_COOKIE_NAME}=`);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount: check localStorage token OR JWT cookie set by backend
  useEffect(() => {
    const token = localStorage.getItem("token");
    const authed = (!!token && token !== "undefined") || hasJwtCookie();
    setIsAuthenticated(authed);
    setLoading(false);
  }, []);

  // Keep auth state in sync across tabs/windows
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token") {
        const token = localStorage.getItem("token");
        setIsAuthenticated((!!token && token !== "undefined") || hasJwtCookie());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Called when user logs in successfully
  const login = (token: string) => {
    if (token && token !== "undefined") {
      localStorage.setItem("token", token); // header-based API calls
      // The server also set an HttpOnly cookie for same-origin image requests
      setIsAuthenticated(true);
    } else {
      console.warn("Invalid token passed to login()");
    }
  };

  // Called when user logs out — clears cookie on server and local token
  const logout = async () => {
    try {
      // Same-origin via Vite proxy, cookie will be included automatically
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      // Non-fatal; we'll still clear client state
      console.warn("Logout request failed; clearing client state anyway.", err);
    } finally {
      localStorage.removeItem("token");
      setIsAuthenticated(false);
    }
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
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
