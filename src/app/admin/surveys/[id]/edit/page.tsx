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
  const [redirectUrl, setRedirectUrl] = useState("");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/surveys/${id}`)
      .then((r) => {
        if (r.status === 401) throw new Error("密钥已失效，请重新登录");
        if (!r.ok) throw new Error(`加载失败（${r.status}）`);
        return r.json();
      })
      .then((data) => {
        setTitle(data.title);
        setDescription(data.description);
        setRedirectUrl(data.redirect_url);
        setQuestions(
          data.questions.map((q: { id: string; type: string; title: string; options: any[]; required: boolean; redirect_url: string; image_url: string; order: number }) => ({
            id: q.id,
            type: q.type,
            title: q.title,
            options: (q.options ?? []).map((o) => typeof o === "string" ? { label: o, limit: 0 } : o as { label: string; limit: number }),
            required: q.required,
            redirect_url: q.redirect_url,
            image_url: q.image_url ?? "",
            order: q.order,
          }))
        );
      })
      .catch((e) => setLoadError(e.message || "加载失败，请重试"))
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

    const res = await fetch(`/api/admin/surveys/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description,
        redirect_url: redirectUrl,
        questions: questions.map((q) => ({
          ...q,
          title: q.title.trim(),
          options: q.options?.filter((o) => (typeof o === "string" ? o : o.label).trim()) ?? [],
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

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card py-12 text-center">
          <p className="mb-4 text-sm font-medium" style={{ color: "var(--accent)" }}>{loadError}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary text-sm py-2 px-4">重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-0">
      <div className="mb-6 sm:mb-8">
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
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
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

        <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-base" style={{ minHeight: 48 }}>
          {saving ? "保存中..." : "保存修改"}
        </button>
      </form>
    </div>
  );
}
