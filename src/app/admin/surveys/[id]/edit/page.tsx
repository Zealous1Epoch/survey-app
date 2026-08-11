"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import QuestionEditor from "@/components/question-editor";
import type { QuestionData } from "@/lib/db/questions";

export default function EditSurveyPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/survey-admin/surveys/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.title);
        setDescription(data.description);
        setQuestions(
          data.questions.map((q: { type: string; title: string; options: string[]; required: boolean; order: number }) => ({
            type: q.type,
            title: q.title,
            options: q.options,
            required: q.required,
            order: q.order,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("标题不能为空");
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch(`/api/survey-admin/surveys/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description,
        questions: questions.map((q) => ({
          ...q,
          title: q.title.trim(),
          options: q.options?.filter((o) => o.trim()) ?? [],
        })),
      }),
    });

    if (res.ok) {
      router.push(`/admin/surveys/${id}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "保存失败");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="space-y-4">
          <div className="card animate-pulse" style={{ height: 200 }} />
          <div className="card animate-pulse" style={{ height: 300 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <a
          href={`/admin/surveys/${id}`}
          className="inline-flex items-center gap-1 text-sm transition-colors hover:underline"
          style={{ color: "var(--text-secondary)", textUnderlineOffset: "3px" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回
        </a>
        <h1 className="mt-2 text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          编辑问卷
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
              className="input-field"
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

        <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-base">
          {saving ? "保存中..." : "保存修改"}
        </button>
      </form>
    </div>
  );
}