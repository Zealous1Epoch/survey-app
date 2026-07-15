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
import { getDb } from "@/lib/db";

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getUserId(req);
  const survey = getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }
  if (userId && survey.owner_id !== userId) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }
  const questions = getQuestions(id).map(sanitizeQuestion);
  return NextResponse.json({ ...survey, questions });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const survey = getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }
  if (survey.owner_id !== userId) {
    return NextResponse.json({ error: "无权修改" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, redirect_url, questions } = body;

  updateSurvey(id, { title, description, redirect_url }, userId);

  if (questions && Array.isArray(questions)) {
    const db = getDb();
    db.transaction(() => {
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
    })();
  }

  return NextResponse.json(getSurvey(id));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const deleted = deleteSurvey(id, userId);
  if (!deleted) {
    return NextResponse.json({ error: "问卷不存在或无权删除" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
