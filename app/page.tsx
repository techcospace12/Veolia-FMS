"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";

export default function Home() {
  const { role, ready } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (role) router.replace("/dashboard");
    else router.replace("/login");
  }, [ready, role, router]);
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      Loading…
    </div>
  );
}
