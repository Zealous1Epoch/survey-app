"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuestionEditor from "@/components/question-editor";
import type { QuestionData, QuestionType } from "@/lib/question-types";

interface GenQuestion {
  type: string;
  title: string;
  options: string[] | Record<string, number>;
  required: boolean;
}

const GEN_OPT_TYPES = ["choice", "multi", "dropdown"];

function toEditorQuestion(q: GenQuestion): QuestionData {
  const uid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `q_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  let options: QuestionData["options"] = [];
  if (q.type === "number") {
    const o = (q.options ?? {}) as Record<string, number>;
    options = {
      min: typeof o.min === "number" ? o.min : undefined,
      max: typeof o.max === "number" ? o.max : undefined,
    };
  } else if (GEN_OPT_TYPES.includes(q.type) && Array.isArray(q.options)) {
    options = q.options.map((label) => label);
  }
  return { id: uid, type: q.type as QuestionType, title: q.title, options, required: q.required !== false };
}

export default function NewSurveyPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [genText, setGenText] = useState("");
  const [genFile, setGenFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const genFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/survey-admin/ai-status")
      .then((r) => r.json())
      .then((d) => setAiConfigured(Boolean(d.configured)))
      .catch(() => setAiConfigured(false));
  }, []);

  const handleGenerate = async () => {
    const text = genText.trim();
    if (!text && !genFile) return;
    if (questions.some((q) => q.title.trim()) && !confirm("生成结果将覆盖当前题目，继续？")) return;
    setGenerating(true);
    setGenError("");
    try {
      const form = new FormData();
      if (text) form.append("text", text);
      if (genFile) form.append("file", genFile, genFile.name);
      const res = await fetch("/api/survey-admin/generate-survey", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.draft) {
        setGenError(data.error ?? "生成失败，请重试");
        return;
      }
      const draft = data.draft as { title?: string; description?: string; questions?: GenQuestion[] };
      if (!title.trim() && draft.title) setTitle(draft.title);
      if (!description.trim() && draft.description) setDescription(draft.description);
      if (Array.isArray(draft.questions) && draft.questions.length > 0) {
        setQuestions(draft.questions.map(toEditorQuestion));
      }
      setGenOpen(false);
      setGenText("");
      setGenFile(null);
    } catch {
      setGenError("网络错误，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("标题不能为空");
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch("/api/survey-admin/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description,
        questions: questions.map((q) => ({
          ...q,
          title: q.title.trim(),
          options: Array.isArray(q.options)
            ? q.options.filter((o) => o.trim())
            : (q.options ?? []),
        })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/admin/surveys/${data.id}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "创建失败");
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <LinkBack />
          <h1 className="mt-2 text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            创建问卷
          </h1>
        </div>
        <button
          type="button"
          className="btn-secondary text-sm py-2 px-3"
          disabled={aiConfigured !== true}
          onClick={() => setGenOpen((o) => !o)}
        >
          {aiConfigured === false ? "未配置 AI" : genOpen ? "收起生成" : "从文档生成"}
        </button>
      </div>

      {genOpen && aiConfigured === true && (
        <div className="card mb-6 space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">文档内容</label>
            <textarea
              value={genText}
              onChange={(e) => setGenText(e.target.value)}
              rows={5}
              placeholder="粘贴文本..."
              className="textarea-field"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              ref={genFileRef}
              type="file"
              accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: "none" }}
              onChange={(e) => setGenFile(e.target.files?.[0] ?? null)}
            />
            <button type="button" className="btn-secondary text-sm py-2 px-3" onClick={() => genFileRef.current?.click()}>
              选择文件
            </button>
            {genFile && (
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{genFile.name}</span>
            )}
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className="btn-primary text-sm py-2 px-4"
              disabled={generating || (!genText.trim() && !genFile)}
              onClick={handleGenerate}
            >
              {generating ? "生成中..." : "生成问卷"}
            </button>
          </div>
          {genError && (
            <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              {genError}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">问卷标题 <span style={{ color: "var(--accent)" }}>*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">说明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="textarea-field"
            />
          </div>
        </div>

        <div className="card">
          <QuestionEditor questions={questions} onChange={setQuestions} />
        </div>

        {error && (
          <div className="rounded-md px-4 py-3 text-sm" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full py-3 text-base"
        >
          {saving ? "创建中..." : "创建问卷"}
        </button>
      </form>
    </div>
  );
}

function LinkBack() {
  return (
    <a
      href="/admin"
      className="inline-flex items-center gap-1 text-sm transition-colors hover:underline"
      style={{ color: "var(--text-secondary)", textUnderlineOffset: "3px" }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      返回列表
    </a>
  );
}
