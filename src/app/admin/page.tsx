"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SurveyWithCounts } from "@/lib/db/surveys";

export default function AdminPage() {
  const [surveys, setSurveys] = useState<SurveyWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSurveys = () => {
    fetch("/api/admin/surveys")
      .then((r) => r.json())
      .then(setSurveys)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此问卷？所有题目和回答数据将被删除。")) return;
    await fetch(`/api/admin/surveys/${id}`, { method: "DELETE" });
    fetchSurveys();
  };

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
            Surveys
          </p>
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
          {surveys.map((s, i) => (
            <div
              key={s.id}
              className={`card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in animate-in-delay-${i + 1}`}
              style={{ padding: "1rem 1.25rem" }}
            >
              <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
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
                    <span>{s.question_count} 题</span>
                    <span>·</span>
                    <span>{s.response_count} 条回答</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{new Date(s.created_at).toLocaleDateString("zh-CN")}</span>
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