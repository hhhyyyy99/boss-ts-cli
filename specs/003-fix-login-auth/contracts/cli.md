# CLI Contracts: 登录授权验证修复

## Shared Rules

- 登录成功只在候选凭证完成授权验证后返回。
- 登录失败、取消、超时或验证未知状态不得写入新的有效凭证。
- 任何输出不得包含 Cookie 值、token 或完整敏感响应。
- JSON 输出使用项目现有 envelope：`ok`, `schema_version`, `data`, `error`。

## Command: `boss login`

```text
boss login [options]
```

Options:

```text
--qrcode          使用二维码扫码登录
--web             使用浏览器页面登录
--browser <name>  指定浏览器来源 (chrome/edge/brave/firefox)
--cookie-path <p> 指定 Cookie 数据库文件路径
--profile <name>  指定浏览器用户配置文件名称
--json            输出 JSON envelope
```

Default behavior:

```text
boss login
```

自动检测本机浏览器会话，获得候选凭证后执行授权验证。

Success human output:

```text
✓ 登录成功
当前用户: <displayName 或 已验证账号>
登录来源: browser|qrcode|web
```

Success JSON:

```json
{
  "ok": true,
  "schema_version": "1",
  "data": {
    "message": "登录成功",
    "source": "browser",
    "user": {
      "displayName": "张三",
      "accountType": "geek",
      "verifiedAt": "2026-06-01T10:30:00.000Z"
    },
    "expiresAt": "2026-06-08T10:30:00.000Z"
  }
}
```

Failure JSON:

```json
{
  "ok": false,
  "schema_version": "1",
  "data": null,
  "error": {
    "code": "auth_verification_failed",
    "message": "授权验证失败：候选凭证无法访问当前用户信息。请重新登录或改用 boss login --qrcode。"
  }
}
```

Exit Codes:

```text
0  登录成功且凭证已验证保存
1  登录失败、验证失败、取消、超时或保存失败
```

### `boss login --qrcode`

Required behavior:

- 显示二维码和过期提示。
- 扫码后显示等待 App 确认。
- App 确认后只产生候选凭证，仍需通过授权验证。
- 超时或取消时返回失败，不保存凭证。

### `boss login --web`

Required behavior:

- 打开或提供登录 URL。
- 等待浏览器登录结果回收到 CLI。
- 回收不到可验证候选凭证时返回失败。
- 浏览器页面自身成功不等于 CLI 登录成功。

### `boss login --browser <name>`

Required behavior:

- 只检查指定浏览器来源。
- 指定来源不可用时不得静默切换到其他浏览器。
- 多 Profile 无法唯一选择时提示用户使用更明确的来源。

## Command: `boss status`

```text
boss status [--json]
```

Required behavior:

- 读取本地有效登录状态。
- 能够展示最近验证时间、登录来源和账号摘要。
- 如凭证过期或无法验证，应返回未认证状态并提示重新登录。

Authenticated JSON:

```json
{
  "ok": true,
  "schema_version": "1",
  "data": {
    "authenticated": true,
    "source": "browser",
    "user": {
      "displayName": "张三",
      "accountType": "geek",
      "verifiedAt": "2026-06-01T10:30:00.000Z"
    },
    "expiresAt": "2026-06-08T10:30:00.000Z"
  }
}
```

Unauthenticated JSON:

```json
{
  "ok": true,
  "schema_version": "1",
  "data": {
    "authenticated": false,
    "nextActions": [
      "boss login",
      "boss login --qrcode",
      "boss login --web"
    ]
  }
}
```

## Command: `boss logout`

```text
boss logout [--json]
```

Required behavior:

- 清除本地有效登录状态。
- 即使当前未登录也返回成功。

## Error Codes

| Code | Meaning |
|------|---------|
| `credential_acquisition_failed` | 未能从所选方式获得候选凭证 |
| `authorization_pending_timeout` | 等待扫码、确认或浏览器回收超时 |
| `auth_verification_failed` | 候选凭证被服务端拒绝或无法访问当前用户信息 |
| `auth_verification_unknown` | 网络或服务异常导致无法确认授权 |
| `credential_persistence_failed` | 已验证凭证保存失败 |
| `login_cancelled` | 用户取消登录流程 |

## Implementation Alignment

- Success responses include `source`, `user`, and `expiresAt`.
- Failure responses use the existing project envelope and `BossApiError` handling.
- `status` may include `searchAuthenticated` and `recommendAuthenticated` as additional diagnostic fields from existing behavior.
