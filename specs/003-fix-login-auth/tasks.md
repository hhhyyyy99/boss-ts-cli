# Tasks: 登录授权验证修复

**Input**: Design documents from `/specs/003-fix-login-auth/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/cli.md](./contracts/cli.md), [quickstart.md](./quickstart.md)

**Tests**: Included because the implementation plan and quickstart require vitest coverage for authorization verification, persistence safety, and each login entry.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare test scaffolding and fixtures used by all login-flow tasks.

- [X] T001 Create auth test scaffold and shared fixtures in tests/helpers/auth-fixtures.ts
- [X] T002 [P] Create mocked auth network/client helpers in tests/helpers/auth-mocks.ts
- [X] T003 [P] Create CLI auth contract fixture examples in tests/fixtures/auth-contracts.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared auth types, errors, and helpers that every user story depends on.

**Critical**: No user story implementation should begin until these tasks are complete.

- [X] T004 Add LoginStage, CandidateCredential, AuthorizationVerificationResult, AccountSummary, and AuthenticatedSession types in src/types/index.ts
- [X] T005 Add auth-specific JSON envelope error codes in src/schema.ts
- [X] T006 [P] Add structured auth/login error classes in src/exceptions.ts
- [X] T007 Add candidate credential creation helpers in src/login/index.ts
- [X] T008 Add credential shape validation predicates in src/auth.ts
- [X] T009 Add backward-compatible credential loading notes and type guards in src/auth.ts

**Checkpoint**: Shared login result vocabulary is ready for all stories.

---

## Phase 3: User Story 1 - 所有登录方式必须完成授权验证 (Priority: P1) MVP

**Goal**: A login success message is only possible after candidate credentials can access protected current-user identity, and failed attempts do not replace an existing valid session.

**Independent Test**: Feed verified, rejected, malformed, and network-failure candidate credentials into the shared auth path; verify only the verified case persists and reports success.

### Tests for User Story 1

- [X] T010 [P] [US1] Add verifyCandidateCredential success/rejected/unknown tests in tests/unit/auth.test.ts
- [X] T011 [P] [US1] Add verified-only persistence and old-credential preservation tests in tests/unit/credential-persistence.test.ts
- [X] T012 [P] [US1] Add login success/failure JSON envelope contract tests in tests/integration/smoke.test.ts

### Implementation for User Story 1

- [X] T013 [US1] Implement verifyCandidateCredential with protected identity lookup in src/auth.ts
- [X] T014 [US1] Implement saveVerifiedCredential and legacy credential compatibility in src/auth.ts
- [X] T015 [US1] Update login command to verify candidate credentials before persistence in src/commands/auth.ts
- [X] T016 [US1] Update status and me commands to use verified session semantics and account summary in src/commands/auth.ts
- [X] T017 [US1] Emit stage-specific login errors without sensitive credential values in src/commands/auth.ts
- [X] T018 [US1] Run US1 auth tests using tests/unit/auth.test.ts and tests/unit/credential-persistence.test.ts

**Checkpoint**: Any login entry that reaches the shared path is safe: verified credentials save, all other states fail without overwriting prior valid credentials.

---

## Phase 4: User Story 2 - 默认 login 自动完成可用登录 (Priority: P1)

**Goal**: `boss login` auto-detects a usable local browser session, verifies it, and gives actionable alternatives when no verified session exists.

**Independent Test**: Run the default login path with mocked existing browser session, missing session, and expired/rejected candidate; verify output and persistence behavior.

### Tests for User Story 2

- [X] T019 [P] [US2] Add default login success/no-session/expired-candidate tests in tests/unit/login-default.test.ts
- [X] T020 [P] [US2] Add browser auto-detect candidate source metadata tests in tests/unit/browsers.test.ts

### Implementation for User Story 2

- [X] T021 [US2] Update browser auto-detect to return CandidateCredential metadata in src/browsers/index.ts
- [X] T022 [US2] Route default login through the browser_auto candidate flow in src/commands/auth.ts
- [X] T023 [US2] Add default login next-action messages for no verified local session in src/commands/auth.ts
- [X] T024 [US2] Run default login tests using tests/unit/login-default.test.ts

**Checkpoint**: Default login is independently usable and never treats unverified browser cookies as success.

---

## Phase 5: User Story 3 - 二维码登录必须从扫码到授权闭环 (Priority: P2)

**Goal**: `boss login --qrcode` reports QR scan/confirm states, returns only candidate credentials from QR acquisition, and relies on shared verification before persistence.

**Independent Test**: Mock QR generation, scan, confirm, timeout, cancellation, and empty-cookie cases; verify no unverified QR result is saved.

### Tests for User Story 3

- [X] T025 [P] [US3] Add QR generated/scanned/confirmed/timeout/empty-cookie tests in tests/unit/login-qrcode.test.ts

### Implementation for User Story 3

- [X] T026 [US3] Reword QR flow messages so qrcode.ts reports candidate acquisition instead of final login success in src/login/qrcode.ts
- [X] T027 [US3] Return structured QR candidate results and timeout/cancel failures from src/login/qrcode.ts
- [X] T028 [US3] Route QR candidate flow through shared verification and persistence in src/commands/auth.ts
- [X] T029 [US3] Ensure QR temporary file cleanup on success, failure, timeout, and cancel in src/login/cleanup.ts
- [X] T030 [US3] Run QR login tests using tests/unit/login-qrcode.test.ts

**Checkpoint**: QR login completes a full authorization loop and leaves no persisted state on timeout, cancellation, or empty credentials.

---

## Phase 6: User Story 4 - Web 登录必须完成浏览器到 CLI 的授权回收 (Priority: P2)

**Goal**: `boss login --web` distinguishes browser-page completion from CLI authorization success and fails clearly when no verifiable credential returns to the CLI.

**Independent Test**: Mock callback with valid cookies, callback without cookies, timeout, and local server error; verify only verified callback credentials persist.

### Tests for User Story 4

- [X] T031 [P] [US4] Add Web callback/no-cookie/timeout/server-error tests in tests/unit/login-web.test.ts

### Implementation for User Story 4

- [X] T032 [US4] Reword Web login messages and remove pre-verification success semantics in src/login/web-login.ts
- [X] T033 [US4] Return structured Web candidate results and callback failure details from src/login/web-login.ts
- [X] T034 [US4] Route Web candidate flow through shared verification and persistence in src/commands/auth.ts
- [X] T035 [US4] Run Web login tests using tests/unit/login-web.test.ts

**Checkpoint**: Web login only succeeds when the CLI receives and verifies credentials, not merely when the browser page is opened or logged in.

---

## Phase 7: User Story 5 - 指定浏览器登录必须尊重用户选择 (Priority: P3)

**Goal**: `boss login --browser <name>` checks only the selected browser/profile and never silently falls back to another source.

**Independent Test**: Mock installed, missing, not-logged-in, and ambiguous-profile browser states; verify strict source behavior and user-facing guidance.

### Tests for User Story 5

- [X] T036 [P] [US5] Add specified-browser strict-source tests in tests/unit/browsers-specified.test.ts
- [X] T037 [P] [US5] Add browser profile ambiguity tests in tests/unit/browser-profiles.test.ts

### Implementation for User Story 5

- [X] T038 [US5] Update specified browser extraction to expose missing and ambiguous source details in src/browsers/index.ts
- [X] T039 [US5] Enforce no silent fallback for --browser and --profile in src/commands/auth.ts
- [X] T040 [US5] Run specified browser tests using tests/unit/browsers-specified.test.ts and tests/unit/browser-profiles.test.ts

**Checkpoint**: Specified browser login is deterministic and never authenticates with an unintended browser or account.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validate contracts, documentation, and full project quality gates.

- [X] T041 [P] Update implementation verification notes in specs/003-fix-login-auth/quickstart.md
- [X] T042 [P] Review CLI contract examples against final behavior in specs/003-fix-login-auth/contracts/cli.md
- [X] T043 Run TypeScript typecheck using package.json
- [X] T044 Run full vitest suite using package.json
- [X] T045 Build the CLI and run manual smoke commands from specs/003-fix-login-auth/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 Setup has no dependencies.
- Phase 2 Foundational depends on Phase 1 and blocks all user stories.
- Phase 3 US1 is the MVP and should complete before other stories rely on shared verification semantics.
- Phase 4 US2 depends on Phase 2 and should follow US1 for default-login persistence safety.
- Phase 5 US3 and Phase 6 US4 depend on Phase 2 and the shared verification behavior from US1.
- Phase 7 US5 depends on Phase 2 and can run after US1, in parallel with US3 or US4 if file conflicts are coordinated.
- Phase 8 Polish depends on the desired user stories being complete.

### User Story Dependencies

- US1: No story dependency after Foundation; establishes shared verification and persistence safety.
- US2: Depends on US1 shared verification behavior; no dependency on QR/Web stories.
- US3: Depends on US1 shared verification behavior; no dependency on US2/US4/US5.
- US4: Depends on US1 shared verification behavior; no dependency on US2/US3/US5.
- US5: Depends on US1 shared verification behavior; no dependency on QR/Web stories.

### Parallel Opportunities

- T002 and T003 can run in parallel after T001.
- T006 can run in parallel with T004/T005 if type names are coordinated.
- T010, T011, and T012 can run in parallel because they target different test files.
- T019 and T020 can run in parallel.
- T031 can run in parallel with T036 and T037 after foundational types exist.
- T041 and T042 can run in parallel after implementation behavior is stable.

---

## Parallel Examples

### User Story 1

```text
Task: "T010 [P] [US1] Add verifyCandidateCredential success/rejected/unknown tests in tests/unit/auth.test.ts"
Task: "T011 [P] [US1] Add verified-only persistence and old-credential preservation tests in tests/unit/credential-persistence.test.ts"
Task: "T012 [P] [US1] Add login success/failure JSON envelope contract tests in tests/integration/smoke.test.ts"
```

### User Story 3 and User Story 4

```text
Task: "T025 [P] [US3] Add QR generated/scanned/confirmed/timeout/empty-cookie tests in tests/unit/login-qrcode.test.ts"
Task: "T031 [P] [US4] Add Web callback/no-cookie/timeout/server-error tests in tests/unit/login-web.test.ts"
```

### User Story 5

```text
Task: "T036 [P] [US5] Add specified-browser strict-source tests in tests/unit/browsers-specified.test.ts"
Task: "T037 [P] [US5] Add browser profile ambiguity tests in tests/unit/browser-profiles.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational types/errors/helpers.
3. Complete Phase 3 US1 shared verification and persistence safety.
4. Stop and validate: US1 tests must prove unverified candidates cannot be saved.

### Incremental Delivery

1. Add US1 to make all login entries safe at the shared persistence boundary.
2. Add US2 so default `boss login` becomes reliable.
3. Add US3 for QR authorization closure.
4. Add US4 for Web authorization closure.
5. Add US5 for strict browser selection.
6. Run Phase 8 quality gates and manual smoke checks.

### Team Parallelism

After Phase 2 and US1 are complete, different developers can work on QR (`src/login/qrcode.ts`), Web (`src/login/web-login.ts`), and specified browser (`src/browsers/index.ts`) with limited overlap. Changes to `src/commands/auth.ts` should be sequenced or merged carefully because US2, US3, US4, and US5 all touch command routing.

---

## Notes

- Every task includes a concrete file path.
- [P] marks tasks that can be done in parallel without editing the same primary file.
- Tests should be written first for each story and should fail before implementation.
- Do not print Cookie values, token values, or full sensitive service responses in tests or CLI output.
