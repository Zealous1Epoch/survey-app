import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/lib/db/responses";
import { getQuestions, sanitizeQuestion } from "@/lib/db/questions";
import { getSurvey } from "@/lib/db/surveys";

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

  const stats = getStats(id);
  const questions = getQuestions(id).map(sanitizeQuestion);

  const enriched = questions.map((q) => ({
    ...q,
    stats: stats[q.id] ?? { total: 0, values: {} },
  }));

  return NextResponse.json(enriched);
}
