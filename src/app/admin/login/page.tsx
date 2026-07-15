"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
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

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    if (res.ok) {
      const redirect = searchParams.get("redirect") ?? "/admin";
      router.replace(redirect);
    } else {
      const data = await res.json();
      setError(data.error ?? "登录失败");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
        {/* Logo & Title */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "var(--primary-light)" }}
          >
            <ClipboardList size={28} style={{ color: "var(--primary)" }} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              问卷月
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              登录你的账号
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4" style={{ padding: "2.5rem 2rem", background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "var(--shadow-md)" }}>
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            placeholder="用户名"
            className="input-field"
            autoFocus
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="密码"
            className="input-field"
            autoComplete="current-password"
          />
          {error && (
            <div className="rounded-md px-4 py-3 text-sm animate-in" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full" style={{ minHeight: 48 }}>
            {loading ? "登录中..." : "登录"}
          </button>
          <div className="pt-2 text-center">
            <Link href="/admin/register" className="text-sm transition-colors hover:underline" style={{ color: "var(--text-secondary)" }}>
              没有账号？注册
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
