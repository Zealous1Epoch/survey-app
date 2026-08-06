"use client";

import { useState } from "react";

interface QuestionData {
  id: string;
  type: string;
  title: string;
  options: string[];
  required: boolean;
  redirect_url: string;
}

interface Props {
  question: QuestionData;
  surveyId: string;
  onSubmit: (value: string) => Promise<{
    success: boolean;
    redirect_url?: string;
    error?: string;
  }>;
}

const typeIndicator: Record<string, { text: string; color: string }> = {
  choice: { text: "单选", color: "#C8694A" },
  multi: { text: "多选", color: "#7D9B8F" },
  text: { text: "填空", color: "#8B7E6A" },
  rating: { text: "评分", color: "#C8A45A" },
};

export default function QuestionForm({ question, surveyId, onSubmit }: Props) {
  const [value, setValue] = useState<string>(() => {
    if (question.type === "multi") return JSON.stringify([]);
    if (question.type === "rating") return "0";
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (question.required) {
      if (!value || value === "" || value === "[]" || value === "0") {
        setError("此题为必填");
        return;
      }
    }
    setLoading(true);
    setError("");

    try {
      const result = await onSubmit(
        question.type === "multi" ? value : String(value)
      );
      if (result.success) {
        setDone(true);
        const redirectUrl = result.redirect_url;
        if (redirectUrl) {
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 1500);
        }
      } else {
        setError(result.error ?? "提交失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const indicator = typeIndicator[question.type] ?? { text: "", color: "var(--text-muted)" };

  if (done) {
    return (
      <div
        className="flex flex-col items-center justify-center px-4"
        style={{ minHeight: "60vh", animation: "fadeInUp 0.5s ease-out" }}
      >
        <div
          className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--accent-green-light)" }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path
              d="M7 14l5 5 9-9"
              stroke="var(--accent-green)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-lg sm:text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          提交成功
        </h2>
        <p className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
          感谢你的回答
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Question type badge */}
      <div className="mb-4">
        <span
          className="inline-flex items-center rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-medium"
          style={{
            background: `${indicator.color}12`,
            color: indicator.color,
          }}
        >
          {indicator.text}
        </span>
      </div>

      {/* Question title — 小屏缩小字体 */}
      <h2 className="mb-6 sm:mb-8 text-base sm:text-lg font-medium leading-relaxed" style={{ color: "var(--text-primary)" }}>
        {question.title}
      </h2>

      {/* Choice (radio) */}
      {question.type === "choice" && (
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <label
              key={i}
              className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 sm:px-4 py-3 sm:py-3.5 transition-all"
              style={{
                borderColor: value === opt ? "var(--accent)" : "var(--border)",
                background: value === opt ? "var(--accent-light)" : "var(--bg-card)",
              }}
            >
              <div
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all"
                style={{
                  borderColor: value === opt ? "var(--accent)" : "var(--border)",
                }}
              >
                {value === opt && (
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />
                )}
              </div>
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {/* Multi (checkbox) */}
      {question.type === "multi" && (
        <div className="space-y-2">
          {question.options.map((opt, i) => {
            const selected: string[] = JSON.parse(value || "[]");
            const checked = selected.includes(opt);
            return (
              <label
                key={i}
                className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 sm:px-4 py-3 sm:py-3.5 transition-all"
                style={{
                  borderColor: checked ? "var(--accent-green)" : "var(--border)",
                  background: checked ? "var(--accent-green-light)" : "var(--bg-card)",
                }}
              >
                <div
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all"
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
              </label>
            );
          })}
        </div>
      )}

      {/* Text */}
      {question.type === "text" && (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="请输入你的回答..."
          rows={4}
          className="textarea-field text-base"
          style={{ minHeight: 120 }}
        />
      )}

      {/* Rating */}
      {question.type === "rating" && (
        <div className="text-center">
          <div className="inline-flex items-center gap-1 sm:gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = Number(value) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setValue(String(star))}
                  className="transition-all duration-150 hover:scale-110"
                  style={{
                    fontSize: "2rem",
                    color: active ? "#C8A45A" : "var(--border)",
                    transform: active ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  &#9733;
                </button>
              );
            })}
          </div>
          {Number(value) > 0 && (
            <p className="mt-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {Number(value)} / 5
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="mt-4 rounded-md px-4 py-3 text-sm animate-in"
          style={{ background: "var(--accent-light)", color: "var(--accent)" }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary mt-8 w-full py-3.5 text-base"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/>
            </svg>
            提交中...
          </span>
        ) : (
          "提交"
        )}
      </button>
    </div>
  );
}