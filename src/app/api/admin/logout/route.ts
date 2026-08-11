import { NextRequest, NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  const cookieOpts = {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
  res.cookies.set("auth_token", "", cookieOpts);
  res.cookies.set("admin_logged_in", "", { ...cookieOpts, httpOnly: false });
  return res;
}