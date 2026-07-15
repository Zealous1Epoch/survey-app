"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("用户名不能为空");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("用户名只能包含字母、数字和下划线");
      return;
    }
    if (username.length < 3 || username.length > 20) {
      setError("用户名需要 3-20 个字符");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 个字符");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    if (res.ok) {
      router.replace("/admin/login?registered=1");
    } else {
      const data = await res.json();
      setError(data.error ?? "注册失败");
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
            <UserPlus size={28} style={{ color: "var(--primary)" }} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              创建账号
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              注册后即可创建和管理问卷
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4" style={{ padding: "2.5rem 2rem", background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "var(--shadow-md)" }}>
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            placeholder="用户名（3-20个字符）"
            className="input-field"
            autoFocus
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="密码（至少6个字符）"
            className="input-field"
            autoComplete="new-password"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(""); }}
            placeholder="确认密码"
            className="input-field"
            autoComplete="new-password"
          />
          {error && (
            <div className="rounded-md px-4 py-3 text-sm animate-in" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full" style={{ minHeight: 48 }}>
            {loading ? "注册中..." : "注册"}
          </button>
          <div className="pt-2 text-center">
            <Link href="/admin/login" className="text-sm transition-colors hover:underline" style={{ color: "var(--text-secondary)" }}>
              已有账号？登录
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
