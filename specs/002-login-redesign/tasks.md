# Tasks: 登录功能重新设计

**Input**: Design documents from `/specs/002-login-redesign/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: 未要求额外测试任务。重构后需确保现有测试 (`vitest run`) 和类型检查 (`tsc --noEmit`) 继续通过。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (项目结构初始化)

**Purpose**: 创建新模块目录，为基础类型定义打好框架

- [x] T001 创建 `src/browsers/` 和 `src/login/` 目录结构 per plan.md
- [x] T001.5 [P] 创建 `src/login/index.ts` — 登录调度入口骨架，根据参数分发到 Cookie 提取 / QR 登录 / Web 登录（各逻辑由对应模块实现）

---

## Phase 2: Foundational — 登录状态持久化 (US4) 🔧

**Purpose**: 凭证加密存储、加载、过期续期、登出，是所有登录方式的基础

**⚠️ CRITICAL**: 所有登录方式 (US1/US2/US3) 必须在此阶段完成后才能实现

**Goal**: 用户登录一次后凭证安全保存在本地，后续使用时自动恢复

**Independent Test**: 登录后重启终端，运行 `boss status` 仍显示已认证；`boss logout` 后凭证被清除

### Implementation for US4

- [x] T002 [US4] 更新 `src/types/index.ts` — Credential 接口增加 `version` 字段（默认 1），新增 `BrowserCookieStore` 接口定义
- [x] T003 [US4] 更新 `src/crypto.ts` — 加密/解密函数支持 credential version 字段；解密失败时返回明确错误类型（不静默失败）
- [x] T004 [US4] 重构 `src/auth.ts` — `saveCredential()` 增加 version 字段；`loadCredential()` 解密失败时自动清理无效文件并提示"本地凭证已失效"；`logout()` 删除凭证文件而非保存空凭证
- [x] T005 [US4] 在 `src/auth.ts` 中实现 `refreshIfNeeded()` — 凭证过期时根据 `source` 字段选择正确的续期方式（browser→重试提取, qrcode→自动拉起 QR 登录, web→自动拉起浏览器登录）
- [x] T006 [US4] 在 `src/index.ts` 中更新启动时的凭证加载逻辑，加载失败时输出可操作的中文错误提示

**Checkpoint**: 凭证持久化基础设施就绪 — 可独立测试 save/load/logout/expiry 生命周期

---

## Phase 3: User Story 1 — 浏览器 Cookie 自动提取 (P1) 🎯 MVP

**Goal**: `boss login` 自动从已登录的浏览器中提取 Cookie，零操作登录

**Independent Test**: 在已登录 BOSS直聘 的 Chrome 中运行 `boss login`，3 秒内完成登录并显示用户身份

### Implementation for US1

- [x] T007 [P] [US1] 创建 `src/browsers/paths.ts` — 定义跨平台浏览器 Cookie 路径配置表 (Chrome/Edge/Brave/Firefox, Linux/macOS/Windows)；多 Profile 检测：自动尝试 Default Profile → 无有效 Cookie 则扫描所有 Profile 并列出供用户选择
- [x] T008 [P] [US1] 创建 `src/browsers/decrypt.ts` — AES-256-GCM 解密工具函数（v10/v11: 所有平台 PBKDF2 密钥派生; v20: 仅 Windows，Chrome 127+ App-Bound Encryption，通过 DPAPI 解密后 AES-GCM）
- [x] T009 [P] [US1] 创建 `src/browsers/chromium-key.ts` — Chromium 密钥提取（macOS Keychain / Linux secret-tool+kwallet+PBKDF2 fallback / Windows DPAPI），修复现有 `getChromiumKey()` 中的所有已知 bug
- [x] T010 [US1] 创建 `src/browsers/chromium.ts` — Chromium Cookie 提取主流程（打开 Cookie DB、查询 zhipin.com 域 Cookie、调用解密、过滤验证），支持 v10/v11/v20 格式
- [x] T011 [US1] 创建 `src/browsers/firefox.ts` — Firefox Cookie 提取（读取 cookies.sqlite、处理 NSS 加密/明文），支持 Linux/macOS/Windows
- [x] T012 [US1] 创建 `src/browsers/lock.ts` — 数据库锁定处理（WAL 模式只读打开 + 文件复制到临时目录回退 + 提示关闭浏览器）
- [x] T013 [US1] 创建 `src/browsers/index.ts` — 自动检测入口 `autoDetectCookies()`（Chrome→Edge→Brave→Firefox 顺序，比较 Cookie 新鲜度选择最佳会话）；单浏览器提取 `extractFromBrowser(name)`；**Cookie 完整性校验：必须包含 `__zp_stoken__`，否则视为提取失败**
- [x] T014 [US1] 更新 `src/commands/auth.ts` 和 `src/login/index.ts` — `login` 命令集成新浏览器提取流程；`--browser <name>` 指定浏览器；`--cookie-path <path>` 自定义路径；默认提取失败时通过调度器提示备选方案（`--qrcode` / `--web`）
- [x] T015 [US1] 在 `src/constants.ts` 中更新 `BROWSER_PATHS` 配置（移除旧版硬编码，引用 `src/browsers/paths.ts`）并更新 User-Agent 为动态检测操作系统

**Checkpoint**: `boss login` 可自动从 Chrome 提取 Cookie 完成登录，覆盖 Windows/macOS/Linux

---

## Phase 4: User Story 2 — 二维码扫码登录 (P2)

**Goal**: `boss login --qrcode` 在终端显示二维码，用户用 BOSS直聘 App 扫码登录

**Independent Test**: 运行 `boss login --qrcode`，终端显示可扫描二维码，App 扫码后在 2 分钟内完成登录

### Implementation for US2

- [x] T016 [P] [US2] 创建 `src/login/cleanup.ts` — 临时文件生命周期管理（`os.tmpdir()` 创建、`process.on('exit'/'SIGINT')` 注册清理钩子）
- [x] T017 [US2] 创建 `src/login/qrcode.ts` — 二维码登录完整流程：
  - 获取 QR session（POST randkey）
  - 使用 `qrcode-terminal` 从原始数据直接渲染终端二维码（去除 jimp+jsqr 冗余解码）
  - 可选：GUI 环境保存 PNG 并用系统查看器打开
  - 轮询扫描状态（2 秒间隔，120 秒超时，支持重试）
  - 轮询确认状态
  - 获取 Cookie（修复 Set-Cookie 解析：正确处理 expires 中的逗号）
  - Ctrl+C 安全取消并清理资源
  - 超时后明确提示"二维码已过期，请重新生成"
  - **API 响应降级处理：JSON 解析失败或返回非预期格式时给出具体错误信息，不崩溃**
- [x] T018 [US2] 更新 `src/commands/auth.ts` — `login --qrcode` 命令集成新 QR 登录流程

**Checkpoint**: `boss login --qrcode` 可独立完成二维码扫描登录

---

## Phase 5: User Story 3 — 浏览器页面登录 (P3)

**Goal**: `boss login --web` 打开系统浏览器到登录页，用户登录后自动捕获凭证

**Independent Test**: 运行 `boss login --web`，浏览器打开登录页，完成登录后 CLI 自动获取凭证

### Implementation for US3

- [x] T019 [US3] 创建 `src/login/web-login.ts` — 浏览器页面登录：
  - 启动 localhost 临时 HTTP 服务器（随机端口）
  - 打开系统浏览器到 BOSS直聘 登录页
  - 等待回调请求，从请求中提取 Cookie
  - 自动关闭服务器并保存凭证
  - 无 GUI 环境给出明确错误提示"无法打开浏览器，请使用 --qrcode 方式登录"
  - 超时保护（5 分钟）
  - 回调失败时的回退提示（如 BOSS直聘 不支持标准 OAuth 回调）
  - **API 响应降级处理：非预期响应格式时优雅降级，提供明确错误信息**
- [x] T020 [US3] 更新 `src/commands/auth.ts` — `login --web` 命令集成

**Checkpoint**: `boss login --web` 可独立完成浏览器页面登录

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 错误信息完善、边界情况修复、代码清理

- [x] T021 [P] 统一所有错误消息为中文，确保每种失败场景都有可操作提示（`src/auth.ts`, `src/browsers/`, `src/login/`）
- [x] T022 [P] 更新 `src/commands/auth.ts` — `login` 成功时显示用户身份信息（FR-016）
- [x] T023 [P] 移除 `scripts/extract-cookies.py` Python 桥接脚本及 `src/auth.ts` 中的 `tryPythonBridge()` 调用（纯 Node.js 方案不再需要）
- [x] T024 [P] 更新 `scripts/import-cookies.mjs` — 保持手动 Cookie 导入路径兼容性
- [x] T025 运行 `tsc --noEmit` 和 `vitest run`，确保类型检查和现有测试全部通过
- [ ] T026 按 quickstart.md 执行手动验证：Cookie 提取 (< 3 秒) / QR 登录 (< 2 秒生成二维码) / Web 登录 / 凭证过期续期 / 登出

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational US4 (Phase 2)**: Depends on Setup completion — BLOCKS all login methods
- **US1 Cookie 提取 (Phase 3)**: Depends on Phase 2 — No dependencies on US2/US3
- **US2 QR 登录 (Phase 4)**: Depends on Phase 2 — No dependencies on US1/US3
- **US3 Web 登录 (Phase 5)**: Depends on Phase 2 — No dependencies on US1/US2
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US4 (P1)**: Foundational — MUST complete first（所有登录方式的基础）
- **US1 (P1)**: Can start after US4 — 独立于 US2/US3
- **US2 (P2)**: Can start after US4 — 独立于 US1/US3
- **US3 (P3)**: Can start after US4 — 独立于 US1/US2

### Within Each User Story

- 路径/配置模块先于解密/提取模块
- 核心逻辑先于命令集成
- `src/browsers/` 内模块：paths.ts + decrypt.ts + chromium-key.ts 可并行，chromium.ts + firefox.ts 依赖前者

### Parallel Opportunities

- Phase 3: T007 (paths.ts), T008 (decrypt.ts), T009 (chromium-key.ts) 可并行
- Phase 4: T016 (cleanup.ts) 可与 US1 的实现任务并行
- Phase 5: 整个 US3 可与 US2 并行
- Phase 6: T021, T022, T023, T024 均可并行

---

## Parallel Example: User Story 1

```bash
# 并行创建浏览器模块基础文件（不同文件，无依赖）:
Task: "T007 创建 src/browsers/paths.ts — 路径配置表"
Task: "T008 创建 src/browsers/decrypt.ts — AES-GCM 解密工具"
Task: "T009 创建 src/browsers/chromium-key.ts — 密钥提取"

