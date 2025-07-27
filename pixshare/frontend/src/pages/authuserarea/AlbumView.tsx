import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BASE_URL } from "../../utils/api";

type Photo = {
  id: number;
  filename: string;
  filepath: string;
  uploaded_at: string;
};

export default function AlbumView() {
  const { albumId } = useParams();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const token = localStorage.getItem("token");

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`${BASE_URL}/albums/${albumId}/photos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load photos");
      }

      const data = await res.json();
      setPhotos(data.photos);
    } catch (err) {
      console.error("Failed to load photos:", err);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch(`${BASE_URL}/albums/${albumId}/photos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setPhotos((prev) => [...prev, data.photo]);
        setFile(null);
      } else {
        console.error("Upload failed:", data);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  const deletePhoto = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/photos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      } else {
        console.error("Delete failed");
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [albumId]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-[var(--primary)] mb-4">
        Album #{albumId}
      </h1>

      {/* Upload */}
      <div className="flex gap-2 mb-6 items-center">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button
          onClick={handleUpload}
          className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-4 py-2 rounded"
        >
          Upload
        </button>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group border rounded overflow-hidden shadow bg-white"
          >
            <Link to={`/albums/${albumId}/photo/${photo.id}`}>
              <img
                src={`${BASE_URL}/${photo.filepath}`}
                alt={photo.filename}
                className="w-full h-48 object-cover"
              />
            </Link>
            <button
              onClick={() => deletePhoto(photo.id)}
              className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-80 hover:opacity-100"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
