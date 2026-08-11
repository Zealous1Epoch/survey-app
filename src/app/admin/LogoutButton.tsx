"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="text-xs px-3 py-1.5 rounded-md transition-colors hover:bg-red-50 hover:text-red-600"
      style={{ color: "var(--text-secondary)" }}
    >
      退出
    </button>
  );
}