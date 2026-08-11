import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";

export interface User {
  id: string;
  username: string;
  password: string;
  role: "super_admin" | "admin";
  created_at: string;
}

export type SafeUser = Omit<User, "password">;

function toSafeUser(u: User): SafeUser {
  return { id: u.id, username: u.username, role: u.role, created_at: u.created_at };
}

/** 按用户名查找用户 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const db = await getDb();
  const [rows] = await db.execute(
    "SELECT * FROM users WHERE username = ?",
    [username]
  );
  const list = rows as User[];
  return list.length > 0 ? list[0] : null;
}

/** 按 ID 查找用户 */
export async function getUserById(id: string): Promise<User | null> {
  const db = await getDb();
  const [rows] = await db.execute(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );
  const list = rows as User[];
  return list.length > 0 ? list[0] : null;
}

/** 获取所有用户列表（不含密码） */
export async function getUsers(): Promise<SafeUser[]> {
  const db = await getDb();
  const [rows] = await db.execute(
    "SELECT id, username, role, created_at FROM users ORDER BY created_at ASC"
  );
  return rows as SafeUser[];
}

/** 统计用户总数 */
export async function getUserCount(): Promise<number> {
  const db = await getDb();
  const [rows] = await db.execute("SELECT COUNT(*) as count FROM users");
  return (rows as any[])[0].count as number;
}

/** 创建用户，返回 SafeUser */
export async function createUser(data: {
  username: string;
  password: string;
  role?: string;
}): Promise<SafeUser> {
  const db = await getDb();
  const id = uuid();
  const now = new Date().toISOString();
  const hash = await bcrypt.hash(data.password, 10);
  const role = data.role ?? "admin";

  await db.execute(
    "INSERT INTO users (id, username, password, role, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, data.username, hash, role, now]
  );

  return { id, username: data.username, role: role as SafeUser["role"], created_at: now };
}

/** 验证密码 */
export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password);
}

/** 修改密码 */
export async function updatePassword(id: string, newPassword: string): Promise<boolean> {
  const db = await getDb();
  const hash = await bcrypt.hash(newPassword, 10);
  const [result] = await db.execute(
    "UPDATE users SET password = ? WHERE id = ?",
    [hash, id]
  );
  return (result as any).affectedRows > 0;
}

/** 删除用户 */
export async function deleteUser(id: string): Promise<boolean> {
  const db = await getDb();
  // 将该用户的问卷重新分配给第一个 super_admin
  const [superAdmins] = await db.execute(
    "SELECT id FROM users WHERE role = 'super_admin' ORDER BY created_at ASC LIMIT 1"
  );
  const saList = superAdmins as any[];
  if (saList.length > 0) {
    await db.execute(
      "UPDATE surveys SET user_id = ? WHERE user_id = ?",
      [saList[0].id, id]
    );
  }

  const [result] = await db.execute("DELETE FROM users WHERE id = ?", [id]);
  return (result as any).affectedRows > 0;
}

/** 将没有归属的问卷分配给指定用户 */
export async function assignOrphanSurveys(userId: string): Promise<number> {
  const db = await getDb();
  const [result] = await db.execute(
    "UPDATE surveys SET user_id = ? WHERE user_id IS NULL",
    [userId]
  );
  return (result as any).affectedRows;
}