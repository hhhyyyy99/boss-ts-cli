# 技术调研: BOSS直聘 TypeScript CLI

**日期**: 2026-06-01 | **关联**: [plan.md](./plan.md)

## 1. 浏览器 Cookie 提取

### 决策
手动实现 Chromium 系和 Firefox 的 Cookie 解密，使用 `sqlite3` 读取浏览器数据库 + Node.js `crypto` 解密。

### 理由
- TS/Node.js 生态中不存在类似 Python `browser-cookie3` 的统一跨浏览器 Cookie 提取库
- Chromium 系 (Chrome/Edge/Brave/Opera/Vivaldi/Chromium) 共享相同的加密方案：AES-256-GCM，密钥存储于 OS 密钥链 (macOS Keychain / Linux gnome-keyring 或 kwallet / Windows DPAPI)
- Firefox 使用独立的加密方案和存储格式 (key4.db + logins.json 或 cookies.sqlite)
- 各浏览器 Cookie 文件路径已知且稳定

### 替代方案评估
| 方案 | 优点 | 缺点 |
|------|------|------|
| 调用 Python 脚本 | 复用现有代码 | 违背"无需 Python 依赖"目标 |
| 使用 `sqlite3` + `crypto` 手动解密 | 纯 Node.js，无外部运行时依赖 | 需分别处理 macOS/Linux/Windows 密钥链 |
| 用 Playwright/Puppeteer 启动浏览器提取 | 无需处理加密 | 太重，启动浏览器耗时过长 |

### 实现路径
1. 定位浏览器 Cookie 数据库路径（按 OS + 浏览器名）
2. 从 OS 密钥链提取加密密钥
   - macOS: `security find-generic-password` 命令
   - Linux: gnome-keyring (libsecret) 或 kwallet
   - Windows: DPAPI (CryptUnprotectData)
3. 使用 Node.js `crypto` 模块 AES-256-GCM 解密
4. 解析 SQLite 数据库获取 Cookie 值

## 2. CLI 框架

### 决策
使用 `commander` (v12+)

### 理由
- Node.js 生态中最流行的 CLI 框架，API 风格类似 Python Click
- 声明式命令定义、自动 help 生成、子命令嵌套
- TypeScript 类型支持良好
- 轻量 (< 50KB)，无多余依赖

### 替代方案
| 方案 | 优点 | 缺点 |
|------|------|------|
| `commander` | 最流行，类似 Click | 功能较基础 |
| `oclif` | 企业级，插件系统 | 过度设计，包体积大 |
| `yargs` | 灵活 | 声明式不如 commander 直观 |
| 手写参数解析 | 零依赖 | 重复造轮子 |

## 3. HTTP 客户端

### 决策
使用 Node.js 原生 `fetch` (v18+ 内置)

### 理由
- Node.js 18+ 原生支持 `fetch`，无需额外依赖
- 支持 Request/Response、Headers、AbortController 等标准 API
- 减少依赖链，降低安全风险

### 替代方案
| 方案 | 优点 | 缺点 |
|------|------|------|
| 原生 `fetch` | 零依赖，标准 API | 不支持自动重试/拦截器 |
| `undici` | Node.js 官方 HTTP 库 | fetch 底层就是 undici |
| `axios` | 拦截器、重试 | 额外依赖 |
| `got` | 功能丰富 | 额外依赖，包体积大 |

### 注意
- 需要在原生 fetch 上封装重试、超时、Cookie 管理
- User-Agent 和 Headers 伪装在拦截器层实现

## 4. 终端输出

### 决策
`chalk` + `cli-table3` + `ora`

### 理由
- `chalk`: Node.js 终端颜色的事实标准
- `cli-table3`: 表格化输出（搜索结果、列表展示）
- `ora`: 加载 spinner（登录等待、批量操作进度）
- 与 Python 版本的 Rich 库功能对等

### 替代方案
| 方案 | 优点 | 缺点 |
|------|------|------|
| `chalk` + `cli-table3` + `ora` | 轻量组合，各司其职 | 三个包分散 |
| `ink` | React 渲染终端 UI | 过重，不适合简单 CLI |
| `pastel` | 类似 Rich 的全功能 | 不成熟，社区小 |

## 5. 二维码终端渲染

### 决策
使用 `qrcode-terminal`

### 理由
- 在终端中用 Unicode 半角块渲染二维码
- 零配置，API 简单
- 与 Python 版本行为一致

## 6. 凭证加密

### 决策
Node.js 内置 `crypto` 模块，AES-256-GCM 加密

### 理由
- AES-256-GCM 是经过充分验证的认证加密算法
- Node.js 内置 `crypto` 无需额外依赖
- 密钥派生：使用机器 ID (hostname + machine-id + username 的 SHA-256) 作为派生种子
- 与 OS 密钥链结合：macOS Keychain / Linux DBus secret / Windows DPAPI 存储派生密钥

### 实现
```
加密: plaintext → AES-256-GCM(key, random IV) → { iv, authTag, ciphertext }
存储: { iv, authTag, ciphertext } → Base64 → credential.json
解密: credential.json → Base64 解码 → AES-256-GCM 解密 → plaintext
```

## 7. 构建与发布

### 决策
`tsup` + `npm publish`

### 理由
- `tsup`: 基于 esbuild，编译速度极快，支持 ESM/CJS 双输出
- 在 `package.json` 中配置 `bin` 字段注册 `boss` 命令
- `npm publish` 发布到 npm registry

### 替代方案
| 方案 | 优点 | 缺点 |
|------|------|------|
| `tsup` | 快速，双格式输出 | 不支持类型生成 (需配合 tsc --declaration) |
| `unbuild` | 智能推断，自动 d.ts | 较新，社区较小 |
| `tsx` | 无需编译即可运行 | 启动慢，不适合发布 |

## 8. 测试框架

### 决策
`vitest`

### 理由
- 与 Vite 生态集成，原生支持 TypeScript/ESM
- 兼容 Jest API，迁移成本低
- 内置 mock、覆盖率、watch 模式

## 9. 浏览器 Cookie 数据库路径

### Chromium 系 (Chrome/Edge/Brave/Opera/Vivaldi/Chromium)

| OS | Cookie 路径 |
|----|------------|
| Linux | `~/.config/<browser>/Default/Cookies` 或 `~/.config/<browser>/Default/Network/Cookies` |
| macOS | `~/Library/Application Support/<browser>/Default/Cookies` |
| Windows | `%LOCALAPPDATA%\<browser>\User Data\Default\Cookies` 或 `%LOCALAPPDATA%\<browser>\User Data\Default\Network\Cookies` |

### Firefox

| OS | Cookie 路径 |
|----|------------|
| Linux | `~/.mozilla/firefox/<profile>/cookies.sqlite` |
| macOS | `~/Library/Application Support/Firefox/Profiles/<profile>/cookies.sqlite` |
| Windows | `%APPDATA%\Mozilla\Firefox\Profiles\<profile>\cookies.sqlite` |

## 总结

所有技术选型优先考虑零依赖或轻量依赖，与 Python 版本保持一致的用户体验。浏览器 Cookie 提取是最大技术挑战点，需要针对各平台密钥链分别处理。
