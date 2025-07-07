import { Link } from "react-router-dom";

export default function Dashboard() {
  // Placeholder values for storage and albums
  const storageUsed = 2.5; // in GB
  const storageLimit = 10; // in GB
  const recentAlbums = [
    { id: "1", name: "Summer Vacation" },
    { id: "2", name: "Wedding Photos" },
    { id: "3", name: "Conference 2025" },
  ];

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
