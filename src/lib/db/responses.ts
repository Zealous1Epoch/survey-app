import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export interface Response {
  id: string;
  question_id: string;
  survey_id: string;
  submission_id: string;
  value: string;
  submitted_at: string;
}

export interface ResponseRow {
  id: string;
  question_title: string;
  question_type: string;
  value: string;
  submitted_at: string;
}

/** Single-response submit (backwards compatible) */
export function submitResponse(
  surveyId: string,
  questionId: string,
  value: string,
  submissionId?: string
): Response {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  const sid = submissionId || uuid();
  db.prepare(
    "INSERT INTO responses (id, question_id, survey_id, submission_id, value, submitted_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, questionId, surveyId, sid, value, now);
  return { id, question_id: questionId, survey_id: surveyId, submission_id: sid, value, submitted_at: now };
}

/** 带限额检查的单题提交（事务内原子操作） */
export function submitWithLimitCheck(
  surveyId: string,
  questionId: string,
  value: string,
  limit: number,
  submissionId?: string
): { success: boolean; error?: string; response?: Response } {
  const db = getDb();
  const id = uuid();
  const sid = submissionId || uuid();
  const now = new Date().toISOString();

  const result = db.transaction(() => {
    const row = db
      .prepare("SELECT COUNT(*) as cnt FROM responses WHERE question_id = ? AND value = ?")
      .get(questionId, value) as { cnt: number };
    if (row.cnt >= limit) {
      return { success: false as const, error: "该选项已被选满，请选择其他选项" };
    }
    db.prepare(
      "INSERT INTO responses (id, question_id, survey_id, submission_id, value, submitted_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, questionId, surveyId, sid, value, now);
    return {
      success: true as const,
      response: { id, question_id: questionId, survey_id: surveyId, submission_id: sid, value, submitted_at: now },
    };
  })();

  return result;
}

/** Bulk submit: all answers for one person in one go */
export function submitBulk(
  surveyId: string,
  answers: Array<{ questionId: string; value: string }>
): string {
  const db = getDb();
  const submissionId = uuid();
  const now = new Date().toISOString();

  const stmt = db.prepare(
    "INSERT INTO responses (id, question_id, survey_id, submission_id, value, submitted_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const insertAll = db.transaction(() => {
    for (const a of answers) {
      stmt.run(uuid(), a.questionId, surveyId, submissionId, a.value, now);
    }
  });

  insertAll();
  return submissionId;
}

/** 带限量检查的批量提交（事务内原子操作，避免竞态条件） */
export function submitBulkWithLimitCheck(
  surveyId: string,
  answers: Array<{ questionId: string; value: string }>,
  limitedChecks: Array<{ questionId: string; optionLabel: string; limit: number }>
): { success: boolean; error?: string; submissionId?: string } {
  const db = getDb();
  const submissionId = uuid();
  const now = new Date().toISOString();

  const stmt = db.prepare(
    "INSERT INTO responses (id, question_id, survey_id, submission_id, value, submitted_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const result = db.transaction(() => {
    // 在事务内检查限量
    for (const check of limitedChecks) {
      const row = db
        .prepare("SELECT COUNT(*) as cnt FROM responses WHERE question_id = ? AND value = ?")
        .get(check.questionId, check.optionLabel) as { cnt: number };
      if (row.cnt >= check.limit) {
        return { success: false as const, error: `"${check.optionLabel}" 已被选满，请选择其他选项` };
      }
    }
    // 通过检查后批量写入
    for (const a of answers) {
      stmt.run(uuid(), a.questionId, surveyId, submissionId, a.value, now);
    }
    return { success: true as const, submissionId };
  })();

  return result;
}

/** Get all submissions grouped by person (pivot) */
export interface SubmissionRow {
  submission_id: string;
  submitted_at: string;
  answers: Record<string, string>; // question_title -> value
}

export function getSubmissions(surveyId: string): SubmissionRow[] {
  const db = getDb();
  const questions = db
    .prepare("SELECT id, title FROM questions WHERE survey_id = ? ORDER BY \"order\" ASC")
    .all(surveyId) as Array<{ id: string; title: string }>;

  const all = db
    .prepare(
      `SELECT r.submission_id, r.question_id, r.value, r.submitted_at
       FROM responses r WHERE r.survey_id = ? AND r.submission_id != ''
       ORDER BY r.submitted_at DESC`
    )
    .all(surveyId) as Array<{
    submission_id: string;
    question_id: string;
    value: string;
    submitted_at: string;
  }>;

  const qMap = new Map(questions.map((q) => [q.id, q.title]));
  const grouped = new Map<string, SubmissionRow>();

  for (const row of all) {
    if (!grouped.has(row.submission_id)) {
      grouped.set(row.submission_id, {
        submission_id: row.submission_id,
        submitted_at: row.submitted_at,
        answers: {},
      });
    }
    const title = qMap.get(row.question_id) ?? row.question_id;
    const key = title || row.question_id; // 空标题时用题目 ID 兜底
    grouped.get(row.submission_id)!.answers[key] = row.value;
  }

  return Array.from(grouped.values());
}

