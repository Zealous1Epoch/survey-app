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
  const survey = getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }
  const questions = getQuestions(id).map(sanitizeQuestion);
  return NextResponse.json({ ...survey, questions });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const survey = getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }

  const body = await req.json();
  const { title, description, redirect_url, questions } = body;

  updateSurvey(id, { title, description, redirect_url });

  if (questions && Array.isArray(questions)) {
    deleteQuestionsBySurvey(id);
    questions.forEach(
      (
        q: {
          id?: string;
          type: QuestionType;
          title: string;
          options?: string[];
          required?: boolean;
          redirect_url?: string;
        },
        i: number
      ) => {
        createQuestion(id, { ...q, order: i });
      }
    );
  }

  return NextResponse.json(getSurvey(id));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteSurvey(id);
  if (!deleted) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
