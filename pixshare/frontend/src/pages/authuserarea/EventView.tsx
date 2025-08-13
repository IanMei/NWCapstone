import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { BASE_URL } from "../../utils/api";

type Album = { id: number; name: string; photo_count?: number };
type EventDetails = {
  id: number;
  name: string;
  description?: string | null;
  date?: string | null;
  albums: Album[];
  shareId?: string | null; // ignored for initial UI to avoid stale link
};

type Photo = {
  id: number;
  filename: string;
  filepath: string;   // relative path under /uploads
  uploaded_at: string;
  album_id?: number;  // we add this client-side so we can filter
};

const noCacheFetchInit = (headers: HeadersInit): RequestInit => ({
  method: "GET",
  headers: {
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    ...headers,
  },
  credentials: "include",
  cache: "no-store",
});

export default function EventView() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";

  const [eventInfo, setEventInfo] = useState<EventDetails | null>(null);
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // photos-in-event
  const [eventPhotos, setEventPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState<boolean>(false);
  const [albumFilter, setAlbumFilter] = useState<number | "all">("all");

  // share UI — start EMPTY so user must click to generate
  const [shareToken, setShareToken] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const shareInputRef = useRef<HTMLInputElement>(null);

  const requireAuth = () => {
    if (!token || token === "undefined") {
      navigate("/login");
      return false;
    }
    return true;
  };

  const fetchEvent = async () => {
    if (!eventId) {
      setErrorMsg("Missing event id in the URL.");
      setLoading(false);
      return;
    }
    try {
      const url = `${BASE_URL}/events/${eventId}?_=${Date.now()}`;
      const res = await fetch(url, noCacheFetchInit({ Authorization: `Bearer ${token}` }));

      if (res.status === 304) return;

      if (!res.ok) {
        let msg = `Failed to load event #${eventId}`;
        try {
          const data = await res.json();
          msg = data?.msg || msg;
        } catch {}
        throw new Error(msg);
      }

      const data = await res.json();
      setEventInfo(data.event);

      // IMPORTANT: do NOT prefill share link from backend to avoid showing a stale/broken link.
      // If you want to show an existing link later, you could add a "Load existing link" button.
      // if (data?.event?.shareId) setShareToken(data.event.shareId);  <-- intentionally disabled
    } catch (err: any) {
      console.error("fetchEvent error:", err);
      setErrorMsg(err.message || "Failed to load event");
    }
  };

  const fetchAllAlbums = async () => {
    try {
      const url = `${BASE_URL}/albums?_=${Date.now()}`;
      const res = await fetch(url, noCacheFetchInit({ Authorization: `Bearer ${token}` }));

      if (res.status === 304) return;

      if (!res.ok) {
        let msg = "Failed to load albums";
        try {
          const data = await res.json();
          msg = data?.msg || msg;
        } catch {}
        throw new Error(msg);
      }

      const data = await res.json();
      setAllAlbums(data.albums || []);
    } catch (err: any) {
      console.error("fetchAllAlbums error:", err);
      setErrorMsg((prev) => prev || err.message || "Failed to load albums");
    }
  };

  // Fetch photos for all albums inside this event
  const fetchEventPhotos = async (albums: Album[]) => {
    if (!albums || albums.length === 0) {
      setEventPhotos([]);
      return;
    }
    setPhotosLoading(true);
    try {
      const results = await Promise.all(
        albums.map(async (a) => {
          const url = `${BASE_URL}/albums/${a.id}/photos?_=${Date.now()}`;
          const res = await fetch(url, noCacheFetchInit({ Authorization: `Bearer ${token}` }));
          if (!res.ok) {
            // If one album fails, log and continue the rest
            try {
              const data = await res.json();
              console.warn("Album photos fetch failed:", a.id, data?.msg || res.statusText);
            } catch {
              console.warn("Album photos fetch failed:", a.id, res.statusText);
            }
            return [] as Photo[];
          }
          const data = await res.json();
          const withAlbum = (data.photos || []).map((p: Photo) => ({
            ...p,
            album_id: a.id,
          }));
          return withAlbum as Photo[];
        })
      );
      const merged = results.flat();
      setEventPhotos(merged);
    } catch (e) {
      console.error("fetchEventPhotos error:", e);
      setEventPhotos([]);
    } finally {
      setPhotosLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!requireAuth()) return;
    setLoading(true);
    setErrorMsg("");

    Promise.allSettled([fetchEvent(), fetchAllAlbums()]).finally(() => {
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // When eventInfo.albums changes, (re)load photos for those albums
  useEffect(() => {
    if (eventInfo?.albums) {
      fetchEventPhotos(eventInfo.albums);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventInfo?.albums?.map((a) => a.id).join(",")]);

  const availableAlbums = useMemo(() => {
    if (!eventInfo) return allAlbums;
    const existing = new Set(eventInfo.albums.map((a) => a.id));
    return allAlbums.filter((a) => !existing.has(a.id));
  }, [allAlbums, eventInfo]);

  const filteredPhotos = useMemo(() => {
    if (albumFilter === "all") return eventPhotos;
    return eventPhotos.filter((p) => p.album_id === albumFilter);
  }, [eventPhotos, albumFilter]);

  const toggleSelect = (id: number) => {
    setSelectedAlbumIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addSelectedAlbums = async () => {
    if (!eventId || selectedAlbumIds.length === 0) return;
    try {
      const res = await fetch(`${BASE_URL}/events/${eventId}/albums`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ album_ids: selectedAlbumIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.msg || "Failed to add albums");
      await fetchEvent();              // refresh event (and photos via effect)
      setSelectedAlbumIds([]);
    } catch (err: any) {
      console.error("addSelectedAlbums error:", err);
      alert(err.message || "Add failed");
    }
  };

  const removeAlbum = async (albumId: number) => {
    if (!eventId) return;
    try {
      const res = await fetch(`${BASE_URL}/events/${eventId}/albums/${albumId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (res.status === 304) {
        await fetchEvent();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.msg || "Failed to remove album");
      await fetchEvent();              // refresh event (and photos via effect)
    } catch (err: any) {
      console.error("removeAlbum error:", err);
      alert(err.message || "Remove failed");
    }
  };

  const createEventShare = async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`${BASE_URL}/share/event/${eventId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ can_comment: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.msg || "Failed to create share link");
      setShareToken(data.share.token); // now show the link
    } catch (e: any) {
      console.error("createEventShare error:", e);
      alert(e.message || "Share failed");
    }
  };

  const shareUrl =
    shareToken &&
    `${window.location.protocol}//${window.location.host}/shared/event/${shareToken}`;

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard && (window as any).isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        if (shareInputRef.current) {
          shareInputRef.current.focus();
          shareInputRef.current.select();
          document.execCommand("copy");
          window.getSelection()?.removeAllRanges();
        } else {
          const el = document.createElement("textarea");
          el.value = shareUrl;
          el.style.position = "fixed";
          el.style.opacity = "0";
          document.body.appendChild(el);
          el.focus();
          el.select();
          document.execCommand("copy");
          document.body.removeChild(el);
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      alert("Could not copy. Please copy manually.");
    }
  };

  if (loading) {
    return (
      <main className="p-6">
        <button
          onClick={() => navigate("/events")}
          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded shadow text-sm mb-3"
        >
          ← All Events
        </button>
        <p>Loading event…</p>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="p-6">
        <button
          onClick={() => navigate("/events")}
          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded shadow text-sm mb-3"
        >
          ← All Events
        </button>
        <p className="text-red-600">Error: {errorMsg}</p>
      </main>
    );
  }

  if (!eventInfo) {
    return (
      <main className="p-6">
        <button
          onClick={() => navigate("/events")}
          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded shadow text-sm mb-3"
        >
          ← All Events
        </button>
        <p>Event not found.</p>
      </main>
    );
  }

  const albumCount = eventInfo.albums.length;
  const IMG_BASE = BASE_URL.replace("/api", ""); // for /uploads/**

  return (
    <main className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <div className="mb-2">
        <button
          onClick={() => navigate("/events")}
          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded shadow text-sm"
        >
          ← All Events
        </button>
      </div>

      {/* Title + count */}
      <h1 className="text-3xl font-bold text-[var(--primary)] mb-1">
        {eventInfo.name}{" "}
        <span className="text-base text-gray-600">
          ({albumCount} {albumCount === 1 ? "album" : "albums"})
        </span>
      </h1>
      {eventInfo.date && (
        <div className="text-sm text-gray-600 mb-4">
          Date: {new Date(eventInfo.date).toLocaleDateString()}
        </div>
      )}

      {/* Share section: starts as JUST a button; link appears only after generation */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <button
          onClick={createEventShare}
          className="self-start bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-3 py-2 rounded"
        >
          {shareToken ? "Regenerate Share Link" : "Generate Share Link"}
        </button>

        {shareUrl && (
          <div className="flex items-stretch">
            <input
              ref={shareInputRef}
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="px-2 py-2 border rounded-l text-sm w-[320px]"
            />
            <button
              onClick={copyShareUrl}
              className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-3 rounded-r text-sm"
              title="Copy share link"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* Add albums */}
      <section className="mb-6 bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Add Albums to this Event</h2>

        {availableAlbums.length === 0 ? (
          <p className="text-sm text-gray-500">No more albums to add.</p>
        ) : (
          <>
            <div className="max-h-48 overflow-auto border rounded">
              {availableAlbums.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedAlbumIds.includes(a.id)}
                      onChange={() => toggleSelect(a.id)}
                    />
                    <span>{a.name}</span>
                  </div>
                  {typeof a.photo_count === "number" && (
                    <span className="text-xs text-gray-500">
                      {a.photo_count} {a.photo_count === 1 ? "photo" : "photos"}
                    </span>
                  )}
                </label>
              ))}
            </div>

            <button
              onClick={addSelectedAlbums}
              disabled={selectedAlbumIds.length === 0}
              className="mt-3 bg-[var(--accent)] hover:bg-[var(--accent-dark)] disabled:opacity-60 text-white px-4 py-2 rounded"
            >
              Add {selectedAlbumIds.length}{" "}
              {selectedAlbumIds.length === 1 ? "Album" : "Albums"}
            </button>
          </>
        )}
      </section>

      {/* Current albums */}
      <section className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Albums in this Event</h2>
        {eventInfo.albums.length === 0 ? (
          <p className="text-sm text-gray-500">No albums added yet.</p>
        ) : (
          <ul className="divide-y">
            {eventInfo.albums.map((a) => (
              <li key={a.id} className="py-2 flex items-center justify-between">
                <Link
                  to={`/albums/${a.id}`}
                  className="text-[var(--secondary)] hover:underline"
                >
                  {a.name}
                </Link>
                <button
                  onClick={() => removeAlbum(a.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Photos in event + filter */}
      <section className="bg-white rounded shadow p-4">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <h2 className="text-lg font-semibold">Photos in this Event</h2>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Filter by album:</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={albumFilter}
              onChange={(e) =>
                setAlbumFilter(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
            >
              <option value="all">All albums</option>
              {eventInfo.albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {photosLoading ? (
          <p className="text-sm text-gray-500">Loading photos…</p>
        ) : filteredPhotos.length === 0 ? (
          <p className="text-sm text-gray-500">No photos to display.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredPhotos.map((p) => (
              <div key={`${p.album_id}-${p.id}`} className="border rounded overflow-hidden shadow">
                <img
                  src={`${IMG_BASE}/uploads/${p.filepath}`}
                  alt={p.filename}
                  className="w-full h-44 object-cover"
                  loading="lazy"
                />
                <div className="px-2 py-1 text-xs text-gray-600 flex justify-between">
                  <span className="truncate" title={p.filename}>
                    {p.filename}
                  </span>
                  {p.album_id && (
                    <span className="ml-2 text-gray-400">
                      #
                      {eventInfo.albums.find((a) => a.id === p.album_id)?.name ??
                        p.album_id}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
