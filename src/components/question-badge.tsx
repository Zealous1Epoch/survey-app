const badgeMap: Record<string, string> = {
  choice: "单选",
  multi: "多选",
  text: "填空",
  rating: "评分",
  dropdown: "下拉单选",
  nps: "NPS 推荐度",
  date: "日期",
  number: "数字",
  yesno: "是/否",
};

export default function QuestionBadge({ type }: { type: string }) {
  return <span className="badge">{badgeMap[type] ?? type}</span>;
}
