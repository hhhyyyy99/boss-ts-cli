# Data Model: 登录授权验证修复

**Created**: 2026-06-01

## Entity: LoginAttempt (登录尝试)

一次用户发起的登录流程，不直接持久化。

| Field | Type | Description |
|-------|------|-------------|
| id | string | 单次登录尝试标识，用于诊断和测试 |
| method | `'browser_auto' \| 'browser_specified' \| 'qrcode' \| 'web'` | 用户选择的登录入口 |
| stage | `LoginStage` | 当前阶段 |
| startedAt | string | ISO 8601 开始时间 |
| finishedAt | string \| null | ISO 8601 结束时间 |
| result | `'success' \| 'failed' \| 'cancelled' \| 'timeout' \| null` | 最终结果 |
| sourceDetail | string \| null | 浏览器名称、Profile 或 Web/QR 会话摘要，不含敏感凭证 |
| errorMessage | string \| null | 用户可见失败摘要 |

**Validation Rules**:
- `method` 由 CLI 参数唯一确定。
- `result === 'success'` 时必须已有成功的 `AuthorizationVerificationResult`。
- `sourceDetail` 不得包含 Cookie 值、token 或完整授权响应。

**State Transitions**:

```text
created
  -> credential_acquisition
  -> awaiting_authorization
  -> authorization_verification
  -> credential_persistence
  -> success

credential_acquisition|awaiting_authorization|authorization_verification|credential_persistence
  -> failed|cancelled|timeout
```

## Entity: CandidateCredential (候选凭证)

登录入口获取到但尚未验证的凭证集合。

| Field | Type | Description |
|-------|------|-------------|
| cookies | Cookie[] | 候选 Cookie 列表 |
| source | `'browser' \| 'qrcode' \| 'web'` | 候选来源 |
| method | LoginAttempt.method | 产生该候选的入口 |
| sourceDetail | string \| null | 浏览器/Profile/会话摘要 |
| acquiredAt | string | ISO 8601 获取时间 |

**Validation Rules**:
- `cookies` 可以为空，但空候选必须导致验证失败，不能保存。
- `cookies` 中只允许存储 `zhipin.com` 相关 Cookie。
- CandidateCredential 不得写入持久化凭证文件。

## Entity: AuthorizationVerificationResult (授权验证结果)

候选凭证访问受保护当前用户身份后的判定。

| Field | Type | Description |
|-------|------|-------------|
| status | `'verified' \| 'rejected' \| 'unknown'` | 验证状态 |
| stage | `'authorization_verification'` | 固定阶段 |
| accountSummary | AccountSummary \| null | 当前账号摘要 |
| message | string | 用户可见说明 |
| nextActions | string[] | 推荐下一步命令或操作 |

**Validation Rules**:
- `status === 'verified'` 时 `accountSummary` 必须存在。
- `status !== 'verified'` 时不得调用持久化保存。
- `unknown` 用于网络、服务端异常或验证服务不可用；不得等同于成功。

## Entity: AccountSummary (账号摘要)

登录成功后展示给用户的非敏感身份信息。

| Field | Type | Description |
|-------|------|-------------|
| displayName | string \| null | 用户名、昵称或账号展示名 |
| accountType | string \| null | 求职者、招聘者或未知 |
| source | `'browser' \| 'qrcode' \| 'web'` | 登录来源 |
| verifiedAt | string | ISO 8601 验证时间 |

**Validation Rules**:
- 可以缺少 `displayName`，但必须能确认当前身份接口返回授权成功。
- 不包含 Cookie、手机号、完整简历或其他敏感详情。

## Entity: AuthenticatedSession (有效登录状态)

已通过授权验证并保存的本地登录状态。

| Field | Type | Description |
|-------|------|-------------|
| version | number | 凭证格式版本 |
| cookies | Cookie[] | 已验证 Cookie 列表 |
| source | `'browser' \| 'qrcode' \| 'web'` | 登录来源 |
| accountSummary | AccountSummary | 验证时获得的账号摘要 |
| createdAt | string | ISO 8601 创建时间 |
| expiresAt | string | ISO 8601 过期时间 |
| verifiedAt | string | ISO 8601 最近验证时间 |

**Validation Rules**:
- 只能由 `CandidateCredential + verified AuthorizationVerificationResult` 生成。
- `expiresAt` 使用现有凭证有效期策略。
- 保存失败时不得删除或覆盖旧的有效会话。

## Entity: LoginStage

统一错误阶段枚举。

| Value | Meaning |
|-------|---------|
| `credential_acquisition` | 从浏览器、二维码或 Web 回调获取候选凭证 |
| `awaiting_authorization` | 等待用户扫码、App 确认或浏览器登录完成 |
| `authorization_verification` | 使用候选凭证验证当前账号身份 |
| `credential_persistence` | 保存已验证会话 |
| `cancelled` | 用户主动取消 |
| `timeout` | 流程超时 |

## Entity: Cookie

沿用现有 Cookie 结构。

| Field | Type | Description |
|-------|------|-------------|
| name | string | Cookie 名称 |
| value | string | Cookie 值 |
| domain | string | 所属域 |
| path | string | 路径 |
| expires | number \| undefined | 过期时间 |
| httpOnly | boolean \| undefined | HttpOnly 标记 |
| secure | boolean \| undefined | Secure 标记 |

**Validation Rules**:
- `name` 和 `value` 必须非空才可用于授权验证。
- `domain` 必须包含 `zhipin.com`。
