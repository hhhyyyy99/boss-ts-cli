# Tasks: Login and History Authorization Reliability

**Input**: Design documents from `/specs/005-login-history-auth/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/auth-flow.contract.md](./contracts/auth-flow.contract.md), [contracts/history-flow.contract.md](./contracts/history-flow.contract.md), [quickstart.md](./quickstart.md)

**Tests**: Required by FR-014 and SC-006. Test tasks must be written before the corresponding implementation tasks and should fail before the fix is implemented.

**Organization**: Tasks are grouped by user story so `login --web`, default `login`, and `history -p=1` can be implemented and validated as independent increments after the shared foundation.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm current command behavior and prepare focused test files without changing runtime behavior.

- [X] T001 Capture current `node dist/index.js login --help` output notes in `specs/005-login-history-auth/quickstart.md`
- [X] T002 Capture current `node dist/index.js history --help` output notes in `specs/005-login-history-auth/quickstart.md`
- [X] T003 [P] Review current web login timeout/import behavior in `src/login/web-login.ts`
- [X] T004 [P] Review current login option handling in `src/commands/auth.ts`
- [X] T005 [P] Review current history request parameters and errors in `src/commands/search.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared diagnostics and test support required by all three user stories.

**CRITICAL**: No user story implementation should begin until shared error classification and test helpers are ready.

- [X] T006 Add auth/history diagnostic error codes to `src/schema.ts`
- [X] T007 Add classified auth/history error types or helpers to `src/exceptions.ts`
- [X] T008 Add non-sensitive diagnostic outcome helpers for auth/history failures in `src/commands/common.ts`
- [X] T009 [P] Add login flow mock helpers in `tests/helpers/auth-mocks.ts`
- [X] T010 [P] Add API response/error mock helpers for history flows in `tests/helpers/auth-mocks.ts`
- [X] T011 Verify shared diagnostic helpers never include raw cookie/token values in `tests/unit/auth.test.ts`

**Checkpoint**: Shared diagnostics and test utilities are ready for user story work.

---

## Phase 3: User Story 1 - Recover Browser Login Reliably (Priority: P1) MVP

**Goal**: `boss login --web` reaches verified success, classified timeout, or actionable failure without indefinite waiting.

**Independent Test**: Run web-login unit tests and verify `login --web` recovery states complete with structured next actions.

### Tests for User Story 1

- [X] T012 [P] [US1] Add test for successful web recovered browser cookies in `tests/unit/login-web.test.ts`
- [X] T013 [P] [US1] Add test for web login timeout classified error and next actions in `tests/unit/login-web.test.ts`
- [X] T014 [P] [US1] Add test for manual URL/open-browser failure continuing to bounded recovery in `tests/unit/login-web.test.ts`
- [X] T015 [P] [US1] Add test that web login JSON-mode failures remain parseable envelopes in `tests/unit/login-web.test.ts`

### Implementation for User Story 1

- [X] T016 [US1] Refactor web login recovery states and bounded timeout configuration in `src/login/web-login.ts`
- [X] T017 [US1] Ensure browser open failure preserves manual URL and continues recovery in `src/login/web-login.ts`
- [X] T018 [US1] Ensure page-cookie import and browser-cookie polling return credential candidates without leaking raw values in `src/login/web-login.ts`
- [X] T019 [US1] Map web login timeout and recovery failures to structured AuthFlowError next actions in `src/login/web-login.ts`
- [X] T020 [US1] Update web login handling messages and JSON-safe error behavior in `src/commands/auth.ts`
- [X] T021 [US1] Run `npm run test -- tests/unit/login-web.test.ts` for web login recovery

**Checkpoint**: `login --web` is independently testable and no longer has an unbounded/no-follow-up state.

---

## Phase 4: User Story 2 - Make Default Login Complete a Usable Flow (Priority: P1)

**Goal**: `boss login` attempts a complete authentication path and supports `--cookie-source` compatibility while preserving explicit modes.

**Independent Test**: Run default-login and specified-browser tests and verify default login has a fallback/actionable path when browser extraction misses.

### Tests for User Story 2

- [X] T022 [P] [US2] Add test for default login fallback when browser auto-detection returns no cookies in `tests/unit/login-default.test.ts`
- [X] T023 [P] [US2] Add test for default login preserving verified browser-auto candidate behavior in `tests/unit/login-default.test.ts`
- [X] T024 [P] [US2] Add test for `--cookie-source` mapping to specified browser source in `tests/unit/browsers-specified.test.ts`
- [X] T025 [P] [US2] Add test for rejecting combined `--browser` and `--cookie-source` input in `tests/unit/browsers-specified.test.ts`

### Implementation for User Story 2

- [X] T026 [US2] Add `--cookie-source <name>` compatibility option and conflict validation in `src/commands/auth.ts`
- [X] T027 [US2] Route `--cookie-source` through the same specified-browser candidate flow as `--browser` in `src/commands/auth.ts`
- [X] T028 [US2] Implement default login fallback/actionable next-step behavior after empty browser-auto candidate in `src/commands/auth.ts`
- [X] T029 [US2] Preserve explicit `--qrcode`, `--web`, `--browser`, `--cookie-path`, and `--profile` behavior in `src/commands/auth.ts`
- [X] T030 [US2] Ensure default login failure output avoids generic-only "未检测到可验证的登录会话" endings in `src/commands/auth.ts`
- [X] T031 [US2] Run `npm run test -- tests/unit/login-default.test.ts tests/unit/browsers-specified.test.ts`

**Checkpoint**: Default login and browser-source compatibility are independently functional.

---

