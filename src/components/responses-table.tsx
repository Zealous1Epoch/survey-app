"use client";

import { ResponseRow } from "@/lib/db/responses";

interface Props {
  data: ResponseRow[];
  loading: boolean;
}

export default function ResponsesTable({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="px-6 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        加载中...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-4xl mb-3">&#128203;</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          暂无回答数据
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
            <th className="px-6 py-3 text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
              答案
            </th>
            <th className="px-6 py-3 text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
              提交时间
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id}
              className="animate-in"
              style={{
                borderBottom: "1px solid var(--border-light)",
                animationDelay: `${i * 0.02}s`,
              }}
            >
              <td className="px-6 py-3.5 font-medium">{row.value}</td>
              <td className="px-6 py-3.5" style={{ color: "var(--text-secondary)" }}>
                {new Date(row.submitted_at).toLocaleString("zh-CN", {
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
  );
}
