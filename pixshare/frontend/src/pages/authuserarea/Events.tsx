import { useState, useEffect } from "react";
import { BASE_URL } from "../../utils/api";

type EventAlbum = {
  id: number;
  name: string;
  shareId: string;
};

export default function Events() {
  const [events, setEvents] = useState<EventAlbum[]>([]);
  const [eventName, setEventName] = useState("");
  const token = localStorage.getItem("token");

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${BASE_URL}/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEvents(data.events);
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventName.trim()) return;
    try {
      const res = await fetch(`${BASE_URL}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: eventName }),
      });
      const data = await res.json();
      if (res.ok) {
        setEvents((prev) => [...prev, data.event]);
        setEventName("");
      }
    } catch (err) {
      console.error("Create failed", err);
    }
  };

  useEffect(() => {
    fetchEvents();
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
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{event.name}</h2>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${window.location.origin}/shared/album/${event.shareId}`
                  )
                }
                className="text-sm bg-[var(--primary)] hover:bg-[var(--secondary)] text-white px-3 py-1 rounded"
              >
                Copy Share Link
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Share ID: <code>{event.shareId}</code>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
