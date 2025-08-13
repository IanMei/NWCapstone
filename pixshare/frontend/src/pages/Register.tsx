import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api"; // ✅ centralized API base URL

// handle user register logic
const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data?.msg || data?.message || "Registration failed";
        throw new Error(message);
      }

      navigate("/login"); // redirect to login after success
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
  };

  // handle page render
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-light)] text-[var(--primary)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 bg-white p-6 rounded shadow"
      >
        <h1 className="text-2xl font-bold text-center text-[var(--accent-dark)]">
          Register
        </h1>

        <div className="flex flex-col space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            className="px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="flex flex-col space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="flex flex-col space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-semibold py-2 px-4 rounded"
        >
          Register
        </button>

        <p className="text-sm text-center mt-2">
          <Link to="/login" className="text-[var(--primary)] hover:underline">
            Already have an account? Log in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
