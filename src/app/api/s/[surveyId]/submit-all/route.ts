import { NextRequest, NextResponse } from "next/server";
import { submitBulk } from "@/lib/db/responses";
import { getSurvey } from "@/lib/db/surveys";
import { getQuestions } from "@/lib/db/questions";
import { validateAnswers } from "@/lib/answer-validation";

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
    const { answers } = body as {
      answers: Array<{ questionId: string; value: string }>;
    };

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "请至少回答一题" }, { status: 400 });
    }

    // 校验规则与管理员修改答卷同源（题目归属/长度/必填/空答案过滤/题型格式）
    const questions = await getQuestions(surveyId);
    const { error, cleaned } = validateAnswers(questions, answers);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const submissionId = await submitBulk(surveyId, cleaned);

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
