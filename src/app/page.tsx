import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-ocean-900 to-ocean-600 flex flex-col items-center justify-center text-white">
      <div className="text-center space-y-6 px-4">
        <div className="text-6xl mb-4">🤿</div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Dive Shop OS
        </h1>
        <p className="text-xl text-ocean-200 max-w-md mx-auto">
          Book your next dive adventure in minutes — no emails, no waiting.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/book">
            <Button size="lg" className="bg-white text-ocean-900 hover:bg-ocean-50 font-semibold">
              Book a Dive
            </Button>
          </Link>
          <Link href="/admin">
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              Admin Login
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
