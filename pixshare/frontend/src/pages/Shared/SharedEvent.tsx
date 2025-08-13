// src/pages/Shared/SharedEvent.tsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
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
  can_comment?: boolean;
};

// Force-bypass HTTP cache on public share endpoints
const noCacheFetch = (url: string, init: RequestInit = {}) =>
  fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(init.headers || {}),
    },
  });

export default function SharedEvent() {
  const { token } = useParams<{ token: string }>();

  const [data, setData] = useState<SharedEventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // album filter
  const [albumFilter, setAlbumFilter] = useState<number | "all">("all");

  // share copy UI (optional)
  const [copied, setCopied] = useState(false);
  const shareInputRef = useRef<HTMLInputElement>(null);

  const IMG_BASE = BASE_URL.replace("/api", "");

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!token) {
        setErr("Missing share token");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErr("");

        const res = await noCacheFetch(
          `${BASE_URL}/s/${encodeURIComponent(token)}/event`
        );

        if (!res.ok) {
          let msg = "Failed to open shared event";
          try {
            const j = await res.json();
            msg = j?.msg || msg;
          } catch {}
          throw new Error(msg);
        }

        const j = (await res.json()) as SharedEventResponse;
        if (!alive) return;
        setData(j);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Error loading shared event");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const photos = useMemo<Photo[]>(() => {
    if (!data) return [];
    const list =
      (data as any).photos ||
      (data as any).event?.photos ||
      [];
    if (albumFilter === "all") return list;
    return list.filter((p: Photo) => p.album_id === albumFilter);
  }, [data, albumFilter]);

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

  const publicShareUrl = `${window.location.protocol}//${window.location.host}/shared/event/${token}`;

//   const copyShareUrl = async () => {
//     try {
//       if (navigator.clipboard && window.isSecureContext) {
//         await navigator.clipboard.writeText(publicShareUrl);
//       } else {
//         if (shareInputRef.current) {
//           shareInputRef.current.focus();
//           shareInputRef.current.select();
//           document.execCommand("copy");
//           window.getSelection()?.removeAllRanges();
//         }
//       }
//       setCopied(true);
//       setTimeout(() => setCopied(false), 1200);
//     } catch {
//       // ignore
//     }
//   };

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

      {/* Album filter */}
      {albums.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm text-gray-600">Filter by album:</label>
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
                src={`${IMG_BASE}/uploads/${p.filepath}?t=${encodeURIComponent(
                  token!
                )}`}
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
