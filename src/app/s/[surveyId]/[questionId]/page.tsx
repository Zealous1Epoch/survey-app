"use client";

import { useEffect, useState, use } from "react";
import QuestionForm from "@/components/question-form";

interface QuestionData {
  id: string;
  type: string;
  title: string;
  options: string[];
  required: boolean;
  redirect_url: string;
}

export default function AnswerPage({
  params,
}: {
  params: Promise<{ surveyId: string; questionId: string }>;
}) {
  const { surveyId, questionId } = use(params);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/s/${surveyId}/${questionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setQuestion(data);
        }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [surveyId, questionId]);

  const handleSubmit = async (
    value: string
  ): Promise<{ success: boolean; redirect_url?: string; error?: string }> => {
    const res = await fetch(`/api/s/${surveyId}/${questionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    return res.json();
  };

  return (
    <div
      className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-6"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Top decorative line */}
      <div className="mb-8 h-1 w-12 rounded-full" style={{ background: "var(--accent)" }} />

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div
              className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2"
              style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
            />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>加载中...</p>
          </div>
        </div>
      ) : error || !question ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="mb-2 text-lg font-medium" style={{ color: "var(--accent)" }}>
            {error || "题目不存在"}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            请确认二维码是否正确
          </p>
        </div>
      ) : (
        <div className="flex-1">
          <QuestionForm
            question={question}
            surveyId={surveyId}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {/* Bottom brand */}
      <div className="mt-auto pt-12 pb-4 text-center">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          由MuGuang提供支持
        </p>
      </div>
    </div>
  );
}
