"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SubmissionDrawer from "@/components/submission-drawer";

interface QuestionInfo {
  id: string;
  title: string;
  type: string;
  /** 选项数组或 number 题范围对象，编辑答卷抽屉透传给 AnswerInput 用 */
  options: unknown;
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

const PAGE_SIZE = 20;

async function check(res: Response) {
  if (res.status === 401) throw new Error("登录已失效，请重新登录");
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `请求失败（${res.status}）`);
  }
  return res.json();
}

export default function SurveyDataPage() {
  const { id } = useParams<{ id: string }>();
  const [questions, setQuestions] = useState<QuestionInfo[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<Record<string, StatsData>>({});
  const [activeQ, setActiveQ] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [surveyTitle, setSurveyTitle] = useState("");
  const [me, setMe] = useState<{ username: string; role: string } | null>(null);
  const [viewSub, setViewSub] = useState<SubmissionRow | null>(null);
  const isSuper = me?.role === "super_admin";

  const loadSubmissions = useCallback(
    async (p: number) => {
      const data = await check(
        await fetch(`/api/survey-admin/surveys/${id}/responses?page=${p}&page_size=${PAGE_SIZE}`)
      );
      setSubmissions(data.submissions ?? []);
      setTotal(data.total ?? 0);
    },
    [id]
  );

  // 挂载：加载问卷结构与第一页回答（回答由下方 page effect 触发）
  useEffect(() => {
    fetch("/api/survey-admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
    (async () => {
      try {
        const survey = await check(await fetch(`/api/survey-admin/surveys/${id}`));
        setSurveyTitle(survey.title);
        const qs: QuestionInfo[] = survey.questions ?? [];
        setQuestions(qs);
        if (qs.length > 0) setActiveQ((prev) => prev || qs[0].id);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // 翻页时重新拉取
  useEffect(() => {
    loadSubmissions(page).catch((e) => setLoadError(e instanceof Error ? e.message : "加载失败"));
  }, [loadSubmissions, page]);

  // 当前题统计按需加载（已缓存则跳过；删除/清空后 setStats({}) 使缓存失效）
  useEffect(() => {
    if (!activeQ || stats[activeQ]) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await check(
          await fetch(`/api/survey-admin/surveys/${id}/stats?question_id=${encodeURIComponent(activeQ)}`)
        );
        if (!cancelled) setStats((prev) => ({ ...prev, [activeQ]: data.stats }));
      } catch {
        if (!cancelled) setStats((prev) => ({ ...prev, [activeQ]: { total: 0, values: {} } }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeQ, id, stats]);

  const handleExport = () => {
    window.open(`/api/survey-admin/surveys/${id}/export`, "_blank");
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm("确定删除这条回答？")) return;
    try {
      const res = await fetch(
        `/api/survey-admin/surveys/${id}/responses?submission_id=${submissionId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        alert("删除失败，请刷新后重试");
        return;
      }
      setStats({});
      if (submissions.length === 1 && page > 1) {
        // 删掉本页最后一条 → 回退一页（page 变化会自动重新拉取）
        setPage((p) => p - 1);
      } else {
        await loadSubmissions(page);
      }
    } catch {
      alert("网络错误，删除失败");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("确定清空该问卷的所有回答？此操作不可恢复。")) return;
    try {
      const res = await fetch(`/api/survey-admin/surveys/${id}/responses`, { method: "DELETE" });
      if (!res.ok) {
        alert("清空失败，请刷新后重试");
        return;
      }
      setStats({});
      if (page !== 1) {
        setPage(1);
      } else {
        await loadSubmissions(1);
      }
    } catch {
      alert("网络错误，清空失败");
    }
  };

  const activeQuestion = questions.find((q) => q.id === activeQ);
  const activeStats = activeQ ? stats[activeQ] : null;
  const activeType = activeQuestion?.type;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // NPS：推荐者(9-10) 占比 − 贬损者(0-6) 占比
  const npsData =
    activeType === "nps" && activeStats && activeStats.total > 0
      ? (() => {
          let promo = 0,
            pass = 0,
            detr = 0;
          for (const [k, c] of Object.entries(activeStats.values)) {
            const n = Number(k);
            if (n >= 9) promo += c;
            else if (n <= 6) detr += c;
            else pass += c;
          }
          const t = activeStats.total;
          return { promo, pass, detr, score: Math.round(((promo - detr) / t) * 100) };
        })()
      : null;

  // 数字题：均值摘要
  const numData =
    activeType === "number" && activeStats && activeStats.total > 0
      ? (() => {
          const parts: number[] = [];
          for (const [k, c] of Object.entries(activeStats.values)) {
            const n = Number(k);
            if (Number.isFinite(n)) for (let i = 0; i < c; i++) parts.push(n);
          }
          if (parts.length === 0) return null;
          const sum = parts.reduce((a, b) => a + b, 0);
          return {
            count: parts.length,
            avg: Math.round((sum / parts.length) * 100) / 100,
            min: Math.min(...parts),
            max: Math.max(...parts),
          };
        })()
      : null;

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
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm transition-colors hover:underline"
          style={{ color: "var(--text-secondary)", textUnderlineOffset: "3px" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回列表
        </Link>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              {surveyTitle}
            </h1>
            <p className="nums mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {total} 条回答
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/surveys/${id}/qrcode`} className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2" style={{ borderColor: "var(--accent-green)", color: "var(--accent-green)" }}>
              二维码
            </Link>
            <button onClick={handleExport} className="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-1 sm:mr-1.5">
                <path d="M7 2v7M4 6l3 3 3-3M2 10v1.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              导出 Excel
            </button>
            {total > 0 && (
              <button onClick={handleClearAll} className="btn-danger text-xs sm:text-sm px-3 sm:px-4">
                清空回答
              </button>
            )}
          </div>
        </div>
      </div>

      {loadError && (
        <div className="card mb-6 text-sm" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
          {loadError}
        </div>
      )}

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
                className="flex-shrink-0 rounded-md px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all"
                style={
                  activeQ === q.id
                    ? { background: "var(--primary)", color: "#faf9f5" }
                    : { background: "var(--bg-subtle)", color: "var(--text-secondary)" }
                }
              >
                {q.title.length > 12 ? q.title.slice(0, 12) + "..." : q.title}
              </button>
            ))}
          </div>

          {/* Active question stats（按需加载） */}
          {!activeStats ? (
            <div className="card animate-pulse" style={{ height: 140 }} />
          ) : (
            <div className="card" style={{ padding: "1.5rem" }}>
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: "var(--primary)" }} />
                <p className="nums text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  共 {activeStats.total} 条回答
                </p>
              </div>
              {activeStats.total === 0 ? (
                <p className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>暂无回答</p>
              ) : npsData ? (
                <div>
                  <div style={{ textAlign: "center", margin: "0.5rem 0 1.25rem" }}>
                    <span className="nums" style={{ fontSize: 44, fontWeight: 700, color: "var(--primary)" }}>
                      {npsData.score > 0 ? `+${npsData.score}` : npsData.score}
                    </span>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>NPS 净推荐值</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
                    {([
                      ["推荐者 9-10", npsData.promo, "var(--accent-green)"],
                      ["中立者 7-8", npsData.pass, "var(--text-muted)"],
                      ["贬损者 0-6", npsData.detr, "var(--accent)"],
                    ] as [string, number, string][]).map(([label, cnt, color]) => (
                      <div
                        key={label}
                        className="flex-1 rounded-md px-3 py-2 text-center"
                        style={{ background: "var(--bg-subtle)" }}
                      >
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</p>
                        <p className="nums" style={{ fontSize: 18, fontWeight: 600, color }}>
                          {Math.round((cnt / activeStats.total) * 100)}%
                        </p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                    {Array.from({ length: 11 }, (_, i) => {
                      const c = activeStats.values[String(i)] ?? 0;
                      const h = Math.round((c / activeStats.total) * 100);
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <span className="nums" style={{ fontSize: 12, color: "var(--text-muted)" }}>{c > 0 ? c : ""}</span>
                          <div style={{ width: "100%", height: 72, display: "flex", alignItems: "flex-end" }}>
                            <div style={{ width: "100%", height: `${Math.max(h, 2)}%`, background: "var(--primary)", borderRadius: 3, opacity: c > 0 ? 1 : 0.15 }} />
                          </div>
                          <span className="nums" style={{ fontSize: 12, color: "var(--text-muted)" }}>{i}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : numData ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {([
                    ["有效作答", numData.count],
                    ["平均", numData.avg],
                    ["最小", numData.min],
                    ["最大", numData.max],
                  ] as [string, number][]).map(([label, val]) => (
                    <div key={label} className="flex-1 rounded-md px-3 py-2 text-center" style={{ background: "var(--bg-subtle)", minWidth: 80 }}>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</p>
                      <p className="nums" style={{ fontSize: 18, fontWeight: 600, color: "var(--primary)" }}>{val}</p>
                    </div>
                  ))}
                </div>
              ) : activeQuestion?.type === "text" ? (
                /* 填空题：按条展示 */
                <div className="space-y-2">
                  {Object.entries(activeStats.values)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 100)
                    .map(([val, count]) => (
                      <div
                        key={val}
                        className="flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm"
                        style={{ background: "var(--bg-subtle)" }}
                      >
                        <span className="min-w-0 whitespace-pre-wrap break-words">{val}</span>
                        {count > 1 && (
                          <span className="nums flex-shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
                            ×{count}
                          </span>
                        )}
                      </div>
                    ))}
                  {Object.keys(activeStats.values).length > 100 && (
                    <p className="pt-1 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                      仅展示出现频次最高的前 100 条
                    </p>
                  )}
                </div>
              ) : (
                /* 选择/评分题：条形分布 */
                <div className="space-y-3">
                  {Object.entries(activeStats.values)
                    .sort((ea, eb) =>
                      activeQuestion?.type === "rating"
                        ? Number(ea[0]) - Number(eb[0])
                        : eb[1] - ea[1]
                    )
                    .map(([val, count], i) => {
                      const pct = Math.round((count / activeStats.total) * 100);
                      return (
                        <div key={val}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium truncate mr-3">{val}</span>
                            <span className="nums flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                              {count} <span style={{ color: "var(--text-muted)" }}>({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-md" style={{ background: "var(--bg-subtle)" }}>
                            <div
                              className="h-full rounded-md transition-all duration-200"
                              style={{
                                width: `${pct}%`,
                                background: i === 0 ? "var(--primary)" : "var(--accent-green)",
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
              <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th
                        className="px-3 sm:px-5 py-3 text-xs font-medium sticky left-0 z-10"
                        style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}
                      >
                        #
                      </th>
                      {questions.map((q) => (
                        <th
                          key={q.id}
                          className="px-2 sm:px-4 py-3 text-xs font-medium whitespace-nowrap"
                          style={{ color: "var(--text-muted)", minWidth: 100 }}
                        >
                          {q.title.length > 8 ? q.title.slice(0, 8) + "..." : q.title}
                        </th>
                      ))}
                      <th className="px-2 sm:px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                        提交时间
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub, i) => (
                      <tr
                        key={sub.submission_id}
                        className="animate-in group transition-colors hover:bg-[color:var(--bg-subtle)]"
                        style={{
                          borderBottom: "1px solid var(--border-light)",
                          animationDelay: `${i * 0.02}s`,
                        }}
                      >
                        <td
                          className="nums px-3 sm:px-5 py-3 font-medium sticky left-0 z-10 bg-[color:var(--bg-card)] group-hover:bg-[color:var(--bg-subtle)] transition-colors"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        {questions.map((q) => {
                          const v = sub.answers[q.id];
                          return (
                            <td
                              key={q.id}
                              className="px-2 sm:px-4 py-3 whitespace-nowrap"
                              title={v && v.length > 40 ? v : undefined}
                            >
                              {v ? (
                                v.length > 40 ? v.slice(0, 40) + "…" : v
                              ) : (
                                <span style={{ color: "var(--text-muted)" }}>-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="nums px-2 sm:px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                          {new Date(sub.submitted_at).toLocaleString("zh-CN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => setViewSub(sub)}
                            className="mr-3 text-xs transition-colors text-[color:var(--text-muted)] hover:text-[color:var(--primary)]"
                          >
                            查看
                          </button>
                          <button
                            onClick={() => handleDeleteSubmission(sub.submission_id)}
                            className="text-xs transition-colors text-[color:var(--text-muted)] hover:text-[color:var(--accent)]"
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
                className="flex items-center justify-between px-4 sm:px-5 py-3"
                style={{ borderTop: "1px solid var(--border-light)" }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                >
                  上一页
                </button>
                <p className="nums text-xs" style={{ color: "var(--text-secondary)" }}>
                  第 {page} / {totalPages} 页 · 共 {total} 人
                </p>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {viewSub && (
        <SubmissionDrawer
          surveyId={id}
          questions={questions}
          submission={viewSub}
          canEdit={isSuper}
          onClose={() => setViewSub(null)}
          onSaved={() => {
            // 答案变了统计就得重算；列表也刷一遍
            setStats({});
            loadSubmissions(page).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
