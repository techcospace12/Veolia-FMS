import { NextRequest, NextResponse } from "next/server";

// Simple HTTP Basic Auth gate. Credentials are read from env vars set on the
// host (Render dashboard or render.yaml). If either var is unset, auth is
// disabled — that's the default for local dev.
export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  if (!user || !pass) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const encoded = auth.slice("Basic ".length);
    try {
      const [u, p] = atob(encoded).split(":");
      if (u === user && p === pass) return NextResponse.next();
    } catch {
      // fall through — respond with 401
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Veolia FMS Demo"',
    },
  });
}

// Run on every path except Next's static assets and the favicon.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
