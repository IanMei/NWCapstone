// src/components/Navbar.tsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import ThemeSwitcher from "./ThemeSwitcher";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch {
      navigate("/");
    }
  };

  // active if exact or inside section (e.g., /albums/42)
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const navItemClass = (active: boolean) =>
    [
      "relative px-3 py-1 rounded-lg transition-colors duration-150",
      "focus:outline-none focus:ring-2 focus:ring-white/40",
      active
        ? // Active: brighter pill + subtle ring + tiny underline bar
          "text-white bg-white/15 ring-1 ring-white/15 shadow-sm " +
          "after:absolute after:left-2 after:right-2 after:-bottom-1 after:h-0.5 after:bg-white/70 after:rounded-full"
        : // Inactive: dim text, hover brighten
          "text-white/80 hover:text-white hover:bg-white/10",
    ].join(" ");

  return (
    <nav
      className={[
        "sticky top-0 z-40",
        // solid base color + slight transparency + blur for a modern look
        "bg-[var(--primary)]/95 backdrop-blur shadow-md border-b border-white/10",
        "px-6 py-3",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          to={isAuthenticated ? "/dashboard" : "/"}
          className="text-2xl font-bold tracking-tight select-none"
          title="PixShare"
        >
          {/* Subtle text treatment for a 'tech' feel */}
          <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            PixShare
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className={navItemClass(isActive("/dashboard"))}>
                Dashboard
              </Link>
              <Link to="/albums" className={navItemClass(isActive("/albums"))}>
                Albums
              </Link>
              <Link to="/events" className={navItemClass(isActive("/events"))}>
                Events
              </Link>
              <Link
                to="/account/settings"
                className={navItemClass(isActive("/account/settings"))}
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={navItemClass(isActive("/login"))}>
                Login
              </Link>
              <Link to="/register" className={navItemClass(isActive("/register"))}>
                Register
              </Link>
            </>
          )}
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
}
