import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export type QuestionType = "choice" | "multi" | "text" | "rating" | "limited_choice";

/** 选项数据结构：label 为选项文字，limit=0 表示不限量 */
export interface OptionItem {
  label: string;
  limit: number;
}

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
  options?: (string | OptionItem)[];
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

/** 将旧格式 string[] 或新格式 OptionItem[] 统一转为 OptionItem[] */
export function normalizeOptions(raw: unknown): OptionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return { label: item, limit: 0 };
    return { label: item.label ?? "", limit: Math.max(0, Number(item.limit ?? 0)) };
  });
}

/** 计算某个 limited_choice 题目各选项的剩余名额，返回 Map<选项label, 剩余数> */
export function getRemainingSlots(questionId: string): Map<string, number> {
  const db = getDb();
  const q = getQuestion(questionId);
  if (!q) return new Map();

  const options = normalizeOptions(JSON.parse(q.options));
  const counts = db
    .prepare("SELECT value, COUNT(*) as cnt FROM responses WHERE question_id = ? GROUP BY value")
    .all(questionId) as Array<{ value: string; cnt: number }>;

  const countMap = new Map(counts.map((r) => [r.value, r.cnt]));
  const result = new Map<string, number>();
  for (const opt of options) {
    const used = countMap.get(opt.label) ?? 0;
    const limit = opt.limit;
    result.set(opt.label, limit === 0 ? Infinity : Math.max(0, limit - used));
  }
  return result;
}

/** 批量计算多个 limited_choice 题目的剩余名额（避免 N+1 查询） */
export function getRemainingSlotsBatch(questionIds: string[]): Map<string, Map<string, number>> {
  const db = getDb();
  const result = new Map<string, Map<string, number>>();

  if (questionIds.length === 0) return result;

  const placeholders = questionIds.map(() => "?").join(",");
  const counts = db
    .prepare(
      `SELECT question_id, value, COUNT(*) as cnt
       FROM responses
       WHERE question_id IN (${placeholders})
       GROUP BY question_id, value`
    )
    .all(...questionIds) as Array<{ question_id: string; value: string; cnt: number }>;

  // 按 question_id 分组
  const countsByQ = new Map<string, Map<string, number>>();
  for (const row of counts) {
    if (!countsByQ.has(row.question_id)) {
      countsByQ.set(row.question_id, new Map());
    }
    countsByQ.get(row.question_id)!.set(row.value, row.cnt);
  }

  // 一次性批量取题目，避免循环单查的 N+1
  const qs = db
    .prepare(`SELECT * FROM questions WHERE id IN (${placeholders})`)
    .all(...questionIds) as Question[];

  // 为每个题目计算剩余名额
  for (const q of qs) {
    const options = normalizeOptions(JSON.parse(q.options));
    const qCounts = countsByQ.get(q.id) ?? new Map();
    const slots = new Map<string, number>();
    for (const opt of options) {
      const used = qCounts.get(opt.label) ?? 0;
      slots.set(opt.label, opt.limit === 0 ? Infinity : Math.max(0, opt.limit - used));
    }
    result.set(q.id, slots);
  }

  return result;
}
