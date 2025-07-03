import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <h1 className="text-5xl font-bold mb-6 text-[var(--primary)]">Welcome to PixShare</h1>
      <p className="text-lg max-w-xl mb-8 text-[var(--secondary)]">
        Securely upload, manage, and share your photos and videos in the cloud.
        Designed for simplicity, privacy, and future flexibility.
      </p>
      <Link
        to="/register"
        className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-6 py-3 rounded shadow font-semibold"
      >
        Get Started
      </Link>
    </main>
  );
}