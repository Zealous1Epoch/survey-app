"use client";

type OptionItem = { label: string; limit: number; remaining?: number };

/** 从选项数组中安全提取 label */
function getOptionLabel(opt: string | OptionItem): string {
  if (typeof opt === "string") return opt;
  return opt.label ?? "";
}

interface QuestionData {
  id: string;
  type: string;
  title: string;
  options: (string | OptionItem)[];
  required: boolean;
  redirect_url: string;
}

interface Props {
  question: QuestionData;
  value: string;
  onChange: (v: string) => void;
}

export default function AnswerInput({ question, value, onChange }: Props) {
  const t = question.type;
  // 防御性检查：确保 options 是数组
  const options = Array.isArray(question.options) ? question.options : [];

  if (t === "choice" || t === "limited_choice") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {options.map((rawOpt, i) => {
          const label = getOptionLabel(rawOpt);
          const optData = typeof rawOpt === "object" ? rawOpt as OptionItem : null;
          const isFull = optData && optData.limit > 0 && (optData.remaining ?? Infinity) <= 0;
          const selected = value === label;
          return (
            <div
              key={i}
              role="radio"
              aria-checked={selected}
              tabIndex={isFull ? -1 : 0}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "1rem 1.25rem",
                border: selected ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                cursor: isFull ? "not-allowed" : "pointer",
                background: selected ? "var(--primary-light)" : "rgba(255,255,255,0.3)",
                fontWeight: 500,
                fontSize: 15,
                opacity: isFull ? 0.5 : 1,
                transition: "all 0.3s ease-out",
              }}
              onClick={() => { if (!isFull) onChange(label); }}
              onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isFull) onChange(label); }}
              onMouseEnter={(e) => {
                if (!selected && !isFull) {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                  e.currentTarget.style.borderColor = "var(--primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!selected && !isFull) {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.borderColor = "var(--border)";
                }
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                border: selected ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                background: selected ? "var(--primary)" : "transparent",
              }}>
                {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
              </div>
              <span style={{ flex: 1 }}>{label}</span>
              {optData && (
                <span style={{ fontSize: 12, color: isFull ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }}>
                  {isFull ? "已满" : optData.limit > 0 ? `剩余 ${optData.remaining}/${optData.limit}` : "不限量"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (t === "multi") {
    const selected: string[] = JSON.parse(value || "[]");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {options.map((rawOpt, i) => {
          const opt = getOptionLabel(rawOpt);
          const checked = selected.includes(opt);
          const toggle = () => {
            const next = checked ? selected.filter((v) => v !== opt) : [...selected, opt];
            onChange(JSON.stringify(next));
          };
          return (
            <div
              key={i}
              role="checkbox"
              aria-checked={checked}
              tabIndex={0}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "1rem 1.25rem",
                border: checked ? "1.5px solid var(--accent-green)" : "1.5px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                background: checked ? "var(--accent-green-light)" : "rgba(255,255,255,0.3)",
                fontWeight: 500,
                fontSize: 15,
                transition: "all 0.3s ease-out",
              }}
              onClick={toggle}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(); }}
              onMouseEnter={(e) => {
                if (!checked) {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                  e.currentTarget.style.borderColor = "var(--accent-green)";
                }
              }}
              onMouseLeave={(e) => {
                if (!checked) {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.borderColor = "var(--border)";
                }
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                border: checked ? "1.5px solid var(--accent-green)" : "1.5px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                background: checked ? "var(--accent-green)" : "transparent",
              }}>
                {checked && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span>{opt}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (t === "text") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="请输入你的回答..."
        rows={4}
        className="textarea-field"
        style={{ minHeight: 120 }}
      />
    );
  }

  if (t === "rating") {
    return (
      <div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {[1, 2, 3, 4, 5].map((star) => {
            const active = Number(value) >= star;
            return (
              <button
                key={star}
                type="button"
                aria-label={`${star} 星`}
                onClick={() => onChange(String(star))}
                style={{
                  width: 52, height: 52, borderRadius: "50%",
                  border: active ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                  background: active ? "var(--primary)" : "rgba(255,255,255,0.4)",
                  color: active ? "#fff" : "var(--text-primary)",
                  fontSize: 18, fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.3s ease-out",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                    e.currentTarget.style.borderColor = "var(--primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
              >
                {star}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
          <span>非常不满意</span>
          <span>非常满意</span>
        </div>
      </div>
    );
  }

  return null;
}