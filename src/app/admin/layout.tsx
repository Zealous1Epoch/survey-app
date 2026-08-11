"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/app/admin/LogoutButton";

interface UserInfo {
  userId: string;
  username: string;
  role: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 登录页不渲染 layout 的 header 和 main 容器
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navColor = "#2D5A8A";

  return (
    <div className="min-h-screen">
      <nav className={`navbar${scrolled ? " scrolled" : ""}`}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-lg font-semibold tracking-tight"
              style={{ color: navColor, letterSpacing: "-0.01em" }}
            >
              问卷月
            </Link>
            {user?.role === "super_admin" && (
              <Link
                href="/admin/accounts"
                className="text-sm transition-colors hover:underline"
                style={{ color: navColor, opacity: 0.75, textUnderlineOffset: "3px" }}
              >
                账号管理
              </Link>
            )}
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: navColor, opacity: 0.65 }}>
                {user.username}
                {user.role === "super_admin" && (
                  <span className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                    超管
                  </span>
                )}
              </span>
              <LogoutButton />
            </div>
          )}
        </div>
      </nav>
      <main style={{ paddingTop: "var(--nav-height)" }}>
        <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
      </main>
    </div>
  );
}
