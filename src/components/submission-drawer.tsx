"use client";

import { useCallback, useEffect, useState } from "react";
import AnswerInput from "@/components/answer-input";

interface DrawerQuestion {
  id: string;
  type: string;
  title: string;
  /** API 返回的 options 已解析：选项数组或 number 题的范围对象 */
  options: unknown;
  required?: boolean;
}

interface SubmissionSnapshot {
  submission_id: string;
  submitted_at: string;
  answers: Record<string, string>;
}

interface EditLog {
  id: string;
  question_id: string;
  question_title: string;
  old_value: string | null;
  new_value: string | null;
  editor_name: string;
  created_at: string;
}

interface Props {
  surveyId: string;
  questions: DrawerQuestion[];
  submission: SubmissionSnapshot;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/** multi 的 JSON 数组 → 顿号连接；解析不了按原文返回 */
function prettyValue(raw: string | null | undefined): string {
  if (raw === null || raw === undefined || raw === "") return "";
  if (raw.startsWith("[")) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.join("、");
    } catch {
      /* 不是 JSON，按原文显示 */
    }
  }
  return raw;
}

function displayAnswer(q: DrawerQuestion, raw: string | undefined): string {
  if (raw === undefined || raw === "") return "";
  if (q.type === "rating") return `${raw} / 5`;
  if (q.type === "nps") return `${raw} / 10`;
  return prettyValue(raw);
}

export default function SubmissionDrawer({ surveyId, questions, submission, canEdit, onClose, onSaved }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(submission.answers);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<EditLog[] | null>(null);

  const refreshLogs = useCallback(() => {
    fetch(`/api/survey-admin/surveys/${surveyId}/responses/logs?submission_id=${encodeURIComponent(submission.submission_id)}`)
      .then((r) => (r.ok ? r.json() : { logs: [] }))
      .then((d) => setLogs(d.logs ?? []))
      .catch(() => setLogs([]));
  }, [surveyId, submission.submission_id]);

  useEffect(() => {
    if (canEdit) refreshLogs();
  }, [canEdit, refreshLogs]);

  // 锁背景滚动；ESC 关闭（编辑态禁关，防误触丢失未保存的修改）
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editing) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, editing]);

  const startEdit = () => {
    const d: Record<string, string> = {};
    for (const q of questions) d[q.id] = answers[q.id] ?? "";
    setDraft(d);
    setError("");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/survey-admin/surveys/${surveyId}/responses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submission.submission_id,
          answers: questions.map((q) => ({ questionId: q.id, value: draft[q.id] ?? "" })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `保存失败（${res.status}）`);
        return;
      }
      // 服务端会把空答案过滤后落库，本地快照按同样规则同步
      const next: Record<string, string> = {};
      for (const q of questions) {
        const v = draft[q.id] ?? "";
        if (v === "" || v === "[]") continue;
        if (q.type === "rating" && v === "0") continue;
        next[q.id] = v;
      }
      setAnswers(next);
      setEditing(false);
      refreshLogs();
      onSaved();
    } catch {
      setError("网络错误，保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: "rgba(20, 20, 19, 0.45)" }}
      onClick={() => {
        if (!editing) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(560px, 100vw)",
          background: "var(--bg-card)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-3"
          style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <p className="text-sm font-semibold">回答详情</p>
            <p className="nums mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {new Date(submission.submitted_at).toLocaleString("zh-CN")}
              {canEdit && logs && logs.length > 0 && (
                <span
                  className="ml-2 rounded-md px-1.5 py-0.5"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
                >
                  管理员修改过 {logs.length} 处
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} aria-label="关闭" className="transition-colors" style={{ color: "var(--text-muted)" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div
              className="mx-6 mt-4 rounded-md px-3 py-2 text-sm"
              style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
            >
              {error}
            </div>
          )}

          {questions.map((q, i) => (
            <div key={q.id} style={{ padding: "0.9rem 1.5rem", borderBottom: "1px solid var(--border-light)" }}>
              <p className="mb-2 text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                {i + 1}. {q.title}
              </p>
              {editing ? (
                <AnswerInput
                  question={{
                    id: q.id,
                    type: q.type,
                    title: q.title,
                    options: q.options as never,
                    required: !!q.required,
                  }}
                  value={draft[q.id] ?? ""}
                  onChange={(v) => setDraft((d) => ({ ...d, [q.id]: v }))}
                />
              ) : (
                <p
                  className="whitespace-pre-wrap break-words text-sm"
                  style={{ color: displayAnswer(q, answers[q.id]) ? "var(--text-primary)" : "var(--text-muted)" }}
                >
                  {displayAnswer(q, answers[q.id]) || "未作答"}
                </p>
              )}
            </div>
          ))}

          {/* 修改记录（仅超管可见，读态展示） */}
          {canEdit && !editing && (
            <div style={{ padding: "1rem 1.5rem" }}>
              <p className="mb-3 text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                修改记录
              </p>
              {!logs ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  加载中…
                </p>
              ) : logs.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  暂无
                </p>
              ) : (
                <div className="space-y-3">
                  {logs.map((l) => (
                    <div
                      key={l.id}
                      className="rounded-md px-3 py-2"
                      style={{ background: "var(--bg-subtle)", fontSize: 12, lineHeight: 1.7 }}
                    >
                      <p className="nums mb-1" style={{ color: "var(--text-muted)" }}>
                        {new Date(l.created_at).toLocaleString("zh-CN")} · {l.editor_name}
                      </p>
                      <p style={{ color: "var(--text-secondary)" }}>
                        {l.question_title}：
                        <span style={{ textDecoration: "line-through", color: "var(--text-muted)" }}>
                          {prettyValue(l.old_value) || "空"}
                        </span>
                        <span className="mx-1">→</span>
                        <span style={{ color: "var(--text-primary)" }}>{prettyValue(l.new_value) || "空"}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2"
          style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--border)" }}
        >
          {editing ? (
            <>
              <button
                onClick={() => {
                  setEditing(false);
                  setError("");
                }}
                className="btn-secondary px-4 py-2 text-sm"
              >
                取消
              </button>
              <button onClick={save} disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-40">
                {saving ? "保存中…" : "保存"}
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                <button onClick={startEdit} className="btn-primary px-4 py-2 text-sm">
                  编辑回答
                </button>
              )}
              <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
                关闭
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
