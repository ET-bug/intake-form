export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean-50 to-white">
      <header className="bg-ocean-900 text-white py-4">
        <div className="max-w-3xl mx-auto px-4 flex items-center gap-3">
          <span className="text-2xl">🤿</span>
          <span className="font-bold text-lg">Book a Dive</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
