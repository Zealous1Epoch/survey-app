/** 服务端答案校验——答题提交（submit-all）与管理员修改答卷共用同一套规则，
 *  避免两条链路各写一份校验、日后行为漂移 */

export interface AnswerLike {
  questionId: string;
  value: string;
}

export interface QuestionLike {
  id: string;
  type: string;
  title: string;
  /** 库里是 0/1，API 层可能已转 boolean */
  required: unknown;
  /** 库里存 JSON 字符串：选项数组或 number 题的范围对象 */
  options: string;
}

export const MAX_VALUE_LEN = 5000;

/**
 * 按答题链路顺序校验：题目归属 → 长度上限 → 必填 → 空答案过滤 → 题型格式。
 * error 非 null 时为中文错误文案；cleaned 是过滤掉空答案后的落库列表。
 * checkRequired 默认 true；管理员修改答卷时传 false——
 * 修改只保证"填了的合法"，不为历史缺答补做完整性检查。
 */
export function validateAnswers(
  questions: QuestionLike[],
  answers: AnswerLike[],
  opts?: { checkRequired?: boolean }
): { error: string | null; cleaned: AnswerLike[] } {
  const fail = (error: string) => ({ error, cleaned: [] as AnswerLike[] });

  // 答案必须属于该问卷的题目（防止伪造 questionId 写入脏数据）
  const validQuestionIds = new Set(questions.map((q) => q.id));
  if (answers.some((a) => !validQuestionIds.has(a.questionId))) {
    return fail("存在无效的问题 ID");
  }

  // 答案长度上限（TEXT 列 64KB，留足余量）
  for (const a of answers) {
    if (typeof a.value === "string" && a.value.length > MAX_VALUE_LEN) {
      return fail("答案内容过长");
    }
  }

  // 服务端必填校验（不信任前端）
  if (opts?.checkRequired !== false) {
    const answerMap = new Map(answers.map((a) => [a.questionId, a.value ?? ""]));
    for (const q of questions) {
      if (!q.required) continue;
      const raw = answerMap.get(q.id) ?? "";
      let empty = raw === "";
      if (!empty && q.type === "multi") {
        try { const arr = JSON.parse(raw); empty = !Array.isArray(arr) || arr.length === 0; } catch { empty = true; }
      }
      if (!empty && q.type === "rating") {
        const n = Number(raw); empty = !Number.isInteger(n) || n < 1 || n > 5;
      }
      if (!empty && q.type !== "multi" && q.type !== "rating") {
        empty = raw.trim() === "";
      }
      if (empty) {
        return fail(`必答题未完成：${q.title}`);
      }
    }
  }

  // 空答案不落库，避免污染统计
  const cleaned = answers.filter(
    (a) => a.value !== "" && a.value !== "[]" && !(a.value === "0" && questions.find((q) => q.id === a.questionId)?.type === "rating")
  );
  if (cleaned.length === 0) {
    return fail("请至少回答一题");
  }

  // 题型格式校验（选答但填了非法格式也要拦）
  for (const a of cleaned) {
    const q = questions.find((qq) => qq.id === a.questionId);
    if (!q || a.value === "") continue;
    if (q.type === "date") {
      const m = a.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const real = m && Number(m[2]) >= 1 && Number(m[2]) <= 12 &&
        Number(m[3]) >= 1 && Number(m[3]) <= new Date(Number(m[1]), Number(m[2]), 0).getDate();
      if (!real) {
        return fail(`日期格式不正确：${q.title}`);
      }
    }
    if (q.type === "nps") {
      const n = Number(a.value);
      if (!Number.isInteger(n) || n < 0 || n > 10) {
        return fail(`NPS 分值不合法：${q.title}`);
      }
    }
    if (q.type === "rating") {
      // 原先只在必填分支查 1-5，选答评分题可被写入任意值；这里无条件拦
      const n = Number(a.value);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        return fail(`评分不合法：${q.title}`);
      }
    }
    if (q.type === "number") {
      const n = Number(a.value);
      if (!Number.isFinite(n)) {
        return fail(`请输入数字：${q.title}`);
      }
      let cfg: { min?: number; max?: number } = {};
      try {
        const parsed = JSON.parse(q.options);
        if (parsed && !Array.isArray(parsed)) cfg = parsed;
      } catch { /* 选项列不是范围对象则视为无限 */ }
      if (cfg.min !== undefined && cfg.min !== null && n < cfg.min) {
        return fail(`${q.title}：不能小于 ${cfg.min}`);
      }
      if (cfg.max !== undefined && cfg.max !== null && n > cfg.max) {
        return fail(`${q.title}：不能大于 ${cfg.max}`);
      }
    }
  }

  return { error: null, cleaned };
}
