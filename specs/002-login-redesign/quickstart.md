# Quickstart: 登录功能重新设计

**Target**: 开发者快速上手理解新登录系统架构。

## 核心模块

### 1. 浏览器 Cookie 提取 (`src/browsers/`)

新增模块，按浏览器和平台拆分：

```
src/browsers/
├── index.ts              # 统一入口：autoDetect(), extractFromBrowser()
├── paths.ts              # 浏览器 Cookie 路径配置表（所有平台）
├── chromium.ts           # Chromium 系列 (Chrome/Edge/Brave) 加密/解密
├── chromium-key.ts       # Chromium 密钥提取（Keychain/DPAPI/Secret-tool）
├── firefox.ts            # Firefox Cookie 读取
├── decrypt.ts            # 解密工具集（v10/v11/v20 AES-GCM）
└── lock.ts               # 数据库锁定处理（复制回退）
```

### 2. 登录流程 (`src/login/`)

```
src/login/
├── index.ts              # 登录调度：根据参数选择登录方式
├── qrcode.ts             # 二维码登录（生成、轮询、确认）
├── web-login.ts          # 浏览器页面登录（localhost 回调服务器）
└── cleanup.ts            # 临时文件清理
```

### 3. 凭证管理（重构现有 `src/auth.ts`）

```
src/auth.ts               # 精简为核心凭证生命周期管理
src/crypto.ts             # 加密/解密（增加 version 字段）
```

## 关键流程

### Cookie 自动提取

```
boss login
  → autoDetect()
    → for each browser (Chrome → Edge → Brave → Firefox):
      → findCookieDb()            # 查找 Cookie 数据库路径
      → tryReadWithLockHandling() # 处理 DB 锁定
      → getEncryptionKey()        # 提取浏览器加密密钥（按平台）
      → decryptCookies()          # 解密 v10/v11/v20 Cookie
      → filterZhipinCookies()     # 过滤 zhipin.com 域
      → validateHasStoken()       # 检查 __zp_stoken__ 存在
      → compareFreshness()        # 比较会话新鲜度
    → 选最佳 → saveCredential() → 显示登录成功
    → 全部失败 → 提示 --qrcode / --web
```

### 二维码登录

```
boss login --qrcode
  → getQrSession()         # POST /wapi/zppassport/captcha/randkey
  → renderQrCode()         # qrcode-terminal 渲染到终端
  → openPngImage()         # 可选：用系统查看器打开 PNG（GUI 环境）
  → pollScan()             # 每 2 秒轮询，最多 60 次
    → 成功 → pollConfirm() # 等待 App 确认
      → 确认 → getCookies() → saveCredential()
  → onTimeout/SIGINT → cleanup() → exit
```

### 浏览器页面登录

```
boss login --web
  → startCallbackServer()  # localhost:随机端口 HTTP 服务器
  → openLoginPage()        # 系统浏览器打开 BOSS直聘 登录 URL
  → waitForCallback()      # 等待浏览器重定向回调
  → extractCookies()       # 从回调请求中提取 Cookie
  → stopServer()           # 关闭临时 HTTP 服务器
  → saveCredential()
```

## 测试策略

- **单元测试**: 每个解密函数、路径配置、Cookie 过滤逻辑独立可测
- **集成测试**: 使用测试 fixture（预先生成的加密 Cookie 数据库）验证完整提取流程
- **Mock 依赖**: 外部 API 调用（二维码 API）、系统密钥链调用均需可 mock
