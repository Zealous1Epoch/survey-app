import { NextRequest, NextResponse } from "next/server";
import { getSurvey } from "@/lib/db/surveys";
import { getStats, getQuestionStats } from "@/lib/db/responses";
import { getQuestions, getQuestion, sanitizeQuestion } from "@/lib/db/questions";

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

  // 单题懒加载：?question_id=xxx
  const questionId = req.nextUrl.searchParams.get("question_id");
  if (questionId) {
    const q = await getQuestion(questionId);
    if (!q || q.survey_id !== id) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }
    const stats = await getQuestionStats(questionId);
    return NextResponse.json({ id: questionId, stats });
  }

  const stats = await getStats(id);
  const questions = (await getQuestions(id)).map(sanitizeQuestion);

  const enriched = questions.map((q) => ({
    ...q,
    stats: stats[q.id] ?? { total: 0, values: {} },
  }));

  return NextResponse.json(enriched);
}