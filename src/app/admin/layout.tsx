import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
