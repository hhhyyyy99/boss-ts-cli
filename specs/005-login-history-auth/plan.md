# Implementation Plan: Login and History Authorization Reliability

**Branch**: `004-boss-cli-parity` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-login-history-auth/spec.md`

## Summary

Fix the authenticated entry points that currently block real use: `login --web`, default `login`, and `history -p=1`. The implementation will keep existing CLI behavior and credential storage compatible while adding bounded login recovery, clearer diagnostics, `--cookie-source` compatibility, and classified history request outcomes. The feature must not leak credentials or private account data and must preserve JSON stdout behavior for affected commands.

## Technical Context

**Language/Version**: TypeScript 5.5, Node.js >= 18

**Primary Dependencies**: commander for CLI options, Vitest for tests, Node built-ins for browser opening/local HTTP import server, existing browser cookie extractors, existing `ApiClient`

**Storage**: Existing local credential file under the project credential location; no new persistent storage format is planned

**Testing**: Vitest unit tests and existing integration smoke tests; live BOSS verification remains manual or mocked because real account/browser state is environment-specific

**Target Platform**: Local developer machines on Linux, macOS, and Windows where the CLI runs and may access local browsers

**Project Type**: Single-project CLI tool

**Performance Goals**: `login --web` must reach success, timeout, or actionable classified failure within 90 seconds for automated/normal recovery paths; history command should fail fast with classified errors when auth/context is invalid

**Constraints**: Do not print or store raw cookies/tokens/private account data; JSON mode must keep stdout parseable; browser recovery is best-effort across OS/browser/profile combinations; no recruiter/YAML parity work in this feature

**Scale/Scope**: Three affected command flows: `login --web`, default `login`, and `history` pagination/request context

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is still the unfilled template and contains no enforceable project-specific MUST/SHOULD rules. Use repository practice and the active spec as gates:

- CLI user output must keep machine-readable stdout separate from human-readable progress.
- Authentication work must not expose cookies, tokens, phone numbers, chat content, resume content, or private browsing-history values.
- Affected behavior requires regression coverage with Vitest.
- Existing explicit login modes and saved credential compatibility must be preserved.

Gate result: PASS. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-login-history-auth/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth-flow.contract.md
│   └── history-flow.contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── commands/
│   ├── auth.ts              # login/default/web option behavior and messages
│   ├── common.ts            # JSON/human output behavior if needed
│   └── search.ts            # history command request and error handling
├── login/
│   ├── web-login.ts         # bounded web recovery and diagnostics
│   ├── qrcode.ts            # fallback path remains explicit/reused
│   └── index.ts             # credential candidate construction
├── browsers/
│   └── index.ts             # auto/specified browser cookie candidates
├── auth.ts                  # credential verification and persistence
├── client.ts                # endpoint context, BOSS error classification
├── constants.ts             # login/history URLs and referers
├── exceptions.ts            # classified errors
└── schema.ts                # JSON envelope codes

tests/
├── unit/
│   ├── login-web.test.ts
│   ├── login-default.test.ts
│   ├── history-params.test.ts
│   ├── auth.test.ts
│   └── browsers-specified.test.ts
├── helpers/
└── integration/
    └── smoke.test.ts
```

**Structure Decision**: Keep the feature inside the existing CLI modules. Add focused helpers only when they make browser login recovery and history outcome classification testable without live BOSS credentials.

## Complexity Tracking

No constitution violations or extra architecture exceptions.

## Phase 0: Research

See [research.md](./research.md).

## Phase 1: Design

See [data-model.md](./data-model.md), [contracts/auth-flow.contract.md](./contracts/auth-flow.contract.md), [contracts/history-flow.contract.md](./contracts/history-flow.contract.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

Gate result: PASS.

- Design keeps sensitive values out of artifacts and diagnostics.
- Design preserves JSON stdout/human stderr separation.
- Design includes test coverage targets for login recovery, default fallback, and history context.
- Design does not include out-of-scope recruiter or YAML parity work.
