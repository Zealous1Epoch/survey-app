"use client";

import { useEffect, useState, use, useRef } from "react";
import QuestionBadge from "@/components/question-badge";
import AnswerInput from "@/components/answer-input";
import QuestionImage from "@/components/question-image";

type OptionItem = { label: string; limit: number; remaining?: number };

interface QuestionData {
  id: string;
  type: string;
  title: string;
  options: (string | OptionItem)[];
  required: boolean;
  redirect_url: string;
  image_url: string;
}

interface SurveyData {
  title: string;
  description: string;
  redirect_url: string;
  questions: QuestionData[];
}

export default function SurveyAnswerPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = use(params);
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [done, setDone] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [draftRestored, setDraftRestored] = useState(false);
  const autoNextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draftKey = `survey_draft_${surveyId}`;

  useEffect(() => {
    fetch(`/api/s/${surveyId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setSurvey(data);
          // 恢复上次未提交的草稿（仅保留仍存在的题目答案）
          try {
            const raw = localStorage.getItem(draftKey);
            if (raw) {
              const draft = JSON.parse(raw);
              const ids = new Set((data.questions as QuestionData[]).map((q) => q.id));
              const clean: Record<string, string> = {};
              for (const [k, v] of Object.entries(draft.values ?? {})) {
                if (ids.has(k)) clean[k] = v as string;
              }
              if (Object.keys(clean).length > 0) {
                setValues(clean);
                setStep(Math.min(Math.max(0, draft.step ?? 0), (data.questions?.length ?? 1) - 1));
                setDraftRestored(true);
              }
            }
          } catch { /* 草稿损坏则忽略 */ }
        }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [surveyId, draftKey]);

  // 答案变化时写入草稿
  useEffect(() => {
    if (!survey || done) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ values, step }));
    } catch { /* 存储满则忽略 */ }
  }, [values, step, survey, done, draftKey]);

  // 提交成功后清草稿
  useEffect(() => {
    if (done) { try { localStorage.removeItem(draftKey); } catch {} }
  }, [done, draftKey]);

  // 答题中途关页/刷新时挽留（已有作答且未提交）
  const hasProgress = Object.values(values).some((v) => v !== "" && v !== "[]" && v !== "0");
  useEffect(() => {
    if (!hasProgress || done) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [hasProgress, done]);

  useEffect(() => () => { if (autoNextTimer.current) clearTimeout(autoNextTimer.current); }, []);

  // 草稿恢复提示 3 秒后自动消失
  useEffect(() => {
    if (!draftRestored) return;
    const t = setTimeout(() => setDraftRestored(false), 3000);
    return () => clearTimeout(t);
  }, [draftRestored]);

  // lightbox 支持 ESC 关闭
  useEffect(() => {
    if (!zoomImg) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoomImg(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomImg]);

  const question = survey?.questions[step] ?? null;
  const total = survey?.questions.length ?? 0;
  const isLast = step === total - 1;

  const getVal = (qid: string, type: string) => {
    const v = values[qid];
    if (v !== undefined) return v;
    if (type === "multi") return "[]";
    if (type === "rating") return "0";
    return "";
  };

  const setVal = (qid: string, val: string) => {
    setValues((prev) => ({ ...prev, [qid]: val }));
    setFieldError("");
    // 单选/限量单选/评分：选完自动跳下一题（最后一题不自动提交）
    if (question && !isLast && (question.id === qid)) {
      const auto = question.type === "choice" || question.type === "limited_choice" || question.type === "rating";
      if (auto && val && val !== "0") {
        if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
        autoNextTimer.current = setTimeout(() => {
          setStep((s) => s + 1);
          setAnimKey((k) => k + 1);
        }, 400);
      }
    }
  };

  const handleNext = () => {
    if (!question) return;
    if (autoNextTimer.current) { clearTimeout(autoNextTimer.current); autoNextTimer.current = null; }
    const v = getVal(question.id, question.type);
    const empty = !v || v === "" || v === "[]" || (question.type === "rating" && v === "0");
    if (question.required && empty) {
      setFieldError("此题为必填");
      return;
    }
    setFieldError("");
    if (isLast) {
      handleSubmitAll();
    } else {
      setStep((s) => s + 1);
      setAnimKey((k) => k + 1);
    }
  };

  const handlePrev = () => {
    if (autoNextTimer.current) { clearTimeout(autoNextTimer.current); autoNextTimer.current = null; }
    setStep((s) => Math.max(0, s - 1));
    setFieldError("");
    setAnimKey((k) => k + 1);
  };

  const handleSubmitAll = async () => {
    setSubmitting(true);
    try {
      const answers = (survey?.questions ?? []).map((q) => ({
        questionId: q.id,
        value: getVal(q.id, q.type),
      }));

      const res = await fetch(`/api/s/${surveyId}/submit-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const result = await res.json();
      if (result.success) {
        setDone(true);
        if (result.redirect_url) {
          setTimeout(() => { window.location.href = result.redirect_url; }, 1500);
        }
      } else {
        setFieldError(result.error ?? "提交失败");
      }
    } catch {
      setFieldError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div style={{ animation: "pulse 1.8s ease-in-out infinite" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5" style={{ background: "var(--bg-primary)" }}>
        <p className="mb-2 text-lg font-semibold" style={{ color: "var(--accent)" }}>{error || "问卷不存在"}</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>请确认链接是否正确</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5" style={{ background: "var(--bg-primary)" }}>
        <div className="card" style={{ textAlign: "center", maxWidth: 480, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="var(--primary-light)" strokeWidth="3" />
              <path
                d="M24 40 L36 52 L56 28"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="60"
                strokeDashoffset="60"
                style={{ animation: "draw 0.5s 0.2s ease-out forwards" }}
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--primary)" }}>提交成功</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>感谢你的回答</p>
        </div>
      </div>
    );
  }

  const pct = total > 0 ? ((step) / total) * 100 : 0;

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {draftRestored && (
        <div
          style={{
            position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 300,
            padding: "0.5rem 1.25rem", borderRadius: 99, fontSize: 13, fontWeight: 500,
            background: "var(--primary)", color: "#fff", boxShadow: "var(--shadow-lg)",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          已恢复上次未提交的作答
        </div>
      )}
      {/* Navbar */}
      <nav className="navbar">
        <span style={{ fontSize: 20, fontWeight: 700, color: "var(--primary)", letterSpacing: -0.3 }}>
          {survey.title}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", display: "inline-block" }} />
          进行中
        </span>
      </nav>

      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5" style={{ paddingTop: "calc(var(--nav-height) + 2rem)", paddingBottom: "3rem" }}>
        {/* Progress */}
        <div className="mb-8">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
            <span>第 {step + 1} / {total} 题</span>
            <span style={{ color: "var(--primary)", fontWeight: 600 }}>{Math.round(pct)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Question card */}
        <div className="flex-1" key={animKey}>
          <div className="card animate-in">
            <QuestionBadge type={question?.type ?? ""} />

            {question?.image_url && (
              <div style={{ marginBottom: "1.5rem", marginTop: "1rem" }}>
                <QuestionImage
                  src={question.image_url}
                  alt="题目图片"
                  onClick={() => setZoomImg(question.image_url)}
                />
                <p style={{ marginTop: 6, fontSize: 12, textAlign: "center", color: "var(--text-muted)" }}>
                  点击图片可放大
                </p>
              </div>
            )}

            <h2 style={{
              marginTop: question?.image_url ? 0 : "1.5rem",
              marginBottom: "2rem",
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.3,
              letterSpacing: -0.4,
            }}>
              {question?.title}
            </h2>

            {question && (
              <AnswerInput
                question={question}
                value={getVal(question.id, question.type)}
                onChange={(v) => setVal(question.id, v)}
              />
            )}

            {fieldError && (
              <div style={{
                marginTop: "1.5rem",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                background: "var(--accent-light)",
                color: "var(--accent)",
                fontSize: 14,
                fontWeight: 500,
              }}>
                {fieldError}
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2.5rem", gap: 12 }}>
              {step > 0 ? (
                <button onClick={handlePrev} className="btn-secondary">
                  上一题
                </button>
              ) : <span />}
              <button
                onClick={handleNext}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? "提交中..." : isLast ? "提交问卷" : "下一题"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: "3rem", paddingBottom: "1rem" }}>
          <span className="badge">由MuGuang提供支持</span>
        </div>
      </div>

      {/* Image lightbox */}
      {zoomImg && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem", background: "rgba(0,0,0,0.85)",
          }}
          onClick={() => setZoomImg(null)}
        >
          <button
            onClick={() => setZoomImg(null)}
            style={{
              position: "absolute", top: 16, right: 16,
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", cursor: "pointer", fontSize: 18,
            }}
          >
            ✕
          </button>
          <img
            src={zoomImg}
            alt="查看大图"
            style={{ maxHeight: "90vh", maxWidth: "90vw", borderRadius: 12, objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

