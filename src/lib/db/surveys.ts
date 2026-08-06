import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export interface Survey {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  created_at: string;
}

export interface SurveyWithCounts extends Survey {
  question_count: number;
  response_count: number;
}

export async function getSurveys(): Promise<SurveyWithCounts[]> {
  const db = await getDb();
  const [rows] = await db.query(
    `SELECT s.*,
      (SELECT COUNT(*) FROM questions WHERE survey_id = s.id) as question_count,
      (SELECT COUNT(DISTINCT r.id) FROM responses r WHERE r.survey_id = s.id) as response_count
     FROM surveys s ORDER BY s.created_at DESC`
  );
  return rows as SurveyWithCounts[];
}

export async function getSurvey(id: string): Promise<Survey | null> {
  const db = await getDb();
  const [rows] = await db.execute(
    "SELECT * FROM surveys WHERE id = ?",
    [id]
  );
  const list = rows as Survey[];
  return list.length > 0 ? list[0] : null;
}

export async function createSurvey(data: {
  title: string;
  description?: string;
  redirect_url?: string;
}): Promise<Survey> {
  const db = await getDb();
  const id = uuid();
  const now = new Date().toISOString();
  await db.execute(
    "INSERT INTO surveys (id, title, description, redirect_url, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, data.title, data.description ?? "", data.redirect_url ?? "", now]
  );
  return { id, title: data.title, description: data.description ?? "", redirect_url: data.redirect_url ?? "", created_at: now };
}

export async function updateSurvey(
  id: string,
  data: { title?: string; description?: string; redirect_url?: string }
): Promise<boolean> {
  const db = await getDb();
  const fields: string[] = [];
  const values: (string | undefined)[] = [];

  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.redirect_url !== undefined) { fields.push("redirect_url = ?"); values.push(data.redirect_url); }

  if (fields.length === 0) return false;

  values.push(id);
  const [result] = await db.query(
    `UPDATE surveys SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
  return (result as any).affectedRows > 0;
}

export async function deleteSurvey(id: string): Promise<boolean> {
  const db = await getDb();
  const [result] = await db.execute("DELETE FROM surveys WHERE id = ?", [id]);
  return (result as any).affectedRows > 0;
}