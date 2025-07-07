import { useState, useEffect } from "react";
import { BASE_URL } from "../../utils/api";

export default function Settings() {
  const token = localStorage.getItem("token");

  const [profile, setProfile] = useState({ name: "", email: "", subscription: "Free" });
  const [passwords, setPasswords] = useState({ current: "", new: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // Fetch current profile data
    fetch(`${BASE_URL}/account/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProfile(data));
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${BASE_URL}/account/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profile),
    });
    if (res.ok) setMsg("✅ Profile updated!");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${BASE_URL}/account/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(passwords),
    });
    const data = await res.json();
    setMsg(data.msg || (res.ok ? "Password updated!" : "Password change failed"));
  };

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[var(--primary)] mb-6">Account Settings</h1>

      {msg && <p className="mb-4 text-sm text-green-600">{msg}</p>}

      {/* Profile Update */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Profile Info</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4 bg-white p-4 rounded shadow">
          <input
            name="name"
            value={profile.name}
            onChange={handleProfileChange}
            placeholder="Full Name"
            className="w-full px-3 py-2 border rounded"
          />
          <input
            name="email"
            value={profile.email}
            onChange={handleProfileChange}
            placeholder="Email"
            type="email"
            className="w-full px-3 py-2 border rounded"
          />
          <p className="text-sm text-gray-600">
            Subscription: <strong>{profile.subscription}</strong>
          </p>
          <button
            type="submit"
            className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-4 py-2 rounded"
          >
            Update Profile
          </button>
        </form>
      </section>

      {/* Password Change */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4 bg-white p-4 rounded shadow">
          <input
            type="password"
            name="current"
            value={passwords.current}
            onChange={handlePasswordChange}
            placeholder="Current Password"
            className="w-full px-3 py-2 border rounded"
          />
          <input
            type="password"
            name="new"
            value={passwords.new}
            onChange={handlePasswordChange}
            placeholder="New Password"
            className="w-full px-3 py-2 border rounded"
          />
          <button
            type="submit"
            className="bg-[var(--primary)] text-white px-4 py-2 rounded"
          >
            Update Password
          </button>
        </form>
      </section>
    </main>
  );
}
