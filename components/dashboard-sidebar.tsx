"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Search,
  CreditCard,
  BarChart3,
  Swords,
  Calendar,
  LogOut,
  Box,
  Settings,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  pro?: boolean;
  exact?: boolean;
}

const coreItems: NavItem[] = [
  { href: "/dashboard", label: "Pregled", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/tenders", label: "Skener", icon: Search },
  { href: "/dashboard/vault", label: "Dokumenti", icon: FileText },
  { href: "/dashboard/bids", label: "Ponude", icon: Briefcase },
];

const intelligenceItems: NavItem[] = [
  { href: "/dashboard/intelligence", label: "Analitika", icon: BarChart3, pro: true, exact: true },
  { href: "/dashboard/intelligence/competitors", label: "Konkurencija", icon: Swords, pro: true },
  { href: "/dashboard/intelligence/upcoming", label: "Planirano", icon: Calendar, pro: true },
];

const accountItems: NavItem[] = [
  { href: "/dashboard/subscription", label: "Pretplata", icon: CreditCard },
  { href: "/dashboard/settings", label: "Postavke", icon: Settings },
];

interface DashboardSidebarProps {
  userEmail: string;
  companyName?: string;
}

export function DashboardSidebar({ userEmail, companyName }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function NavLink({ item }: { item: NavItem }) {
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href);

    return (
      <Link href={item.href} className="block">
        <span
          className={cn(
            "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-medium transition-all",
            isActive
              ? "bg-white text-blue-600 shadow-sm"
              : "text-white/90 hover:bg-white/15"
          )}
        >
          <item.icon className="size-4 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.pro && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-600">
              PRO
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 m-3 flex h-[calc(100vh-24px)] w-[200px] flex-col overflow-hidden rounded-[2rem] bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 shadow-xl">
      {/* Diagonal header section */}
      <div className="relative px-4 pb-8 pt-6">
        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center justify-center transition-opacity hover:opacity-90">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
            <Box className="size-5" />
          </div>
        </Link>
        {/* Diagonal decorative shape */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-blue-600/50" style={{ clipPath: 'polygon(0 0, 100% 50%, 100% 100%, 0 100%)' }} />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-1 scrollbar-hide">
        <div className="space-y-0.5">
          {coreItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="mt-5 space-y-0.5">
          {intelligenceItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="mt-5 space-y-0.5">
          {accountItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* User avatar at bottom */}
      <div className="mt-auto px-3 pb-4">
        <button
          onClick={handleSignOut}
          className="group flex w-full items-center justify-center rounded-2xl p-2 transition-all hover:bg-white/10"
        >
          <div className="relative">
            <div className="flex size-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="absolute -bottom-1 -right-1 size-4 rounded-full bg-blue-700 text-white/80" />
          </div>
        </button>
      </div>
    </aside>
  );
}
