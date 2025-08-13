// src/pages/Shared/SharedEvent.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { BASE_URL } from "../../utils/api";

type Album = { id: number; name: string };
type Photo = {
  id: number;
  filename: string;
  filepath: string;
  uploaded_at: string;
  album_id?: number;
};

type SharedEventResponse = {
  event: {
    id: number;
    name: string;
    description?: string | null;
    date?: string | null;
  };
  albums: Album[];
  photos?: Photo[];
  can_comment?: boolean; // reused as "can_collaborate"
};

// Force-bypass HTTP cache on public share endpoints
const noCacheFetch = (url: string, init: RequestInit = {}) =>
  fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`, {
    ...init,
    credentials: "omit",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(init.headers || {}),
    },
  });

export default function SharedEvent() {
  const { token: shareToken } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<SharedEventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // album filter
  const [albumFilter, setAlbumFilter] = useState<number | "all">("all");

  // collaboration UI
  const [addingIds, setAddingIds] = useState<string>(""); // comma-separated IDs
  const [saving, setSaving] = useState<boolean>(false);

  // share copy UI (optional)
  const [copied, setCopied] = useState(false);
  const shareInputRef = useRef<HTMLInputElement>(null);

  const IMG_BASE = BASE_URL.replace("/api", "");

  const getJWT = () => {
    const t = localStorage.getItem("token");
    return t && t !== "undefined" ? t : null;
  };
  const authHeaders = (): HeadersInit => {
    const jwt = getJWT();
    return jwt ? { Authorization: `Bearer ${jwt}` } : {};
  };

  const load = async () => {
    if (!shareToken) {
      setErr("Missing share token");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErr("");
      const res = await noCacheFetch(`${BASE_URL}/s/${encodeURIComponent(shareToken)}/event`);
      if (!res.ok) {
        let msg = "Failed to open shared event";
        try {
          const j = await res.json();
          msg = j?.msg || msg;
        } catch {}
        throw new Error(msg);
      }
      const j = (await res.json()) as SharedEventResponse;
      setData(j);
    } catch (e: any) {
      setErr(e?.message || "Error loading shared event");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareToken]);

  const photos = useMemo<Photo[]>(() => {
    if (!data) return [];
    const list = (data as any).photos || (data as any).event?.photos || [];
    if (albumFilter === "all") return list;
    return list.filter((p: Photo) => p.album_id === albumFilter);
  }, [data, albumFilter]);

  // ---- Collaboration actions (via share token) -----------------------------

  const addAlbumsById = async () => {
    if (!data || !shareToken) return;
    const jwt = getJWT();
    if (!jwt) {
      alert("Please log in to add your albums to this event.");
      navigate("/login");
      return;
    }

    const eventId = data.event.id;

    // Parse comma-separated IDs -> number[]
    const ids = Array.from(
      new Set(
        addingIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => Number(s))
          .filter((n) => Number.isFinite(n) && n > 0)
      )
    );

    if (ids.length === 0) {
      alert("Please enter one or more album IDs (comma-separated).");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(
        `${BASE_URL}/events/${eventId}/albums?t=${encodeURIComponent(shareToken)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ album_ids: ids }),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j?.msg || "Failed to add albums");
      }
      // Re-load the shared payload to reflect new albums + photos
      await load();
      setAddingIds("");
    } catch (e: any) {
      alert(e?.message || "Add failed");
    } finally {
      setSaving(false);
    }
  };

  const removeAlbum = async (albumId: number) => {
    if (!data || !shareToken) return;
    const jwt = getJWT();
    if (!jwt) {
      alert("Please log in.");
      navigate("/login");
      return;
    }
    const eventId = data.event.id;
    if (!confirm("Remove this album from the event? (Owner only)")) return;

    try {
      setSaving(true);
      const res = await fetch(
        `${BASE_URL}/events/${eventId}/albums/${albumId}?t=${encodeURIComponent(shareToken)}`,
        {
          method: "DELETE",
          headers: {
            ...authHeaders(),
          },
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.msg || "Failed to remove album");
      await load();
    } catch (e: any) {
      alert(e?.message || "Remove failed (only the event owner can remove albums).");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <p>Loading shared event…</p>
      </main>
    );
  }

  if (err || !data) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <p className="text-red-600">{err || "This shared event is unavailable."}</p>
        <Link to="/" className="inline-block mt-2 text-[var(--secondary)] hover:underline">
          Go home
        </Link>
      </main>
    );
  }

  const { event, albums } = data;
  const total = photos.length;

  // Optional copy UI
  // const publicShareUrl = `${window.location.protocol}//${window.location.host}/shared/event/${shareToken}`;
  // const copyShareUrl = async () => {
  //   try {
  //     await navigator.clipboard.writeText(publicShareUrl);
  //     setCopied(true);
  //     setTimeout(() => setCopied(false), 1200);
  //   } catch {}
  // };

  return (
    <main className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-[var(--primary)]">
          {event.name}
          <span className="ml-2 text-base text-gray-600">
            {total} {total === 1 ? "photo" : "photos"}
          </span>
        </h1>
        {event.date && (
          <div className="text-sm text-gray-600">
            {new Date(event.date).toLocaleDateString()}
          </div>
        )}
        {event.description && (
          <p className="mt-2 text-sm text-gray-700">{event.description}</p>
        )}

        {/* Share link (optional convenience)
        <div className="mt-3 flex items-stretch gap-2">
          <input
            ref={shareInputRef}
            readOnly
            value={publicShareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="px-2 py-2 border rounded-l text-sm w-[360px]"
          />
          <button
            onClick={copyShareUrl}
            className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-3 rounded-r text-sm"
            title="Copy share link"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div> */}
      </div>

      {/* Collaboration: manage albums with share_token */}
      <section className="mb-6 bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Manage Albums in this Event</h2>

        {/* Existing albums (with remove) */}
        {albums.length === 0 ? (
          <p className="text-sm text-gray-500">No albums added yet.</p>
        ) : (
          <ul className="divide-y mb-4">
            {albums.map((a) => (
              <li key={a.id} className="py-2 flex items-center justify-between">
                <span className="text-[var(--secondary)]">{a.name}</span>
                <button
                  onClick={() => removeAlbum(a.id)}
                  className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  disabled={saving}
                  title="Owner only"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add by ID(s) for now (until we expose a picker) */}
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <label className="text-sm text-gray-600">Add your albums by ID:</label>
          <input
            type="text"
            value={addingIds}
            onChange={(e) => setAddingIds(e.target.value)}
            placeholder="e.g. 3, 5, 9"
            className="px-3 py-2 border rounded w-72"
          />
          <button
            onClick={addAlbumsById}
            disabled={saving || addingIds.trim().length === 0}
            className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          You must be logged in. Only albums you own can be attached. Removal is owner-only.
        </p>
      </section>

      {/* Album filter */}
      {albums.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm text-gray-600">Filter photos by album:</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={albumFilter}
            onChange={(e) =>
              setAlbumFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">All albums</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Photos */}
      {photos.length === 0 ? (
        <p className="text-sm text-gray-500">No photos to display.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((p) => (
            <div
              key={`${p.album_id ?? "x"}-${p.id}`}
              className="border rounded overflow-hidden shadow bg-white"
            >
              <img
                // Important: pass the share token so /uploads authorizes the file
                src={`${IMG_BASE}/uploads/${p.filepath}?t=${encodeURIComponent(shareToken!)}`}
                alt={p.filename}
                className="w-full h-44 object-cover"
                loading="lazy"
              />
              <div className="px-2 py-1 text-xs text-gray-600 flex justify-between">
                <span className="truncate" title={p.filename}>
                  {p.filename}
                </span>
                {p.album_id && (
                  <span className="ml-2 text-gray-400" title="Album">
                    {albums.find((a) => a.id === p.album_id)?.name ?? `Album ${p.album_id}`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
