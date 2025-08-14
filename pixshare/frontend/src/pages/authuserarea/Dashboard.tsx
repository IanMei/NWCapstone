// src/pages/Dashboard/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL, PHOTO_BASE_URL } from "../../utils/api";

type Album = {
  id: number;
  name: string;
};

type EventItem = {
  id: number;
  name: string;
  shareId?: string | null;
};

type EventCard = {
  id: number;
  name: string;
  coverPath?: string | null; // photos/<user>/<album>/file.jpg
};

const noCache = (url: string) => `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;

export default function Dashboard() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [recentEvents, setRecentEvents] = useState<EventCard[]>([]);
  const [storageUsed, setStorageUsed] = useState<number>(0);
  const [storageLimit, setStorageLimit] = useState<number>(10);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const authHeader: HeadersInit =
    token && token !== "undefined" ? { Authorization: `Bearer ${token}` } : {};

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
        try {
          const j = await res.json();
          msg = j?.msg || msg;
        } catch {}
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
        try {
          const j = await res.json();
          msg = j?.msg || msg;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setStorageUsed(Number(data.used_gb || 0));
      setStorageLimit(Number(data.limit_gb || 10));
    } catch (err) {
      console.error("Failed to fetch storage:", err);
    }
  };

  // Fetch recent 3 events and derive a cover image (first album's first photo)
  const fetchRecentEventsWithCovers = async () => {
    if (!ensureAuthOrRedirect()) return;
    try {
      setLoadingEvents(true);
      // List events (server returns newest first in your API)
      const listRes = await fetch(noCache(`${BASE_URL}/events`), {
        headers: authHeader,
        credentials: "omit",
        cache: "no-store",
      });
      if (!listRes.ok) {
        if (handleAuthError(listRes.status)) return;
        let msg = "Failed to fetch events";
        try {
          const j = await listRes.json();
          msg = j?.msg || msg;
        } catch {}
        throw new Error(msg);
      }
      const listData = await listRes.json();
      const recent = (listData.events || []).slice(0, 3) as EventItem[];

      const withCovers = await Promise.all(
        recent.map(async (ev): Promise<EventCard> => {
          try {
            // Get event detail -> albums
            const evRes = await fetch(noCache(`${BASE_URL}/events/${ev.id}`), {
              headers: authHeader,
              credentials: "omit",
              cache: "no-store",
            });
            if (!evRes.ok) throw new Error("event detail failed");
            const evData = await evRes.json();
            const albums: { id: number; name: string }[] = evData?.event?.albums || [];
            if (!albums.length) return { id: ev.id, name: ev.name, coverPath: null };

            // Get first album's photos
            const firstAlbumId = albums[0].id;
            const phRes = await fetch(noCache(`${BASE_URL}/albums/${firstAlbumId}/photos`), {
              headers: authHeader,
              credentials: "omit",
              cache: "no-store",
            });
            if (!phRes.ok) throw new Error("album photos failed");
            const phData = await phRes.json();
            const firstPhoto = (phData.photos || [])[0];
            return {
              id: ev.id,
              name: ev.name,
              coverPath: firstPhoto ? firstPhoto.filepath : null,
            };
          } catch {
            return { id: ev.id, name: ev.name, coverPath: null };
          }
        })
      );

      setRecentEvents(withCovers);
    } catch (err) {
      console.error("Failed to fetch recent events:", err);
      setRecentEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
    fetchStorage();
    fetchRecentEventsWithCovers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentAlbums = albums.slice(-3).reverse();
  const pct =
    storageLimit > 0 ? Math.min(100, Math.round((storageUsed / storageLimit) * 100)) : 0;

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

      {/* Recent Events (with cover) */}
      <section className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-3 text-[var(--primary)]">Recent Events</h2>
        {loadingEvents ? (
          <p className="text-sm text-gray-500">Loading events…</p>
        ) : recentEvents.length === 0 ? (
          <p className="text-sm text-gray-500">No events yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recentEvents.map((ev) => {
              const coverUrl =
                ev.coverPath ? `${PHOTO_BASE_URL}/uploads/${ev.coverPath}` : null;
              return (
                <Link
                  key={ev.id}
                  to={`/events/${ev.id}`}
                  className="group block rounded overflow-hidden shadow bg-white hover:shadow-md transition-shadow"
                  title={ev.name}
                >
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={ev.name}
                      className="w-full h-32 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                      No cover image
                    </div>
                  )}
                  <div className="p-3 text-[var(--secondary)] font-medium truncate">
                    {ev.name}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
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
