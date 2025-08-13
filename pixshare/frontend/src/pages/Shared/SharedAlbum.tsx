import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BASE_URL, PHOTO_BASE_URL } from "../../utils/api";

type SharedPhoto = {
  id: number;
  filename: string;
  filepath: string; // e.g., "photos/<user>/<album>/<file>"
  uploaded_at: string;
};

type SharedAlbumResponse = {
  album: { id: number; name: string };
  photos: SharedPhoto[];
  can_comment: boolean; // currently informational; public comments not implemented server-side
};

export default function SharedAlbum() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedAlbumResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string>("");

  // Copy helper state
  const [copied, setCopied] = useState(false);
  const shareInputRef = useRef<HTMLInputElement>(null);

  const shareUrl = useMemo(() => {
    if (!token) return "";
    return `${window.location.protocol}//${window.location.host}/shared/album/${token}`;
  }, [token]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setErrMsg("");
      try {
        const res = await fetch(`${BASE_URL.replace("/api", "")}/api/s/${token}/album`, {
          method: "GET",
          credentials: "include",
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.msg || "Failed to open shared album");
        }
        setData(payload as SharedAlbumResponse);
      } catch (e: any) {
        setErrMsg(e?.message || "Unable to load this shared album.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // robust copy (Clipboard API + fallback)
  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
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
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      alert("Could not copy. Please copy the link manually.");
    }
  };

  if (loading) {
    return (
      <main className="p-6">
        <p>Loading shared album…</p>
      </main>
    );
  }

  if (errMsg || !data) {
    return (
      <main className="p-6">
        <p className="text-red-600 mb-3">{errMsg || "Album not found or link expired."}</p>
        <Link to="/" className="text-[var(--primary)] hover:underline">
          ← Back to Home
        </Link>
      </main>
    );
  }

  const { album, photos, can_comment } = data;
  const countLabel = `${photos.length} ${photos.length === 1 ? "photo" : "photos"}`;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <h1 className="text-3xl font-bold text-[var(--primary)]">
        {album.name} <span className="text-base text-gray-600">({countLabel})</span>
      </h1>
      {can_comment ? (
        <p className="text-xs text-gray-500 mt-1">Comments may be allowed by the owner.</p>
      ) : (
        <p className="text-xs text-gray-500 mt-1">Comments are disabled for this shared album.</p>
      )}

      {/* Grid */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {photos.map((p) => {
          // IMPORTANT: pass ?t=<token> so backend authorizes public access
          const src = `${PHOTO_BASE_URL}/uploads/${p.filepath}?t=${token}`;
          return (
            <a
              key={p.id}
              href={src}
              target="_blank"
              rel="noreferrer"
              className="block border rounded overflow-hidden bg-white shadow hover:shadow-md transition"
              title={p.filename}
            >
              <img src={src} alt={p.filename} className="w-full h-40 object-cover" />
            </a>
          );
        })}
      </div>
    </main>
  );
}
