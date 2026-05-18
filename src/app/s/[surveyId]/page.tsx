"use client";

import { useEffect, useState, use } from "react";

interface QuestionData {
  id: string;
  type: string;
  title: string;
  options: string[];
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

  useEffect(() => {
    fetch(`/api/s/${surveyId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setSurvey(data);
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [surveyId]);

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
  };

  const handleNext = () => {
    if (!question) return;
    const v = getVal(question.id, question.type);
    if (question.required && (!v || v === "" || v === "[]" || v === "0")) {
      setFieldError("此题为必填");
      return;
    }
    setFieldError("");
    if (isLast) {
      handleSubmitAll();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    setStep((s) => Math.max(0, s - 1));
    setFieldError("");
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
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5" style={{ background: "var(--bg-primary)" }}>
        <p className="mb-2 text-lg font-medium" style={{ color: "var(--accent)" }}>{error || "问卷不存在"}</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>请确认二维码是否正确</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5" style={{ background: "var(--bg-primary)" }}>
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--accent-green-light)" }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M7 14l5 5 9-9" stroke="var(--accent-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>提交成功</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>感谢你的回答</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-6" style={{ background: "var(--bg-primary)" }}>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-1 w-full rounded-full" style={{ background: "var(--bg-subtle)" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / total) * 100}%`, background: "var(--accent)" }}
          />
        </div>
        <p className="mt-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          第 {step + 1} / {total} 题
        </p>
      </div>

      {/* Question */}
      {question && (
        <div className="flex-1 animate-in">
          <QuestionBadge type={question.type} />

          {question.image_url && (
            <div className="mb-6 mt-4">
              <img
                src={question.image_url}
                alt="题目图片"
                className="w-full cursor-pointer rounded-lg border object-cover"
                style={{ borderColor: "var(--border)", maxHeight: "40vh" }}
                onClick={() => setZoomImg(question.image_url)}
              />
              <p className="mt-1.5 text-xs text-center" style={{ color: "var(--text-muted)" }}>
                点击图片可放大
              </p>
            </div>
          )}

          <h2 className="mt-4 mb-8 text-lg font-medium leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {question.title}
          </h2>

          <AnswerInput
            question={question}
            value={getVal(question.id, question.type)}
            onChange={(v) => setVal(question.id, v)}
          />

          {fieldError && (
            <div className="mt-4 rounded-md px-4 py-3 text-sm animate-in" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              {fieldError}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center gap-3">
        {step > 0 && (
          <button onClick={handlePrev} className="btn-secondary flex-shrink-0 px-4">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-1">
              <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            上一题
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={submitting}
          className="btn-primary flex-1 py-3.5 text-base"
        >
          {submitting ? "提交中..." : isLast ? "提交" : "下一题"}
        </button>
      </div>

      {/* Bottom */}
      <div className="mt-auto pt-8 pb-4 text-center">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          由MuGuang提供支持
        </p>
      </div>

      {/* Image lightbox */}
      {zoomImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(44, 36, 22, 0.9)" }}
          onClick={() => setZoomImg(null)}
        >
          <button
            onClick={() => setZoomImg(null)}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <img src={zoomImg} alt="查看大图" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

/* ---- Badge ---- */
const badgeMap: Record<string, { text: string; color: string }> = {
  choice: { text: "单选", color: "#C8694A" },
  multi: { text: "多选", color: "#7D9B8F" },
  text: { text: "填空", color: "#8B7E6A" },
  rating: { text: "评分", color: "#C8A45A" },
};

function QuestionBadge({ type }: { type: string }) {
  const b = badgeMap[type] ?? { text: type, color: "var(--text-muted)" };
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: `${b.color}12`, color: b.color }}>
      {b.text}
    </span>
  );
}

/* ---- Answer Input ---- */
function AnswerInput({
  question,
  value,
  onChange,
}: {
  question: QuestionData;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = question.type;

  if (t === "choice") {
    return (
      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <div
            key={i}
            role="radio"
            aria-checked={value === opt}
            tabIndex={0}
            className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3.5 transition-all"
            style={{
              borderColor: value === opt ? "var(--accent)" : "var(--border)",
              background: value === opt ? "var(--accent-light)" : "var(--bg-card)",
            }}
            onClick={() => onChange(opt)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(opt); }}
          >
            <div
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2"
              style={{ borderColor: value === opt ? "var(--accent)" : "var(--border)" }}
            >
              {value === opt && <div className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />}
            </div>
            <span className="text-sm">{opt}</span>
          </div>
        ))}
      </div>
    );
  }

  if (t === "multi") {
    const selected: string[] = JSON.parse(value || "[]");
    return (
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const checked = selected.includes(opt);
          const toggle = () => {
            const next = checked ? selected.filter((v) => v !== opt) : [...selected, opt];
            onChange(JSON.stringify(next));
          };
          return (
            <div
              key={i}
              role="checkbox"
              aria-checked={checked}
              tabIndex={0}
              className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3.5 transition-all"
              style={{
                borderColor: checked ? "var(--accent-green)" : "var(--border)",
                background: checked ? "var(--accent-green-light)" : "var(--bg-card)",
              }}
              onClick={toggle}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(); }}
            >
              <div
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2"
                style={{
                  borderColor: checked ? "var(--accent-green)" : "var(--border)",
                  background: checked ? "var(--accent-green)" : "transparent",
                }}
              >
                {checked && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 4.5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-sm">{opt}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (t === "text") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="请输入你的回答..."
        rows={4}
        className="textarea-field text-base"
        style={{ minHeight: 120 }}
      />
    );
  }

  if (t === "rating") {
    return (
      <div className="text-center">
        <div className="inline-flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = Number(value) >= star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => onChange(String(star))}
                className="transition-all duration-150 hover:scale-110"
                style={{ fontSize: "2.5rem", color: active ? "#C8A45A" : "var(--border)", transform: active ? "scale(1.1)" : "scale(1)" }}
              >
                &#9733;
              </button>
            );
          })}
        </div>
        {Number(value) > 0 && <p className="mt-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{Number(value)} / 5</p>}
      </div>
    );
  }

  return null;
}
