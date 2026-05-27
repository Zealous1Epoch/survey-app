import { NextRequest, NextResponse } from "next/server";
import { getSubmissions, deleteSubmission, clearResponses } from "@/lib/db/responses";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const submissions = getSubmissions(id);
  return NextResponse.json(submissions);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
