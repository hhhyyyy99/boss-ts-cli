# Tasks: BOSS CLI Command Parity Audit

**Input**: Design documents from `/specs/004-boss-cli-parity/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/parity-matrix.schema.md](./contracts/parity-matrix.schema.md), [quickstart.md](./quickstart.md)

**Tests**: No code-level TDD was requested. Validation tasks below are artifact and consistency checks required by the spec.

**Organization**: Tasks are grouped by user story so each deliverable can be completed and reviewed independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare source evidence and artifact shells without modifying CLI behavior.

- [X] T001 Create empty artifact shell `specs/004-boss-cli-parity/parity-audit.md` with baseline, scope, command parity, gaps, live verification, and remediation headings
- [X] T002 Create empty JSON artifact shell `specs/004-boss-cli-parity/parity-matrix.json` matching the top-level shape in `specs/004-boss-cli-parity/contracts/parity-matrix.schema.md`
- [X] T003 [P] Capture local top-level help evidence in `specs/004-boss-cli-parity/parity-audit.md` from `node dist/index.js --help`
- [X] T004 [P] Capture local recruiter help evidence in `specs/004-boss-cli-parity/parity-audit.md` from `node dist/index.js recruiter --help`
- [X] T005 [P] Capture reference baseline metadata in `specs/004-boss-cli-parity/parity-audit.md` from `https://github.com/jackwener/boss-cli` commit `dcd8331`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build normalized inventories and validation rules that all user stories depend on.

**CRITICAL**: No user story work should begin until the inventory shape and evidence sources are ready.

- [X] T006 Define the complete `baseline`, `local`, `inventories`, `findings`, and `remediation` sections in `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T007 Normalize workflow areas and command path naming rules in `specs/004-boss-cli-parity/parity-audit.md`
- [X] T008 [P] Add reference evidence source records for README, command source, and tests in `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T009 [P] Add local evidence source records for help output, source files, and tests in `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T010 Document sensitive-data exclusion rules in `specs/004-boss-cli-parity/parity-audit.md`
- [X] T011 Validate `specs/004-boss-cli-parity/parity-matrix.json` parses as JSON and contains no Cookie/token/private account values

**Checkpoint**: Foundation ready. Inventories can now be filled and compared by user story.

---

## Phase 3: User Story 1 - Understand Command Coverage (Priority: P1) MVP

**Goal**: Produce a complete command coverage comparison for reference and local CLIs.

**Independent Test**: Compare `parity-audit.md` and `parity-matrix.json` against local/reference help and source evidence; every reference command appears exactly once with a parity status and option coverage is calculated.

### Implementation for User Story 1

- [X] T012 [P] [US1] Add all reference top-level commands to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T013 [P] [US1] Add all local top-level commands to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T014 [P] [US1] Add all reference recruiter subcommands including `recruiter geek` to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T015 [P] [US1] Add all local recruiter/hr subcommands to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T016 [P] [US1] Add reference global and structured output modes, including JSON/YAML behavior, to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T017 [P] [US1] Add local global and structured output modes, including JSON behavior and any missing YAML support, to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T018 [P] [US1] Add required arguments, options, defaults, choices, and aliases for every reference top-level command to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T019 [P] [US1] Add required arguments, options, defaults, choices, and aliases for every local top-level command to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T020 [P] [US1] Add required arguments, options, defaults, choices, and aliases for every reference recruiter subcommand to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T021 [P] [US1] Add required arguments, options, defaults, choices, and aliases for every local recruiter/hr subcommand to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T022 [US1] Add command coverage tables for auth, job search, personal center, social, utility, and recruiter workflows to `specs/004-boss-cli-parity/parity-audit.md`
- [X] T023 [US1] Add option-level parity tables and 95% option coverage calculation to `specs/004-boss-cli-parity/parity-audit.md`
- [X] T024 [US1] Add Full status findings for matched commands/options/output modes to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T025 [US1] Add parity findings for missing, partial, blocked, and intentionally different command names, aliases, arguments, options, and output modes to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T026 [US1] Compare JSON/YAML support, success envelope shape, error envelope shape, and stdout/stderr separation in `specs/004-boss-cli-parity/parity-audit.md`
- [X] T027 [US1] Add structured output findings for JSON/YAML, success envelopes, error envelopes, and stdout/stderr separation to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T028 [US1] Mirror every US1 finding from `specs/004-boss-cli-parity/parity-matrix.json` into `specs/004-boss-cli-parity/parity-audit.md`
- [X] T029 [US1] Verify every reference command and recruiter subcommand appears exactly once in `specs/004-boss-cli-parity/parity-matrix.json`

**Checkpoint**: User Story 1 is independently reviewable as a complete command-surface and option-level coverage audit.

---

## Phase 4: User Story 2 - Prioritize Restoration Gaps (Priority: P2)

**Goal**: Classify each non-full parity finding by user impact and remediation priority.

**Independent Test**: Review `parity-audit.md` and confirm every non-full finding has a named gap, affected workflow, affected users, expected benefit, recommended action, suggested next phase, and exactly one P0/P1/P2/P3 priority.

### Implementation for User Story 2

- [X] T030 [US2] Add P0/P1/P2/P3 priority definitions and assignment rules to `specs/004-boss-cli-parity/parity-audit.md`
- [X] T031 [US2] Assign exactly one priority to every non-full finding in `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T032 [US2] Add gap, impact, and recommendedAction fields for every non-full finding in `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T033 [US2] Add `severity`, `affectedUsers`, `expectedBenefit`, and `suggestedNextPhase` fields for every non-full finding in `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T034 [US2] Populate remediation counts by status and priority in `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T035 [US2] Create top five remediation items in `specs/004-boss-cli-parity/parity-audit.md`
- [X] T036 [US2] Create recommended remediation batches in `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T037 [US2] Add live-verification-required flags and conditions for account-role or anti-bot-sensitive findings in `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T038 [US2] Add live-verification-required section in `specs/004-boss-cli-parity/parity-audit.md`
- [X] T039 [US2] Add behavior parity findings for request context, safety confirmations, default values, auth prerequisites, recruiter role prerequisites, and unsupported authenticated flows to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T040 [US2] Add local-only command/option extension classification to `specs/004-boss-cli-parity/parity-audit.md`
- [X] T041 [US2] Add local-only command/option extension findings to `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T042 [US2] Verify no discovered missing parity item remains only in notes or terminal output outside `specs/004-boss-cli-parity/parity-audit.md` and `specs/004-boss-cli-parity/parity-matrix.json`

