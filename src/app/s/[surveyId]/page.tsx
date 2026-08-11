"use client";

import { useEffect, useState, use } from "react";

interface QuestionData {
  id: string;
  type: string;
  title: string;
  options: string[];
  required: boolean;

  image_url: string;
}

interface SurveyData {
  title: string;
  description: string;

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
      setAnimKey((k) => k + 1);
    }
  };

  const handlePrev = () => {
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
      {/* Navbar */}
      <nav className="navbar px-4 sm:px-8">
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)", letterSpacing: -0.3 }}>
          {survey.title}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", display: "inline-block" }} />
          进行中
        </span>
      </nav>

      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 sm:px-5" style={{ paddingTop: "calc(var(--nav-height) + 2rem)", paddingBottom: "3rem" }}>
        {/* Progress */}
        <div className="mb-6 sm:mb-8">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
            <span>第 {step + 1} / {total} 题</span>
            <span style={{ color: "var(--primary)", fontWeight: 600 }}>{Math.round(pct)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

{/* Description */}        {survey.description && (          <div className="mb-6" style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7 }}>            {survey.description}          </div>        )}
        {/* Question card */}
        <div className="flex-1" key={animKey}>
          <div className="card animate-in" style={{ padding: "1.5rem" }}>
            <QuestionBadge type={question?.type ?? ""} />

            {question?.image_url && (
              <div style={{ marginBottom: "1.5rem", marginTop: "1rem" }}>
                <img
                  src={question.image_url}
                  alt="题目图片"
                  style={{ width: "100%", maxHeight: "40vh", objectFit: "cover", borderRadius: "var(--radius-sm)", cursor: "pointer", border: "1px solid var(--border)" }}
                  onClick={() => setZoomImg(question.image_url)}
                />
                <p style={{ marginTop: 6, fontSize: 12, textAlign: "center", color: "var(--text-muted)" }}>
                  点击图片可放大
                </p>
              </div>
            )}

            <h2 className="text-xl sm:text-2xl font-bold leading-relaxed" style={{
              marginTop: question?.image_url ? 0 : "1.25rem",
              marginBottom: "1.5rem",
              color: "var(--text-primary)",
              letterSpacing: -0.3,
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
                <button onClick={handlePrev} className="btn-secondary text-sm sm:text-base">
                  上一题
                </button>
              ) : <span />}
              <button
                onClick={handleNext}
                disabled={submitting}
                className="btn-primary text-sm sm:text-base"
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

/* ---- Badge ---- */
const badgeMap: Record<string, { text: string; color: string }> = {
  choice: { text: "单选", color: "var(--accent)" },
  multi: { text: "多选", color: "#7D9B8F" },
  text: { text: "填空", color: "#8B7E6A" },
  rating: { text: "评分", color: "#C8A45A" },
};

function QuestionBadge({ type }: { type: string }) {
  const b = badgeMap[type] ?? { text: type, color: "var(--text-muted)" };
  return <span className="badge">{b.text}</span>;
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
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {question.options.map((opt, i) => {
          const selected = value === opt;
          return (
            <div
              key={i}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              className={selected ? "option-selected" : "option-default"}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "0.875rem 1rem",
                border: selected ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                background: selected ? "var(--primary-light)" : "rgba(255,255,255,0.3)",
                fontWeight: 500,
                fontSize: 15,
                transition: "all 0.3s ease-out",
              }}
              onClick={() => onChange(opt)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(opt); }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                  e.currentTarget.style.borderColor = "var(--primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.borderColor = "var(--border)";
                }
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                border: selected ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                background: selected ? "var(--primary)" : "transparent",
              }}>
                {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
              </div>
              <span>{opt}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (t === "multi") {
    const selected: string[] = JSON.parse(value || "[]");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "0.875rem 1rem",
                border: checked ? "1.5px solid var(--accent-green)" : "1.5px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                background: checked ? "var(--accent-green-light)" : "rgba(255,255,255,0.3)",
                fontWeight: 500,
                fontSize: 15,
                transition: "all 0.3s ease-out",
              }}
              onClick={toggle}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(); }}
              onMouseEnter={(e) => {
                if (!checked) {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                  e.currentTarget.style.borderColor = "var(--accent-green)";
                }
              }}
              onMouseLeave={(e) => {
                if (!checked) {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.borderColor = "var(--border)";
                }
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                border: checked ? "1.5px solid var(--accent-green)" : "1.5px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                background: checked ? "var(--accent-green)" : "transparent",
              }}>
                {checked && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span>{opt}</span>
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
        className="textarea-field"
        style={{ minHeight: 120 }}
      />
    );
  }

  if (t === "rating") {
    return (
      <div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {[1, 2, 3, 4, 5].map((star) => {
            const active = Number(value) >= star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => onChange(String(star))}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  border: active ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                  background: active ? "var(--primary)" : "rgba(255,255,255,0.4)",
                  color: active ? "#fff" : "var(--text-primary)",
                  fontSize: 16, fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.3s ease-out",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                    e.currentTarget.style.borderColor = "var(--primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
              >
                {star}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
          <span>非常不满意</span>
          <span>非常满意</span>
        </div>
      </div>
    );
  }

  return null;
}