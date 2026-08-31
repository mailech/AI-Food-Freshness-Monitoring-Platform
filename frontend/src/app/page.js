export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold text-blue-600">
        Food Freshness Monitoring Platform
      </h1>
      <p className="max-w-xl text-center text-gray-600">
        AI-powered freshness assessment, shelf-life prediction, spoilage
        detection, and storage recommendations.
      </p>
      <a
        href="/login"
        className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white shadow transition hover:bg-blue-700"
      >
        Sign in
      </a>
    </main>
  );
}
