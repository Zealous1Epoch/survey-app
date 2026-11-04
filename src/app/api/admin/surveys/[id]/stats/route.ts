import { NextRequest, NextResponse } from "next/server";
import { getStats, getQuestionStats } from "@/lib/db/responses";
import { getQuestions, sanitizeQuestion, getQuestion } from "@/lib/db/questions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 只统计单题：?question_id=xxx
    const questionId = req.nextUrl.searchParams.get("question_id");
    if (questionId) {
      const q = getQuestion(questionId);
      if (!q || q.survey_id !== id) {
        return NextResponse.json({ error: "题目不存在" }, { status: 404 });
      }
      const stats = getQuestionStats(questionId);
      return NextResponse.json({ id: questionId, stats });
    }

    const stats = getStats(id);
    const questions = getQuestions(id).map(sanitizeQuestion);

    const enriched = questions.map((q) => ({
      ...q,
      stats: stats[q.id] ?? { total: 0, values: {} },
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("获取统计数据失败:", error);
    return NextResponse.json({ error: "获取统计数据失败" }, { status: 500 });
  }
}
