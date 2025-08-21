// src/pages/Events/Events.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL, PHOTO_BASE_URL } from "../../utils/api";

type EventItem = {
  id: number;
  name: string;
  shareId?: string | null;
};

type EventMeta = {
  coverPath: string | null;
  photoCount: number;
};

const noCache = (url: string) => `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [meta, setMeta] = useState<Record<number, EventMeta>>({});
  const [eventName, setEventName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const navigate = useNavigate();

  const getToken = (): string | null => {
    const token = localStorage.getItem("token");
    return token && token !== "undefined" ? token : null;
  };

  const ownerImgQS = (() => {
    const t = getToken();
    return t ? `?a=${encodeURIComponent(t)}` : "";
  })();

  const headers: HeadersInit = getToken() ? { Authorization: `Bearer ${getToken()}` } : {};

  const handleAuthError = (status: number) => {
    if (status === 401 || status === 422) {
      navigate("/login");
      return true;
    }
    return false;
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(noCache(`${BASE_URL}/events`), {
        headers,
        credentials: "omit",
        cache: "no-store",
      });
      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        let msg = "Failed to fetch events";
        try {
          const j = await res.json();
          msg = j?.msg || msg;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      const list: EventItem[] = data.events || [];
      setEvents(list);
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
  };

  // Load preview cover + photoCount for each event (sums album photo_count if available)
  const fetchEventMeta = async (list: EventItem[]) => {
    if (!list.length) {
      setMeta({});
      return;
    }
    setLoadingMeta(true);
    try {
      const entries = await Promise.all(
        list.map(async (ev) => {
          try {
            // 1) Get event detail -> albums (id, name, maybe photo_count)
            const evRes = await fetch(noCache(`${BASE_URL}/events/${ev.id}`), {
              headers,
              credentials: "omit",
              cache: "no-store",
            });
            if (!evRes.ok) throw new Error("event detail failed");
            const evData = await evRes.json();
            const albums: { id: number; name: string; photo_count?: number }[] =
              evData?.event?.albums || [];

            // Compute photoCount (use album.photo_count when present)
            const photoCount = albums.reduce(
              (sum, a) => sum + (typeof a.photo_count === "number" ? a.photo_count : 0),
              0
            );

            // 2) Find first album that has at least one photo and use its first photo as cover
            let coverPath: string | null = null;
            for (const a of albums) {
              const phRes = await fetch(noCache(`${BASE_URL}/albums/${a.id}/photos`), {
                headers,
                credentials: "omit",
                cache: "no-store",
              });
              if (!phRes.ok) continue;
              const phData = await phRes.json();
              const first = (phData.photos || [])[0];
              if (first?.filepath) {
                coverPath = first.filepath as string;
                break;
              }
            }
            return [ev.id, { coverPath, photoCount }] as const;
          } catch {
            return [ev.id, { coverPath: null, photoCount: 0 }] as const;
          }
        })
      );
      setMeta(Object.fromEntries(entries));
    } catch (e) {
      console.warn("Cover/metadata loading failed:", e);
      setMeta({});
    } finally {
      setLoadingMeta(false);
    }
  };

  const handleCreateEvent = async () => {
    const name = eventName.trim();
    if (!name || creating) return;
    try {
      setCreating(true);
      const res = await fetch(`${BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        credentials: "omit",
        cache: "no-store",
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        const next = [data.event, ...events];
        setEvents(next);
        setEventName("");
        // fetch meta just for the new one
        fetchEventMeta([data.event]);
      } else {
        if (handleAuthError(res.status)) return;
        throw new Error(data?.msg || "Create failed");
      }
    } catch (err) {
      console.error("Create failed", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    try {
      setDeletingId(eventId);
      const res = await fetch(`${BASE_URL}/events/${eventId}`, {
        method: "DELETE",
        headers,
        credentials: "omit",
      });
      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        let msg = "Delete failed";
        try {
          const j = await res.json();
          msg = j?.msg || msg;
        } catch {}
        throw new Error(msg);
      }
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setMeta((prev) => {
        const copy = { ...prev };
        delete copy[eventId];
        return copy;
      });
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const t = getToken();
    if (!t) {
      navigate("/login");
      return;
    }
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)load meta whenever event set changes
  useEffect(() => {
    if (events.length) fetchEventMeta(events);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.map((e) => e.id).join(",")]);

  const onKeyDownCreate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateEvent();
    }
  };

  const plural = (n: number, s: string) => (n === 1 ? s : `${s}s`);

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold text-[var(--primary)] mb-4">Event Albums</h1>

      {/* Create */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Event Name (e.g., Wedding 2025)"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          onKeyDown={onKeyDownCreate}
          className="px-4 py-2 border rounded w-full max-w-sm"
        />
        <button
          onClick={handleCreateEvent}
          disabled={creating || !eventName.trim()}
          className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] disabled:opacity-60 text-white px-4 py-2 rounded"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </div>

      {/* Event cards with cover images (same visual style as Albums) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {events.map((ev) => {
          const m = meta[ev.id];
          const coverUrl =
            m?.coverPath ? `${PHOTO_BASE_URL}/uploads/${m.coverPath}${ownerImgQS}` : null;
          const count = m?.photoCount ?? 0;

          return (
            <div key={ev.id} className="rounded overflow-hidden shadow bg-white">
              <Link to={`/events/${ev.id}`} title={ev.name} className="block">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={ev.name}
                    className="w-full h-40 md:h-48 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-40 md:h-48 bg-gray-100 text-gray-500 flex items-center justify-center text-sm">
                    {loadingMeta ? "Loading…" : "No cover image"}
                  </div>
                )}
              </Link>

              <div className="p-3 flex items-center justify-between">
                <Link
                  to={`/events/${ev.id}`}
                  className="text-lg text-[var(--secondary)] hover:underline truncate"
                >
                  {ev.name}
                </Link>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {count} {plural(count, "photo")}
                </span>
              </div>

              <div className="px-3 pb-3">
                <button
                  onClick={() => handleDeleteEvent(ev.id)}
                  disabled={deletingId === ev.id}
                  className="text-sm text-red-600 hover:underline disabled:opacity-60"
                >
                  {deletingId === ev.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <p className="text-sm text-gray-600">No events yet. Create your first one above.</p>
      )}
    </main>
  );
}
