export default function DonePage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-5"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "var(--accent-green-light)" }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M7 14l5 5 9-9"
            stroke="var(--accent-green)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="mb-2 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
        提交成功
      </h2>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        感谢你的回答
      </p>
    </div>
  );
}