## Phase 5: User Story 3 - Fetch Browsing History Without Missing Parameters (Priority: P1)

**Goal**: `boss history -p=1` returns results, empty state, or classified actionable error instead of raw missing-parameter failure.

**Independent Test**: Run history unit tests and verify request params, no-auth behavior, empty state, and code 17/19 classification.

### Tests for User Story 3

- [X] T032 [P] [US3] Add test for history request params including page and pageSize in `tests/unit/history-params.test.ts`
- [X] T033 [P] [US3] Add test for classifying BOSS code 17/19 history responses as missing request context in `tests/unit/history-params.test.ts`
- [X] T034 [P] [US3] Add test for empty history producing a non-raw empty-state outcome in `tests/unit/history-params.test.ts`
- [X] T035 [P] [US3] Add test for unauthenticated history avoiding low-level missing-parameter output in `tests/unit/history-params.test.ts`
- [X] T036 [P] [US3] Add test that JSON-mode history errors remain valid envelopes in `tests/unit/history-params.test.ts`

### Implementation for User Story 3

- [X] T037 [US3] Add history-specific error classification helper in `src/commands/search.ts`
- [X] T038 [US3] Ensure history request sends page, pageSize, and required safe context parameters in `src/commands/search.ts`
- [X] T039 [US3] Handle empty history as a clear empty-state result in `src/commands/search.ts`
- [X] T040 [US3] Map unauthenticated, expired-session, missing-context, and remote failures to actionable user output in `src/commands/search.ts`
- [X] T041 [US3] Ensure history JSON-mode success and failure envelopes remain parseable in `src/commands/search.ts`
- [X] T042 [US3] Run `npm run test -- tests/unit/history-params.test.ts`

**Checkpoint**: `history -p=1` is independently testable and no longer exposes raw code 17/19 as the final outcome.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate all affected flows together and update feature documentation.

- [X] T043 [P] Verify login help documents `--cookie-source` and preserved explicit modes with `node dist/index.js login --help`
- [X] T044 [P] Verify history help still documents page selection with `node dist/index.js history --help`
- [X] T045 [P] Scan affected source/tests for raw cookie/token/private-value leakage in `src/commands/auth.ts`, `src/login/web-login.ts`, `src/commands/search.ts`, and `tests/`
- [X] T046 Run `npm run typecheck`
- [X] T047 Run `npm run test`
- [X] T048 Run quickstart validation steps from `specs/005-login-history-auth/quickstart.md`
- [X] T049 Update `specs/005-login-history-auth/quickstart.md` with final observed command behavior notes
- [X] T050 Update `specs/005-login-history-auth/tasks.md` task checkboxes only after corresponding work is complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user story phases.
- **User Story 1 (Phase 3)**: Depends on Foundational completion; MVP for web login reliability.
- **User Story 2 (Phase 4)**: Depends on Foundational completion; can run after or parallel with US1 if file coordination is managed.
- **User Story 3 (Phase 5)**: Depends on Foundational completion; independent of login implementation when mocked credentials are used.
- **Polish (Phase 6)**: Depends on all selected user stories.

### User Story Dependencies

- **US1 Recover Browser Login Reliably**: No dependency on US2/US3 after foundation.
- **US2 Make Default Login Complete a Usable Flow**: Uses shared diagnostics and may reuse US1 messages, but remains independently testable.
- **US3 Fetch Browsing History Without Missing Parameters**: Independent of login implementation under mocked verified sessions.

### Parallel Opportunities

- T003, T004, and T005 can run in parallel during setup.
- T009 and T010 can run in parallel after diagnostic code shape is agreed.
- T012 through T015 can be written in parallel because they are distinct web-login test cases.
- T022 through T025 can be written in parallel because they cover separate default-login/browser-source scenarios.
- T032 through T036 can be written in parallel because they cover separate history outcomes.
- T043 through T045 can run in parallel during polish.

---

## Parallel Example: User Story 1

```text
Task: "T012 [P] [US1] Add test for successful web recovered browser cookies in tests/unit/login-web.test.ts"
Task: "T013 [P] [US1] Add test for web login timeout classified error and next actions in tests/unit/login-web.test.ts"
Task: "T014 [P] [US1] Add test for manual URL/open-browser failure continuing to bounded recovery in tests/unit/login-web.test.ts"
Task: "T015 [P] [US1] Add test that web login JSON-mode failures remain parseable envelopes in tests/unit/login-web.test.ts"
```

## Parallel Example: User Story 3

```text
Task: "T032 [P] [US3] Add test for history request params including page and pageSize in tests/unit/history-params.test.ts"
Task: "T033 [P] [US3] Add test for classifying BOSS code 17/19 history responses as missing request context in tests/unit/history-params.test.ts"
Task: "T034 [P] [US3] Add test for empty history producing a non-raw empty-state outcome in tests/unit/history-params.test.ts"
Task: "T036 [P] [US3] Add test that JSON-mode history errors remain valid envelopes in tests/unit/history-params.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 shared diagnostics and test helpers.
3. Complete Phase 3 `login --web` tests and implementation.
4. Stop and validate `login --web` reaches success, timeout, or actionable failure without indefinite waiting.

### Incremental Delivery

1. Deliver US1 to unblock the reported browser-login stall.
2. Deliver US2 to make default `login` and `--cookie-source` compatibility reliable.
3. Deliver US3 to fix `history -p=1` request context and error classification.
4. Run Phase 6 full validation and quickstart checks.

### Scope Guard

Do not implement recruiter parity, YAML output parity, new credential storage formats, or unrelated command refactors in this feature. Those remain separate follow-up work.
