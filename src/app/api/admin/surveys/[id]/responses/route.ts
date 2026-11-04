import { NextRequest, NextResponse } from "next/server";
import { getSurvey } from "@/lib/db/surveys";
import { getSubmissionsPaged, deleteSubmission, clearResponses } from "@/lib/db/responses";

function checkOwnership(survey: { user_id: string | null } | null, req: NextRequest): NextResponse | null {
  if (!survey) {
    return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
  }
  const role = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id");
  if (role !== "super_admin" && survey.user_id !== userId) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const survey = await getSurvey(id);
  const err = checkOwnership(survey, req);
  if (err) return err;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(sp.get("page_size") ?? "20") || 20));
  const { rows, total } = await getSubmissionsPaged(id, pageSize, (page - 1) * pageSize);
  return NextResponse.json({ submissions: rows, total, page, page_size: pageSize });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const survey = await getSurvey(id);
  const err = checkOwnership(survey, req);
  if (err) return err;

  const submissionId = req.nextUrl.searchParams.get("submission_id");

  if (submissionId) {
    const ok = await deleteSubmission(id, submissionId);
    if (!ok) {
      return NextResponse.json({ error: "回答不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  await clearResponses(id);
  return NextResponse.json({ success: true });
}