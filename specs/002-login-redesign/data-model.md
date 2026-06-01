# Data Model: 登录功能重新设计

**Created**: 2026-06-01

## Entity: Credential (登录凭证)

持久化的用户登录凭证，加密存储在本地磁盘。

| Field | Type | Description |
|-------|------|-------------|
| version | number | 凭证格式版本（初始为 1），用于未来迁移 |
| cookies | Cookie[] | 从 BOSS直聘 获取的所有认证 Cookie |
| source | `'browser' \| 'qrcode' \| 'web'` | 登录来源标识 |
| createdAt | number | 创建时间（Unix timestamp ms） |
| expiresAt | number | 过期时间（创建时间 + 7 天） |

**Validation Rules**:
- `cookies` 至少包含 `__zp_stoken__` Cookie
- `expiresAt` = `createdAt + 7 * 24 * 3600 * 1000`
- `source` 决定了凭证过期后的续期策略：
  - `'browser'` → 重试浏览器自动提取
  - `'qrcode'` → 自动拉起二维码重新登录流程
  - `'web'` → 自动拉起浏览器页面重新登录流程

**State Transitions**:
```
[不存在] --login()--> [有效]
[有效] --7天过期--> [需续期] --refresh()--> [有效] 或 [不存在]
[有效] --logout()--> [不存在]（文件删除）
[有效] --密钥失效--> [不存在]（自动清理）
```

## Entity: Cookie

单个 HTTP Cookie 记录。

| Field | Type | Description |
|-------|------|-------------|
| name | string | Cookie 名称 |
| value | string | Cookie 值 |
| domain | string | 所属域（`.zhipin.com`） |
| path | string | Cookie 路径（默认 `/`） |
| secure | boolean | 是否仅 HTTPS |
| httpOnly | boolean | 是否 HttpOnly |
| expires | number | Unix timestamp (seconds)，0 表示会话 Cookie |

**Validation Rules**:
- `domain` 必须包含 `zhipin.com`
- `name` 不能为空

## Entity: Login Session (登录会话)

二维码登录过程中的临时运行时状态（不持久化到磁盘）。

| Field | Type | Description |
|-------|------|-------------|
| qrId | string | BOSS直聘 返回的二维码 Session ID |
| randKey | string | 随机密钥，用于轮询签名 |
| qrContent | string | 二维码原始内容（URL） |
| qrImagePath | string | 二维码图片临时文件路径（可空） |
| status | `'pending' \| 'scanned' \| 'confirmed' \| 'expired' \| 'cancelled'` | 当前状态 |
| createdAt | number | 创建时间（Unix timestamp ms） |
| expiresAt | number | 过期时间（创建时间 + 120 秒） |
| pollAttempts | number | 已轮询次数 |

**State Transitions**:
```
pending --App扫码--> scanned --App确认--> confirmed --获取Cookie--> [销毁]
pending --120秒超时--> expired --[销毁]
pending --Ctrl+C--> cancelled --[销毁]
```

## Entity: BrowserCookieStore (浏览器 Cookie 数据库)

表示一个浏览器实例的 Cookie 数据库（物理文件映射）。

| Field | Type | Description |
|-------|------|-------------|
| browserName | string | 浏览器名称（`chrome` / `edge` / `brave` / `firefox`） |
| platform | `'win32' \| 'darwin' \| 'linux'` | 操作系统 |
| profilePath | string | Profile 目录路径 |
| dbPath | string | Cookie 数据库文件完整路径 |
| encryptionVersion | number | 加密格式版本（10/11/20） |
| encryptedKey | Buffer | 从 Local State 提取的加密密钥 |
