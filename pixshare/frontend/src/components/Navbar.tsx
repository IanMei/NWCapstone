import { Link } from "react-router-dom";
import ThemeSwitcher from "./ThemeSwitcher";

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-[var(--primary)] text-white">
      <Link to="/" className="text-2xl font-bold">PixShare</Link>
      <div className="flex items-center gap-6">
        <Link to="/login" className="hover:underline">Login</Link>
        <Link to="/register" className="hover:underline">Register</Link>
        <ThemeSwitcher />
      </div>
    </nav>
  );
}