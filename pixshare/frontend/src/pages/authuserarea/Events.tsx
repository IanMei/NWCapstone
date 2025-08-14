// src/pages/Events/Events.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL } from "../../utils/api";

type EventItem = {
  id: number;
  name: string;
  shareId?: string | null;
};

const noCache = (url: string) => `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventName, setEventName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("token") || "";
  const headers: HeadersInit =
    token && token !== "undefined" ? { Authorization: `Bearer ${token}` } : {};

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
      setEvents(data.events || []);
    } catch (err) {
      console.error("Failed to fetch events", err);
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
        // Put new event at top
        setEvents((prev) => [data.event, ...prev]);
        setEventName("");
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
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!token || token === "undefined") {
      navigate("/login");
      return;
    }
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDownCreate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateEvent();
    }
  };

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--primary)] mb-4">Event Albums</h1>

      {/* Create Event */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Event Name (e.g., Wedding 2025)"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          onKeyDown={onKeyDownCreate}
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={handleCreateEvent}
          disabled={creating || !eventName.trim()}
          className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] disabled:opacity-60 text-white px-4 py-2 rounded"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <p className="text-sm text-gray-600">No events yet. Create your first one above.</p>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => (
            <li key={event.id} className="bg-white p-4 rounded shadow">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => navigate(`/events/${event.id}`)}
                  className="text-left text-lg font-semibold text-[var(--secondary)] hover:underline"
                  title="Open event"
                >
                  {event.name}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    disabled={deletingId === event.id}
                    className="text-sm bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white px-3 py-1 rounded"
                    title="Delete event"
                  >
                    {deletingId === event.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
