"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SurveyWithCounts } from "@/lib/db/surveys";

export default function AdminPage() {
  const [surveys, setSurveys] = useState<SurveyWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ username: string; role: string } | null>(null);
  const [creatorFilter, setCreatorFilter] = useState("all");

  const fetchSurveys = () => {
    fetch("/api/survey-admin/surveys")
      .then((r) => r.json())
      .then(setSurveys)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSurveys();
    fetch("/api/survey-admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const isSuper = me?.role === "super_admin";
  // 创建人分组计数（仅超管视角有跨用户数据）
  const creators = (() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const s of surveys) {
      const key = s.user_id ?? "__orphan__";
      const label = s.creator_name ?? "未归属";
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { label, count: 1 });
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  })();
  const visible = creatorFilter === "all" ? surveys : surveys.filter((s) => (s.user_id ?? "__orphan__") === creatorFilter);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此问卷？所有题目和回答数据将被删除。")) return;
    await fetch(`/api/survey-admin/surveys/${id}`, { method: "DELETE" });
    fetchSurveys();
  };

  const totalResponses = surveys.reduce((a, s) => a + (s.response_count ?? 0), 0);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          {!loading && surveys.length > 0 && (
            <p className="nums mb-1 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              共 {surveys.length} 份问卷 · {totalResponses} 条回答
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            问卷列表
          </h1>
        </div>
        <Link href="/admin/surveys/new" className="btn-primary text-sm sm:text-base px-4 sm:px-8">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-1 sm:mr-1.5">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="hidden sm:inline">创建问卷</span>
          <span className="sm:hidden">新建</span>
        </Link>
      </div>

      {!loading && isSuper && creators.length > 1 && (
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setCreatorFilter("all")}
            className="flex-shrink-0 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-all"
            style={
              creatorFilter === "all"
                ? { background: "var(--primary)", color: "#faf9f5" }
                : { background: "var(--bg-subtle)", color: "var(--text-secondary)" }
            }
          >
            全部 <span className="nums">{surveys.length}</span>
          </button>
          {creators.map(([key, { label, count }]) => (
            <button
              key={key}
              onClick={() => setCreatorFilter(key)}
              className="flex-shrink-0 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-all"
              style={
                creatorFilter === key
                  ? { background: "var(--primary)", color: "#faf9f5" }
                  : { background: "var(--bg-subtle)", color: "var(--text-secondary)" }
              }
            >
              {label} <span className="nums">{count}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse" style={{ height: 56 }} />
          ))}
        </div>
      ) : surveys.length === 0 ? (
        <div className="card py-20 text-center" style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border)" }}>
          <p className="mb-2 text-5xl">&#128221;</p>
          <p className="mb-1 text-lg font-medium" style={{ color: "var(--text-primary)" }}>
            还没有问卷
          </p>
          <p className="mb-5 text-sm" style={{ color: "var(--text-secondary)" }}>
            创建你的第一份问卷，生成二维码，开始收集数据
          </p>
          <Link href="/admin/surveys/new" className="btn-primary">
            创建第一个问卷
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((s, i) => (
            <div
              key={s.id}
              className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in"
              style={{ padding: "1rem 1.25rem" }}
            >
              <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                <div className="nums flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/admin/surveys/${s.id}`}
                    className="block truncate font-medium transition-colors hover:underline"
                    style={{ color: "var(--text-primary)", textUnderlineOffset: "3px" }}
                  >
                    {s.title}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2 sm:gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span className="nums">{s.question_count} 题</span>
                    <span>·</span>
                    <span className="nums">{s.response_count} 条回答</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{new Date(s.created_at).toLocaleDateString("zh-CN")}</span>
                    {isSuper && (
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[11px]"
                        style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
                      >
                        {s.creator_name ?? "未归属"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* 操作按钮：大屏横排，小屏自适应 */}
              <div className="flex flex-shrink-0 items-center gap-1 ml-0 sm:ml-auto">
                <Link href={`/admin/surveys/${s.id}`} className="btn-ghost text-xs px-2 sm:px-4">数据</Link>
                <Link href={`/admin/surveys/${s.id}/qrcode`} className="btn-ghost text-xs px-2 sm:px-4" style={{ color: "var(--accent-green)" }}>二维码</Link>
                <Link href={`/admin/surveys/${s.id}/edit`} className="btn-ghost text-xs px-2 sm:px-4">编辑</Link>
                <button onClick={() => handleDelete(s.id)} className="btn-danger text-xs px-2 sm:px-4">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}