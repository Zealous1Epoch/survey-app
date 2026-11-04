import { NextRequest, NextResponse } from "next/server";
import { getSurveys, createSurvey } from "@/lib/db/surveys";
import { createQuestion, QuestionType } from "@/lib/db/questions";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");

  // super_admin 可以看到所有问卷，普通用户只能看自己的
  const surveys = await getSurveys(role === "super_admin" ? undefined : userId ?? undefined);
  return NextResponse.json(surveys);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, redirect_url, questions } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const survey = await createSurvey({ title: title.trim(), description, redirect_url, userId });

  if (questions && Array.isArray(questions)) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      // order 兜底用数组下标：全 0 会让 MySQL 返回顺序不稳定（新建问卷题目乱序）
      await createQuestion(survey.id, { ...q, order: q.order ?? i });
    }
  }

  return NextResponse.json(survey, { status: 201 });
}