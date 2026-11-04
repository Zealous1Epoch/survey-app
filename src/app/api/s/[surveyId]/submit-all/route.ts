import { NextRequest, NextResponse } from "next/server";
import { submitBulk, submitBulkWithLimitCheck } from "@/lib/db/responses";
import { getSurvey } from "@/lib/db/surveys";
import { getQuestions, normalizeOptions } from "@/lib/db/questions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;

    const survey = getSurvey(surveyId);
    if (!survey) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
    }

    const body = await req.json();
    let { answers } = body as {
      answers: Array<{ questionId: string; value: string }>;
    };

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "请至少回答一题" }, { status: 400 });
    }

    // 验证答案的 questionId 是否属于该问卷
    const questions = getQuestions(surveyId);
    const validQuestionIds = new Set(questions.map((q) => q.id));
    const invalidAnswers = answers.filter((a) => !validQuestionIds.has(a.questionId));
    if (invalidAnswers.length > 0) {
      return NextResponse.json({ error: "存在无效的问题 ID" }, { status: 400 });
    }

    // 服务端必填校验（不信任前端）
    const answerMap = new Map(answers.map((a) => [a.questionId, a.value ?? ""]));
    for (const q of questions) {
      if (!q.required) continue;
      const raw = answerMap.get(q.id) ?? "";
      let empty = raw === "";
      if (!empty && q.type === "multi") {
        try { const arr = JSON.parse(raw); empty = !Array.isArray(arr) || arr.length === 0; } catch { empty = true; }
      }
      if (!empty && q.type === "rating") {
        const n = Number(raw); empty = !Number.isInteger(n) || n < 1 || n > 5;
      }
      if (!empty && q.type !== "multi" && q.type !== "rating") {
        empty = raw.trim() === "";
      }
      if (empty) {
        return NextResponse.json({ error: `必答题未完成：${q.title}` }, { status: 400 });
      }
    }

    // 选答题的空答案不落库，避免污染统计
    const cleanAnswers = answers.filter(
      (a) => a.value !== "" && a.value !== "[]" && !(a.value === "0" && questions.find((q) => q.id === a.questionId)?.type === "rating")
    );
    if (cleanAnswers.length === 0) {
      return NextResponse.json({ error: "请至少回答一题" }, { status: 400 });
    }
    answers = cleanAnswers;

    // 收集需要限量检查的选项
    const limitedChecks: Array<{ questionId: string; optionLabel: string; limit: number }> = [];
    for (const a of answers) {
      if (!a.value) continue;
      const q = questions.find((q) => q.id === a.questionId);
      if (!q || q.type !== "limited_choice") continue;
      const options = normalizeOptions(JSON.parse(q.options));
      const selected = options.find((o) => o.label === a.value);
      if (selected && selected.limit > 0) {
        limitedChecks.push({ questionId: a.questionId, optionLabel: a.value, limit: selected.limit });
      }
    }

    // 事务内原子操作：限量检查 + 批量写入
    if (limitedChecks.length > 0) {
      const result = submitBulkWithLimitCheck(surveyId, answers, limitedChecks);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        submission_id: result.submissionId,
        redirect_url: survey.redirect_url || "",
      });
    }

    // 无需限量检查，直接批量提交
    const submissionId = submitBulk(surveyId, answers);
    return NextResponse.json({
      success: true,
      submission_id: submissionId,
      redirect_url: survey.redirect_url || "",
    });
  } catch (error) {
    console.error("批量提交失败:", error);
    return NextResponse.json({ error: "提交失败，请重试" }, { status: 500 });
  }
}
