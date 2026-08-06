import { NextRequest, NextResponse } from "next/server";
import { getQuestion, sanitizeQuestion } from "@/lib/db/questions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ surveyId: string; questionId: string }> }
) {
  const { questionId } = await params;
  const question = await getQuestion(questionId);
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }
  return NextResponse.json(sanitizeQuestion(question));
}