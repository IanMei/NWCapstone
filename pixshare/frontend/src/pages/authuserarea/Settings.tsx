// src/pages/Account/Settings.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../utils/api";

type Profile = {
  name: string;
  email: string;
  subscription?: string;
};

const noCache = (u: string) => `${u}${u.includes("?") ? "&" : "?"}_=${Date.now()}`;

export default function Settings() {
  const navigate = useNavigate();

  const getToken = () => {
    const t = localStorage.getItem("token");
    return t && t !== "undefined" ? t : null;
  };
  const authHeaders = (): HeadersInit => {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  };
  const handleAuthError = (status: number) => {
    if (status === 401 || status === 422) {
      navigate("/login");
      return true;
    }
    return false;
  };

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({ name: "", email: "", subscription: "Free" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const fetchProfile = async () => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const res = await fetch(noCache(`${BASE_URL}/account/profile`), {
        headers: { ...authHeaders(), "Cache-Control": "no-cache", Pragma: "no-cache" },
        cache: "no-store",
        credentials: "omit",
      });
      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.msg || "Failed to load profile");
      }
      const data = await res.json();
      setProfile({
        name: data?.name ?? "",
        email: data?.email ?? "",
        subscription: data?.subscription ?? "Free",
      });
    } catch (e: any) {
      setErr(e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    if (!profile.name.trim()) {
      setErr("Name is required.");
      return;
    }
    if (!isValidEmail(profile.email)) {
      setErr("Please enter a valid email address.");
      return;
    }

    try {
      setSavingProfile(true);
      const res = await fetch(`${BASE_URL}/account/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "omit",
        body: JSON.stringify({ name: profile.name.trim(), email: profile.email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        throw new Error(data?.msg || "Profile update failed");
      }
      setMsg(data?.msg || "✅ Profile updated!");
      // refresh from server (so we reflect normalized/changed values)
      fetchProfile();
    } catch (e: any) {
      setErr(e.message || "Profile update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const onPwdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    if (!passwords.current || !passwords.next) {
      setErr("Please enter your current and new password.");
      return;
    }
    if (passwords.next.length < 6) {
      setErr("New password must be at least 6 characters.");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setErr("New password and confirmation do not match.");
      return;
    }

    try {
      setSavingPwd(true);
      const res = await fetch(`${BASE_URL}/account/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "omit",
        body: JSON.stringify({ current: passwords.current, new: passwords.next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        throw new Error(data?.msg || "Password change failed");
      }
      setMsg(data?.msg || "✅ Password updated!");
      setPasswords({ current: "", next: "", confirm: "" });
    } catch (e: any) {
      setErr(e.message || "Password change failed");
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[var(--primary)] mb-6">Account Settings</h1>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          {(msg || err) && (
            <div
              className={`mb-4 text-sm rounded px-3 py-2 ${
                err ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
              }`}
            >
              {err || msg}
            </div>
          )}

          {/* Profile */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Profile Info</h2>
            <form onSubmit={submitProfile} className="space-y-4 bg-white p-4 rounded shadow">
              <div>
                <label className="block text-sm mb-1">Full Name</label>
                <input
                  name="name"
                  value={profile.name}
                  onChange={onProfileChange}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={onProfileChange}
                  placeholder="Email"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <p className="text-sm text-gray-600">
                Subscription: <strong>{profile.subscription ?? "Free"}</strong>
              </p>
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] disabled:opacity-60 text-white px-4 py-2 rounded"
              >
                {savingProfile ? "Saving…" : "Update Profile"}
              </button>
            </form>
          </section>

          {/* Password */}
          <section>
            <h2 className="text-lg font-semibold mb-2">Change Password</h2>
            <form onSubmit={submitPassword} className="space-y-4 bg-white p-4 rounded shadow">
              <div>
                <label className="block text-sm mb-1">Current Password</label>
                <input
                  type="password"
                  name="current"
                  value={passwords.current}
                  onChange={onPwdChange}
                  placeholder="Current Password"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">New Password</label>
                <input
                  type="password"
                  name="next"
                  value={passwords.next}
                  onChange={onPwdChange}
                  placeholder="New Password (min 6 chars)"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Confirm New Password</label>
                <input
                  type="password"
                  name="confirm"
                  value={passwords.confirm}
                  onChange={onPwdChange}
                  placeholder="Confirm New Password"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <button
                type="submit"
                disabled={savingPwd}
                className="bg-[var(--primary)] text-white px-4 py-2 rounded disabled:opacity-60"
              >
                {savingPwd ? "Updating…" : "Update Password"}
              </button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
