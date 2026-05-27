import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ success: true });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_token", password, cookieOpts);
  res.cookies.set("admin_logged_in", "1", { ...cookieOpts, httpOnly: false });

  return res;
}
