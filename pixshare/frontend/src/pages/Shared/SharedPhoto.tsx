// src/pages/Shared/SharedPhoto.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BASE_URL, PHOTO_BASE_URL } from "../../utils/api";

type Photo = {
  id: number;
  filename: string;
  filepath: string; // e.g. photos/<user>/<album>/file.jpg
  uploaded_at: string;
};

type Comment = {
  id: number;
  content: string;
  author: string;
  created_at: string;
};

type OpenPhotoResponse = {
  photo: Photo;
  can_comment?: boolean;
};

// Force-bypass HTTP cache for public share endpoints
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

export default function SharedPhoto() {
  const { token } = useParams(); // from /shared/photo/:token

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [canComment, setCanComment] = useState<boolean>(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [posting, setPosting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Load photo (and can_comment flag)
  useEffect(() => {
    const loadPhoto = async () => {
      if (!token) return;
      try {
        const res = await noCacheFetch(`${BASE_URL}/s/${encodeURIComponent(token)}/photo`);
        const data = (await res.json()) as OpenPhotoResponse;
        if (!res.ok) throw new Error((data as any)?.msg || "Invalid or expired link");
        setPhoto(data.photo);
        setCanComment(!!data.can_comment);
      } catch (e: any) {
        setError(e?.message || "Failed to open shared link");
      }
    };
    loadPhoto();
  }, [token]);

  // Load comments once we know the photo id
  useEffect(() => {
    const loadComments = async () => {
      if (!token || !photo?.id) return;
      try {
        const res = await noCacheFetch(
          `${BASE_URL}/photos/${photo.id}/comments?t=${encodeURIComponent(token)}`
        );
        if (!res.ok) {
          // If backend chooses to return 403/404 for disabled or unknown, just show none.
          return;
        }
        const data = await res.json();
        setComments(data?.comments || []);
      } catch {
        /* ignore comment load errors on public page */
      }
    };
    loadComments();
  }, [token, photo?.id]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !photo?.id || !newComment.trim() || posting) return;
    try {
      setPosting(true);
      const res = await fetch(
        `${BASE_URL}/photos/${photo.id}/comments?t=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({ content: newComment.trim() }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as any)?.msg || "Failed to post comment");
      }
      // Append newly created comment
      if (data?.comment) {
        setComments((prev) => [...prev, data.comment as Comment]);
      } else {
        // Fallback: refetch the list
        const r2 = await noCacheFetch(
          `${BASE_URL}/photos/${photo.id}/comments?t=${encodeURIComponent(token)}`
        );
        const j2 = await r2.json().catch(() => ({}));
        if (j2?.comments) setComments(j2.comments);
      }
      setNewComment("");
    } catch (e: any) {
      alert(e?.message || "Could not post comment");
    } finally {
      setPosting(false);
    }
  };

  if (error) {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-red-600 mb-2">Unable to open link</h1>
        <p className="text-gray-700">{error}</p>
      </main>
    );
  }

  if (!photo) return <main className="p-6">Loading…</main>;

  // IMPORTANT: pass token so /uploads authorizes this public request
  const imgSrc = `${PHOTO_BASE_URL}/uploads/${photo.filepath}?t=${encodeURIComponent(
    token || ""
  )}`;

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <img src={imgSrc} alt={photo.filename} className="w-full rounded shadow mb-4" />
      <p className="text-lg text-[var(--primary)] mb-6">{photo.filename}</p>

      {/* Comments */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-[var(--primary)] mb-3">Comments</h2>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 mb-3">No comments yet.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {comments.map((c) => (
              <li
                key={c.id}
                className="bg-white rounded px-4 py-2 shadow text-sm flex items-start justify-between gap-3"
              >
                <div>
                  <strong>{c.author || "Guest"}</strong>: {c.content}
                  <div className="text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {canComment ? (
          <form onSubmit={handlePost} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment"
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              type="submit"
              disabled={posting || newComment.trim().length === 0}
              className="bg-[var(--primary)] text-white px-4 py-2 rounded disabled:opacity-60"
            >
              {posting ? "Posting…" : "Post"}
            </button>
          </form>
        ) : (
          <p className="text-xs text-gray-500">
            Commenting is disabled for this share link.
          </p>
        )}
      </section>
    </main>
  );
}