**Checkpoint**: User Story 2 is independently reviewable as an actionable prioritized remediation baseline.

---

## Phase 5: User Story 3 - Produce an Actionable Migration Baseline (Priority: P3)

**Goal**: Make the audit stable enough for follow-up planning and future regression checks.

**Independent Test**: Use the audit artifacts as input to planning; each priority gap can become an independently trackable follow-up task and the same baseline can be rerun later.

### Implementation for User Story 3

- [X] T043 [US3] Add artifact usage instructions and rerun procedure to `specs/004-boss-cli-parity/parity-audit.md`
- [X] T044 [US3] Add baseline source list and retrieval date to `specs/004-boss-cli-parity/parity-audit.md`
- [X] T045 [US3] Record local branch, build command used, dist freshness note, and worktree state at evidence capture time in `specs/004-boss-cli-parity/parity-audit.md`
- [X] T046 [US3] Add evidence conflict resolution rules for README vs help output vs source vs tests in `specs/004-boss-cli-parity/parity-audit.md`
- [X] T047 [US3] Add evidence conflict resolution metadata for conflicting sources in `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T048 [US3] Ensure `specs/004-boss-cli-parity/parity-matrix.json` finding ids are stable, unique, and suitable for future task references
- [X] T049 [US3] Add recommended follow-up feature groupings to `specs/004-boss-cli-parity/parity-audit.md`
- [X] T050 [US3] Cross-check that every finding id in `specs/004-boss-cli-parity/parity-matrix.json` appears in `specs/004-boss-cli-parity/parity-audit.md`
- [X] T051 [US3] Cross-check that every finding listed in `specs/004-boss-cli-parity/parity-audit.md` appears in `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T052 [US3] Verify `specs/004-boss-cli-parity/parity-audit.md` and `specs/004-boss-cli-parity/parity-matrix.json` are discoverable from `specs/004-boss-cli-parity/quickstart.md`

