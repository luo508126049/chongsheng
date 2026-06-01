# 《重生一亿次》项目规划与进度

## 当前决策
- 交付形态：Web H5 原型优先，后续迁移微信小程序。
- 技术栈：React + Vite + TypeScript 前端；Node.js + Express + Prisma 后端；MySQL 为目标数据库。
- AI 模型：DeepSeek 兼容接口，通过环境变量配置；无 API key 时使用服务端确定性降级剧情，保证闭环可跑。
- 内容投放：MySQL 数据库为最终源；MVP 提供简易内容后台与 JSON 导入导出。
- 默认世界观：保留 PRD 的“现实·普通人生”为默认，同时预留修仙世界观扩展。

## 当前进度
- M1：已完成。已初始化 React/Vite H5、Express API、Prisma/MySQL schema、环境变量、DeepSeek provider 抽象和本规划文件。
- M2：已完成基础闭环。当前在无 DeepSeek key、无 MySQL 的本地内存模式下，可跑通“新建 run -> 聊天回合 -> 风险死亡 -> 结算 -> 天赋入口”。
- M3：部分完成。已有记忆碎片、天赋候选/选择、成就解锁、最近结算和摘要记忆骨架；已补内存/Prisma 双仓库运行时，仍需真实 MySQL 环境验证完整历史留存策略。
- M4：部分完成。已有 `/admin/content/*` 简易 JSON 管理接口和 H5 后台入口；内容接口已可落到 Prisma 仓库，仍需补表单化 CRUD、管理员登录和更完整内容校验。
- M5：部分完成。已有 AI JSON 校验、失败重试/降级、无选项兜底、基础埋点和单元测试；仍需真实模型压测、死亡率调参和数据看板。

## 后续工作方式
- 每次不连续任务先读取本文件，再按相关文件局部扫描。
- 每完成一个实现阶段，更新本文件的“当前进度”和“下一步”。
- 不重复全仓库扫描，除非结构发生重大变化或出现无法定位的问题。

## 下一步
1. 接入 MySQL：已完成运行时 Prisma 仓库与 `DATA_STORE=prisma` 切换；下一步配置真实 `DATABASE_URL`，运行 Prisma migrate 和 seed，并做端到端数据库模式验证。
2. 接入 DeepSeek：配置 `DEEPSEEK_API_KEY`、模型名和 base URL，做 JSON 成功率与叙事质量测试。
3. 扩充内容：导入 120 张事件卡、15 张死法卡、30+ 天赋/成就，并完善后台校验。
4. 增强后台：管理员登录、表单化编辑、启停发布、导入差异预览。
5. 做 MVP 调参：首局死亡率、回合长度、记忆碎片奖励、天赋解锁节奏。

## 最近验证
- `npm test`：通过，3 个测试文件 / 8 个用例。
- `npm run build -w apps/server`：通过，服务端 TypeScript 构建成功。
- `npm run prisma:generate -w apps/server`：通过，Prisma Client 已生成；本地 `.env` 的 `DATABASE_URL` 仍是占位符，未执行 migrate/seed。
- Playwright fallback：通过，使用系统 Chrome 验证桌面首页、开局聊天、连续高风险选择触发结算、移动端首页；控制台无错误。
