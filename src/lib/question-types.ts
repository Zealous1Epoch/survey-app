/** 纯类型与常量模块：客户端/服务端共用，严禁引入 db（mysql2） */

export type QuestionType =
  | "choice"
  | "multi"
  | "text"
  | "rating"
  | "dropdown"
  | "nps"
  | "date"
  | "number"
  | "yesno";

/** number 题型借用 options 列存的范围配置 */
export interface NumberConfig {
  min?: number;
  max?: number;
}

/** 有选项列表、可复用选项编辑器的题型 */
export const OPTION_LIST_TYPES: QuestionType[] = ["choice", "multi", "dropdown"];

/** 服务端题型白名单（与 QuestionType 保持一致） */
export const VALID_QUESTION_TYPES: string[] = [
  "choice",
  "multi",
  "text",
  "rating",
  "dropdown",
  "nps",
  "date",
  "number",
  "yesno",
];

export interface QuestionData {
  id?: string;
  type: QuestionType;
  title: string;
  options?: string[] | NumberConfig;
  required?: boolean;
  redirect_url?: string;
  image_url?: string;
  order?: number;
}
