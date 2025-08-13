import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BASE_URL, PHOTO_BASE_URL } from "../../utils/api";

type Photo = {
  id: number;
  filename: string;
  filepath: string; // e.g. photos/<user>/<album>/file.jpg
  uploaded_at: string;
};

export default function SharedPhoto() {
  const { token } = useParams(); // token from /shared/photo/:token
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BASE_URL}/s/${token}/photo`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.msg || "Invalid or expired link");
        setPhoto(data.photo);
      } catch (e: any) {
        setError(e.message || "Failed to open shared link");
      }
    };
    if (token) load();
  }, [token]);

  if (error) {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-red-600 mb-2">Unable to open link</h1>
        <p className="text-gray-700">{error}</p>
      </main>
    );
  }

  if (!photo) return <main className="p-6">Loading…</main>;

  // IMPORTANT: pass token as ?t=... so /uploads route authorizes this public request
  const imgSrc = `${PHOTO_BASE_URL}/uploads/${photo.filepath}?t=${encodeURIComponent(
    token || ""
  )}`;

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <img src={imgSrc} alt={photo.filename} className="w-full rounded shadow mb-4" />
      <p className="text-lg text-[var(--primary)]">{photo.filename}</p>
    </main>
  );
}
