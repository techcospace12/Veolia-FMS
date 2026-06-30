"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import type { Role } from "@/lib/types";

function landingPageFor(role: Role): string {
  switch (role) {
    case "PLANT_USER": return "/data-entry";
    case "PLANT_HEAD": return "/approvals";
    default: return "/dashboard";
  }
}

export default function Home() {
  const { role, ready } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (role) router.replace(landingPageFor(role));
    else router.replace("/login");
  }, [ready, role, router]);
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      Loading…
    </div>
  );
}
