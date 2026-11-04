import { NextRequest, NextResponse } from "next/server";
import { getSurvey } from "@/lib/db/surveys";
import { getQuestions, sanitizeQuestion, normalizeOptions, getRemainingSlotsBatch } from "@/lib/db/questions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;
    const survey = getSurvey(surveyId);
    if (!survey) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
    }

    const rawQuestions = getQuestions(surveyId);

    // 批量获取所有 limited_choice 题目的剩余名额（一次查询）
    const limitedIds = rawQuestions.filter((q) => q.type === "limited_choice").map((q) => q.id);
    const allSlots = getRemainingSlotsBatch(limitedIds);

    const questions = rawQuestions.map((q) => {
      const sanitized = sanitizeQuestion(q);
      if (q.type === "limited_choice") {
        const remaining = allSlots.get(q.id) ?? new Map();
        const options = normalizeOptions(sanitized.options);
        sanitized.options = options.map((opt) => ({
          label: opt.label,
          limit: opt.limit,
          remaining: remaining.get(opt.label) ?? (opt.limit || Infinity),
        }));
      }
      return sanitized;
    });

    return NextResponse.json({
      ...survey,
      questions,
    });
  } catch (error) {
    console.error("获取问卷失败:", error);
    return NextResponse.json({ error: "获取问卷失败" }, { status: 500 });
  }
}
