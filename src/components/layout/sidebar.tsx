"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardList, FlaskConical, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/reservations", label: "Reservations", icon: ClipboardList },
  { href: "/tools/concurrency", label: "Concurrency", icon: FlaskConical },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="border-b px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Allo Health
        </p>
        <h1 className="mt-1 text-sm font-semibold">Inventory Ops</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        Internal operations dashboard
      </div>
    </aside>
  );
}
