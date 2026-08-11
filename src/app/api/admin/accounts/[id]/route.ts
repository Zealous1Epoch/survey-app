import { NextRequest, NextResponse } from "next/server";
import { updatePassword } from "@/lib/db/users";

/** 修改密码（super_admin 可改任意用户，普通用户只能改自己） */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUserId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");

  // 普通用户只能改自己的密码
  if (role !== "super_admin" && id !== currentUserId) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { password } = await req.json();
  if (!password || password.length < 4) {
    return NextResponse.json({ error: "密码至少 4 位" }, { status: 400 });
  }

  const ok = await updatePassword(id, password);
  if (!ok) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}