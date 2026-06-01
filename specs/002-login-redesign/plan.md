# Implementation Plan: 登录功能重新设计

**Branch**: `002-login-redesign` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-login-redesign/spec.md`

## Summary

重新设计 CLI 工具的三种登录方式（浏览器 Cookie 自动提取、二维码扫码、浏览器页面登录），修复当前实现中的所有已知问题。核心目标是实现跨平台（Windows/macOS/Linux）的可靠 Cookie 提取（含 Chrome v20 App-Bound Encryption）、健壮的二维码登录流程、以及基于 localhost 回调的浏览器页面登录。

## Technical Context

**Language/Version**: TypeScript 5.5, Node.js >= 18

**Primary Dependencies**: commander (CLI), better-sqlite3 (Cookie DB 读取), qrcode-terminal (终端二维码), jimp + jsqr (二维码图片解码), ora (进度提示)

**Storage**: 本地加密文件 (AES-256-GCM, key = PBKDF2(hostname + username + machine-id))

**Testing**: vitest (单元 + 集成测试)

**Target Platform**: Linux (主要), macOS, Windows — Node.js CLI

**Project Type**: CLI tool

**Performance Goals**: Cookie 提取 < 3 秒 (SC-001), 二维码生成 < 2 秒 (SC-002)

**Constraints**: 不引入需要系统级安装的外部依赖（如 Python runtime），优先纯 Node.js 实现

**Scale/Scope**: 单一用户本地 CLI 工具，无并发需求

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution 模板未定义具体原则，无需门禁检查。以下为项目隐含的质量标准：
- 代码需正确支持 TypeScript 类型检查 (`tsc --noEmit`)
- 现有测试需全部通过 (`vitest run`)
- 不引入破坏性命令行接口变更（保持向后兼容）

## Project Structure

### Documentation (this feature)

```text
specs/002-login-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── index.ts             # 入口点，启动时加载凭证
├── auth.ts              # 核心：三种登录方式 + 凭证生命周期
├── client.ts            # API 客户端（Cookie 管理、请求签名、限速）
├── crypto.ts            # 凭证加密/解密 (AES-256-GCM)
├── constants.ts         # URL、路径、TTL、浏览器配置
├── schema.ts            # JSON 信封格式
├── exceptions.ts        # 错误类型
├── index-cache.ts       # 索引缓存
├── commands/
│   └── auth.ts          # login/logout/status/me 命令定义
└── types/
    └── index.ts          # Cookie, Credential 等类型定义

tests/
├── unit/
│   ├── auth.test.ts         # [NEW] 认证模块单元测试
│   ├── crypto.test.ts
│   └── client.test.ts       # [NEW] API 客户端测试
└── integration/
    └── smoke.test.ts
```

**Structure Decision**: 保持现有单项目结构。新增模块拆分到 `src/` 子目录：`src/browsers/`（浏览器 Cookie 提取，按平台和浏览器分类）, `src/login/`（二维码和 web 登录流程）。

## Complexity Tracking

> 无宪法违规需要记录。

## Phase 0: Research

### Research Tasks

1. **Chrome v20 App-Bound Encryption (Windows)** — Chrome 127+ 在 Windows 上使用 App-Bound Encryption，需要研究解密方案
2. **Firefox Cookie 提取** — Firefox 使用不同的 Cookie 存储格式和加密机制
3. **跨平台浏览器检测** — 不同 OS 上浏览器 Cookie 文件路径检测策略
4. **DB 文件锁定处理** — SQLite WAL 模式和文件复制策略
5. **`--web` 回调机制** — localhost HTTP 服务器接收回调的最佳实践
6. **QR 登录临时文件管理** — 临时文件生命周期和清理策略

### Research Output

See [research.md](./research.md).

## Phase 1: Design

### Data Model

See [data-model.md](./data-model.md).

### Contracts

See [contracts/](./contracts/).

### Quickstart

See [quickstart.md](./quickstart.md).
