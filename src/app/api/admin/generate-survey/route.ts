import { NextRequest, NextResponse } from "next/server";
import { callLlm, extractTextFromDocxOrText, sanitizeDraft } from "@/lib/ai/survey-gen";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MIN_DOC_CHARS = 20;

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let docText = "";
  try {
    const form = await req.formData();
    const textField = form.get("text");
    const file = form.get("file");
    if (typeof textField === "string" && textField.trim()) {
      docText = textField;
    }
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "文件超过 2MB 限制" }, { status: 400 });
      }
      const fromFile = await extractTextFromDocxOrText(file.name || "", await file.arrayBuffer());
      if (!docText) docText = fromFile;
    }
  } catch {
    return NextResponse.json({ error: "请求格式错误，需 multipart（text 或 file）" }, { status: 400 });
  }

  if (docText.trim().length < MIN_DOC_CHARS) {
    return NextResponse.json({ error: "文档内容太短，至少需要几十个字符" }, { status: 400 });
  }

  try {
    const draft = sanitizeDraft(await callLlm(docText));
    return NextResponse.json({ draft });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "AI_NOT_CONFIGURED") {
      return NextResponse.json({ error: "未配置 AI 密钥（.env 的 DEEPSEEK_API_KEY）" }, { status: 501 });
    }
    if (code === "NO_USABLE_QUESTIONS" || code === "PARSE_FAILED") {
      return NextResponse.json({ error: "AI 返回内容无法解析为问卷，请重试或调整文档" }, { status: 502 });
    }
    if (code === "UPSTREAM_EMPTY" || code === "UPSTREAM_ERROR") {
      return NextResponse.json({ error: "AI 服务暂时不可用，请稍后重试" }, { status: 502 });
    }
    console.error("[generate-survey]", e);
    return NextResponse.json({ error: "生成失败，请重试" }, { status: 500 });
  }
}
