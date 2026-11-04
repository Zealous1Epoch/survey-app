import { NextRequest, NextResponse } from "next/server";
import { getSurveys, createSurvey } from "@/lib/db/surveys";
import { createQuestion, QuestionType } from "@/lib/db/questions";

export async function GET() {
  try {
    const surveys = getSurveys();
    return NextResponse.json(surveys);
  } catch (error) {
    console.error("获取问卷列表失败:", error);
    return NextResponse.json({ error: "获取问卷列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, redirect_url, questions } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }

    const survey = createSurvey({ title: title.trim(), description, redirect_url });

    if (questions && Array.isArray(questions)) {
      questions.forEach((q: { type: QuestionType; title: string; options?: (string | { label: string; limit: number })[]; required?: boolean; redirect_url?: string }, i: number) => {
        createQuestion(survey.id, { ...q, order: i });
      });
    }

    return NextResponse.json(survey, { status: 201 });
  } catch (error) {
    console.error("创建问卷失败:", error);
    return NextResponse.json({ error: "创建问卷失败" }, { status: 500 });
  }
}
