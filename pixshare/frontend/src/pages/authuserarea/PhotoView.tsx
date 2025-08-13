import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BASE_URL, PHOTO_BASE_URL } from "../../utils/api";

type Comment = { id: number; content: string; author: string; created_at: string; };
type Photo = { id: number; filename: string; filepath: string; uploaded_at: string; };

export default function PhotoView() {
  const { albumId, photoId } = useParams();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [shareToken, setShareToken] = useState<string>("");   // 👈 new
  const token = localStorage.getItem("token") || "";

  useEffect(() => {
    const fetchPhotoFromAlbum = async () => {
      try {
        const res = await fetch(`${BASE_URL}/albums/${albumId}/photos`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.msg || "Failed to load photos");
        const matched = data.photos.find((p: Photo) => p.id.toString() === photoId);
        if (matched) setPhoto(matched);
        else throw new Error("Photo not found in album");
      } catch (err) { console.error("Photo fetch error:", err); }
    };

    const fetchComments = async () => {
      try {
        const res = await fetch(`${BASE_URL}/photos/${photoId}/comments`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setComments(data.comments);
      } catch (err) { console.error("Failed to load comments:", err); }
    };

    fetchPhotoFromAlbum();
    fetchComments();
  }, [albumId, photoId, token]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`${BASE_URL}/photos/${photoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ content: newComment }),
      });
      const data = await res.json();
      if (res.ok) { setComments((prev) => [...prev, data.comment]); setNewComment(""); }
    } catch (err) { console.error("Comment post error:", err); }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/photos/${photoId}/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) { console.error("Delete comment error:", err); }
  };

  // 👉 Generate share token on demand
  const generateShare = async () => {
    try {
      const res = await fetch(`${BASE_URL}/share/photo/${photoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ can_comment: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.msg || "Failed to create share link");
      setShareToken(data.share.token); // store token
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    }
  };

  const currentHost = window.location.host;
  const currentProtocol = window.location.protocol;
  const shareUrl = shareToken
    ? `${currentProtocol}//${currentHost}/shared/photo/${shareToken}`
    : "";

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(`/albums/${albumId}`)}
        className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded shadow"
      >
        ← Back to Album
      </button>

      {photo ? (
        <>
          <img
            src={`${PHOTO_BASE_URL}/uploads/${photo.filepath}`}
            alt={photo.filename}
            className="w-full rounded shadow mb-4"
          />
          <p className="text-lg text-[var(--primary)] mb-2">
            {photo.filename || "Untitled Photo"}
          </p>

          {/* Share */}
          <div className="mb-6 space-y-2">
            <button
              onClick={generateShare}
              className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-3 py-2 rounded"
            >
              Generate Share Link
            </button>

            {shareUrl && (
              <div className="flex">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-2 py-1 border rounded-l text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                  className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-3 rounded-r"
                >
                  Copy
                </button>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--primary)] mb-2">Comments</h2>
            <ul className="space-y-2 mb-4">
              {comments.map((c) => (
                <li key={c.id} className="bg-white rounded px-4 py-2 shadow text-sm flex items-start justify-between gap-3">
                  <div>
                    <strong>{c.author}</strong>: {c.content}
                    <div className="text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="text-red-600 text-xs hover:underline"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment"
                className="flex-1 px-3 py-2 border rounded"
              />
              <button type="submit" className="bg-[var(--primary)] text-white px-4 py-2 rounded">
                Post
              </button>
            </form>
          </div>
        </>
      ) : (
        <p>Loading photo...</p>
      )}
    </main>
  );
}
