# 问卷月 - 问卷调查与数据收集工具

基于 Next.js 的在线问卷调查系统，支持问卷创建、二维码分享、数据收集与导出。

## 功能特性

- **问卷管理** — 创建、编辑、删除问卷
- **多种题型** — 支持文本、单选、多选等题型
- **二维码分享** — 自动生成问卷二维码，方便移动端访问
- **数据导出** — 支持导出答卷数据为 Excel 格式
- **管理后台** — 登录认证后的问卷管理和数据查看界面
- **响应式设计** — 适配桌面端和移动端

## 技术栈

- **前端**: Next.js 15 + React 19 + Tailwind CSS
- **数据库**: SQLite (better-sqlite3)
- **图标**: Lucide React
- **导出**: ExcelJS
- **二维码**: qrcode

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 或使用启动脚本
bash start.sh
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
│   │   ├── admin/      # 管理接口
│   │   └── s/          # 问卷答题接口
│   └── s/[surveyId]/   # 问卷填写页
├── components/         # 公共组件
└── lib/                # 工具函数和数据库
```

## 构建部署

```bash
npm run build
npm start
```
