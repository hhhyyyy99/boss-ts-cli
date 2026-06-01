# Implementation Plan: BOSS直聘 TypeScript CLI

**Branch**: `001-boss-ts-cli` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-boss-ts-cli/spec.md`

## Summary

将 Python 实现的 boss-cli（BOSS 直聘命令行工具）完整移植到 TypeScript/Node.js 平台。实现求职者和招聘方双端全部功能，包括认证（浏览器 Cookie 提取 + 二维码登录）、职位搜索与筛选、推荐、导出、打招呼、招聘方管理、结构化 JSON 输出及反检测机制。v1 目标与 Python 版本功能完全对等，命令行接口严格兼容。

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js >= 18 (LTS), ESM 模块

**Primary Dependencies**:
- CLI 框架: `commander` (类似 Python Click 的声明式 CLI)
- HTTP 客户端: Node.js 原生 `fetch` (v18+ 内置，无需额外依赖)
- 终端渲染: `chalk` (颜色), `cli-table3` (表格), `ora` (spinner)
- 二维码: `qrcode-terminal` (终端 Unicode 二维码渲染)
- 浏览器 Cookie: `sqlite3` + Node.js `crypto` (手动实现 Cookie 解密，Chromium 系 + Firefox)
- 加密: Node.js 内置 `crypto` (AES-256-GCM 凭证加密)
- 构建: `tsup` 或 `unbuild` (TypeScript 编译打包)
- 包发布: `npm`

**Storage**: 文件系统 — `~/.config/boss-cli/credential.json` (加密凭证), `~/.cache/boss-cli/index.json` (搜索序号缓存)

**Testing**: `vitest` (单元测试 + 集成测试), `msw` 或 `nock` (HTTP mock)

**Target Platform**: Linux, macOS, Windows (Node.js 跨平台)

**Project Type**: CLI (命令行工具，通过 npm 全局安装)

**Performance Goals**: 搜索 <5s 返回结果，导出 100 条 <10s，批量打招呼 10 条 <30s（含 1.5s 延迟）

**Constraints**: <100MB 内存占用，Node.js >= 18，离线不可用（需访问 BOSS 直聘 API）

**Scale/Scope**: 单用户单机 CLI 工具，约 26 个命令，7 个子命令组

## Constitution Check

*GATE: 当前 constitution 为模板状态，无项目特定原则。以下原则基于项目上下文推导：*

| 原则 | 状态 |
|------|------|
| CLI 接口兼容性 — 命令名、参数名、标志与 Python 版本严格一致 | ✅ 通过 |
| 测试覆盖 — 核心 API 客户端和命令处理器需要单元测试 | ✅ 计划中 |
| 安全性 — 凭证加密存储，Cookie 视为敏感数据 | ✅ 通过 |
| 简洁性 — JSON 唯一结构化输出格式，无 YAML 依赖 | ✅ 通过 |

## Project Structure

### Documentation (this feature)

```text
specs/001-boss-ts-cli/
├── plan.md              # 本文件
├── research.md          # Phase 0 技术调研
├── data-model.md        # Phase 1 数据模型
├── quickstart.md        # Phase 1 快速开始
├── contracts/           # Phase 1 CLI 合约
└── tasks.md             # Phase 2 任务分解 (/speckit-tasks 生成)
```

### Source Code (repository root)

```text
src/
├── index.ts             # CLI 入口，注册所有子命令
├── client.ts            # API 客户端 (rate-limit, cooldown, retry, 反检测)
├── auth.ts              # 认证模块 (浏览器 Cookie 提取, QR 登录, TTL 刷新)
├── crypto.ts            # 凭证加密/解密 (AES-256-GCM)
├── constants.ts         # URL, UA/Headers, 城市代码, 筛选枚举
├── exceptions.ts        # 结构化异常定义
├── index-cache.ts       # 搜索结果序号缓存
├── schema.ts            # 输出封装 (ok/schema_version/data/error)
├── commands/
│   ├── common.ts        # 共享工具 (handleCommand, stderr console 初始化)
│   ├── auth.ts          # login, logout, status
│   ├── search.ts        # search, recommend, detail, show, export, cities
│   ├── personal.ts      # me, applied, interviews, chat, history
│   ├── social.ts        # greet, batch-greet
│   └── recruiter.ts     # recruiter 全部子命令
└── types/
    └── index.ts         # TypeScript 类型定义

tests/
├── unit/
│   ├── client.test.ts
│   ├── auth.test.ts
│   ├── crypto.test.ts
│   ├── schema.test.ts
│   └── commands/
└── integration/
    └── smoke.test.ts    # 需要真实 Cookie 的端到端测试
```

**Structure Decision**: 采用单项目结构，目录布局镜像 Python 版本的模块划分以降低理解成本。`src/commands/` 按功能域拆分（认证、搜索、个人、社交、招聘方），每个文件对应一组相关命令。

## Complexity Tracking

> 当前无违规项需记录。
