"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const redirect = searchParams.get("redirect") ?? "/admin";
      window.location.href = redirect;
    } else {
      const data = await res.json();
      setError(data.error ?? "登录失败");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            问卷管理
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            请输入用户名和密码
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            placeholder="用户名"
            className="input-field"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="密码"
            className="input-field"
          />
          {error && (
            <div className="rounded-md px-4 py-3 text-sm animate-in" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "验证中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-sm" style={{ color: "var(--text-secondary)" }}>加载中...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
