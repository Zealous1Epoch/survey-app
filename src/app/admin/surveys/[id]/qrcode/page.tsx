"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCodeCard from "@/components/qrcode-card";

export default function QRCodePage() {
  const { id } = useParams<{ id: string }>();
  const [surveyTitle, setSurveyTitle] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [urlLocked, setUrlLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("survey_base_url");
    if (saved) {
      setCustomUrl(saved);
      setBaseUrl(saved);
      setUrlLocked(true);
    } else {
      setCustomUrl(window.location.origin);
      setBaseUrl(window.location.origin);
    }

    fetch(`/api/survey-admin/surveys/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSurveyTitle(data.title);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const lockUrl = () => {
    const trimmed = customUrl.replace(/\/+$/, "");
    setBaseUrl(trimmed);
    setCustomUrl(trimmed);
    setUrlLocked(true);
    localStorage.setItem("survey_base_url", trimmed);
  };

  const unlockUrl = () => {
    setUrlLocked(false);
    setCustomUrl(window.location.origin);
    setBaseUrl(window.location.origin);
    localStorage.removeItem("survey_base_url");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card animate-pulse" style={{ height: 80 }} />
        <div className="card animate-pulse mx-auto max-w-sm" style={{ height: 360 }} />
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <a
          href={`/admin/surveys/${id}`}
          className="inline-flex items-center gap-1 text-sm transition-colors hover:underline"
          style={{ color: "var(--text-secondary)", textUnderlineOffset: "3px" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回数据
        </a>
        <h1 className="mt-2 text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          问卷二维码
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {surveyTitle} — 扫码后逐题作答
        </p>
      </div>

      {/* URL lock bar */}
      <div className="card mb-8">
        <label className="mb-2 block text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
          公网访问地址
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customUrl}
            onChange={(e) => {
              setCustomUrl(e.target.value);
              if (!urlLocked) setBaseUrl(e.target.value);
            }}
            disabled={urlLocked}
            className="input-field disabled:opacity-60"
            style={urlLocked ? { background: "var(--bg-subtle)" } : {}}
            placeholder="https://your-domain.com"
          />
          {!urlLocked ? (
            <button onClick={lockUrl} className="btn-primary flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-1">
                <rect x="3" y="6" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M5 6V4.5a2 2 0 114 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              锁定
            </button>
          ) : (
            <button onClick={unlockUrl} className="btn-secondary flex-shrink-0">
              修改
            </button>
          )}
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          {urlLocked ? "地址已锁定，二维码指向固定 URL" : "输入扫码者实际访问的公网地址，然后锁定"}
        </p>
      </div>

      {/* Single QR for the whole survey */}
      <div className="mx-auto max-w-sm">
        <QRCodeCard url={`${baseUrl}/survey/s/${id}`} title={surveyTitle} />
      </div>
    </div>
  );
}
