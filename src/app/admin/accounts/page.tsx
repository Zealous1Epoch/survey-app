"use client";

import { useEffect, useState, useCallback } from "react";
import type { SafeUser } from "@/lib/db/users";

export default function AccountsPage() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 新建表单
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [creating, setCreating] = useState(false);

  // 修改密码表单
  const [editId, setEditId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editing, setEditing] = useState(false);

  const fetchUsers = useCallback(() => {
    fetch("/api/survey-admin/accounts")
      .then((r) => {
        if (r.status === 403) throw new Error("无权限");
        return r.json();
      })
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;
    setCreating(true);
    setError("");

    const res = await fetch("/api/survey-admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
    });

    if (res.ok) {
      setNewUsername("");
      setNewPassword("");
      setNewRole("admin");
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error ?? "创建失败");
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此账号？该账号的问卷将转移给超级管理员。")) return;
    const res = await fetch("/api/survey-admin/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error ?? "删除失败");
    }
  };

  const handleChangePassword = async (id: string) => {
    if (!editPassword.trim() || editPassword.length < 4) {
      setError("密码至少 4 位");
      return;
    }
    setEditing(true);
    setError("");

    const res = await fetch(`/api/survey-admin/accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: editPassword }),
    });

    if (res.ok) {
      setEditId(null);
      setEditPassword("");
    } else {
      const data = await res.json();
      setError(data.error ?? "修改失败");
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div>
        <h1 className="mb-8 text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>账号管理</h1>
        <div className="card animate-pulse" style={{ height: 200 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="mb-8 text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>账号管理</h1>
        <div className="card py-16 text-center">
          <p className="text-lg" style={{ color: "var(--accent)" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>账号管理</h1>

      {/* 创建新账号 */}
      <div className="card mb-6" style={{ padding: "1.25rem" }}>
        <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>新建账号</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[120px]">
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>用户名</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="input-field"
              placeholder="用户名"
              required
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              placeholder="至少 4 位"
              required
            />
          </div>
          <div className="min-w-[100px]">
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>角色</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="input-field"
            >
              <option value="admin">管理员</option>
              <option value="super_admin">超级管理员</option>
            </select>
          </div>
          <button type="submit" disabled={creating} className="btn-primary text-sm px-5">
            {creating ? "创建中..." : "创建"}
          </button>
        </form>
      </div>

      {/* 用户列表 */}
      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            style={{ padding: "1rem 1.25rem" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
                {u.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                    {u.username}
                  </span>
                  {u.role === "super_admin" && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                      超管
                    </span>
                  )}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {new Date(u.created_at).toLocaleDateString("zh-CN")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editId === u.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="input-field text-xs w-28"
                    placeholder="新密码"
                    autoFocus
                  />
                  <button onClick={() => handleChangePassword(u.id)} disabled={editing} className="btn-primary text-xs px-2 py-1">
                    确认
                  </button>
                  <button onClick={() => { setEditId(null); setEditPassword(""); }} className="btn-ghost text-xs px-2 py-1">
                    取消
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={() => setEditId(u.id)} className="btn-ghost text-xs px-2 sm:px-3">改密</button>
                  <button onClick={() => handleDelete(u.id)} className="btn-danger text-xs px-2 sm:px-3">删除</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}