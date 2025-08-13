import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL } from "../../utils/api";

type Album = {
  id: number;
  name: string;
};

const noCache = (url: string) => `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;

export default function Dashboard() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [storageUsed, setStorageUsed] = useState<number>(0);
  const [storageLimit, setStorageLimit] = useState<number>(10);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const authHeader: HeadersInit = token && token !== "undefined"
    ? { Authorization: `Bearer ${token}` }
    : {};

  const ensureAuthOrRedirect = () => {
    if (!token || token === "undefined") {
      navigate("/login");
      return false;
    }
    return true;
  };

  const handleAuthError = (status: number) => {
    if (status === 401 || status === 422) {
      navigate("/login");
      return true;
    }
    return false;
  };

  const fetchAlbums = async () => {
    if (!ensureAuthOrRedirect()) return;
    try {
      const res = await fetch(noCache(`${BASE_URL}/albums`), {
        headers: authHeader,
        credentials: "omit",
        cache: "no-store",
      });
      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        let msg = "Failed to fetch albums";
        try { const j = await res.json(); msg = j?.msg || msg; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setAlbums(data.albums || []);
    } catch (err) {
      console.error("Failed to fetch dashboard albums:", err);
    }
  };

  const fetchStorage = async () => {
    if (!ensureAuthOrRedirect()) return;
    try {
      const res = await fetch(noCache(`${BASE_URL}/dashboard/storage`), {
        headers: authHeader,
        credentials: "omit",
        cache: "no-store",
      });
      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        let msg = "Failed to fetch storage";
        try { const j = await res.json(); msg = j?.msg || msg; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setStorageUsed(Number(data.used_gb || 0));
      setStorageLimit(Number(data.limit_gb || 10));
    } catch (err) {
      console.error("Failed to fetch storage:", err);
    }
  };

  useEffect(() => {
    fetchAlbums();
    fetchStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentAlbums = albums.slice(-3).reverse();
  const pct = storageLimit > 0 ? Math.min(100, Math.round((storageUsed / storageLimit) * 100)) : 0;

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold text-[var(--primary)] mb-4">Dashboard</h1>

      {/* Storage Summary */}
      <section className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-2 text-[var(--primary)]">Storage Usage</h2>
        <div className="w-full bg-gray-200 rounded h-4 mb-2 overflow-hidden">
          <div
            className="h-4 rounded bg-[var(--accent)] transition-all"
            style={{ width: `${pct}%` }}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          />
        </div>
        <p className="text-sm text-gray-600">
          {storageUsed.toFixed(2)} GB of {storageLimit.toFixed(2)} GB used ({pct}%)
        </p>
      </section>

      {/* Recent Albums */}
      <section className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-2 text-[var(--primary)]">Recent Albums</h2>
        {recentAlbums.length === 0 ? (
          <p className="text-sm text-gray-500">No albums yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentAlbums.map((album) => (
              <li key={album.id}>
                <Link
                  to={`/albums/${album.id}`}
                  className="text-[var(--secondary)] hover:underline"
                >
                  {album.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick Links */}
      <section className="p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-2 text-[var(--primary)]">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/albums"
            className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-4 py-2 rounded"
          >
            View All Albums
          </Link>
          <Link
            to="/events"
            className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-4 py-2 rounded"
          >
            Manage Events
          </Link>
          <Link
            to="/account/settings"
            className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-4 py-2 rounded"
          >
            Account Settings
          </Link>
        </div>
      </section>
    </main>
  );
}
