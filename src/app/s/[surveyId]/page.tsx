"use client";

import { useEffect, useState, use, useRef } from "react";
import QuestionBadge from "@/components/question-badge";
import AnswerInput from "@/components/answer-input";

type OptionItem = { label: string; limit?: number };

interface QuestionData {
  id: string;
  type: string;
  title: string;
  options: (string | OptionItem)[] | { min?: number; max?: number };
  required: boolean;
  image_url: string;
}

interface SurveyData {
  title: string;
  description: string;
  redirect_url: string;
  payment_enabled?: number | boolean;
  payment_qr?: string;
  questions: QuestionData[];
}

/** 每类题目的粗略作答用时（秒），用于开场页预计总时长 */
const ETA_SECONDS: Record<string, number> = {
  choice: 8,
  dropdown: 8,
  rating: 8,
  nps: 8,
  multi: 15,
  text: 40,
  date: 12,
  number: 12,
  yesno: 5,
};

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
  const [started, setStarted] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(0);
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
                setHasDraft(true);
              }
            }
          } catch { /* 草稿损坏则忽略 */ }
        }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [surveyId, draftKey]);

  // 答案变化时写入草稿（未点开始前不落盘）
  useEffect(() => {
    if (!survey || done || !started) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ values, step }));
    } catch { /* 存储满则忽略 */ }
  }, [values, step, survey, done, started, draftKey]);

  // 提交成功后清草稿
  useEffect(() => {
    if (done) { try { localStorage.removeItem(draftKey); } catch {} }
  }, [done, draftKey]);

  // 答题中途关页/刷新时挽留（已有作答且未提交；values 只存用户实际交互过的题，"0" 对 NPS 是有效答案）
  const hasProgress = Object.values(values).some((v) => v !== "" && v !== "[]");
  useEffect(() => {
    if (!hasProgress || done || !started) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [hasProgress, done, started]);

  useEffect(() => () => { if (autoNextTimer.current) clearTimeout(autoNextTimer.current); }, []);

  // 记录到达过的最远题目（分段进度条允许跳回的范围）
  useEffect(() => {
    setMaxStepReached((m) => Math.max(m, step));
  }, [step]);

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
    // 单选/评分/NPS/是否/下拉：选完自动跳下一题（最后一题不自动提交）
    if (question && !isLast && (question.id === qid)) {
      const auto = ["choice", "rating", "nps", "yesno", "dropdown"].includes(question.type);
      // rating 的 "0" 是未答哨兵；NPS 的 0 分是合法答案
      const answered = val !== "" && !(question.type === "rating" && val === "0");
      if (auto && answered) {
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

  // 数字键快选：1-9 对应选项（单选/下拉直选；多选切换；是/否 1=是 2=否）
  const quickSelect = (idx: number): boolean => {
    if (!question) return false;
    const list = Array.isArray(question.options) ? question.options : [];
    const labelOf = (opt: string | OptionItem) => (typeof opt === "string" ? opt : opt.label);
    if (question.type === "choice" || question.type === "dropdown") {
      const opt = list[idx];
      if (opt === undefined) return false;
      setVal(question.id, labelOf(opt));
      return true;
    }
    if (question.type === "multi") {
      const opt = list[idx];
      if (opt === undefined) return false;
      const label = labelOf(opt);
      let cur: string[] = [];
      try {
        const parsed = JSON.parse(values[question.id] ?? "[]");
        if (Array.isArray(parsed)) cur = parsed;
      } catch { cur = []; }
      const next = cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label];
      setVal(question.id, JSON.stringify(next));
      return true;
    }
    if (question.type === "yesno") {
      if (idx === 0) { setVal(question.id, "是"); return true; }
      if (idx === 1) { setVal(question.id, "否"); return true; }
    }
    return false;
  };

  // 键盘快捷键：1-9 快选选项 · Enter 下一题 · ←/→ 上/下一题（不劫持输入控件的原生按键）
  useEffect(() => {
    if (!started || done || !question) return;
    const onKey = (e: KeyboardEvent) => {
      if (zoomImg || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName ?? "";
      const role = el?.getAttribute?.("role") ?? "";
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (/^[1-9]$/.test(e.key)) {
        if (!typing && quickSelect(Number(e.key) - 1)) e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        // 文本域内换行、已聚焦按钮/选项的原生激活行为优先，避免双重触发
        if (tag === "TEXTAREA" || tag === "BUTTON" || role === "radio" || role === "checkbox") return;
        e.preventDefault();
        handleNext();
        return;
      }
      if (typing) return; // 日期/数字输入框内的 ←/→ 光标移动保留原生
      if (e.key === "ArrowLeft") {
        if (step > 0) { e.preventDefault(); handlePrev(); }
      } else if (e.key === "ArrowRight") {
        if (!isLast) { e.preventDefault(); handleNext(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 开场页"重新开始"：丢弃草稿，从零作答
  const handleRestart = () => {
    if (autoNextTimer.current) { clearTimeout(autoNextTimer.current); autoNextTimer.current = null; }
    try { localStorage.removeItem(draftKey); } catch { /* 忽略 */ }
    setValues({});
    setStep(0);
    setMaxStepReached(0);
    setHasDraft(false);
    setFieldError("");
    setStarted(true);
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
        // 收款码开启时留在收尾页展示二维码，不再跳走
        const payOn = !!(survey?.payment_enabled && survey?.payment_qr);
        if (result.redirect_url && !payOn) {
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

  // 开场页：标题 + 说明 + 题数/预计用时，有草稿时按钮为"继续作答"
  if (!started) {
    const etaMinutes = Math.max(1, Math.round(
      survey.questions.reduce((sum, q) => sum + (ETA_SECONDS[q.type] ?? 10), 0) / 60
    ));
    return (
      <div className="flex min-h-screen items-center justify-center px-5" style={{ background: "var(--bg-primary)" }}>
        <div className="card animate-in" style={{ textAlign: "center", maxWidth: 480, width: "100%" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: -0.4, lineHeight: 1.3 }}>
            {survey.title}
          </h1>
          {survey.description && (
            <p style={{ marginTop: "1rem", fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>
              {survey.description}
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2.5rem", margin: "1.75rem 0" }}>
            <div>
              <div className="nums" style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>{total}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>题</div>
            </div>
            <div style={{ width: 1, height: 36, background: "var(--border)" }} />
            <div>
              <div className="nums" style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>约 {etaMinutes}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>分钟</div>
            </div>
          </div>
          <button className="btn-primary w-full" style={{ minHeight: 48 }} onClick={() => setStarted(true)}>
            {hasDraft ? "继续作答" : "开始作答"}
          </button>
          {hasDraft && (
            <button className="btn-secondary w-full" style={{ marginTop: 10, minHeight: 44 }} onClick={handleRestart}>
              重新开始
            </button>
          )}
        </div>
      </div>
    );
  }

  if (done) {
    const answeredCount = survey.questions.filter((q) => {
      const v = values[q.id];
      if (v === undefined || v === "" || v === "[]") return false;
      return !(q.type === "rating" && v === "0");
    }).length;
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
          <p className="nums" style={{ marginTop: 8, fontSize: 13, color: "var(--text-muted)" }}>已收到 {answeredCount} / {total} 题的回答</p>
          {survey.payment_enabled && survey.payment_qr && (
            <div style={{ marginTop: "1.5rem" }}>
              <img
                src={survey.payment_qr}
                alt=""
                onClick={() => setZoomImg(survey.payment_qr ?? null)}
                style={{
                  width: 260, height: 260, objectFit: "contain",
                  background: "#fff", border: "1px solid var(--border)",
                  borderRadius: 6, cursor: "zoom-in",
                }}
              />
            </div>
          )}
        </div>
        {zoomImg && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "1rem", background: "rgba(20,20,19,0.88)",
            }}
            onClick={() => setZoomImg(null)}
          >
            <button
              onClick={() => setZoomImg(null)}
              style={{
                position: "absolute", top: 16, right: 16,
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(245,244,237,0.14)", color: "#f5f4ed",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", cursor: "pointer", fontSize: 18,
              }}
            >
              ✕
            </button>
            <img
              src={zoomImg}
              alt=""
              style={{ maxHeight: "90vh", maxWidth: "90vw", borderRadius: 6, objectFit: "contain" }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  const pct = total > 0 ? ((step + 1) / total) * 100 : 0;

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
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
        {/* Progress：分段进度条，点过的段可跳回 */}
        <div className="mb-8">
          <div className="nums" style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
            <span>第 {step + 1} / {total} 题</span>
            <span style={{ color: "var(--primary)", fontWeight: 600 }}>{Math.round(pct)}%</span>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {survey.questions.map((q, idx) => {
              const jumpable = idx !== step && idx <= maxStepReached;
              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={!jumpable}
                  tabIndex={jumpable ? 0 : -1}
                  aria-label={`第 ${idx + 1} 题`}
                  onClick={() => {
                    if (!jumpable) return;
                    if (autoNextTimer.current) { clearTimeout(autoNextTimer.current); autoNextTimer.current = null; }
                    setStep(idx);
                    setAnimKey((k) => k + 1);
                    setFieldError("");
                  }}
                  style={{
                    flex: 1,
                    height: idx === step ? 8 : 6,
                    padding: 0,
                    border: "none",
                    borderRadius: 3,
                    background: idx === step
                      ? "var(--primary)"
                      : idx <= maxStepReached
                        ? "rgba(27, 54, 93, 0.35)"
                        : "var(--border)",
                    cursor: jumpable ? "pointer" : "default",
                    transition: "background var(--motion-fast) var(--ease-standard), height var(--motion-fast) var(--ease-standard)",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Question card */}
        <div className="flex-1" key={animKey}>
          <div className="card animate-in">
            <QuestionBadge type={question?.type ?? ""} />

            {question?.image_url && (
              <div style={{ marginBottom: "1.5rem", marginTop: "1rem" }}>
                <img
                  src={question.image_url}
                  alt="题目图片"
                  style={{
                    width: "100%",
                    maxHeight: "40vh",
                    objectFit: "cover",
                    borderRadius: "var(--radius-sm)",
                    cursor: "zoom-in",
                    border: "1px solid var(--border)",
                  }}
                  onClick={() => setZoomImg(question.image_url)}
                />
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
            padding: "1rem", background: "rgba(20,20,19,0.88)",
          }}
          onClick={() => setZoomImg(null)}
        >
          <button
            onClick={() => setZoomImg(null)}
            style={{
              position: "absolute", top: 16, right: 16,
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(245,244,237,0.14)", color: "#f5f4ed",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", cursor: "pointer", fontSize: 18,
            }}
          >
            ✕
          </button>
          <img
            src={zoomImg}
            alt="查看大图"
            style={{ maxHeight: "90vh", maxWidth: "90vw", borderRadius: 6, objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
