import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { BASE_URL } from "../../utils/api";

type Comment = {
  id: number;
  content: string;
  author: string;
};

type Photo = {
  id: number;
  url: string;
  caption?: string;
};

export default function PhotoView() {
  const { albumId, photoId } = useParams();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${BASE_URL}/photos/${photoId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPhoto(data.photo));

    fetch(`${BASE_URL}/photos/${photoId}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setComments(data.comments));
  }, [photoId]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const res = await fetch(`${BASE_URL}/photos/${photoId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: newComment }),
    });

    const data = await res.json();
    if (res.ok) {
      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
    }
  };

  const shareUrl = `${window.location.origin}/shared/photo/${photoId}`;

  return (
    <main className="p-6 max-w-3xl mx-auto">
      {photo ? (
        <>
          <img
            src={photo.url}
            alt={photo.caption || ""}
            className="w-full rounded shadow mb-4"
          />
          <p className="text-lg text-[var(--primary)] mb-2">
            {photo.caption || "Untitled Photo"}
          </p>

          {/* Sharing */}
          <div className="mb-6">
            <label className="block text-sm text-gray-600 mb-1">Share Link:</label>
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
          </div>

          {/* Comments */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--primary)] mb-2">Comments</h2>
            <ul className="space-y-2 mb-4">
              {comments.map((c) => (
                <li key={c.id} className="bg-white rounded px-4 py-2 shadow text-sm">
                  <strong>{c.author}</strong>: {c.content}
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
              <button
                type="submit"
                className="bg-[var(--primary)] text-white px-4 py-2 rounded"
              >
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