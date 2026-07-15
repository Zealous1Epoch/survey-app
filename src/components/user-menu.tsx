"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Skip auth check on public pages
  const isPublicPage = pathname === "/admin/login" || pathname === "/admin/register";

  useEffect(() => {
    if (isPublicPage) {
      setLoading(false);
      return;
    }

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setUsername(data.username);
        else router.replace("/admin/login");
      })
      .finally(() => setLoading(false));
  }, [router, isPublicPage]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  if (loading || isPublicPage) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {username}
      </span>
      <button
        onClick={handleLogout}
        className="text-sm transition-colors hover:text-red-500"
        style={{ color: "var(--text-muted)" }}
      >
        退出
      </button>
    </div>
  );
}
