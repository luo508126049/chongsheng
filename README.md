# 重生一亿次 H5 MVP

AI 文本人生模拟小游戏原型。当前实现包含 React H5、Express REST API、Prisma/MySQL schema、DeepSeek 兼容 provider、内存/Prisma 双仓库、内容后台 JSON 导入导出和基础测试。

## 本地运行

```bash
npm install
npm run dev
```

- H5 前端：http://localhost:5173
- API 服务：http://localhost:5174
- 健康检查：http://localhost:5174/health

默认 `DATA_STORE=memory`，服务端会使用内存数据与确定性降级剧情，保证核心闭环可跑。`/health` 会返回当前仓库模式。

## 环境变量

复制 `.env.example` 为 `.env` 后按需填写：

```bash
DATA_STORE="memory"
DATABASE_URL="mysql://user:password@localhost:3306/rebirth_billion_times"
DEEPSEEK_API_KEY="..."
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-chat"
```

## 数据库

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

当前 Prisma schema 已按 MySQL 设计。要切换到真实数据库：

1. 配置真实 `DATABASE_URL`。
2. 执行 `npm run prisma:migrate` 和 `npm run seed`。
3. 将 `DATA_STORE` 改为 `prisma`，再启动服务。

未设置 `DATA_STORE=prisma` 时，即使存在示例 `DATABASE_URL`，运行时仍使用内存仓库。

## 验证

```bash
npm test
npm run build
```

已覆盖：

- 规则引擎：属性 clamp、死亡判定、天赋加成、碎片倍率。
- 内容服务：事件卡筛选、导入校验。
- AI 服务：结构化 JSON 解析、无选项兜底。

## 工作方式

后续不连续任务先读 `PROJECT_PLAN.md`，再按需要局部扫描相关文件，避免重复消耗上下文。
