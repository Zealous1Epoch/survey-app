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

export function getSurveys(): SurveyWithCounts[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.*,
        (SELECT COUNT(*) FROM questions WHERE survey_id = s.id) as question_count,
        (SELECT COUNT(DISTINCT r.id) FROM responses r WHERE r.survey_id = s.id) as response_count
       FROM surveys s ORDER BY s.created_at DESC`
    )
    .all() as SurveyWithCounts[];
}

export function getSurvey(id: string): Survey | null {
  const db = getDb();
  return (db
    .prepare("SELECT * FROM surveys WHERE id = ?")
    .get(id) as Survey) ?? null;
}

export function createSurvey(data: {
  title: string;
  description?: string;
  redirect_url?: string;
}): Survey {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO surveys (id, title, description, redirect_url, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, data.title, data.description ?? "", data.redirect_url ?? "", now);
  return { id, title: data.title, description: data.description ?? "", redirect_url: data.redirect_url ?? "", created_at: now };
}

export function updateSurvey(
  id: string,
  data: { title?: string; description?: string; redirect_url?: string }
): boolean {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | undefined)[] = [];

  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.redirect_url !== undefined) { fields.push("redirect_url = ?"); values.push(data.redirect_url); }

  if (fields.length === 0) return false;

  values.push(id);
  const result = db
    .prepare(`UPDATE surveys SET ${fields.join(", ")} WHERE id = ?`)
    .run(...(values as [string, ...string[]]));
  return result.changes > 0;
}

export function deleteSurvey(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM surveys WHERE id = ?").run(id);
  return result.changes > 0;
}