/** 分页获取提交（按人），并返回总数 */
export function getSubmissionsPaged(
  surveyId: string,
  limit: number,
  offset: number
): { rows: SubmissionRow[]; total: number } {
  const db = getDb();
  const total = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT submission_id) as cnt FROM responses WHERE survey_id = ? AND submission_id != ''`
      )
      .get(surveyId) as { cnt: number }
  ).cnt;

  const pageIds = db
    .prepare(
      `SELECT submission_id, MAX(submitted_at) as submitted_at
       FROM responses
       WHERE survey_id = ? AND submission_id != ''
       GROUP BY submission_id
       ORDER BY submitted_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(surveyId, limit, offset) as Array<{ submission_id: string; submitted_at: string }>;

  if (pageIds.length === 0) return { rows: [], total };

  const questions = db
    .prepare("SELECT id, title FROM questions WHERE survey_id = ? ORDER BY \"order\" ASC")
    .all(surveyId) as Array<{ id: string; title: string }>;
  const qMap = new Map(questions.map((q) => [q.id, q.title]));

  const placeholders = pageIds.map(() => "?").join(",");
  const answers = db
    .prepare(
      `SELECT submission_id, question_id, value FROM responses
       WHERE survey_id = ? AND submission_id IN (${placeholders})`
    )
    .all(surveyId, ...pageIds.map((p) => p.submission_id)) as Array<{
    submission_id: string;
    question_id: string;
    value: string;
  }>;

  const grouped = new Map<string, SubmissionRow>();
  for (const p of pageIds) {
    grouped.set(p.submission_id, {
      submission_id: p.submission_id,
      submitted_at: p.submitted_at,
      answers: {},
    });
  }
  for (const row of answers) {
    const sub = grouped.get(row.submission_id);
    if (!sub) continue;
    const title = qMap.get(row.question_id) ?? row.question_id;
    const key = title || row.question_id;
    sub.answers[key] = row.value;
  }

  return { rows: Array.from(grouped.values()), total };
}

/** 单题统计 */
export function getQuestionStats(questionId: string): { total: number; values: Record<string, number> } {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT value, COUNT(*) as count FROM responses
       WHERE question_id = ?
       GROUP BY value ORDER BY count DESC`
    )
    .all(questionId) as Array<{ value: string; count: number }>;

  const values: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    values[r.value] = r.count;
    total += r.count;
  }
  return { total, values };
}

export function getResponses(
  surveyId: string,
  questionId?: string
): ResponseRow[] {
  const db = getDb();
  let sql = `
    SELECT r.id, q.title as question_title, q.type as question_type, r.value, r.submitted_at
    FROM responses r
    JOIN questions q ON q.id = r.question_id
    WHERE r.survey_id = ?
  `;
  const params: string[] = [surveyId];

  if (questionId) {
    sql += " AND r.question_id = ?";
    params.push(questionId);
  }

  sql += " ORDER BY r.submitted_at DESC";
  return db.prepare(sql).all(...params) as ResponseRow[];
}

export function getStats(surveyId: string): Record<
  string,
  { total: number; values: Record<string, number> }
> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT q.id, q.title, q.type, q.options, r.value, COUNT(*) as count
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       WHERE r.survey_id = ?
       GROUP BY q.id, r.value
       ORDER BY q."order", count DESC`
    )
    .all(surveyId) as Array<{
    id: string;
    title: string;
    type: string;
    options: string;
    value: string;
    count: number;
  }>;

  const stats: Record<string, { total: number; values: Record<string, number> }> = {};
  for (const row of rows) {
    if (!stats[row.id]) {
      stats[row.id] = { total: 0, values: {} };
    }
    stats[row.id].values[row.value] = row.count;
    stats[row.id].total += row.count;
  }
  return stats;
}

export function deleteSubmission(surveyId: string, submissionId: string): boolean {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM responses WHERE survey_id = ? AND submission_id = ?")
    .run(surveyId, submissionId);
  return result.changes > 0;
}

export function clearResponses(surveyId: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM responses WHERE survey_id = ?").run(surveyId);
  return result.changes > 0;
}

/** 防止 Excel 公式注入：对以 =、+、-、@ 开头的值添加单引号前缀 */
export function sanitizeExcelValue(value: string): string {
  if (!value) return "";
  if (/^[=+\-@]/.test(value)) {
    return "'" + value;
  }
  return value;
}

/** Export: one row per person, columns = questions + submission time */
export function getExportRows(
  surveyId: string
): Array<Record<string, string>> {
  const db = getDb();
  const questions = db
    .prepare("SELECT * FROM questions WHERE survey_id = ? ORDER BY \"order\" ASC")
    .all(surveyId) as Array<{ id: string; title: string }>;

  const submissions = getSubmissions(surveyId);

  return submissions.map((sub) => {
    const row: Record<string, string> = {
      "提交编号": sub.submission_id,
      "提交时间": sub.submitted_at,
    };
    for (const q of questions) {
      const key = q.title || q.id; // 空标题时用题目 ID 兜底
      row[key] = sanitizeExcelValue(sub.answers[key] ?? "");
    }
    return row;
  });
}

