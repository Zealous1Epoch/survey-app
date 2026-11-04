import { NextRequest, NextResponse } from "next/server";
import { getSubmissionsPaged, deleteSubmission, clearResponses } from "@/lib/db/responses";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(sp.get("page_size") ?? "50") || 50));
    const { rows, total } = getSubmissionsPaged(id, pageSize, (page - 1) * pageSize);
    return NextResponse.json({ submissions: rows, total, page, page_size: pageSize });
  } catch (error) {
    console.error("获取回答数据失败:", error);
    return NextResponse.json({ error: "获取回答数据失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (error) {
    console.error("删除回答失败:", error);
    return NextResponse.json({ error: "删除回答失败" }, { status: 500 });
  }
}
