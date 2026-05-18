"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QuestionEditor from "@/components/question-editor";
import { QuestionData } from "@/lib/db/questions";

export default function NewSurveyPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("标题不能为空");
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description,
        redirect_url: redirectUrl,
        questions: questions.map((q) => ({
          ...q,
          title: q.title.trim(),
          options: q.options?.filter((o) => o.trim()) ?? [],
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
      <div className="mb-8">
        <LinkBack />
        <h1 className="mt-2 text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          创建问卷
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">问卷标题 <span style={{ color: "var(--accent)" }}>*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：活动满意度调查"
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">说明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="问卷说明文字..."
              rows={2}
              className="textarea-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">提交后跳转地址</label>
            <input
              type="text"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="留空则显示确认页"
              className="input-field"
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
