import { NextRequest, NextResponse } from "next/server";
import { getSubmissions, deleteSubmission, clearResponses } from "@/lib/db/responses";
import { getSurvey } from "@/lib/db/surveys";

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id");
}

function checkOwnership(req: NextRequest, surveyId: string): NextResponse | null {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const survey = getSurvey(surveyId);
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }
  if (survey.owner_id !== userId) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authError = checkOwnership(req, id);
  if (authError) return authError;

  const submissions = getSubmissions(id);
  return NextResponse.json(submissions);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authError = checkOwnership(req, id);
  if (authError) return authError;

  const submissionId = req.nextUrl.searchParams.get("submission_id");

  if (submissionId) {
    const ok = deleteSubmission(id, submissionId);
    if (!ok) {
      return NextResponse.json({ error: "回答不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  clearResponses(id);
  return NextResponse.json({ success: true });
}
