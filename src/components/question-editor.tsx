"use client";

import type { QuestionType, QuestionData } from "@/lib/db/questions";
import { useRef } from "react";

interface Props {
  questions: QuestionData[];
  onChange: (questions: QuestionData[]) => void;
}

const typeLabels: Record<QuestionType, string> = {
  choice: "单选",
  multi: "多选",
  text: "填空",
  rating: "评分",
};

export default function QuestionEditor({ questions, onChange }: Props) {
  const fileRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const add = () => {
    onChange([
      ...questions,
      { type: "choice", title: "", options: [""], required: true },
    ]);
  };

  const remove = (i: number) => {
    onChange(questions.filter((_, idx) => idx !== i));
  };

  const update = (i: number, data: Partial<QuestionData>) => {
    const updated = questions.map((q, idx) =>
      idx === i ? { ...q, ...data } : q
    );
    onChange(updated);
  };

  const addOption = (qi: number) => {
    const q = questions[qi];
    update(qi, { options: [...(q.options ?? []), ""] });
  };

  const updateOption = (qi: number, oi: number, val: string) => {
    const opts = [...(questions[qi].options ?? [])];
    opts[oi] = val;
    update(qi, { options: opts });
  };

  const removeOption = (qi: number, oi: number) => {
    const opts = questions[qi].options?.filter((_, idx) => idx !== oi) ?? [];
    update(qi, { options: opts });
  };

  const typeChange = (qi: number, type: QuestionType) => {
    const defaults: Partial<QuestionData> = { type };
    defaults.options = type === "choice" || type === "multi" ? [""] : [];
    update(qi, defaults);
  };

  const handleImageUpload = async (qi: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/survey-admin/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.url) update(qi, { image_url: data.url });
  };

  const removeImage = (qi: number) => {
    update(qi, { image_url: "" });
  };

  const setFileRef = (qi: number, el: HTMLInputElement | null) => {
    if (el) fileRefs.current.set(qi, el);
    else fileRefs.current.delete(qi);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>
          题目列表
        </h3>
        <button type="button" onClick={add} className="btn-primary text-sm">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-1">
            <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          添加题目
        </button>
      </div>

      {questions.length === 0 && (
        <div className="rounded-lg py-12 text-center" style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            还没有题目，点击上方按钮添加
          </p>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, qi) => (
          <div
            key={qi}
            className="rounded-lg border p-3 sm:p-4 animate-in"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-card)",
              animationDelay: `${qi * 0.03}s`,
            }}
          >
            {/* Row 1: index + type + required + delete — 小屏堆叠 */}
            <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <span
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
              >
                {qi + 1}
              </span>
              <select
                value={q.type}
                onChange={(e) => typeChange(qi, e.target.value as QuestionType)}
                className="select-field text-sm"
              >
                {Object.entries(typeLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={q.required !== false}
                  onChange={(e) => update(qi, { required: e.target.checked })}
                  className="h-3.5 w-3.5 rounded accent-current"
                />
                必填
              </label>
              <button
                type="button"
                onClick={() => remove(qi)}
                className="btn-danger ml-auto text-xs"
              >
                删除
              </button>
            </div>

            {/* Title */}
            <input
              type="text"
              value={q.title}
              onChange={(e) => update(qi, { title: e.target.value })}
              placeholder="输入题目内容..."
              className="input-field mb-3"
            />

            {/* Options for choice/multi */}
            {(q.type === "choice" || q.type === "multi") && (
              <div className="mb-3 space-y-2">
                {(q.options ?? []).map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium"
                      style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}
                    >
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                      placeholder={`选项 ${oi + 1}`}
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(qi, oi)}
                      className="flex-shrink-0 rounded p-1 text-xs transition-colors hover:bg-red-50 hover:text-red-500"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(qi)}
                  className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  添加选项
                </button>
              </div>
            )}

            {/* Image section — 小屏堆叠 */}
            <div className="mb-3">
              {q.image_url ? (
                <div className="relative inline-block">
                  <img
                    src={q.image_url}
                    alt="题目图片预览"
                    className="h-20 rounded border object-cover"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(qi)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileRefs.current.get(qi)?.click()}
                      className="btn-ghost text-xs"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-1">
                        <rect x="2" y="3" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                        <circle cx="5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1"/>
                        <path d="M12 9l-3-3-2 2-1-1-4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      添加图片
                    </button>
                    <span className="text-xs hidden sm:inline" style={{ color: "var(--text-muted)" }}>或</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => setFileRef(qi, el)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(qi, file);
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) update(qi, { image_url: e.target.value });
                    }}
                    placeholder="粘贴图片 URL"
                    className="input-field flex-1 text-xs"
                    style={{ padding: "0.4rem 0.5rem" }}
                  />
                </div>
              )}
            </div>

            {/* Redirect URL */}
            <input
              type="text"
              value={q.redirect_url ?? ""}
              onChange={(e) => update(qi, { redirect_url: e.target.value })}
              placeholder="提交后跳转地址（可选，留空使用问卷默认）"
              className="input-field text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
}