# 上述完成后，可并行创建浏览器特定模块:
Task: "T010 创建 src/browsers/chromium.ts — Chromium Cookie 提取"
Task: "T011 创建 src/browsers/firefox.ts — Firefox Cookie 提取"

# 上述完成后，创建集成层:
Task: "T012 创建 src/browsers/lock.ts — 数据库锁定处理"
Task: "T013 创建 src/browsers/index.ts — 自动检测入口"
```

---

## Implementation Strategy

### MVP First (US4 + US1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: US4 凭证持久化 (T002–T006)
3. Complete Phase 3: US1 Cookie 提取 (T007–T015)
4. **STOP and VALIDATE**: 验证 `boss login` 可自动从 Chrome/Edge/Brave 提取 Cookie 并持久化
5. 验证 `boss logout` 和凭证过期续期正确工作
6. 此时已完成 P1 功能，可发布 MVP

### Incremental Delivery

1. Setup + US4 → 凭证生命周期基础设施就绪
2. + US1 Cookie 提取 → **MVP** `boss login` 自动登录可用
3. + US2 QR 登录 → 无浏览器/远程服务器环境可用
4. + US3 Web 登录 → 全场景覆盖，所有登录路径可用
5. + Polish → 错误提示完善、代码清理、回归验证

### Parallel Team Strategy

With multiple developers:

1. 团队一起完成 Phase 1 + Phase 2 (US4)
2. US4 完成后：
   - Developer A: US1 Cookie 提取 (Phase 3)
   - Developer B: US2 QR 登录 (Phase 4)
   - Developer C: US3 Web 登录 (Phase 5)
3. 所有故事独立完成并集成

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- `src/browsers/` 中的模块可在不触碰现有 `src/auth.ts` 的情况下开发（先并行创建新模块，最后集成）
- 原有 Python bridge (`scripts/extract-cookies.py`) 在 T023 中被移除
- 原有 `--browser` 参数语义变更：现在用于"指定提取浏览器"，打开浏览器登录改用 `--web`
- Chrome v20 App-Bound Encryption 仅在 Windows 平台适用（T008, T009），macOS/Linux 无此加密格式
- 不引入新的 npm 依赖（全部使用现有技术和 Node.js 内置模块）
