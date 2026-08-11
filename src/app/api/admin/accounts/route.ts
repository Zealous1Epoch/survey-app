import { NextRequest, NextResponse } from "next/server";
import { getUsers, createUser, deleteUser, updatePassword } from "@/lib/db/users";

/** 获取用户列表（仅 super_admin） */
export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const users = await getUsers();
  return NextResponse.json(users);
}

/** 创建用户（仅 super_admin） */
export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { username, password, role: newRole } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
  }

  try {
    const user = await createUser({ username, password, role: newRole });
    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
    }
    throw err;
  }
}

/** 删除用户（仅 super_admin，不能删除自己） */
export async function DELETE(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  const currentUserId = req.headers.get("x-user-id");
  if (role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "缺少用户 ID" }, { status: 400 });
  }

  if (id === currentUserId) {
    return NextResponse.json({ error: "不能删除自己" }, { status: 400 });
  }

  const ok = await deleteUser(id);
  if (!ok) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}