"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
  const [stats, setStats] = useState<Record<string, StatsData>>({});
  const [activeQ, setActiveQ] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [surveyTitle, setSurveyTitle] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/surveys/${id}`).then((r) => r.json()),
      fetch(`/api/admin/surveys/${id}/stats`).then((r) => r.json()),
      fetch(`/api/admin/surveys/${id}/responses`).then((r) => r.json()),
    ])
      .then(([survey, statsData, subs]) => {
        setSurveyTitle(survey.title);
        const qs = survey.questions ?? [];
        setQuestions(qs);
        if (qs.length > 0) setActiveQ(qs[0].id);
        setSubmissions(subs);

        const statsMap: Record<string, StatsData> = {};
        statsData.forEach((q: { id: string; stats: StatsData }) => {
          statsMap[q.id] = q.stats;
        });
        setStats(statsMap);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleExport = () => {
    window.open(`/api/admin/surveys/${id}/export`, "_blank");
  };

  const activeStats = activeQ ? stats[activeQ] : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card animate-pulse" style={{ height: 160 }} />
        <div className="card animate-pulse" style={{ height: 300 }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
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
        <div className="mt-3 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              {surveyTitle}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {submissions.length} 条回答
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/surveys/${id}/qrcode`} className="btn-secondary" style={{ borderColor: "var(--accent-green)", color: "var(--accent-green)" }}>
              二维码
            </Link>
            <button onClick={handleExport} className="btn-primary">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-1.5">
                <path d="M7 2v7M4 6l3 3 3-3M2 10v1.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              导出 Excel
            </button>
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
          {activeStats && (
            <div className="card">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  共 {activeStats.total} 条回答
                </p>
              </div>
              {activeStats.total === 0 ? (
                <p className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>暂无回答</p>
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
                <p className="text-4xl mb-3">&#128203;</p>
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
                          {i + 1}
                        </td>
                        {questions.map((q) => (
                          <td key={q.id} className="px-4 py-3 whitespace-nowrap">
                            {sub.answers[q.title] ?? (
                              <span style={{ color: "var(--text-muted)" }}>-</span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                          {new Date(sub.submitted_at).toLocaleString("zh-CN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
