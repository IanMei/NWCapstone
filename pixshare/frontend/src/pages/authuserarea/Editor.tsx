export default function Editor() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
      <h1 className="text-4xl font-bold mb-4 text-[var(--primary)]">Photo Editor</h1>
      <p className="text-lg text-[var(--secondary)] max-w-xl">
        🚧 This feature is currently under development. In a future release, you’ll be able to edit
        your photos online — crop, adjust colors, apply filters, and more!
      </p>
      <p className="mt-6 text-sm text-gray-500">
        We’re building this based on user feedback. Stay tuned!
      </p>
    </main>
  );
}
