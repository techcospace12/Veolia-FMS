import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, computeAccessToken } from "@/lib/auth-token";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body as {
    username?: string;
    password?: string;
  };

  const authUser = process.env.BASIC_AUTH_USER;
  const authPass = process.env.BASIC_AUTH_PASSWORD;
  if (!authUser || !authPass) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  if (username !== authUser || password !== authPass) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await computeAccessToken(authPass);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SEC,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
