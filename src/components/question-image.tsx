"use client";

import Image from "next/image";

interface Props {
  src: string;
  alt: string;
  onClick?: () => void;
}

/** 题目配图：站内 /uploads 图走 next/image 自动优化，外部 URL 直接渲染 */
export default function QuestionImage({ src, alt, onClick }: Props) {
  const isLocal = src.startsWith("/");

  if (isLocal) {
    return (
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={630}
        sizes="(max-width: 672px) 100vw, 672px"
        onClick={onClick}
        style={{
          width: "100%",
          maxHeight: "40vh",
          height: "auto",
          objectFit: "cover",
          borderRadius: "var(--radius-sm)",
          cursor: onClick ? "pointer" : "default",
          border: "1px solid var(--border)",
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      loading="lazy"
      decoding="async"
      style={{
        width: "100%",
        maxHeight: "40vh",
        objectFit: "cover",
        borderRadius: "var(--radius-sm)",
        cursor: onClick ? "pointer" : "default",
        border: "1px solid var(--border)",
      }}
    />
  );
}
