"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // 用 cookie 里的 token 真实请求一次接口，确认密钥有效
    const token = getCookie("admin_token");
    if (!token) {
      setAuthed(false);
      return;
    }
    fetch("/api/admin/surveys", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => setAuthed(r.status === 401 ? false : true))
      .catch(() => setAuthed(true)); // 网络异常时不误踢，交给各页面自己报错
  }, []);

  const handleLogin = async () => {
    const token = tokenInput.trim();
    if (!token) {
      setError("请输入访问密钥");
      return;
    }
    // 先真实校验密钥，避免错误密钥进入"假登录"状态
    setChecking(true);
    try {
      const res = await fetch("/api/admin/surveys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setError("访问密钥不正确");
        return;
      }
    } catch {
      setError("网络错误，请重试");
      return;
    } finally {
      setChecking(false);
    }
    document.cookie = `admin_token=${encodeURIComponent(token)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    setAuthed(true);
    setError("");
  };

  // 加载中
  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>加载中...</p>
      </div>
    );
  }

  // 未登录，显示登录表单
  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5" style={{ background: "var(--bg-primary)" }}>
        <div className="card" style={{ maxWidth: 400, width: "100%" }}>
          <h1 className="mb-2 text-xl font-bold" style={{ color: "var(--text-primary)" }}>问卷管理后台</h1>
          <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>请输入访问密钥以继续</p>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => { setTokenInput(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
            placeholder="访问密钥"
            className="input-field mb-3 w-full"
            autoFocus
          />
          {error && (
            <p className="mb-3 text-sm" style={{ color: "var(--accent)" }}>{error}</p>
          )}
          <button onClick={handleLogin} disabled={checking} className="btn-primary w-full py-2.5">
            {checking ? "验证中..." : "登录"}
          </button>
        </div>
      </div>
    );
  }

  // 已登录，正常渲染
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md" style={{ borderColor: "var(--border-light)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link
            href="/admin"
            className="text-lg font-semibold tracking-tight"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
          >
            <span style={{ color: "var(--accent)" }}></span> 问卷管理
          </Link>
          <button
            onClick={() => {
              document.cookie = "admin_token=; path=/; max-age=0";
              setAuthed(false);
            }}
            className="text-sm transition-colors hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            退出
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
