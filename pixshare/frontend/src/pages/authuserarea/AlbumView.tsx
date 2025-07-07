import { useParams } from "react-router-dom";

export default function AlbumView() {
  const { albumId } = useParams();

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold text-[var(--primary)]">Album {albumId}</h1>
      <p>Media files and actions for this album.</p>
    </main>
  );
}
