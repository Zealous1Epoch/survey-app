import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByUsername } from "@/lib/db/users";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  // Validation
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
  }
  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "密码不能为空" }, { status: 400 });
  }
  if (username.length < 3 || username.length > 20) {
    return NextResponse.json({ error: "用户名需要 3-20 个字符" }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return NextResponse.json({ error: "用户名只能包含字母、数字和下划线" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 个字符" }, { status: 400 });
  }

  // Check if username already exists
  const existing = getUserByUsername(username);
  if (existing) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
  }

  const user = createUser(username, password);
  return NextResponse.json(
    { id: user.id, username: user.username },
    { status: 201 }
  );
}
