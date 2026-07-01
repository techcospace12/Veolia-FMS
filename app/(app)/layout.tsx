"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { ROLE_LABELS, type Role } from "@/lib/types";
import clsx from "clsx";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  hiddenForRoles?: Role[];
};

// Plant User sees only what they need: Dashboard (their plant only),
// Data Entry, Approvals (their own submissions), Generate PPT (their plant only),
// Audit Log. Reconciliation and Plants overview are Finance/leadership tools.
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/plants", label: "Plants", icon: "▤", hiddenForRoles: ["PLANT_USER"] },
  { href: "/data-entry", label: "Data Entry", icon: "✎" },
  { href: "/reconciliation", label: "Reconciliation", icon: "⇋", hiddenForRoles: ["PLANT_USER"] },
  { href: "/approvals", label: "Approvals", icon: "✓" },
  { href: "/generate-ppt", label: "Generate PPT", icon: "▶" },
  { href: "/audit", label: "Audit Log", icon: "⊟" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { role, ready, plantName, clear, userName } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !role) router.replace("/login");
  }, [ready, role, router]);

  if (!ready || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
          <div className="h-9 w-9 rounded bg-veolia-600 text-white grid place-items-center text-lg font-bold">
            V
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">Veolia India</div>
            <div className="text-xs text-slate-500">FMS · 2026</div>
          </div>
        </div>
        <nav className="px-2 py-4 space-y-0.5">
          {NAV.filter((item) => !item.hiddenForRoles?.includes(role)).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-veolia-50 text-veolia-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <span className={clsx("inline-block w-4 text-center", active ? "text-veolia-600" : "text-slate-400")}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm">
            <span className="text-slate-500">Logged in as</span>{" "}
            <span className="font-medium text-slate-800">{userName ?? ROLE_LABELS[role]}</span>
            {plantName && (
              <>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-500">Plant:</span>{" "}
                <span className="font-medium text-slate-800">{plantName}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="pill bg-slate-100 text-slate-600">FY 2026</span>
            <button
              onClick={() => {
                clear();
                router.push("/login");
              }}
              className="btn-secondary"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
