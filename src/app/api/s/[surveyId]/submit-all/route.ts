import { NextRequest, NextResponse } from "next/server";
import { submitBulk } from "@/lib/db/responses";
import { getSurvey } from "@/lib/db/surveys";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
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

  const submissionId = await submitBulk(surveyId, answers);

  return NextResponse.json({
    success: true,
    submission_id: submissionId,
    
  });
}