import { Link, useNavigate } from "react-router-dom";
import ThemeSwitcher from "./ThemeSwitcher";
import { useEffect, useState } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
  }, []);

  const handleLogoClick = () => {
    navigate(isLoggedIn ? "/dashboard" : "/");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-[var(--primary)] text-white">
      <button onClick={handleLogoClick} className="text-2xl font-bold hover:underline">
        PixShare
      </button>

      <div className="flex items-center gap-6">
        {isLoggedIn ? (
          <>
            <Link to="/dashboard" className="hover:underline">Dashboard</Link>
            <Link to="/albums" className="hover:underline">My Albums</Link>
            <Link to="/events" className="hover:underline">Events</Link>
            <Link to="/account/settings" className="hover:underline">Settings</Link>
            <button onClick={handleLogout} className="hover:underline">Log Out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:underline">Login</Link>
            <Link to="/register" className="hover:underline">Register</Link>
          </>
        )}
        <ThemeSwitcher />
      </div>
    </nav>
  );
}
