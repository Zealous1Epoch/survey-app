import { NextRequest, NextResponse } from "next/server";
import {
  getSurvey,
  updateSurvey,
  deleteSurvey,
} from "@/lib/db/surveys";
import {
  getQuestions,
  sanitizeQuestion,
  deleteQuestionsBySurvey,
  createQuestion,
  QuestionType,
} from "@/lib/db/questions";

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

  await updateSurvey(id, { title, description, redirect_url });

  if (questions && Array.isArray(questions)) {
    await deleteQuestionsBySurvey(id);
    for (const q of questions) {
      await createQuestion(id, { ...q, order: q.order ?? 0 });
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