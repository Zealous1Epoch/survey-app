import { NextRequest, NextResponse } from "next/server";
import { submitResponse } from "@/lib/db/responses";
import { getQuestion } from "@/lib/db/questions";
import { getSurvey } from "@/lib/db/surveys";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string; questionId: string }> }
) {
  const { surveyId, questionId } = await params;

  const question = getQuestion(questionId);
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  const survey = getSurvey(surveyId);
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }

  const body = await req.json();
  const { value } = body;

  if (value === undefined || value === null || value === "") {
    if (question.required) {
      return NextResponse.json({ error: "此题为必填" }, { status: 400 });
    }
  }

  const response = submitResponse(surveyId, questionId, String(value ?? ""));

  const redirectUrl = question.redirect_url || survey.redirect_url || "";

  return NextResponse.json({
    success: true,
    id: response.id,
    redirect_url: redirectUrl,
  });
}
