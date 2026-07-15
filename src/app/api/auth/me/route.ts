import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value ?? "";
  const session = token ? await getSession(token) : null;

  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.json({
    id: session.userId,
    username: session.username,
  });
}
