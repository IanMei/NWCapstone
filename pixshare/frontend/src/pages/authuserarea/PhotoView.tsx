import { useParams } from "react-router-dom";

export default function PhotoView() {
  const { albumId, photoId } = useParams();

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold text-[var(--primary)]">Photo {photoId}</h1>
      <p>Viewing photo from album {albumId}.</p>
    </main>
  );
}
