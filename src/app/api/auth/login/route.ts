import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername, verifyPassword } from "@/lib/db/users";
import { createSession } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
  }

  const user = getUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const token = await createSession(user.id, user.username);

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };

  const res = NextResponse.json({ id: user.id, username: user.username });
  res.cookies.set("session_token", token, cookieOpts);
  return res;
}
