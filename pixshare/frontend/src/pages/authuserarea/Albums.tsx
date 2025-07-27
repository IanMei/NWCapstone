import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL } from "../../utils/api";

type Album = {
  id: number;
  name: string;
};

export default function Albums() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [newAlbumName, setNewAlbumName] = useState("");
  const navigate = useNavigate();

  const getToken = (): string | null => {
    const token = localStorage.getItem("token");
    return token && token !== "undefined" ? token : null;
  };

  const fetchAlbums = async (token: string) => {
    try {
      const res = await fetch(`${BASE_URL}/albums`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.msg || "Failed to fetch albums");
      }

      setAlbums(data.albums);
    } catch (err) {
      console.error("Failed to fetch albums:", err);
    }
  };

  const createAlbum = async () => {
    const token = getToken();
    if (!token) return;

    if (!newAlbumName.trim()) return;

    try {
      const res = await fetch(`${BASE_URL}/albums`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newAlbumName }),
      });

      const data = await res.json();

      if (res.ok) {
        setAlbums((prev) => [...prev, data.album]);
        setNewAlbumName("");
      } else {
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.msg || "Failed to delete album");
      }

      setAlbums((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete album:", err);
    }
  };

  // Auth check and initial fetch
  useEffect(() => {
    const token = getToken();
    if (!token) {
      console.warn("No valid token. Redirecting to login...");
      navigate("/login");
    } else {
      fetchAlbums(token);
    }
  }, [navigate]);

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
              {album.name}
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
    </main>
  );
}
