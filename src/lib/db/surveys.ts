import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export interface Survey {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  created_at: string;
  owner_id: string | null;
}

export interface SurveyWithCounts extends Survey {
  question_count: number;
  response_count: number;
}

export function getSurveys(ownerId?: string): SurveyWithCounts[] {
  const db = getDb();
  if (ownerId) {
    return db
      .prepare(
        `SELECT s.*,
          (SELECT COUNT(*) FROM questions WHERE survey_id = s.id) as question_count,
          (SELECT COUNT(DISTINCT r.id) FROM responses r WHERE r.survey_id = s.id) as response_count
         FROM surveys s WHERE s.owner_id = ? ORDER BY s.created_at DESC`
      )
      .all(ownerId) as SurveyWithCounts[];
  }
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

export function createSurvey(
  data: {
    title: string;
    description?: string;
    redirect_url?: string;
  },
  ownerId?: string
): Survey {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO surveys (id, title, description, redirect_url, created_at, owner_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, data.title, data.description ?? "", data.redirect_url ?? "", now, ownerId ?? null);
  return { id, title: data.title, description: data.description ?? "", redirect_url: data.redirect_url ?? "", created_at: now, owner_id: ownerId ?? null };
}

export function updateSurvey(
  id: string,
  data: { title?: string; description?: string; redirect_url?: string },
  ownerId?: string
): boolean {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | undefined)[] = [];

  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.redirect_url !== undefined) { fields.push("redirect_url = ?"); values.push(data.redirect_url); }

  if (fields.length === 0) return false;

  values.push(id);
  if (ownerId !== undefined) {
    values.push(ownerId);
    const result = db
      .prepare(`UPDATE surveys SET ${fields.join(", ")} WHERE id = ? AND owner_id = ?`)
      .run(...(values as [string, ...string[]]));
    return result.changes > 0;
  }

  const result = db
    .prepare(`UPDATE surveys SET ${fields.join(", ")} WHERE id = ?`)
    .run(...(values as [string, ...string[]]));
  return result.changes > 0;
}

export function deleteSurvey(id: string, ownerId?: string): boolean {
  const db = getDb();
  if (ownerId !== undefined) {
    const result = db.prepare("DELETE FROM surveys WHERE id = ? AND owner_id = ?").run(id, ownerId);
    return result.changes > 0;
  }
  const result = db.prepare("DELETE FROM surveys WHERE id = ?").run(id);
  return result.changes > 0;
}
