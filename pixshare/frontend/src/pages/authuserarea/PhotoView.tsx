import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BASE_URL, PHOTO_BASE_URL } from "../../utils/api";

type Comment = { id: number; content: string; author: string; created_at: string };
type Photo = { id: number; filename: string; filepath: string; uploaded_at: string };

export default function PhotoView() {
  const { albumId, photoId } = useParams();
  const navigate = useNavigate();

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  // Share UI
  const [shareToken, setShareToken] = useState<string>("");
  const [allowComments, setAllowComments] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const shareInputRef = useRef<HTMLInputElement>(null);

  const getToken = () => {
    const t = localStorage.getItem("token");
    return t && t !== "undefined" ? t : null;
  };
  const ownerImgQS = (() => {
    const jwt = getToken();
    return jwt ? `?a=${encodeURIComponent(jwt)}` : "";
  })();

  const noCache = (u: string) => `${u}${u.includes("?") ? "&" : "?"}_=${Date.now()}`;
  const authHeaders = (): HeadersInit => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const handleAuthError = (status: number) => {
    if (status === 401 || status === 422) {
      navigate("/login");
      return true;
    }
    return false;
  };
  const ensureAuthed = () => {
    if (!getToken()) {
      navigate("/login");
      return false;
    }
    return true;
  };

  useEffect(() => {
    const fetchPhotoFromAlbum = async () => {
      if (!ensureAuthed()) return;
      try {
        const res = await fetch(noCache(`${BASE_URL}/albums/${albumId}/photos`), {
          method: "GET",
          headers: authHeaders(),
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          if (handleAuthError(res.status)) return;
          throw new Error(data?.msg || "Failed to load photos");
        }
        const matched = (data.photos || []).find((p: Photo) => p.id.toString() === photoId);
        if (matched) setPhoto(matched);
        else throw new Error("Photo not found in album");
      } catch (err) {
        console.error("Photo fetch error:", err);
      }
    };

    const fetchComments = async () => {
      if (!ensureAuthed()) return;
      try {
        const res = await fetch(noCache(`${BASE_URL}/photos/${photoId}/comments`), {
          method: "GET",
          headers: authHeaders(),
          cache: "no-store",
        });
        if (!res.ok) {
          if (handleAuthError(res.status)) return;
          return;
        }
        const data = await res.json();
        setComments(data.comments || []);
      } catch (err) {
        console.error("Failed to load comments:", err);
      }
    };

    fetchPhotoFromAlbum();
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, photoId]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !ensureAuthed()) return;

    try {
      const res = await fetch(`${BASE_URL}/photos/${photoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ content: newComment }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        console.error("Comment post failed:", data);
        return;
      }
      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
    } catch (err) {
      console.error("Comment post error:", err);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!ensureAuthed()) return;
    try {
      const res = await fetch(`${BASE_URL}/photos/${photoId}/comments/${commentId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  // Generate (or regenerate) a share token for this photo
  const generateShare = async () => {
    if (!ensureAuthed()) return;
    try {
      const res = await fetch(`${BASE_URL}/share/photo/${photoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ can_comment: allowComments }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        throw new Error(data?.msg || "Failed to create share link");
      }
      setShareToken(data.share.token);
      setCopied(false);
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
          el.style.top = "0";
          el.style.left = "0";
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
      console.error("Clipboard copy failed:", err);
      alert("Could not copy. Please copy it manually.");
    }
  };

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
            src={`${PHOTO_BASE_URL}/uploads/${photo.filepath}${ownerImgQS}`}
            alt={photo.filename}
            className="w-full rounded shadow mb-4"
          />
          <p className="text-lg text-[var(--primary)] mb-2">
            {photo.filename || "Untitled Photo"}
          </p>

          {/* Share */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={generateShare}
                className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-3 py-2 rounded"
              >
                {shareToken ? "Regenerate Share Link" : "Generate Share Link"}
              </button>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                />
                Allow comments on shared link
              </label>
            </div>

            {shareUrl && (
              <div className="flex items-stretch">
                <input
                  ref={shareInputRef}
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 px-2 py-2 border rounded-l text-sm"
                />
                <button
                  onClick={copyShareUrl}
                  className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-3 rounded-r"
                  title="Copy share link"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}

            {shareToken && (
              <p className="text-xs text-gray-600">
                This share is currently <strong>{allowComments ? "comment-enabled" : "comment-disabled"}</strong>.
                Regenerate to change the setting.
              </p>
            )}
          </div>

          {/* Comments */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--primary)] mb-2">Comments</h2>
            <ul className="space-y-2 mb-4">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="bg-white rounded px-4 py-2 shadow text-sm flex items-start justify-between gap-3"
                >
                  <div>
                    <strong>{c.author}</strong>: {c.content}
                    <div className="text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="text-red-600 text-xs hover:underline"
                    title="Delete comment"
                  >
                    Delete
                  </button>
                </li>
              ))}
              {comments.length === 0 && (
                <li className="text-sm text-gray-500">No comments yet.</li>
              )}
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
