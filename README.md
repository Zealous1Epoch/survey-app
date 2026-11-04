# 问卷月 - 问卷调查与数据收集工具

一个轻量级扫码答题系统，支持管理员创建问卷、为每道题生成独立二维码，用户扫码即可匿名作答。涵盖单选、多选、填空、评分四种题型，支持图片题目、分步作答、数据统计与 Excel 导出。从数据库设计到前端交互到部署运维，独立完成全部开发工作。

## 功能特性

- **问卷管理** — 创建、编辑、删除问卷（编辑按题目 id 增量更新，不会误删已有答卷）
- **多种题型** — 单选、多选、填空、评分，支持题目配图
- **二维码分享** — 自动生成问卷二维码，方便移动端访问
- **数据导出** — 支持导出答卷数据为 Excel 格式
- **管理后台** — JWT 多用户登录（含超管/普通用户权限隔离）与数据查看
- **响应式设计** — 适配桌面端和移动端

## 技术栈

- **前端**: Next.js 15 + React 19 + Tailwind CSS（kami 设计系统：暖纸底色 + 单强调色 + 描边分层）
- **后端**: Next.js API Routes + MySQL (mysql2)
- **认证**: JWT (jose) + bcryptjs
- **图标**: Lucide React
- **导出**: ExcelJS
- **二维码**: qrcode

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量（DATABASE_URL=mysql://user:pass@host:3306/survey）
cp .env.example .env

# 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 项目结构

```
src/
├── app/
│   ├── admin/          # 管理后台页面
│   │   ├── login/      # 登录页
│   │   └── surveys/    # 问卷管理
│   ├── api/            # API 路由
│   │   ├── admin/      # 管理接口（线上经 nginx 映射为 /api/survey-admin/）
│   │   └── s/          # 问卷答题接口
│   └── s/[surveyId]/   # 问卷填写页
├── components/         # 公共组件
└── lib/                # 工具函数和数据库
```

## 构建部署（生产）

```bash
npm run build
npm start -- -p 3001
```

生产环境运行在云服务器（`116.205.141.245:2223`），部署路径 `/opt/survey`，由 pm2 进程 `survey-app` 守护（端口 3001）。nginx 将域名 `hr.hi-tronics.com` 的 `/survey` 路径反代到该服务（应用 basePath 即 `/survey`，静态资源与 uploads 目录由 nginx 直接托管）。

线上入口：<http://hr.hi-tronics.com/survey>

发布流程：

```bash
# 本地验证通过后推送分支，服务器上执行：
cd /opt/survey
git fetch && git checkout <发布分支>
npm run build
pm2 restart survey-app
```

发布前务必备份数据库：`mysqldump --single-transaction <库名> > backup.sql`
