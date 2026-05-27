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
  db.prepare(
    "INSERT INTO responses (id, question_id, survey_id, submission_id, value, submitted_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, questionId, surveyId, submissionId ?? "", value, now);
  return { id, question_id: questionId, survey_id: surveyId, submission_id: submissionId ?? "", value, submitted_at: now };
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
    grouped.get(row.submission_id)!.answers[title] = row.value;
  }

  return Array.from(grouped.values());
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
      row[q.title] = sub.answers[q.title] ?? "";
    }
    return row;
  });
}

