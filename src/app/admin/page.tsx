"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
            Surveys
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
            问卷列表
          </h1>
        </div>
        <Link href="/admin/surveys/new" className="btn-primary text-sm py-2 px-4 self-start sm:self-auto">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-1.5">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          创建问卷
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse" style={{ height: 56 }} />
          ))}
        </div>
      ) : surveys.length === 0 ? (
        <div className="card py-16 text-center" style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border)" }}>
          <FileText size={48} strokeWidth={1} className="mb-4" style={{ color: "var(--text-muted)" }} />
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
              className={`card animate-in animate-in-delay-${i + 1}`}
              style={{ padding: "1rem" }}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/surveys/${s.id}`}
                    className="block truncate font-medium transition-colors hover:underline"
                    style={{ color: "var(--text-primary)", textUnderlineOffset: "3px" }}
                  >
                    {s.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{s.question_count} 题</span>
                    <span>·</span>
                    <span>{s.response_count} 条回答</span>
                    <span>·</span>
                    <span>{new Date(s.created_at).toLocaleDateString("zh-CN")}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1" style={{ marginLeft: "calc(2rem + 0.75rem)" }}>
                <Link href={`/admin/surveys/${s.id}`} className="btn-ghost text-xs py-1 px-2">数据</Link>
                <Link href={`/admin/surveys/${s.id}/qrcode`} className="btn-ghost text-xs py-1 px-2" style={{ color: "var(--accent-green)" }}>二维码</Link>
                <Link href={`/admin/surveys/${s.id}/edit`} className="btn-ghost text-xs py-1 px-2">编辑</Link>
                <button onClick={() => handleDelete(s.id)} className="btn-danger text-xs py-1 px-2">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
