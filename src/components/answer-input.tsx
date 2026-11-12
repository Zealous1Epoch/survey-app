"use client";

type OptionItem = { label: string; limit?: number };

/** 从选项数组中安全提取 label（兼容历史 string 选项与对象选项） */
function getOptionLabel(opt: string | OptionItem): string {
  if (typeof opt === "string") return opt;
  return opt.label ?? "";
}

interface NumberConfig {
  min?: number;
  max?: number;
}

interface QuestionData {
  id: string;
  type: string;
  title: string;
  options: (string | OptionItem)[] | NumberConfig;
  required: boolean;
}

interface Props {
  question: QuestionData;
  value: string;
  onChange: (v: string) => void;
}

export default function AnswerInput({ question, value, onChange }: Props) {
  const t = question.type;
  // 防御性检查：确保 options 是数组（number 题借 options 存范围对象）
  const options: (string | OptionItem)[] = Array.isArray(question.options) ? question.options : [];

  if (t === "choice") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {options.map((rawOpt, i) => {
          const label = getOptionLabel(rawOpt);
          const selected = value === label;
          return (
            <div
              key={i}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "1rem 1.25rem",
                border: selected ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                background: selected ? "var(--primary-light)" : "var(--bg-card)",
                fontWeight: 500,
                fontSize: 15,
                transition: "border-color var(--motion-base) var(--ease-standard), background var(--motion-base) var(--ease-standard)",
              }}
              onClick={() => onChange(label)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(label); }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.borderColor = "var(--primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
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
                {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--bg-card)" }} />}
              </div>
              <span style={{ flex: 1 }}>{label}</span>
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
                background: checked ? "var(--accent-green-light)" : "var(--bg-card)",
                fontWeight: 500,
                fontSize: 15,
                transition: "border-color var(--motion-base) var(--ease-standard), background var(--motion-base) var(--ease-standard)",
              }}
              onClick={toggle}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(); }}
              onMouseEnter={(e) => {
                if (!checked) {
                  e.currentTarget.style.borderColor = "var(--accent-green)";
                }
              }}
              onMouseLeave={(e) => {
                if (!checked) {
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
                    <path d="M2.5 6l2.5 2.5 4.5-5" stroke="#faf9f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                  background: active ? "var(--primary)" : "var(--bg-card)",
                  color: active ? "var(--bg-card)" : "var(--text-primary)",
                  fontSize: 18, fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "border-color var(--motion-base) var(--ease-standard), background var(--motion-base) var(--ease-standard)",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = "var(--primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = "var(--border)";
                  }
                }}
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

  if (t === "dropdown") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-field"
        style={{ width: "100%", fontSize: 15, padding: "0.9rem 1rem" }}
      >
        <option value="" disabled>
          请选择
        </option>
        {options.map((rawOpt, i) => {
          const label = getOptionLabel(rawOpt);
          return (
            <option key={i} value={label}>
              {label}
            </option>
          );
        })}
      </select>
    );
  }

  if (t === "nps") {
    const n = value === "" ? null : Number(value);
    return (
      <div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          {Array.from({ length: 11 }, (_, i) => {
            const active = n === i;
            return (
              <button
                key={i}
                type="button"
                aria-label={`${i} 分`}
                onClick={() => onChange(String(i))}
                style={{
                  minWidth: 44,
                  height: 44,
                  padding: "0 6px",
                  borderRadius: "var(--radius-sm)",
                  border: active ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                  background: active ? "var(--primary)" : "var(--bg-card)",
                  color: active ? "var(--bg-card)" : "var(--text-primary)",
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "border-color var(--motion-base) var(--ease-standard), background var(--motion-base) var(--ease-standard)",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--primary)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {i}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
          <span>肯定不会推荐</span>
          <span>肯定推荐</span>
        </div>
      </div>
    );
  }

  if (t === "yesno") {
    return (
      <div style={{ display: "flex", gap: 12 }}>
        {["是", "否"].map((label) => {
          const selected = value === label;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(label)}
              style={{
                flex: 1,
                padding: "1.1rem 0",
                borderRadius: "var(--radius-sm)",
                border: selected ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                background: selected ? "var(--primary-light)" : "var(--bg-card)",
                color: selected ? "var(--primary)" : "var(--text-primary)",
                fontSize: 17,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "border-color var(--motion-base) var(--ease-standard), background var(--motion-base) var(--ease-standard)",
              }}
              onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = "var(--primary)"; }}
              onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  if (t === "date") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
        style={{ fontSize: 16, padding: "0.9rem 1rem", maxWidth: 280 }}
      />
    );
  }

  if (t === "number") {
    const cfg: NumberConfig = Array.isArray(question.options) ? {} : (question.options ?? {});
    return (
      <div>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          min={cfg.min}
          max={cfg.max}
          onChange={(e) => onChange(e.target.value)}
          className="input-field"
          style={{ fontSize: 16, padding: "0.9rem 1rem", maxWidth: 280 }}
        />
        {(cfg.min !== undefined || cfg.max !== undefined) && (
          <p style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
            {cfg.min ?? "-∞"} ~ {cfg.max ?? "+∞"}
          </p>
        )}
      </div>
    );
  }

  return null;
}
