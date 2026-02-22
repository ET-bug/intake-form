"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  BookOpen,
  Settings,
  Users,
  LayoutDashboard,
  LogOut,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin/dashboard", label: "Schedule", icon: CalendarDays },
  { href: "/admin/bookings", label: "Bookings", icon: BookOpen },
  { href: "/admin/capacity", label: "Capacity", icon: Users },
  { href: "/admin/catalog", label: "Catalog", icon: Waves },
  { href: "/admin/onboarding", label: "Setup", icon: Settings },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="bg-ocean-900 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤿</span>
            <span className="font-bold text-lg">Dive Shop OS</span>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-ocean-700 text-white"
                    : "text-ocean-200 hover:bg-ocean-800 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </nav>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-ocean-200 hover:text-white hover:bg-ocean-800"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
