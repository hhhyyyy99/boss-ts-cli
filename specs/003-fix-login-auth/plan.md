# Implementation Plan: 登录授权验证修复

**Branch**: `003-fix-login-auth` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-fix-login-auth/spec.md`

## Summary

修复所有登录入口的共同缺陷：默认 `boss login`、`--qrcode`、`--web`、指定浏览器登录都必须先产生候选凭证，再通过受保护的当前用户身份检查完成授权验证，最后才允许持久化并提示登录成功。实现上收敛到一个统一的登录调度与验证管线，区分候选凭证、验证结果和已认证会话，确保失败、超时、取消或未知状态不会覆盖已有有效凭证。

## Technical Context

**Language/Version**: TypeScript 5.5, Node.js >= 18

**Primary Dependencies**: commander (CLI), better-sqlite3 (浏览器 Cookie DB 读取), qrcode-terminal (终端二维码), ora/chalk/cli-table3 (CLI 反馈), Node built-in fetch/http/crypto/fs

**Storage**: 本地加密凭证文件 (`credential.json`)，继续使用现有 `src/crypto.ts` 加密封装；新流程只在授权验证成功后写入

**Testing**: vitest (`npm run test`), TypeScript typecheck (`npm run typecheck`)

**Target Platform**: Linux, macOS, Windows 的 Node.js CLI

**Project Type**: Single-project CLI tool

**Performance Goals**: 成功登录后 5 秒内完成当前账号可用性确认；失败路径在明确失败后立即返回可操作提示；二维码/Web 登录遵守既有超时窗口

**Constraints**: 不引入系统级外部运行时；不暴露敏感 Cookie；保持现有 CLI 参数兼容；登录验证失败不得覆盖既有有效凭证

**Scale/Scope**: 单用户本地 CLI 登录流程；覆盖四种登录入口及 `status`/`me` 的验证语义

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

项目 constitution 仍是模板占位，没有可执行的强制原则。采用项目已有隐含门禁：

- TypeScript 类型检查必须通过：`npm run typecheck`
- 测试必须通过：`npm run test`
- 不引入破坏性 CLI 参数变更：保留 `boss login`、`--qrcode`、`--web`、`--browser`、`--cookie-path`、`--profile`
- 敏感凭证不得在用户输出、JSON 错误或诊断信息中泄露

Gate result: PASS。无需要豁免的复杂度或合规违规。

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-login-auth/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── cli.md
└── tasks.md             # created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── auth.ts              # credential lifecycle, candidate validation, save/load/refresh
├── client.ts            # protected API request behavior used by auth verification
├── commands/
│   └── auth.ts          # login/logout/status/me command behavior and user-facing output
├── login/
│   ├── index.ts         # login method dispatch and shared result types
│   ├── qrcode.ts        # QR candidate credential acquisition and state reporting
│   ├── web-login.ts     # Web candidate credential acquisition and callback/timeout handling
│   └── cleanup.ts       # temporary file cleanup
├── browsers/
│   ├── index.ts         # auto-detect and specified browser candidate acquisition
│   ├── chromium.ts      # Chromium cookie extraction
│   ├── firefox.ts       # Firefox cookie extraction
│   ├── lock.ts          # cookie DB lock/copy behavior
│   └── paths.ts         # browser/profile path discovery
├── constants.ts         # auth verification endpoints and timeouts
├── exceptions.ts        # auth-specific error classes if needed
├── schema.ts            # JSON envelope error codes
└── types/
    └── index.ts         # CandidateCredential, AuthenticatedSession, verification types

tests/
├── unit/
│   ├── auth.test.ts         # candidate validation, save semantics, old credential preservation
│   ├── login-qrcode.test.ts # QR state/timeout/cancel behavior with mocked fetch
│   ├── login-web.test.ts    # Web callback/timeout result handling
│   └── browsers.test.ts     # specified browser/no fallback and profile selection behavior
└── integration/
    └── smoke.test.ts        # CLI command contract smoke coverage
```

**Structure Decision**: 保持现有单项目 CLI 结构。优先收敛登录调度和授权验证到现有 `src/auth.ts` / `src/commands/auth.ts`，仅在共享流程确实需要时扩展 `src/login/index.ts` 和类型定义，避免新增大型框架或跨项目结构。

## Complexity Tracking

> 无宪法违规需要记录。

## Phase 0: Research

See [research.md](./research.md).

## Phase 1: Design

See [data-model.md](./data-model.md), [contracts/cli.md](./contracts/cli.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

Gate result: PASS。

- 设计仍保持现有 CLI 参数兼容。
- 候选凭证与有效凭证分离，满足凭证安全和失败不覆盖要求。
- 计划包含单元测试、登录流程测试和 CLI 合同验证。
- 无新增系统级运行时或重型依赖。
