/**
 * 文档 → 问卷草稿生成（服务端专用，勿在客户端组件 import）
 * 走 OpenAI 兼容 chat/completions 协议，默认 DeepSeek。
 */
import mammoth from "mammoth";
import type { QuestionType } from "@/lib/question-types";

export const AI_TYPES: QuestionType[] = [
  "choice", "multi", "text", "rating", "dropdown", "nps", "date", "number", "yesno",
];

const MAX_DOC_CHARS = 20000;
const MAX_QUESTIONS = 30;

export interface DraftQuestion {
  type: QuestionType;
  title: string;
  options: string[] | { min?: number; max?: number };
  required: boolean;
}

export interface SurveyDraft {
  title: string;
  description: string;
  questions: DraftQuestion[];
}

/** 从上传文件提取纯文本（docx 用 mammoth，其余按 utf-8 文本读） */
export async function extractTextFromDocxOrText(name: string, bytes: ArrayBuffer): Promise<string> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return result.value;
  }
  if (lower.endsWith(".doc")) {
    throw new Error("暂不支持旧版 .doc，请另存为 .docx 或粘贴文本");
  }
  return new TextDecoder("utf-8").decode(bytes);
}

const SYSTEM_PROMPT = [
  "你是一名资深问卷设计助手。根据用户提供的文档内容，生成一份结构合理的在线问卷。",
  "要求：",
  "1. 只输出 JSON，不要输出任何其他文字、注释或 Markdown 代码块。",
  '2. JSON 结构：{"title":"问卷标题","description":"问卷说明(可为空字符串)","questions":[{"type":"题型","title":"题干","options":["选项"],"required":true,"min":null,"max":null}]}',
  "3. type 只能是以下之一：choice(单选)、multi(多选)、text(填空)、rating(1-5评分)、dropdown(下拉单选)、nps(0-10推荐度)、date(日期)、number(数字)、yesno(是/否)。",
  "4. choice/multi/dropdown 必须给 2-8 个 options；rating/nps/yesno/date/text 的 options 为空数组；number 的 options 为空数组、可给整数 min/max（不限制则为 null）。",
  "5. 题目数量 3-20 题，题干简洁明确，选项互斥且覆盖合理。",
  "6. 忠实于文档主题，不要虚构文档中不存在的具体数据。",
].join("\n");

export async function callLlm(docText: string): Promise<unknown> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  const truncated = docText.trim().slice(0, MAX_DOC_CHARS);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `文档内容如下：\n"""\n${truncated}\n"""` },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[survey-gen] upstream", res.status, detail.slice(0, 300));
    throw new Error("UPSTREAM_ERROR");
  }
  const data = await res.json();
  const content: unknown = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("UPSTREAM_EMPTY");
  return parseModelJson(content);
}

/** 剥掉可能的代码块围栏后解析 JSON（兜底：截取首个 { 到末个 }） */
function parseModelJson(content: string): unknown {
  let s = content.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(s.slice(start, end + 1));
    }
    throw new Error("PARSE_FAILED");
  }
}

const OPT_TYPES: string[] = ["choice", "multi", "dropdown"];

/** 校验并清洗模型输出为问卷草稿；无可用题目时抛错 */
export function sanitizeDraft(raw: unknown): SurveyDraft {
  if (typeof raw !== "object" || raw === null) throw new Error("PARSE_FAILED");
  const obj = raw as Record<string, unknown>;

  const title = typeof obj.title === "string" ? obj.title.trim().slice(0, 120) : "";
  const description = typeof obj.description === "string" ? obj.description.trim().slice(0, 500) : "";

  const rawList = Array.isArray(obj.questions) ? obj.questions : [];
  const questions: DraftQuestion[] = [];
  for (const item of rawList.slice(0, MAX_QUESTIONS)) {
    if (typeof item !== "object" || item === null) continue;
    const q = item as Record<string, unknown>;
    let type = q.type as QuestionType;
    if (!AI_TYPES.includes(type)) continue;
    const qTitle = typeof q.title === "string" ? q.title.trim().slice(0, 300) : "";
    if (!qTitle) continue;

    const rawOpts = Array.isArray(q.options)
      ? q.options.map((o) => (typeof o === "string" ? o.trim() : "")).filter((o) => o.length > 0).slice(0, 20)
      : [];
    const required = q.required !== false;

    if (type === "number") {
      const min = Number.isInteger(q.min) ? (q.min as number) : undefined;
      const max = Number.isInteger(q.max) ? (q.max as number) : undefined;
      if (min !== undefined && max !== undefined && min > max) {
        questions.push({ type, title: qTitle, options: {}, required });
      } else {
        questions.push({ type, title: qTitle, options: { min, max }, required });
      }
      continue;
    }
    if (OPT_TYPES.includes(type)) {
      // 选项不足两个的单选/多选/下拉退化为填空题，比直接丢弃保留更多信息
      if (rawOpts.length >= 2) {
        questions.push({ type, title: qTitle, options: [...new Set(rawOpts)], required });
      } else {
        questions.push({ type: "text", title: qTitle, options: [], required });
      }
      continue;
    }
    questions.push({ type, title: qTitle, options: [], required });
  }

  if (questions.length === 0) throw new Error("NO_USABLE_QUESTIONS");
  return { title: title || "未命名问卷", description, questions };
}
