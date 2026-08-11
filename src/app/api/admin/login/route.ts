import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername, getUserCount, createUser, verifyPassword, assignOrphanSurveys } from "@/lib/db/users";
import { signToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
  }

  // 首次初始化：用户表为空时，自动创建 super_admin
  const count = await getUserCount();
  if (count === 0) {
    const user = await createUser({ username, password, role: "super_admin" });
    // 将已有的孤儿问卷分配给此用户
    await assignOrphanSurveys(user.id);
    const token = await signToken({ userId: user.id, username: user.username, role: user.role });

    const res = NextResponse.json({ success: true, isFirstUser: true });
    setAuthCookie(res, token);
    return res;
  }

  // 正常登录
  const user = await getUserByUsername(username);
  if (!user) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const valid = await verifyPassword(user, password);
  if (!valid) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const token = await signToken({ userId: user.id, username: user.username, role: user.role });

  const res = NextResponse.json({ success: true });
  setAuthCookie(res, token);
  return res;
}

function setAuthCookie(res: NextResponse, token: string) {
  const cookieOpts = {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };
  res.cookies.set("auth_token", token, cookieOpts);
  res.cookies.set("admin_logged_in", "1", { ...cookieOpts, httpOnly: false });
}