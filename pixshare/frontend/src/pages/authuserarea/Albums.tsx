import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL } from "../../utils/api";

type Album = {
  id: number;
  title: string;
};

export default function Albums() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const authHeaders = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  // Fetch albums
  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/albums`, {
        method: "GET",
        headers: {
          ...authHeaders,
        },
      });

      if (res.status === 401) {
        console.warn("Unauthorized, redirecting to login.");
        navigate("/login");
        return;
      }

      const data = await res.json();
      console.log("Albums fetched:", data);

      if (!res.ok) throw new Error(data.msg || "Failed to fetch albums");
      setAlbums(data.albums || []);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Error fetching albums");
    } finally {
      setLoading(false);
    }
  };

  const createAlbum = async () => {
    if (!newAlbumName.trim()) return;

    try {
      const res = await fetch(`${BASE_URL}/albums`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ title: newAlbumName }), // ✅ use 'title'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Failed to create album");

      setAlbums((prev) => [...prev, data.album]);
      setNewAlbumName("");
    } catch (err: any) {
      console.error("Create album error:", err);
      setError(err.message || "Error creating album");
    }
  };

  const deleteAlbum = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/albums/${id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
        },
      });

      if (!res.ok) throw new Error("Failed to delete album");
      setAlbums((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      console.error("Delete album error:", err);
      setError(err.message || "Error deleting album");
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
    } else {
      fetchAlbums();
    }
  }, []);

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

      {loading ? (
        <p>Loading albums...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : albums.length === 0 ? (
        <p>No albums yet. Create one above.</p>
      ) : (
        <ul className="space-y-4">
          {albums.map((album) => (
            <li
              key={album.id}
              className="flex justify-between items-center p-4 bg-white rounded shadow"
            >
              <Link
                to={`/albums/${album.id}`}
                className="text-lg text-[var(--secondary)] hover:underline"
              >
                {album.title}
              </Link>
              <button
                onClick={() => deleteAlbum(album.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
