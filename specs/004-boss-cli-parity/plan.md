# Implementation Plan: BOSS CLI Command Parity Audit

**Branch**: `004-boss-cli-parity` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-boss-cli-parity/spec.md`

**Note**: This plan covers an audit artifact feature only. It does not implement missing BOSS CLI commands.

## Summary

Create a comprehensive parity audit between this TypeScript CLI and the reference `jackwener/boss-cli` command surface. The output is a human-readable Markdown audit report and a machine-readable JSON parity matrix stored under this feature directory. The audit must inventory every reference command, option, alias, output mode, and observable behavior, compare it with the local CLI, assign parity status and P0/P1/P2/P3 remediation priority, and supplement every discovered missing item into both artifacts and the remediation list.

## Technical Context

**Language/Version**: TypeScript 5.5, Node.js >= 18

**Primary Dependencies**: commander for local CLI help/command surface, Vitest for existing tests, Node built-ins for filesystem/process inspection; reference data from `jackwener/boss-cli` at commit `dcd8331`

**Storage**: Feature-local artifact files in `specs/004-boss-cli-parity/`: `parity-audit.md` and `parity-matrix.json`

**Testing**: Static artifact validation, CLI help snapshots, existing `npm run typecheck`, relevant Vitest coverage, and optional live verification flags for account/role-sensitive behavior

**Target Platform**: Local developer machine running the CLI; outputs are repository documents consumed by maintainers and downstream spec-kit tasks

**Project Type**: Single-project CLI tool with documentation/audit artifacts

**Performance Goals**: Audit generation and validation should complete in under 30 seconds when using local help/source/test evidence and no live BOSS verification

**Constraints**: No automatic command behavior changes; no sensitive Cookie/token output; live BOSS checks are sampled or flagged rather than required for completion; every discovered missing parity item must appear in both formal artifacts and the remediation list

**Scale/Scope**: All reference top-level commands, recruiter subcommands, aliases, required arguments, options, structured output modes, and observable command behaviors covered by the reference baseline

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is still a template with no enforceable project-specific gates. Use repository practice as implicit gates:

- TypeScript type checking remains available via `npm run typecheck`.
- Test execution remains available via `npm run test`.
- No audit artifact may print or persist authentication cookies, tokens, phone numbers, resume contents, or other sensitive live account data.
- CLI compatibility work must not be implemented as part of this feature; remediation is documented only.

Gate result: PASS. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-boss-cli-parity/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── parity-matrix.schema.md
├── parity-audit.md      # Final human-readable audit artifact
├── parity-matrix.json   # Final machine-readable audit artifact
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── index.ts                 # top-level CLI registration
├── commands/
│   ├── auth.ts              # login/logout/status/me
│   ├── search.ts            # search/show/detail/cities/recommend/history/export
│   ├── personal.ts          # applied/interviews/chat
│   ├── social.ts            # greet/batch-greet
│   └── recruiter.ts         # recruiter/hr command group
├── client.ts
├── constants.ts
└── types/
    └── index.ts

tests/
├── integration/
│   └── smoke.test.ts
├── unit/
│   └── *.test.ts
├── helpers/
└── fixtures/
```

**Structure Decision**: Keep the feature as repository documentation and audit artifacts under `specs/004-boss-cli-parity/`. Source files are inspected as evidence, not modified by this feature. If automation is later added, it should be planned as a follow-up implementation feature.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations or additional complexity exceptions.

## Phase 0: Research

See [research.md](./research.md).

## Phase 1: Design

See [data-model.md](./data-model.md), [contracts/parity-matrix.schema.md](./contracts/parity-matrix.schema.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

Gate result: PASS.

- Design remains artifact-only and does not modify command behavior.
- Contracts explicitly prohibit sensitive credential values in audit artifacts.
- Validation strategy uses static/help/test evidence first and flags live-only gaps rather than blocking on account role or anti-bot state.
