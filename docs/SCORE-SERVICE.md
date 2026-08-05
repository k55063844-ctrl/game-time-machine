# 成绩系统上线边界

当前前端已经使用真实玩法事件计算成绩，并把最多 500 局摘要保存在浏览器的 `tm:v1:runs`。这些记录可以用于个人档案和本机排行榜，但状态只能显示为“本机记录”。`localStorage` 可被玩家修改，因此不能直接进入公开多人榜。

## 局记录

每局至少包含：

- `runId`、匿名 `playerId`
- `gameId`、`mode`
- `challengeId`、`seed`
- `rulesetVersion`、`scoreVersion`
- `outcome`、整数 `durationMs`
- 原始 `metrics` 与由规则引擎计算的 `score`
- `startedAt`、`finishedAt`
- `verification.status`

榜单查询必须以 `gameId + mode + rulesetVersion + challengeId` 为隔离键，不能把不同玩法、模式或规则版本混排。

## 公共榜 API

配置 `VITE_SCORE_API_URL` 后，前端适配器提供以下接口：

1. `POST /v1/runs/start`
   - 服务端签发 `runToken`、固定种子、规则版本、一次性 nonce 和过期时间。
2. `POST /v1/runs/finish`
   - 客户端只提交 `runToken`、按固定 tick 记录的输入日志和检查点。
   - 服务端不得信任客户端提交的分数或用时，必须重放规则引擎重新计算。
3. `GET /v1/leaderboards`
   - 只返回 `verification.status === "verified"` 的成绩。

离线开局只能生成本机记录；只有在开局前取得服务端令牌的对局，才有资格稍后进入验证队列。

## 上线前安全要求

- 所有竞技模拟使用固定 tick，不以屏幕刷新次数计分。
- 随机行为由服务端种子驱动；方块序列不得使用 `Math.random()`。
- 输入日志记录发生输入的 tick，不上传客户端声称的最终分数。
- 服务端校验操作频率、nonce 重放、规则版本、状态检查点和最终状态。
- 只有服务端重演通过后，界面才允许显示“回放已验证”。

