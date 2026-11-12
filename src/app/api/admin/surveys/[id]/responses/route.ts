import { NextRequest, NextResponse } from "next/server";
import { getSurvey } from "@/lib/db/surveys";
import { getQuestions } from "@/lib/db/questions";
import { getUserById } from "@/lib/db/users";
import { getSubmissionsPaged, deleteSubmission, clearResponses, updateSubmission } from "@/lib/db/responses";
import { validateAnswers } from "@/lib/answer-validation";

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

/** 修改指定答卷——仅超级管理员。body: { submission_id, answers: [{questionId, value}] }
 *  答案集按"完整覆盖"语义提交，服务端 diff 出增改删并逐项写修改日志 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = req.headers.get("x-user-role");
    if (role !== "super_admin") {
      return NextResponse.json({ error: "仅超级管理员可修改回答" }, { status: 403 });
    }
    const survey = await getSurvey(id);
    if (!survey) {
      return NextResponse.json({ error: "问卷不存在" }, { status: 404 });
    }

    let body: { submission_id?: unknown; answers?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    const submissionId = typeof body.submission_id === "string" ? body.submission_id : "";
    if (!submissionId) {
      return NextResponse.json({ error: "缺少 submission_id" }, { status: 400 });
    }
    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return NextResponse.json({ error: "请保留至少一条回答" }, { status: 400 });
    }

    const questions = await getQuestions(id);
    const { error, cleaned } = validateAnswers(
      questions,
      body.answers as Array<{ questionId: string; value: string }>,
      // 修改场景不查必填：只保证"填了的合法"，不为历史缺答设卡
      { checkRequired: false }
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const editorId = req.headers.get("x-user-id") ?? "";
    const editor = await getUserById(editorId);
    const result = await updateSubmission(id, submissionId, cleaned, {
      id: editorId,
      name: editor?.username ?? "",
    });
    if (!result) {
      return NextResponse.json({ error: "回答不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("修改答卷失败:", error);
    return NextResponse.json({ error: "修改失败，请重试" }, { status: 500 });
  }
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