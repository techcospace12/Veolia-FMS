"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function AccessForm() {
  const params = useSearchParams();
  const nextPath = params.get("next") || "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      // Full navigation so the middleware runs and sees the fresh cookie.
      window.location.href = nextPath;
    } else {
      setError("Invalid credentials — please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-veolia-700 via-veolia-600 to-veolia-500 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded bg-veolia-600 text-white grid place-items-center text-lg font-bold">
            V
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight">Veolia India</div>
            <div className="text-veolia-600 text-sm">Financial Management System</div>
          </div>
        </div>

        <div className="mt-8">
          <h1 className="text-xl font-semibold text-slate-900">Enter access credentials</h1>
          <p className="mt-1 text-sm text-slate-500">
            This is a private demo. Please sign in with the shared credentials.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label">Username</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <AccessForm />
    </Suspense>
  );
}
