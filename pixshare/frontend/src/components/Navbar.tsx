import { Link, useNavigate, useLocation } from "react-router-dom";
import ThemeSwitcher from "./ThemeSwitcher";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      // Ensure the HttpOnly JWT cookie is cleared server-side
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // ✅ send cookie to server so it can unset it
      });
    } catch {
      // ignore—client state will still be cleared by logout()
    } finally {
      await logout(); // clears local token + context state
      navigate("/");  // redirect to homepage after logout
    }
  };

  const linkClass = (path: string) =>
    `hover:underline ${location.pathname === path ? "font-semibold underline" : ""}`;

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-[var(--primary)] text-white">
      <Link
        to={isAuthenticated ? "/dashboard" : "/"}
        className="text-2xl font-bold"
      >
        PixShare
      </Link>

      <div className="flex items-center gap-6">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className={linkClass("/dashboard")}>
              Dashboard
            </Link>
            <Link to="/albums" className={linkClass("/albums")}>
              Albums
            </Link>
            <Link to="/events" className={linkClass("/events")}>
              Events
            </Link>
            <Link to="/account/settings" className={linkClass("/account/settings")}>
              Settings
            </Link>
            <button onClick={handleLogout} className="hover:underline">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={linkClass("/login")}>
              Login
            </Link>
            <Link to="/register" className={linkClass("/register")}>
              Register
            </Link>
          </>
        )}
        <ThemeSwitcher />
      </div>
    </nav>
  );
}
