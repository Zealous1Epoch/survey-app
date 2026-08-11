import { NextRequest, NextResponse } from "next/server";

/** 获取当前登录用户信息 */
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const username = req.headers.get("x-user-name");
  const role = req.headers.get("x-user-role");

  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.json({ userId, username, role });
}