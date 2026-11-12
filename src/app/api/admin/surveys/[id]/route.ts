import { NextRequest, NextResponse } from "next/server";
import {
  getSurvey,
  updateSurvey,
  deleteSurvey,
} from "@/lib/db/surveys";
import { getQuestions, sanitizeQuestion } from "@/lib/db/questions";
import { VALID_QUESTION_TYPES } from "@/lib/question-types";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

/** 检查所有权：非 super_admin 且问卷不属于当前用户时返回 403 */
function checkOwnership(survey: { user_id: string | null } | null, req: NextRequest): NextResponse | null {
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }
  const role = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id");
  if (role !== "super_admin" && survey.user_id !== userId) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const survey = await getSurvey(id);
  const err = checkOwnership(survey, req);
  if (err) return err;

  const questions = (await getQuestions(id)).map(sanitizeQuestion);
  return NextResponse.json({ ...survey, questions });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const survey = await getSurvey(id);
  const err = checkOwnership(survey, req);
  if (err) return err;

  const body = await req.json();
  const { title, description, redirect_url, questions } = body;

  // 先做全部校验再落库，避免 400 时标题已被改掉而题目未变的半成功状态
  if (questions && Array.isArray(questions)) {
    for (const q of questions) {
      if (!VALID_QUESTION_TYPES.includes(q.type)) {
        return NextResponse.json({ error: "无效的题目类型" }, { status: 400 });
      }
    }
  }

  await updateSurvey(id, { title, description, redirect_url });

  // 按题目 id 做 diff（update/insert/delete），绝不整表重建——
  // questions 上有 responses 的外键级联，删题重建会级联删光答卷
  if (questions && Array.isArray(questions)) {
    const db = await getDb();
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [existingRows] = await conn.execute(
        "SELECT id FROM questions WHERE survey_id = ?",
        [id]
      );
      const existingIds = new Set<string>(
        (existingRows as { id: string }[]).map((r) => r.id)
      );
      const keptIds = new Set<string>();

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const order = typeof q.order === "number" ? q.order : i;
        const values = [
          q.type,
          q.title ?? "",
          JSON.stringify(q.options ?? []),
          q.required !== false ? 1 : 0,
          q.redirect_url ?? "",
          q.image_url ?? "",
          order,
        ];
        if (typeof q.id === "string" && existingIds.has(q.id)) {
          keptIds.add(q.id);
          await conn.execute(
            "UPDATE questions SET type = ?, title = ?, options = ?, required = ?, redirect_url = ?, image_url = ?, `order` = ? WHERE id = ? AND survey_id = ?",
            [...values, q.id, id]
          );
        } else {
          // 新题：id 一律服务端生成，不接受客户端传入，防止伪造他人题目 id
          await conn.execute(
            "INSERT INTO questions (id, survey_id, type, title, options, required, redirect_url, image_url, `order`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [uuid(), id, ...values]
          );
        }
      }

      for (const oldId of existingIds) {
        if (!keptIds.has(oldId)) {
          await conn.execute("DELETE FROM questions WHERE id = ?", [oldId]);
        }
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      console.error("保存问卷题目失败", e);
      return NextResponse.json({ error: "保存题目失败" }, { status: 500 });
    } finally {
      conn.release();
    }
  }

  return NextResponse.json(await getSurvey(id));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const survey = await getSurvey(id);
  const err = checkOwnership(survey, req);
  if (err) return err;

  const deleted = await deleteSurvey(id);
  if (!deleted) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}