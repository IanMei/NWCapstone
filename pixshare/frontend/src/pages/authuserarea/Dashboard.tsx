import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL } from "../../utils/api";

type Album = {
  id: number;
  name: string;
};

export default function Dashboard() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [storageUsed, setStorageUsed] = useState<number>(0); // in GB
  const storageLimit = 10;
  const navigate = useNavigate();

  const fetchAlbums = async () => {
    const token = localStorage.getItem("token");
    if (!token || token === "undefined") {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/albums`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.msg || "Failed to fetch albums");
      }

      const data = await res.json();
      setAlbums(data.albums || []);

      // Simulate storage calculation: 0.03 GB per album
      const totalUsed = data.albums.length * 0.03;
      setStorageUsed(Number(totalUsed.toFixed(2)));
    } catch (err) {
      console.error("Failed to fetch dashboard albums:", err);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const recentAlbums = albums.slice(-3).reverse(); // latest 3

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold text-[var(--primary)] mb-4">Dashboard</h1>

      {/* Storage Summary */}
      <section className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-2 text-[var(--primary)]">Storage Usage</h2>
        <div className="w-full bg-gray-200 rounded h-4 mb-2">
          <div
            className="h-4 rounded bg-[var(--accent)]"
            style={{ width: `${(storageUsed / storageLimit) * 100}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">
          {storageUsed} GB of {storageLimit} GB used
        </p>
      </section>

      {/* Recent Albums */}
      <section className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-2 text-[var(--primary)]">Recent Albums</h2>
        {recentAlbums.length === 0 ? (
          <p className="text-sm text-gray-500">No albums yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentAlbums.map((album) => (
              <li key={album.id}>
                <Link
                  to={`/albums/${album.id}`}
                  className="text-[var(--secondary)] hover:underline"
                >
                  {album.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick Links */}
      <section className="p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-2 text-[var(--primary)]">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/albums"
            className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-4 py-2 rounded"
          >
            View All Albums
          </Link>
          <Link
            to="/events"
            className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-4 py-2 rounded"
          >
            Manage Events
          </Link>
          <Link
            to="/account/settings"
            className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-4 py-2 rounded"
          >
            Account Settings
          </Link>
        </div>
      </section>
    </main>
  );
}
