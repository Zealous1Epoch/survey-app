# 私密问卷系统设计

## 目标

轻量级扫码答题系统：管理员创建题目 → 每题生成独立二维码 → 用户扫码匿名回答单题 → 提交后自动跳转 → 数据存入本地 SQLite → 管理员查看/导出。数据全程私密。

## 核心需求

- 每题一个独立二维码，扫完即答即走
- 支持单选、多选、填空、评分四种题型
- 匿名提交，无需登录，无密码
- 提交后自动跳转（可配置跳转 URL，默认为确认页）
- SQLite 本地存储，内置数据查看和 Excel/CSV 导出
- 题目按"问卷"分组管理（一个问卷 = 一组题目 = 多张二维码）

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| 样式 | Tailwind CSS + shadcn/ui |
| 数据库 | better-sqlite3（SQLite 本地文件） |
| 二维码 | qrcode |
| Excel 导出 | exceljs |
| 部署 | VPS（阿里云轻量 / Railway） |

## 数据模型

### surveys（问卷/题目组）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (UUID) | 主键 |
| title | TEXT | 问卷标题 |
| description | TEXT | 说明（可选） |
| redirect_url | TEXT | 提交后跳转地址（空=默认确认页） |
| created_at | TEXT (ISO) | 创建时间 |

### questions（题目）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (UUID) | 主键 |
| survey_id | TEXT (FK) | 所属问卷 |
| type | TEXT | 题型：choice/multi/text/rating |
| title | TEXT | 题目内容 |
| options | TEXT (JSON) | 选项列表（choice/multi 用） |
| required | INTEGER (0/1) | 是否必填（默认1） |
| redirect_url | TEXT | 单独覆盖跳转地址（可选） |
| order | INTEGER | 排序 |

### responses（回答记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (UUID) | 主键 |
| question_id | TEXT (FK) | 对应题目 |
| survey_id | TEXT (FK) | 所属问卷（冗余，方便查询） |
| value | TEXT | 答案值 |
| submitted_at | TEXT (ISO) | 提交时间 |

简化后 answers 表合并进 responses，每题一条记录，不需要 answer 表。

## 页面结构

### 管理端

| 路由 | 说明 |
|------|------|
| `/admin` | 问卷列表 |
| `/admin/surveys/new` | 创建问卷 + 批量添加题目 |
| `/admin/surveys/[id]/edit` | 编辑问卷/题目 |
| `/admin/surveys/[id]` | 每题回答数据 + 统计 + 导出 |
| `/admin/surveys/[id]/qrcode` | 所有题目的二维码展示/下载 |

### 答题端（移动端优先）

| 路由 | 说明 |
|------|------|
| `/s/[surveyId]/[questionId]` | 单题答题页面 |
| `/s/[surveyId]/[questionId]/done` | 提交成功页（跳转前短暂展示） |

## API 设计

```
POST /api/admin/surveys                    # 创建问卷（含题目）
GET  /api/admin/surveys                    # 问卷列表
GET  /api/admin/surveys/[id]               # 问卷详情（含题目列表）
PUT  /api/admin/surveys/[id]               # 更新问卷/题目
DELETE /api/admin/surveys/[id]             # 删除问卷

GET  /api/admin/surveys/[id]/responses     # 回答列表（按题筛选）
GET  /api/admin/surveys/[id]/stats         # 统计（每题汇总）
GET  /api/admin/surveys/[id]/export        # 导出 Excel

GET  /api/s/[surveyId]/[questionId]        # 获取题目（公开）
POST /api/s/[surveyId]/[questionId]/submit # 提交答案（公开）
```

## 核心交互流

1. 管理员创建问卷 → 添加多道题目 → 每题自动生成独立二维码
2. 现场每道题目旁贴一张二维码
3. 用户扫二维码 → 打开单题页面 → 作答 → 提交
4. 提交后 → 显示确认 → 自动跳转（可配：默认确认页 / 自定义 URL / 下一条题目）
5. 管理员在后台查看数据 → 实时刷新 → 导出 Excel

## 部署

VPS 单进程部署，SQLite 文件存储在 `data/` 目录：

```
npx next build
npx next start -p 3000
```

备份：直接复制 `data/` 目录。可配合 cron 定时备份。
