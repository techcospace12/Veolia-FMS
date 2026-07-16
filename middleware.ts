import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, computeAccessToken } from "@/lib/auth-token";

// Password-gate the whole app. If BASIC_AUTH_USER / BASIC_AUTH_PASSWORD env
// vars are unset (local dev), auth is disabled. If they're set, every request
// must present a valid cookie or gets redirected to /access.
export async function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !pass) return NextResponse.next();

  const path = req.nextUrl.pathname;

  // Always allow the login screen and its POST endpoint through.
  if (path === "/access" || path === "/api/access") {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(ACCESS_COOKIE)?.value;
  if (cookie) {
    const expected = await computeAccessToken(pass);
    if (cookie === expected) return NextResponse.next();
  }

  // Send unauthenticated visitors to the gate. Preserve the intended path
  // so we can redirect back after login.
  const url = new URL("/access", req.url);
  const next = req.nextUrl.pathname + req.nextUrl.search;
  if (next && next !== "/") url.searchParams.set("next", next);
  const redirect = NextResponse.redirect(url);
  // Prevent the browser from cheating with a cached HTML render.
  redirect.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