**Checkpoint**: User Story 3 is independently reviewable as a stable migration baseline.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all artifacts.

- [X] T053 [P] Validate all links in `specs/004-boss-cli-parity/parity-audit.md`
- [X] T054 [P] Validate JSON syntax and required invariants in `specs/004-boss-cli-parity/parity-matrix.json`
- [X] T055 [P] Check `specs/004-boss-cli-parity/parity-audit.md` contains no sensitive Cookie/token/private account values
- [X] T056 [P] Check `specs/004-boss-cli-parity/parity-matrix.json` contains no sensitive Cookie/token/private account values
- [X] T057 Run `npm run typecheck` to confirm the repository remains type-safe
- [X] T058 Run `npm run test` to confirm existing tests still pass
- [X] T059 Run the validation steps from `specs/004-boss-cli-parity/quickstart.md`
- [X] T060 Update `specs/004-boss-cli-parity/tasks.md` task checkboxes only after the corresponding artifact work is complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user story phases.
- **User Story 1 (Phase 3)**: Depends on Foundational completion and is the MVP.
- **User Story 2 (Phase 4)**: Depends on User Story 1 findings being present.
- **User Story 3 (Phase 5)**: Depends on User Story 1 and User Story 2 artifacts.
- **Polish (Phase 6)**: Depends on all selected user stories.

### User Story Dependencies

- **US1 Understand Command Coverage**: No dependency on other user stories after foundation.
- **US2 Prioritize Restoration Gaps**: Requires US1 findings to exist.
- **US3 Produce Migration Baseline**: Requires US1 coverage and US2 priorities.

### Parallel Opportunities

- T003, T004, and T005 can run in parallel after artifact shells exist.
- T008 and T009 can run in parallel after JSON sections are defined.
- T012 through T021 can run in parallel because they populate separate command and option inventory categories.
- T026 and T027 can run in parallel with T023 after command inventories exist because they focus on structured output behavior.
- T053 through T056 can run in parallel because they validate different artifacts/concerns.

---

## Parallel Example: User Story 1

```text
Task: "T012 Add all reference top-level commands to specs/004-boss-cli-parity/parity-matrix.json"
Task: "T013 Add all local top-level commands to specs/004-boss-cli-parity/parity-matrix.json"
Task: "T018 Add required arguments, options, defaults, choices, and aliases for every reference top-level command to specs/004-boss-cli-parity/parity-matrix.json"
Task: "T020 Add required arguments, options, defaults, choices, and aliases for every reference recruiter subcommand to specs/004-boss-cli-parity/parity-matrix.json"
```

## Parallel Example: Final Validation

```text
Task: "T053 Validate all links in specs/004-boss-cli-parity/parity-audit.md"
Task: "T054 Validate JSON syntax and required invariants in specs/004-boss-cli-parity/parity-matrix.json"
Task: "T055 Check specs/004-boss-cli-parity/parity-audit.md contains no sensitive Cookie/token/private account values"
Task: "T056 Check specs/004-boss-cli-parity/parity-matrix.json contains no sensitive Cookie/token/private account values"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 command and option coverage.
4. Stop and validate that every reference command appears exactly once with a parity status and option coverage calculation.

### Incremental Delivery

1. Deliver US1 to establish complete command and option coverage.
2. Add US2 to make every gap actionable with P0/P1/P2/P3 priority and remediation metadata.
3. Add US3 to make the artifacts reusable for future planning and regression checks.
4. Run Phase 6 validation.

### Scope Guard

This feature must not implement missing commands, options, aliases, output modes, or behavior. Any remediation remains documented as follow-up work in `specs/004-boss-cli-parity/parity-audit.md` and `specs/004-boss-cli-parity/parity-matrix.json`.
