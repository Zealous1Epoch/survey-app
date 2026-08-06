import { NextRequest, NextResponse } from "next/server";
import {
  getSurvey,
  updateSurvey,
  deleteSurvey,
} from "@/lib/db/surveys";
import {
  getQuestions,
  sanitizeQuestion,
  deleteQuestionsBySurvey,
  createQuestion,
  QuestionType,
} from "@/lib/db/questions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const survey = await getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }
  const questions = (await getQuestions(id)).map(sanitizeQuestion);
  return NextResponse.json({ ...survey, questions });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const survey = await getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }

  const body = await req.json();
  const { title, description, redirect_url, questions } = body;

  await updateSurvey(id, { title, description, redirect_url });

  if (questions && Array.isArray(questions)) {
    await deleteQuestionsBySurvey(id);
    for (const q of questions) {
      await createQuestion(id, { ...q, order: q.order ?? 0 });
    }
  }

  return NextResponse.json(await getSurvey(id));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await deleteSurvey(id);
  if (!deleted) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}