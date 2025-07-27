import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BASE_URL } from "../../utils/api";

type Photo = {
  id: number;
  filename: string;
  filepath: string; // e.g., "photos/3/Vacation/image.jpg"
  uploaded_at: string;
};

export default function AlbumView() {
  const { albumId } = useParams();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [albumName, setAlbumName] = useState<string>("");

  const token = localStorage.getItem("token");

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`${BASE_URL}/albums/${albumId}/photos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to load photos");
      const data = await res.json();
      setPhotos(data.photos);
    } catch (err) {
      console.error("Failed to load photos:", err);
    }
  };

  const fetchAlbumName = async () => {
    try {
      const res = await fetch(`${BASE_URL}/albums/${albumId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to load album name");
      const data = await res.json();
      setAlbumName(data.name);
    } catch (err) {
      console.error("Failed to load album name:", err);
    }
  };

  const handleUpload = async () => {
    if (!files.length) return;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("photos", file);
    });

    try {
      setUploading(true);
      const res = await fetch(`${BASE_URL}/albums/${albumId}/photos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setPhotos((prev) => [...prev, ...data.photos]);
        setFiles([]);
      } else {
        console.error("Upload failed:", data);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
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
    fetchAlbumName();
    fetchPhotos();
  }, [albumId]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-[var(--primary)] mb-4">
        {albumName ? `Album: ${albumName}` : `Album #${albumId}`}
      </h1>

      {/* Upload Section */}
      <div className="flex flex-col gap-4 mb-6 items-start">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <label className="font-medium text-gray-700">Select photo(s):</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <label className="font-medium text-gray-700">Or upload folder:</label>
          <input
            type="file"
            accept="image/*"
            multiple
            // @ts-ignore
            webkitdirectory=""
            directory=""
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!files.length || uploading}
          className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-4 py-2 rounded"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {files.length > 0 && (
          <p className="text-sm text-gray-600">{files.length} file(s) selected</p>
        )}
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
                src={`http://localhost:5000/uploads/${photo.filepath}`}
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
