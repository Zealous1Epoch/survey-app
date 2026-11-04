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

/** 单题提交（向后兼容） */
export async function submitResponse(
  surveyId: string,
  questionId: string,
  value: string,
  submissionId?: string
): Promise<Response> {
  const db = await getDb();
  const id = uuid();
  const now = new Date().toISOString();
  await db.execute(
    "INSERT INTO responses (id, question_id, survey_id, submission_id, value, submitted_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, questionId, surveyId, submissionId ?? "", value, now]
  );
  return { id, question_id: questionId, survey_id: surveyId, submission_id: submissionId ?? "", value, submitted_at: now };
}

/** 批量提交：一个人一次性提交所有答案 */
export async function submitBulk(
  surveyId: string,
  answers: Array<{ questionId: string; value: string }>
): Promise<string> {
  const db = await getDb();
  const connection = await db.getConnection();
  const submissionId = uuid();
  const now = new Date().toISOString();

  try {
    await connection.beginTransaction();
    for (const a of answers) {
      await connection.execute(
        "INSERT INTO responses (id, question_id, survey_id, submission_id, value, submitted_at) VALUES (?, ?, ?, ?, ?, ?)",
        [uuid(), a.questionId, surveyId, submissionId, a.value, now]
      );
    }
    await connection.commit();
    return submissionId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/** 按人分组的所有提交。answers 以 question_id 为键——
 *  用标题作键会让同名题目的答案互相覆盖 */
export interface SubmissionRow {
  submission_id: string;
  submitted_at: string;
  answers: Record<string, string>;
}

export async function getSubmissions(surveyId: string): Promise<SubmissionRow[]> {
  const db = await getDb();
  const [all] = await db.execute(
    `SELECT r.submission_id, r.question_id, r.value, r.submitted_at
     FROM responses r WHERE r.survey_id = ? AND r.submission_id != ''
     ORDER BY r.submitted_at DESC`,
    [surveyId]
  );
  const rows = all as Array<{
    submission_id: string;
    question_id: string;
    value: string;
    submitted_at: string;
  }>;

  const grouped = new Map<string, SubmissionRow>();
  for (const row of rows) {
    if (!grouped.has(row.submission_id)) {
      grouped.set(row.submission_id, {
        submission_id: row.submission_id,
        submitted_at: row.submitted_at,
        answers: {},
      });
    }
    grouped.get(row.submission_id)!.answers[row.question_id] = row.value;
  }

  return Array.from(grouped.values());
}

/** 分页获取提交（按人），并返回总人数 */
export async function getSubmissionsPaged(
  surveyId: string,
  limit: number,
  offset: number
): Promise<{ rows: SubmissionRow[]; total: number }> {
  const db = await getDb();

  const [cntRows] = await db.execute(
    `SELECT COUNT(DISTINCT submission_id) AS total
     FROM responses WHERE survey_id = ? AND submission_id != ''`,
    [surveyId]
  );
  const total = Number((cntRows as Array<{ total: number }>)[0]?.total ?? 0);

  // LIMIT/OFFSET 在预处理语句里绑定不可靠，此处入参已在路由层 parseInt+钳位，直接内插
  const [pageRows] = await db.execute(
    `SELECT submission_id, MAX(submitted_at) AS submitted_at
     FROM responses
     WHERE survey_id = ? AND submission_id != ''
     GROUP BY submission_id
     ORDER BY submitted_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    [surveyId]
  );
  const pageIds = pageRows as Array<{ submission_id: string; submitted_at: string }>;
  if (pageIds.length === 0) return { rows: [], total };

  const placeholders = pageIds.map(() => "?").join(",");
  const [ansRows] = await db.execute(
    `SELECT submission_id, question_id, value
     FROM responses
     WHERE survey_id = ? AND submission_id IN (${placeholders})`,
    [surveyId, ...pageIds.map((p) => p.submission_id)]
  );
  const answers = ansRows as Array<{
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
    sub.answers[row.question_id] = row.value;
  }

  return { rows: Array.from(grouped.values()), total };
}

/** 单题统计（数据页按题懒加载用） */
export async function getQuestionStats(
  questionId: string
): Promise<{ total: number; values: Record<string, number> }> {
  const db = await getDb();
  const [rows] = await db.execute(
    `SELECT value, COUNT(*) AS count FROM responses
     WHERE question_id = ?
     GROUP BY value ORDER BY count DESC`,
    [questionId]
  );
  const list = rows as Array<{ value: string; count: number }>;

  const values: Record<string, number> = {};
  let total = 0;
  for (const r of list) {
    values[r.value] = Number(r.count);
    total += Number(r.count);
  }
  return { total, values };
}

export async function getResponses(
  surveyId: string,
  questionId?: string
): Promise<ResponseRow[]> {
  const db = await getDb();
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
  const [rows] = await db.execute(sql, params);
  return rows as ResponseRow[];
}

export async function getStats(surveyId: string): Promise<Record<
  string,
  { total: number; values: Record<string, number> }
>> {
  const db = await getDb();
  const [rows] = await db.execute(
    `SELECT q.id, q.title, q.type, q.options, r.value, COUNT(*) as count
     FROM responses r
     JOIN questions q ON q.id = r.question_id
     WHERE r.survey_id = ?
     GROUP BY q.id, r.value
     ORDER BY q.\`order\`, count DESC`,
    [surveyId]
  );
  const data = rows as Array<{
    id: string;
    title: string;
    type: string;
    options: string;
    value: string;
    count: number;
  }>;

  const stats: Record<string, { total: number; values: Record<string, number> }> = {};
  for (const row of data) {
    if (!stats[row.id]) {
      stats[row.id] = { total: 0, values: {} };
    }
    stats[row.id].values[row.value] = row.count;
    stats[row.id].total += row.count;
  }
  return stats;
}

export async function deleteSubmission(surveyId: string, submissionId: string): Promise<boolean> {
  const db = await getDb();
  const [result] = await db.execute(
    "DELETE FROM responses WHERE survey_id = ? AND submission_id = ?",
    [surveyId, submissionId]
  );
  return (result as any).affectedRows > 0;
}

export async function clearResponses(surveyId: string): Promise<boolean> {
  const db = await getDb();
  const [result] = await db.execute(
    "DELETE FROM responses WHERE survey_id = ?",
    [surveyId]
  );
  return (result as any).affectedRows > 0;
}

/** 导出：每人一行，列 = 题目 + 提交时间。
 *  内部按 question_id 关联答案，同名题目的列头自动加序号区分 */
export async function getExportRows(
  surveyId: string
): Promise<Array<Record<string, string>>> {
  const db = await getDb();
  const [qRows] = await db.execute(
    "SELECT id, title FROM questions WHERE survey_id = ? ORDER BY `order` ASC",
    [surveyId]
  );
  const questions = qRows as Array<{ id: string; title: string }>;

  // 题目列表为空时补一个占位标题，避免导出全空列
  const titleCount = new Map<string, number>();
  for (const q of questions) {
    titleCount.set(q.title, (titleCount.get(q.title) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  const headers = questions.map((q) => {
    const base = q.title || q.id;
    if ((titleCount.get(q.title) ?? 1) <= 1 && base !== "") return base;
    const n = (seen.get(q.title) ?? 0) + 1;
    seen.set(q.title, n);
    return `${base}(${n})`;
  });

  const submissions = await getSubmissions(surveyId);

  return submissions.map((sub) => {
    const row: Record<string, string> = {
      "提交编号": sub.submission_id,
      "提交时间": sub.submitted_at,
    };
    questions.forEach((q, i) => {
      row[headers[i]] = sub.answers[q.id] ?? "";
    });
    return row;
  });
}