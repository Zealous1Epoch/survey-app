import { NextRequest, NextResponse } from "next/server";
import {
  getSurvey,
  updateSurvey,
  deleteSurvey,
} from "@/lib/db/surveys";
import {
  getQuestions,
  sanitizeQuestion,
  deleteQuestion,
  createQuestion,
  updateQuestion,
  QuestionType,
} from "@/lib/db/questions";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const survey = getSurvey(id);
    if (!survey) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
    }
    const questions = getQuestions(id).map(sanitizeQuestion);
    return NextResponse.json({ ...survey, questions });
  } catch (error) {
    console.error("获取问卷详情失败:", error);
    return NextResponse.json({ error: "获取问卷详情失败" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const survey = getSurvey(id);
    if (!survey) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, redirect_url, questions } = body;

    updateSurvey(id, { title, description, redirect_url });

    if (questions && Array.isArray(questions)) {
      const db = getDb();
      // 增量更新：保留题目 id，避免级联删除已有回答
      const existing = getQuestions(id);
      const existingIds = new Set(existing.map((q) => q.id));
      const incomingIds = new Set(
        questions
          .map((q: { id?: string }) => q.id)
          .filter((qid: string | undefined): qid is string => !!qid && existingIds.has(qid))
      );

      db.transaction(() => {
        // 1) 删除已从编辑器移除的题目（仅这些题目的回答随之删除）
        for (const q of existing) {
          if (!incomingIds.has(q.id)) deleteQuestion(q.id);
        }
        // 2) 更新保留的题目 / 插入新题目
        questions.forEach(
          (
            q: {
              id?: string;
              type: QuestionType;
              title: string;
              options?: (string | { label: string; limit: number })[];
              required?: boolean;
              redirect_url?: string;
              image_url?: string;
            },
            i: number
          ) => {
            const data = {
              type: q.type,
              title: q.title,
              options: q.options,
              required: q.required,
              redirect_url: q.redirect_url ?? "",
              image_url: q.image_url ?? "",
              order: i,
            };
            if (q.id && existingIds.has(q.id)) {
              updateQuestion(q.id, data);
            } else {
              // 新题目一律服务端生成 id，防止客户端伪造 id 覆盖他卷题目
              createQuestion(id, data);
            }
          }
        );
      })();
    }

    return NextResponse.json(getSurvey(id));
  } catch (error) {
    console.error("更新问卷失败:", error);
    return NextResponse.json({ error: "更新问卷失败" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deleted = deleteSurvey(id);
    if (!deleted) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除问卷失败:", error);
    return NextResponse.json({ error: "删除问卷失败" }, { status: 500 });
  }
}
