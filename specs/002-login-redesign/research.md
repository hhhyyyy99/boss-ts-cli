# Research: 登录功能重新设计

**Created**: 2026-06-01

## R1: Chrome v20 App-Bound Encryption (Windows)

**Decision**: 采用纯 Node.js 方案 — 直接读取 Chrome Local State 获取 encrypted_key，通过 Windows DPAPI 解密获取 AES 密钥，然后在 Node.js 中执行 AES-256-GCM 解密 v20 Cookie。

**Rationale**: 
- Chrome 127+ 将加密密钥存储在 `Local State` 文件中（`os_crypt.app_bound_encrypted_key`），该密钥由 DPAPI 保护（绑定到当前用户会话）
- DPAPI 解密可在 Node.js 中通过调用 Windows Crypt API 完成（使用 `ffi-napi` 或直接调用系统工具）
- v20 Cookie 格式：`v20` (3 bytes) + nonce (12 bytes) + ciphertext + tag (16 bytes)
- 注意：App-Bound Encryption 仅在 Windows 平台实现（Chrome 127+）；macOS/Linux 上 Chrome 仍使用 v10 格式，不存在 v20 加密。
- 在某些企业策略下可能被禁用；需要先检查 Chrome 注册表/策略

**Alternatives considered**:
- 使用外部可执行文件（Chrome 自带的 elevation_service）— 过于复杂，且无法保证在所有 Windows 版本上可用
- 使用 Python browser-cookie3（当前方案）— 不适用于纯 Node.js 工具
- 提示用户手动降级到 v10（通过 Chrome flag）— 用户体验差

## R2: Firefox Cookie 提取

**Decision**: 使用 better-sqlite3 直接读取 Firefox 的 SQLite Cookie 数据库（cookies.sqlite），按平台分别处理解密。

**Rationale**:
- Firefox Cookie 存储在 `<profile>/cookies.sqlite`，标准 SQLite 格式
- Linux: 默认无加密，直接读取
- macOS: Cookie value 为空时可能需要检查 key4.db + logins.json（但 Cookie 通常不加密）
- Windows: 部分版本使用 DPAPI 保护，需要调用 Windows API
- Firefox profile 路径可通过 `profiles.ini` 自动检测
- 优先级低于 Chromium，因为 Firefox 在 BOSS直聘 用户群中份额较小

**Alternatives considered**:
- 使用 Python browser-cookie3 桥接 — 额外依赖
- 仅支持 Chromium — 不符合 FR-002

## R3: 跨平台浏览器检测

**Decision**: 维护一个 `BROWSER_PATHS` 配置表，包含各浏览器在各平台下的默认 profile 路径和 Cookie 数据库路径。

**Rationale**:
| 浏览器 | Linux | macOS | Windows |
|--------|-------|-------|---------|
| Chrome | `~/.config/google-chrome/Default/Cookies` | `~/Library/Application Support/Google/Chrome/Default/Cookies` | `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cookies` |
| Edge | `~/.config/microsoft-edge/Default/Cookies` | `~/Library/Application Support/Microsoft Edge/Default/Cookies` | `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cookies` |
| Brave | `~/.config/BraveSoftware/Brave-Browser/Default/Cookies` | `~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Cookies` | `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Cookies` |
| Firefox | `~/.mozilla/firefox/*.default-release/cookies.sqlite` | `~/Library/Application Support/Firefox/Profiles/*.default-release/cookies.sqlite` | `%APPDATA%\Mozilla\Firefox\Profiles\*.default-release\cookies.sqlite` |

- 自动检测顺序：Chrome → Edge → Brave → Firefox
- 每个浏览器的 Cookie 的 `creation_utc` / `last_access_utc` 字段用于比较会话新鲜度
- 多 Profile 检测：扫描 `User Data` / `Profiles` 下的子目录，读取 `Local State` 中的 profile 列表

**Alternatives considered**:
- 使用系统的浏览器默认设置 — 不同 OS 查询方式不统一
- 仅检测默认安装路径 — 用户自定义安装路径会失败

## R4: DB 文件锁定处理

**Decision**: 使用 SQLite WAL 模式兼容读取 + 文件复制回退。

**Rationale**:
- Chromium 的 Cookie 数据库通常使用 WAL 模式，允许并发读取
- better-sqlite3 默认以只读模式打开时，WAL 模式下不会冲突
- 如果打开失败（返回 SQLITE_BUSY），则复制数据库文件到临时目录，打开副本读取
- 如果复制也失败（文件被独占锁定），提示用户关闭浏览器后重试
- 读取完成后清理临时副本

**Alternatives considered**:
- 使用 `sql.js`（纯 JS SQLite，不需要原生绑定）— 但需要将整个 DB 加载到内存
- 等待并重试（指数退避）— 可能长时间阻塞

## R5: `--web` 浏览器页面登录回调机制

**Decision**: 启动临时 localhost HTTP 服务器，打开浏览器登录页面，等待回调后提取 Cookie。

**Rationale**:
- 启动一个临时 HTTP 服务器监听随机端口（如 `localhost:18920`）
- 将 BOSS直聘 登录 URL 构造为带 redirect_uri 参数，指向 localhost 回调
- 系统浏览器打开登录页面 (`open`/`xdg-open`/`start`)
- 用户在浏览器中完成登录后，BOSS直聘 服务器重定向到 localhost 回调 URL
- 回调请求中包含 Cookie（由浏览器自动附加），从请求头提取
- 如果 BOSS直聘 没有标准 OAuth/redirect 流程，则使用以下回退：
  - 在浏览器中注入 JavaScript 来提取 Cookie 并 POST 回 localhost
  - 或使用浏览器扩展 API
  - 或提示用户手动从浏览器 DevTools 复制 Cookie（需提供导入脚本）

**注意**: 如果 BOSS直聘 不支持 OAuth 回调，此方式可能需要调整为"打开浏览器 → 用户登录 → 用户手动复制 Cookie → 工具导入"流程。

**Alternatives considered**:
- 使用系统 WebView — 需要额外原生依赖
- Puppeteer/Playwright — 太重，不适合 CLI 工具

## R6: QR 登录临时文件管理

**Decision**: 二维码 PNG 写入临时目录，注册进程退出清理钩子。

**Rationale**:
- 使用 `os.tmpdir()` 获取临时目录
- 文件命名：`boss_qr_<timestamp>.png`
- 注册 `process.on('exit')` 和 `process.on('SIGINT')` 钩子自动删除
- 在二维码登录流程正常结束（成功/超时/取消）后立即清理
- 不再执行冗余的二维码图片 → 解码 → 重新渲染流程
  - 直接使用 `qrcode-terminal` 从原始数据生成终端二维码（去除 jimp + jsqr 双重解码）
  - 仅在有 GUI 环境且用户请求时打开图片文件

**Alternatives considered**:
- 不创建文件，仅终端渲染 — 无法在 GUI 环境查看图片
- 使用内存缓冲区 — 无法用系统图片查看器打开
