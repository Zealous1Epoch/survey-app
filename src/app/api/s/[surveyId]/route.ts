import { NextRequest, NextResponse } from "next/server";
import { getSurvey } from "@/lib/db/surveys";
import { getQuestions, sanitizeQuestion } from "@/lib/db/questions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;
  const survey = await getSurvey(surveyId);
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }

  const questions = (await getQuestions(surveyId)).map(sanitizeQuestion);
  return NextResponse.json({
    ...survey,
    questions,
  });
}