"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

interface QuestionInfo {
  id: string;
  title: string;
  type: string;
  options: string[];
}

interface StatsData {
  total: number;
  values: Record<string, number>;
}

interface SubmissionRow {
  submission_id: string;
  submitted_at: string;
  answers: Record<string, string>;
}

export default function SurveyDataPage() {
  const { id } = useParams<{ id: string }>();
  const [questions, setQuestions] = useState<QuestionInfo[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<Record<string, StatsData>>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeQ, setActiveQ] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [surveyTitle, setSurveyTitle] = useState("");
  const [error, setError] = useState("");

  const PAGE_SIZE = 20;

  const check = async (r: Response) => {
    if (r.status === 401) throw new Error("密钥已失效，请重新登录");
    if (!r.ok) throw new Error(`加载失败（${r.status}）`);
    return r.json();
  };

  const loadSubmissions = (p: number) => {
    fetch(`/api/admin/surveys/${id}/responses?page=${p}&page_size=${PAGE_SIZE}`)
      .then(check)
      .then((data) => {
        setSubmissions(data.submissions ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((e) => setError(e.message || "加载失败，请重试"));
  };

  useEffect(() => {
    fetch(`/api/admin/surveys/${id}`)
      .then(check)
      .then((survey) => {
        setSurveyTitle(survey.title);
        const qs = survey.questions ?? [];
        setQuestions(qs);
        if (qs.length > 0) setActiveQ(qs[0].id);
      })
      .catch((e) => setError(e.message || "加载失败，请重试"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading) loadSubmissions(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, loading]);

  // 按题懒加载统计
  useEffect(() => {
    if (!activeQ || stats[activeQ]) return;
    setStatsLoading(true);
    fetch(`/api/admin/surveys/${id}/stats?question_id=${activeQ}`)
      .then(check)
      .then((data) => {
        if (data.stats) setStats((prev) => ({ ...prev, [activeQ]: data.stats }));
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQ]);

  const handleExport = () => {
    window.open(`/api/admin/surveys/${id}/export`, "_blank");
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm("确定删除这条回答？")) return;
    const res = await fetch(`/api/admin/surveys/${id}/responses?submission_id=${submissionId}`, { method: "DELETE" });
    if (!res.ok) { alert("删除失败，请重试"); return; }
    if (submissions.length === 1 && page > 1) {
      setPage((p) => p - 1); // 删掉本页最后一条时回退一页（触发重新加载）
    } else {
      loadSubmissions(page);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("确定清空该问卷的所有回答？此操作不可恢复。")) return;
    const res = await fetch(`/api/admin/surveys/${id}/responses`, { method: "DELETE" });
    if (!res.ok) { alert("清空失败，请重试"); return; }
    setSubmissions([]);
    setTotal(0);
    setStats({});
    setPage(1);
  };

  const activeStats = activeQ ? stats[activeQ] : null;
  const activeType = questions.find((q) => q.id === activeQ)?.type;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card animate-pulse" style={{ height: 160 }} />
        <div className="card animate-pulse" style={{ height: 300 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card py-12 text-center">
        <p className="mb-4 text-sm font-medium" style={{ color: "var(--accent)" }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-secondary text-sm py-2 px-4">重试</button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
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
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              {surveyTitle}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {total} 条回答
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/surveys/${id}/qrcode`} className="btn-secondary text-sm py-2 px-3" style={{ borderColor: "var(--accent-green)", color: "var(--accent-green)" }}>
              二维码
            </Link>
            <button onClick={handleExport} className="btn-primary text-sm py-2 px-3">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-1">
                <path d="M7 2v7M4 6l3 3 3-3M2 10v1.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              导出
            </button>
            {total > 0 && (
              <button onClick={handleClearAll} className="btn-danger text-sm py-2 px-3">
                清空
              </button>
            )}
          </div>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="card py-16 text-center" style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>该问卷没有题目</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick stats tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {questions.map((q) => (
              <button
                key={q.id}
                onClick={() => setActiveQ(q.id)}
                className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all"
                style={
                  activeQ === q.id
                    ? { background: "var(--text-primary)", color: "white" }
                    : { background: "var(--bg-subtle)", color: "var(--text-secondary)" }
                }
              >
                {q.title.length > 16 ? q.title.slice(0, 16) + "..." : q.title}
              </button>
            ))}
          </div>

          {/* Active question stats */}
          {(statsLoading || activeStats) && (
            <div className="card">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  {activeStats ? `共 ${activeStats.total} 条回答` : "统计中..."}
                </p>
              </div>
              {!activeStats ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse" style={{ height: 28, background: "var(--bg-subtle)", borderRadius: 8 }} />
                  ))}
                </div>
              ) : activeStats.total === 0 ? (
                <p className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>暂无回答</p>
              ) : activeType === "text" ? (
                /* 填空题按条列出答案，不画百分比条 */
                <div className="space-y-2">
                  {Object.entries(activeStats.values)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 100)
                    .map(([val, count], i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-sm"
                        style={{ background: "var(--bg-subtle)" }}
                      >
                        <span className="min-w-0 whitespace-pre-wrap break-words" style={{ color: "var(--text-primary)" }}>{val}</span>
                        {count > 1 && (
                          <span className="flex-shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>×{count}</span>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(activeStats.values)
                    .sort(([, a], [, b]) => b - a)
                    .map(([val, count], i) => {
                      const pct = Math.round((count / activeStats.total) * 100);
                      return (
                        <div key={val}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium truncate mr-3">{val}</span>
                            <span className="flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                              {count} <span style={{ color: "var(--text-muted)" }}>({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-subtle)" }}>
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${pct}%`,
                                background: i === 0 ? "var(--accent)" : "var(--accent-green)",
                                opacity: 1 - i * 0.12,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Pivot table: one row per person */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-light)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                详细数据（每人一行）
              </p>
            </div>

            {submissions.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <ClipboardList size={48} strokeWidth={1} className="mb-4 mx-auto" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>暂无回答数据</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th
                        className="px-5 py-3 text-xs font-medium tracking-wide uppercase sticky left-0 z-10"
                        style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}
                      >
                        #
                      </th>
                      {questions.map((q) => (
                        <th
                          key={q.id}
                          className="px-4 py-3 text-xs font-medium tracking-wide uppercase whitespace-nowrap"
                          style={{ color: "var(--text-muted)", minWidth: 120 }}
                        >
                          {q.title.length > 12 ? q.title.slice(0, 12) + "..." : q.title}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-xs font-medium tracking-wide uppercase whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                        提交时间
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wide uppercase whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub, i) => (
                      <tr
                        key={sub.submission_id}
                        className="animate-in group"
                        style={{
                          borderBottom: "1px solid var(--border-light)",
                          animationDelay: `${i * 0.02}s`,
                        }}
                      >
                        <td
                          className="px-5 py-3 font-medium sticky left-0 z-10"
                          style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}
                        >
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        {questions.map((q) => {
                          const rawAnswer = sub.answers[q.title] ?? "";
                          const display = rawAnswer.length > 200 ? rawAnswer.slice(0, 200) + "..." : rawAnswer;
                          return (
                            <td key={q.id} className="px-4 py-3 whitespace-nowrap" title={rawAnswer.length > 200 ? rawAnswer : undefined}>
                              {rawAnswer ? display : (
                                <span style={{ color: "var(--text-muted)" }}>-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                          {new Date(sub.submitted_at).toLocaleString("zh-CN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteSubmission(sub.submission_id)}
                            className="text-xs transition-colors hover:text-red-500"
                            style={{ color: "var(--text-muted)" }}
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {total > PAGE_SIZE && (
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: "1px solid var(--border-light)" }}
              >
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  第 {page} / {totalPages} 页 · 共 {total} 人
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn-ghost text-xs py-1 px-3 disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn-ghost text-xs py-1 px-3 disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
