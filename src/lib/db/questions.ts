import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export type QuestionType = "choice" | "multi" | "text" | "rating";

export interface Question {
  id: string;
  survey_id: string;
  type: QuestionType;
  title: string;
  options: string;
  required: number;
  redirect_url: string;
  image_url: string;
  order: number;
}

export interface QuestionData {
  id?: string;
  type: QuestionType;
  title: string;
  options?: string[];
  required?: boolean;
  redirect_url?: string;
  image_url?: string;
  order?: number;
}

export function getQuestions(surveyId: string): Question[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM questions WHERE survey_id = ? ORDER BY \"order\" ASC")
    .all(surveyId) as Question[];
}

export function getQuestion(id: string): Question | null {
  const db = getDb();
  return (db
    .prepare("SELECT * FROM questions WHERE id = ?")
    .get(id) as Question) ?? null;
}

export function createQuestion(
  surveyId: string,
  data: QuestionData
): Question {
  const db = getDb();
  const id = data.id ?? uuid();
  db.prepare(
    `INSERT INTO questions (id, survey_id, type, title, options, required, redirect_url, image_url, "order")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    surveyId,
    data.type,
    data.title,
    JSON.stringify(data.options ?? []),
    data.required !== false ? 1 : 0,
    data.redirect_url ?? "",
    data.image_url ?? "",
    data.order ?? 0
  );
  return {
    id,
    survey_id: surveyId,
    type: data.type,
    title: data.title,
    options: JSON.stringify(data.options ?? []),
    required: data.required !== false ? 1 : 0,
    redirect_url: data.redirect_url ?? "",
    image_url: data.image_url ?? "",
    order: data.order ?? 0,
  };
}

export function updateQuestion(
  id: string,
  data: Partial<QuestionData>
): boolean {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (data.type !== undefined) { fields.push("type = ?"); values.push(data.type); }
  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.options !== undefined) { fields.push("options = ?"); values.push(JSON.stringify(data.options)); }
  if (data.required !== undefined) { fields.push("required = ?"); values.push(data.required ? 1 : 0); }
  if (data.redirect_url !== undefined) { fields.push("redirect_url = ?"); values.push(data.redirect_url); }
  if (data.image_url !== undefined) { fields.push("image_url = ?"); values.push(data.image_url); }
  if (data.order !== undefined) { fields.push("\"order\" = ?"); values.push(data.order); }

  if (fields.length === 0) return false;

  values.push(id);
  const result = db
    .prepare(`UPDATE questions SET ${fields.join(", ")} WHERE id = ?`)
    .run(...(values as [string | number, ...(string | number)[]]));
  return result.changes > 0;
}

export function deleteQuestion(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM questions WHERE id = ?").run(id);
  return result.changes > 0;
}

export function deleteQuestionsBySurvey(surveyId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM questions WHERE survey_id = ?").run(surveyId);
}

export function sanitizeQuestion(q: Question) {
  return {
    ...q,
    options: JSON.parse(q.options),
    required: !!q.required,
    image_url: q.image_url || "",
  };
}
