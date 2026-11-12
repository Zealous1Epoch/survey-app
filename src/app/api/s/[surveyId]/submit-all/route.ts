import { NextRequest, NextResponse } from "next/server";
import { submitBulk } from "@/lib/db/responses";
import { getSurvey } from "@/lib/db/surveys";
import { getQuestions } from "@/lib/db/questions";

const MAX_VALUE_LEN = 5000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;

    const survey = await getSurvey(surveyId);
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

    // 答案必须属于该问卷的题目（防止伪造 questionId 写入脏数据）
    const questions = await getQuestions(surveyId);
    const validQuestionIds = new Set(questions.map((q) => q.id));
    const invalidAnswers = answers.filter((a) => !validQuestionIds.has(a.questionId));
    if (invalidAnswers.length > 0) {
      return NextResponse.json({ error: "存在无效的问题 ID" }, { status: 400 });
    }

    // 答案长度上限（TEXT 列 64KB，留足余量）
    for (const a of answers) {
      if (typeof a.value === "string" && a.value.length > MAX_VALUE_LEN) {
        return NextResponse.json({ error: "答案内容过长" }, { status: 400 });
      }
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

    // 新题型格式服务端校验（选答但未填格式非法也要拦）
    for (const a of answers) {
      const q = questions.find((qq) => qq.id === a.questionId);
      if (!q || a.value === "") continue;
      if (q.type === "date") {
        const m = a.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const real = m && Number(m[2]) >= 1 && Number(m[2]) <= 12 &&
          Number(m[3]) >= 1 && Number(m[3]) <= new Date(Number(m[1]), Number(m[2]), 0).getDate();
        if (!real) {
          return NextResponse.json({ error: `日期格式不正确：${q.title}` }, { status: 400 });
        }
      }
      if (q.type === "nps") {
        const n = Number(a.value);
        if (!Number.isInteger(n) || n < 0 || n > 10) {
          return NextResponse.json({ error: `NPS 分值不合法：${q.title}` }, { status: 400 });
        }
      }
      if (q.type === "number") {
        const n = Number(a.value);
        if (!Number.isFinite(n)) {
          return NextResponse.json({ error: `请输入数字：${q.title}` }, { status: 400 });
        }
        let cfg: { min?: number; max?: number } = {};
        try {
          const parsed = JSON.parse(q.options);
          if (parsed && !Array.isArray(parsed)) cfg = parsed;
        } catch { /* 选项列不是范围对象则视为无限 */ }
        if (cfg.min !== undefined && cfg.min !== null && n < cfg.min) {
          return NextResponse.json({ error: `${q.title}：不能小于 ${cfg.min}` }, { status: 400 });
        }
        if (cfg.max !== undefined && cfg.max !== null && n > cfg.max) {
          return NextResponse.json({ error: `${q.title}：不能大于 ${cfg.max}` }, { status: 400 });
        }
      }
    }

    const submissionId = await submitBulk(surveyId, answers);

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
