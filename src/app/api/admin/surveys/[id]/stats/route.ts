import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/lib/db/responses";
import { getQuestions, sanitizeQuestion } from "@/lib/db/questions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stats = getStats(id);
  const questions = getQuestions(id).map(sanitizeQuestion);

  const enriched = questions.map((q) => ({
    ...q,
    stats: stats[q.id] ?? { total: 0, values: {} },
  }));

  return NextResponse.json(enriched);
}
