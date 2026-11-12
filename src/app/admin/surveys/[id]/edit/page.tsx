"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import QuestionEditor from "@/components/question-editor";
import type { QuestionData } from "@/lib/db/questions";

export default function EditSurveyPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [paymentQr, setPaymentQr] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const payFileRef = useRef<HTMLInputElement | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch(`/api/survey-admin/surveys/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        setTitle(data.title);
        setDescription(data.description ?? "");
        setRedirectUrl(data.redirect_url ?? "");
        setPaymentEnabled(!!data.payment_enabled);
        setPaymentQr(data.payment_qr ?? "");
        // 回填 id 供服务端 diff 定位存量题目；缺 id 会被当成新题重建
        setQuestions(
          data.questions.map((q: { id: string; type: string; title: string; options: string[] | { min?: number; max?: number }; required: boolean; image_url?: string; order: number }) => ({
            id: q.id,
            type: q.type,
            title: q.title,
            options: q.options,
            required: q.required,
            image_url: q.image_url ?? "",
            order: q.order,
          }))
        );
      })
      .catch(() => setLoadError("问卷加载失败，请刷新重试"))
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
        redirect_url: redirectUrl,
        payment_enabled: paymentEnabled ? 1 : 0,
        payment_qr: paymentEnabled ? paymentQr : "",
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
      router.push(`/admin/surveys/${id}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "保存失败");
      setSaving(false);
    }
  };

  const uploadQr = async (file: File) => {
    setUploadingQr(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/survey-admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) setPaymentQr(data.url);
      else alert(data.error || "上传失败，请重试");
    } catch {
      alert("上传失败，请检查网络后重试");
    } finally {
      setUploadingQr(false);
      if (payFileRef.current) payFileRef.current.value = "";
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
    // 加载失败时禁止编辑保存——此时 questions 为空，保存会误删全部题目
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card" style={{ textAlign: "center" }}>
          <p className="mb-4 text-sm" style={{ color: "var(--accent)" }}>{loadError}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary text-sm">重新加载</button>
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
          <div>
            <label className="mb-1.5 block text-sm font-medium">提交后跳转地址</label>
            <input
              type="text"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              className="input-field"
            />
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
            <label
              className="mb-1.5 flex items-center gap-2 text-sm font-medium"
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              <input
                type="checkbox"
                checked={paymentEnabled}
                onChange={(e) => setPaymentEnabled(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
              />
              提交后展示收款码
            </label>
            {paymentEnabled && (
              paymentQr ? (
                <div className="mt-3 flex items-center gap-4">
                  <img
                    src={paymentQr}
                    alt=""
                    style={{ width: 96, height: 96, objectFit: "contain", border: "1px solid var(--border)", borderRadius: 6, background: "#fff" }}
                  />
                  <div className="flex gap-2">
                    <label className="btn-secondary text-sm" style={{ cursor: uploadingQr ? "wait" : "pointer", opacity: uploadingQr ? 0.6 : 1 }}>
                      {uploadingQr ? "上传中..." : "更换"}
                      <input ref={payFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQr(f); }} />
                    </label>
                    <button type="button" onClick={() => setPaymentQr("")} className="btn-secondary text-sm">移除</button>
                  </div>
                </div>
              ) : (
                <label className="btn-secondary mt-3 inline-block text-sm" style={{ cursor: uploadingQr ? "wait" : "pointer", opacity: uploadingQr ? 0.6 : 1 }}>
                  {uploadingQr ? "上传中..." : "上传收款码"}
                  <input ref={payFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQr(f); }} />
                </label>
              )
            )}
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