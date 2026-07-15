"use client";

import type { QuestionType, QuestionData } from "@/lib/db/questions";
import { useRef } from "react";
import { Plus, X, ImageIcon, ImagePlus } from "lucide-react";

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

  const newQuestion = () => ({ type: "choice" as QuestionType, title: "", options: [""], required: true });

  const add = () => {
    onChange([...questions, newQuestion()]);
  };

  const insertAbove = (i: number) => {
    const updated = [...questions];
    updated.splice(i, 0, newQuestion());
    onChange(updated);
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
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
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
      <div className="mb-4 sm:mb-5 flex items-center justify-between gap-3">
        <h3 className="text-xs sm:text-sm font-semibold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>
          题目列表
        </h3>
        <button type="button" onClick={add} className="btn-primary text-sm py-2 px-3">
          <Plus size={14} className="mr-1" />
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
            {/* Insert button above */}
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => insertAbove(qi)}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: "var(--accent)" }}
              >
                <Plus size={13} />
                此处插入
              </button>
              <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            {/* Row 1: index + type + required + delete */}
            <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
              >
                {qi + 1}
              </span>
              <select
                value={q.type}
                onChange={(e) => typeChange(qi, e.target.value as QuestionType)}
                className="select-field text-sm py-1.5"
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
                  className="h-4 w-4 rounded accent-current"
                />
                必填
              </label>
              <button
                type="button"
                onClick={() => remove(qi)}
                className="btn-danger text-xs py-1.5 px-3 ml-auto flex items-center gap-1"
              >
                <X size={12} />
                删除
              </button>
            </div>

            {/* Title */}
            <input
              type="text"
              value={q.title}
              onChange={(e) => update(qi, { title: e.target.value })}
              placeholder="输入题目内容..."
              className="input-field mb-3 text-base"
            />

            {/* Options for choice/multi */}
            {(q.type === "choice" || q.type === "multi") && (
              <div className="mb-3 space-y-2">
                {(q.options ?? []).map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium"
                      style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}
                    >
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                      placeholder={`选项 ${oi + 1}`}
                      className="input-field flex-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(qi, oi)}
                      className="flex-shrink-0 rounded p-2 text-xs transition-colors hover:bg-red-50 hover:text-red-500"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(qi)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  <Plus size={13} />
                  添加选项
                </button>
              </div>
            )}

            {/* Image section */}
            <div className="mb-3">
              {q.image_url ? (
                <div className="relative inline-block">
                  <img
                    src={q.image_url}
                    alt="题目图片预览"
                    className="h-24 sm:h-20 rounded border object-cover"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(qi)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRefs.current.get(qi)?.click()}
                    className="btn-ghost text-xs py-2 px-3"
                  >
                    <ImagePlus size={14} className="mr-1" />
                    上传图片
                  </button>
                  <span className="text-xs hidden sm:inline" style={{ color: "var(--text-muted)" }}>或</span>
                  <input
                    type="text"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) update(qi, { image_url: e.target.value });
                    }}
                    placeholder="粘贴图片 URL"
                    className="input-field flex-1 text-sm py-2"
                  />
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
              )}
            </div>

            {/* Redirect URL */}
            <input
              type="text"
              value={q.redirect_url ?? ""}
              onChange={(e) => update(qi, { redirect_url: e.target.value })}
              placeholder="提交后跳转地址（可选）"
              className="input-field text-sm py-2"
            />
          </div>
        ))}

        {/* Insert after last question */}
        {questions.length > 0 && (
          <div className="flex items-center gap-2 py-2">
            <button
              type="button"
              onClick={() => insertAbove(questions.length)}
              className="flex items-center gap-1 mx-auto text-xs transition-colors"
              style={{ color: "var(--accent)" }}
            >
              <Plus size={13} />
              在末尾添加题目
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
