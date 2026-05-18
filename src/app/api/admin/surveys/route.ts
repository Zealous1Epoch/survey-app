import { NextRequest, NextResponse } from "next/server";
import { getSurveys, createSurvey } from "@/lib/db/surveys";
import { createQuestion, QuestionType } from "@/lib/db/questions";

export async function GET() {
  const surveys = getSurveys();
  return NextResponse.json(surveys);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, redirect_url, questions } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const survey = createSurvey({ title: title.trim(), description, redirect_url });

  if (questions && Array.isArray(questions)) {
    questions.forEach((q: { type: QuestionType; title: string; options?: string[]; required?: boolean; redirect_url?: string }, i: number) => {
      createQuestion(survey.id, { ...q, order: i });
    });
  }

  return NextResponse.json(survey, { status: 201 });
}
