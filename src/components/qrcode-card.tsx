"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface Props {
  url: string;
  title: string;
}

export default function QRCodeCard({ url, title }: Props) {
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: "#2C2416", light: "#FFFFFF" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [url]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qrcode-${title.slice(0, 12)}.png`;
    a.click();
  };

  const handleCopy = async () => {
    try {
      // 优先使用 Clipboard API（需 HTTPS）
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // 降级方案：textarea + execCommand（兼容 HTTP）
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 静默失败
    }
  };

  return (
    <div
      className="card flex flex-col items-center text-center"
      style={{ padding: "1.75rem 1.5rem" }}
    >
      <p className="mb-4 line-clamp-2 text-sm font-medium" style={{ minHeight: "2.5rem" }}>
        {title}
      </p>

      <div
        className="mb-4 flex items-center justify-center rounded-lg p-3"
        style={{ background: "var(--bg-subtle)" }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR: ${title}`}
            className="h-[200px] w-[200px]"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className="h-[200px] w-[200px] animate-pulse rounded" style={{ background: "var(--border)" }} />
        )}
      </div>

      <div className="mb-4 flex w-full items-center gap-1 rounded-md px-3 py-2 text-xs truncate" style={{ background: "var(--bg-subtle)" }}>
        <code className="truncate" style={{ color: "var(--text-secondary)" }}>{url}</code>
      </div>

      <div className="flex w-full gap-2">
        <button
          onClick={handleCopy}
          className="btn-secondary flex-1 text-xs"
          style={{ padding: "0.5rem 0.75rem" }}
        >
          {copied ? "已复制" : "复制链接"}
        </button>
        <button
          onClick={handleDownload}
          className="btn-primary flex-1 text-xs"
          style={{ padding: "0.5rem 0.75rem" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mr-1">
            <path d="M6 1.5v6M3.5 5L6 7.5 8.5 5M1.5 8.5v1a.5.5 0 00.5.5h8a.5.5 0 00.5-.5v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          下载
        </button>
      </div>
    </div>
  );
}
