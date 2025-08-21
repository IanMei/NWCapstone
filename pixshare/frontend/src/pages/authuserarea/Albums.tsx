import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL, PHOTO_BASE_URL } from "../../utils/api";

type Album = {
  id: number;
  name: string;
  photo_count?: number;
};

const noCache = (url: string) => `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;

export default function Albums() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [covers, setCovers] = useState<Record<number, string | null>>({});
  const [newAlbumName, setNewAlbumName] = useState("");
  const navigate = useNavigate();

  const getToken = (): string | null => {
    const token = localStorage.getItem("token");
    return token && token !== "undefined" ? token : null;
  };

  const ownerImgQS = (() => {
    const t = getToken();
    return t ? `?a=${encodeURIComponent(t)}` : "";
  })();

  const handleAuthError = (status: number) => {
    if (status === 401 || status === 422) {
      navigate("/login");
      return true;
    }
    return false;
  };

  const fetchAlbums = async (token: string) => {
    try {
      const res = await fetch(noCache(`${BASE_URL}/albums`), {
        headers: { Authorization: `Bearer ${token}` },
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
      console.error("Failed to fetch albums:", err);
    }
  };

  // Load a cover (first photo) for each album
  const fetchCovers = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const entries = await Promise.all(
        albums.map(async (a) => {
          try {
            const res = await fetch(noCache(`${BASE_URL}/albums/${a.id}/photos`), {
              headers: { Authorization: `Bearer ${token}` },
              credentials: "omit",
              cache: "no-store",
            });
            if (!res.ok) return [a.id, null] as const;
            const data = await res.json();
            const first = (data.photos || [])[0];
            return [a.id, first ? (first.filepath as string) : null] as const;
          } catch {
            return [a.id, null] as const;
          }
        })
      );
      setCovers(Object.fromEntries(entries));
    } catch (e) {
      console.warn("Cover load failed:", e);
      setCovers({});
    }
  };

  const createAlbum = async () => {
    const token = getToken();
    if (!token || !newAlbumName.trim()) return;
    try {
      const res = await fetch(`${BASE_URL}/albums`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "omit",
        cache: "no-store",
        body: JSON.stringify({ name: newAlbumName }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlbums((prev) => [...prev, { ...data.album, photo_count: 0 }]);
        setNewAlbumName("");
      } else {
        if (handleAuthError(res.status)) return;
        throw new Error(data?.msg || "Failed to create album");
      }
    } catch (err) {
      console.error("Failed to create album:", err);
    }
  };

  const deleteAlbum = async (id: number) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/albums/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "omit",
        cache: "no-store",
      });
      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.msg || "Failed to delete album");
      }
      setAlbums((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete album:", err);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      console.warn("No valid token. Redirecting to login...");
      navigate("/login");
    } else {
      fetchAlbums(token);
    }
  }, [navigate]);

  useEffect(() => {
    if (albums.length > 0) fetchCovers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albums.map((a) => a.id).join(",")]);

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4 text-[var(--primary)]">My Albums</h1>

      <div className="mb-6 flex gap-2">
        <input
          value={newAlbumName}
          onChange={(e) => setNewAlbumName(e.target.value)}
          placeholder="New album name"
          className="px-4 py-2 border rounded w-full max-w-sm"
        />
        <button
          onClick={createAlbum}
          className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-4 py-2 rounded"
        >
          Create
        </button>
      </div>

      {/* Album cards with cover images */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {albums.map((album) => {
          const coverPath = covers[album.id] || null;
          const coverUrl = coverPath
            ? `${PHOTO_BASE_URL}/uploads/${coverPath}${ownerImgQS}`
            : null;

          return (
            <div key={album.id} className="rounded overflow-hidden shadow bg-white">
              <Link to={`/albums/${album.id}`} title={album.name} className="block">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={album.name}
                    className="w-full h-40 md:h-48 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-40 md:h-48 bg-gray-100 text-gray-500 flex items-center justify-center text-sm">
                    No cover image
                  </div>
                )}
              </Link>

              <div className="p-3 flex items-center justify-between">
                <Link
                  to={`/albums/${album.id}`}
                  className="text-lg text-[var(--secondary)] hover:underline truncate"
                >
                  {album.name}
                </Link>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {(album.photo_count ?? 0)} photos
                </span>
              </div>

              <div className="px-3 pb-3">
                <button
                  onClick={() => deleteAlbum(album.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
