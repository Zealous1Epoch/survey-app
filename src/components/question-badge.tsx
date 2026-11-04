const badgeMap: Record<string, { text: string; color: string }> = {
  choice: { text: "单选", color: "var(--accent)" },
  multi: { text: "多选", color: "#7D9B8F" },
  text: { text: "填空", color: "#8B7E6A" },
  rating: { text: "评分", color: "#C8A45A" },
  limited_choice: { text: "限量单选", color: "var(--accent)" },
};

export default function QuestionBadge({ type }: { type: string }) {
  const b = badgeMap[type] ?? { text: type, color: "var(--text-muted)" };
  return <span className="badge">{b.text}</span>;
}