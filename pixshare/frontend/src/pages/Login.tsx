import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BASE_URL } from "../utils/api";
// const BASE_URL = "http://localhost:5000/api"; // Update this if needed

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Login failed");

      localStorage.setItem("token", data.token);
      login(data.token); // ✅ update global login state
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Network error");
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] p-6 bg-[var(--bg-light)]">
      <h1 className="text-3xl font-bold mb-4 text-[var(--primary)]">Log In</h1>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 bg-white p-6 rounded shadow"
      >
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring focus:ring-[var(--primary)]"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring focus:ring-[var(--primary)]"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-semibold py-2 px-4 rounded"
        >
          Log In
        </button>
        <p className="text-sm text-center">
          Don’t have an account?{" "}
          <Link to="/register" className="text-[var(--primary)] hover:underline">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}
