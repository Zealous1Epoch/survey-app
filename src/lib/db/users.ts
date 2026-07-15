import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";

export interface User {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

export function createUser(username: string, password: string): User {
  const db = getDb();
  const id = uuid();
  const password_hash = bcrypt.hashSync(password, 10);
  const created_at = new Date().toISOString();
  db.prepare(
    "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)"
  ).run(id, username, password_hash, created_at);
  return { id, username, password_hash, created_at };
}

export function getUserByUsername(username: string): User | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as User | undefined;
  return row ?? null;
}

export function getUserById(id: string): User | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | User
    | undefined;
  return row ?? null;
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}
