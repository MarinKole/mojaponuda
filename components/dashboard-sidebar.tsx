"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  ChevronRight,
  Building2,
  Activity,
  Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  pro?: boolean;
}

const coreItems: NavItem[] = [
  { href: "/dashboard", label: "Pregled_Sistema", icon: LayoutDashboard },
  { href: "/dashboard/vault", label: "Trezor_Dokumenata", icon: FileText },
  { href: "/dashboard/bids", label: "Radne_Ponude", icon: Briefcase },
  { href: "/dashboard/tenders", label: "Tender_Skener", icon: Search },
];

const intelligenceItems: NavItem[] = [
  { href: "/dashboard/intelligence", label: "Tržišna_Analitika", icon: BarChart3, pro: true },
  { href: "/dashboard/intelligence/competitors", label: "Praćenje_Konkurencije", icon: Swords, pro: true },
  { href: "/dashboard/intelligence/upcoming", label: "Planirane_Nabavke", icon: Calendar, pro: true },
];

const accountItems: NavItem[] = [
  { href: "/dashboard/subscription", label: "Licenca_i_Naplata", icon: CreditCard },
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
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));

    return (
      <Link href={item.href}>
        <span
          className={cn(
            "group flex items-center gap-3 rounded-none px-3 py-2 transition-all duration-150 border-l-2",
            isActive
              ? "border-blue-500 bg-[#0a1628] text-white"
              : "border-transparent text-slate-400 hover:bg-[#0a1628]/50 hover:text-slate-200"
          )}
        >
          <item.icon className={cn("size-3.5 shrink-0", isActive ? "text-blue-500" : "text-slate-500 group-hover:text-slate-400")} />
          <span className="flex-1 font-mono text-[10px] tracking-wider uppercase truncate">{item.label}</span>
          {item.pro && (
            <span className={cn(
              "font-mono text-[9px] font-bold uppercase tracking-widest",
              isActive
                ? "text-blue-400"
                : "text-slate-600"
            )}>
              [PRO]
            </span>
          )}
          {isActive && <ChevronRight className="size-3 text-blue-500" />}
        </span>
      </Link>
    );
  }

  return (
    <aside className="flex w-[260px] flex-col border-r border-slate-800 bg-[#020611]">
      {/* Brand */}
      <div className="flex flex-col px-5 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-blue-500" />
            <span className="font-mono text-xs font-bold text-white tracking-widest">
              MP<span className="text-blue-500">.OS</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[9px] text-emerald-500">SYS_ON</span>
          </div>
        </div>
        {companyName ? (
          <div className="border border-slate-800 bg-[#060b17] p-2">
            <p className="font-mono text-[9px] text-slate-500 mb-0.5">ACTIVE_ENTITY:</p>
            <p className="truncate font-mono text-[11px] font-bold text-white uppercase" title={companyName}>
              {companyName}
            </p>
          </div>
        ) : (
          <div className="border border-amber-900/30 bg-amber-950/10 p-2 text-amber-500">
            <p className="font-mono text-[9px]">ENTITY_MISSING</p>
          </div>
        )}
      </div>

      {/* Core Navigation */}
      <nav className="flex-1 space-y-8 overflow-y-auto px-2 py-2">
        <div>
          <div className="mb-2 flex items-center gap-2 px-3">
            <Activity className="size-3 text-slate-600" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-600">
              Operacije
            </p>
          </div>
          <div className="space-y-0.5">
            {coreItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 px-3">
            <Activity className="size-3 text-slate-600" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-600">
              Analitika
            </p>
          </div>
          <div className="space-y-0.5">
            {intelligenceItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 px-3">
            <Activity className="size-3 text-slate-600" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-600">
              Sistem
            </p>
          </div>
          <div className="space-y-0.5">
            {accountItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-800 p-4 bg-[#060b17]">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[9px] text-slate-500">USER_SESSION</p>
          <p className="font-mono text-[9px] text-emerald-500">SECURE</p>
        </div>
        <p className="truncate font-mono text-[10px] text-slate-300 mb-3" title={userEmail}>
          {userEmail}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center gap-2 rounded-none border border-slate-800 bg-[#020611] font-mono text-[10px] text-slate-400 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/50"
          onClick={handleSignOut}
        >
          <LogOut className="size-3.5" />
          TERMINATE_SESSION
        </Button>
      </div>
    </aside>
  );
}
