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
        try { const j = await res.json(); msg = j?.msg || msg; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventName.trim()) return;
    try {
      const res = await fetch(`${BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        credentials: "omit",
        cache: "no-store",
        body: JSON.stringify({ name: eventName }),
      });
      const data = await res.json();
      if (res.ok) {
        setEvents((prev) => [...prev, data.event]);
        setEventName("");
      } else {
        if (handleAuthError(res.status)) return;
        throw new Error(data?.msg || "Create failed");
      }
    } catch (err) {
      console.error("Create failed", err);
    }
  };

  const copyShare = async (shareId?: string | null) => {
    if (!shareId) return;
    const url = `${window.location.origin}/shared/event/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
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
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={handleCreateEvent}
          className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-4 py-2 rounded"
        >
          Create
        </button>
      </div>

      {/* Events List */}
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
                {event.shareId ? (
                  <button
                    onClick={() => copyShare(event.shareId)}
                    className="text-sm bg-[var(--primary)] hover:bg-[var(--secondary)] text-white px-3 py-1 rounded"
                    title="Copy public share link"
                  >
                    Copy Share Link
                  </button>
                ) : (
                  <span className="text-xs text-gray-500">No share link</span>
                )}
              </div>
            </div>

            {event.shareId && (
              <p className="text-sm text-gray-600 mt-1 break-all">
                Share URL:{" "}
                <code>{`${window.location.origin}/shared/event/${event.shareId}`}</code>
              </p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
