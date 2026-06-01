# Feature Specification: BOSS CLI Command Parity Audit

**Feature Branch**: `004-boss-cli-parity`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "https://github.com/jackwener/boss-cli 根据对标项目看看所有的命令还原度"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand Command Coverage (Priority: P1)

As a maintainer, I want a complete comparison between this CLI and the reference `jackwener/boss-cli` command surface, so I can see which commands, aliases, options, and output modes are fully restored, partially restored, missing, or intentionally different.

**Why this priority**: Without a command-level inventory, later fixes may chase individual bugs while still missing whole user workflows.

**Independent Test**: Can be tested by comparing the generated audit against both CLIs' help output and confirming every reference command appears exactly once with a parity status.

**Acceptance Scenarios**:

1. **Given** the reference project exposes job seeker commands, **When** the audit is generated, **Then** it lists authentication, search, detail/export, recommendation, personal center, greeting, chat, city, and utility commands with their local parity status.
2. **Given** the reference project exposes recruiter commands, **When** the audit is generated, **Then** it lists recruiter search, recommendations, greeting, inbox, reply, chat actions, resume, job management, labels, export, and legacy aliases with their local parity status.
3. **Given** the local CLI has extra or renamed commands, **When** the audit is generated, **Then** those differences are shown as local extensions or compatibility deviations rather than hidden.

---

### User Story 2 - Prioritize Restoration Gaps (Priority: P2)

As a maintainer, I want each gap to be classified by user impact, so I can decide what to fix first instead of treating cosmetic help differences the same as broken core workflows.

**Why this priority**: The goal is not only to count commands but to identify which missing or degraded behaviors block real usage.

**Independent Test**: Can be tested by reviewing the generated gap list and confirming every non-full-parity item has a severity, affected workflow, and recommended next action.

**Acceptance Scenarios**:

1. **Given** a command exists locally but lacks reference options, **When** the audit is generated, **Then** the gap is marked partial and the missing options are named.
2. **Given** a reference command is absent locally, **When** the audit is generated, **Then** the gap is marked missing and assigned a priority based on workflow impact.
3. **Given** a local command fails an expected authenticated workflow, **When** the audit is generated, **Then** the behavior gap is recorded separately from mere command registration.

---

### User Story 3 - Produce an Actionable Migration Baseline (Priority: P3)

As a developer, I want the audit to become a stable baseline for future planning, so implementation work can be split into focused tasks and later rechecked for regressions.

**Why this priority**: A parity report should support the next planning phase, not remain an informal one-off note.

**Independent Test**: Can be tested by using the audit output as input to a plan and confirming each priority gap can become an independently trackable task.

**Acceptance Scenarios**:

1. **Given** the audit finds gaps, **When** the report is complete, **Then** it groups them into recommended implementation batches such as compatibility flags, output formats, recruiter parity, and behavioral fixes.
2. **Given** future changes modify CLI help, **When** the parity check is rerun, **Then** maintainers can detect newly missing or changed commands against the reference baseline.

---

### Edge Cases

- The reference project has commands or aliases documented in README that differ from actual help output.
- The local CLI has commands beyond the reference project, such as different login variants or renamed browser options.
- Some commands are present in help but depend on authentication or BOSS account role, making live behavior difficult to validate for every user.
- The reference project changes after the audit is created; the report must state the source revision or retrieval date used as the comparison baseline.
- Output mode differences, especially JSON/YAML behavior and stdout/stderr separation, may affect agent usage even when the visible command name exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The audit MUST identify the reference command inventory from `jackwener/boss-cli`, including top-level commands, recruiter subcommands, aliases, required arguments, options, and supported structured output modes.
- **FR-002**: The audit MUST identify the local command inventory using the same categories as the reference inventory.
- **FR-003**: The audit MUST classify every reference command as Full, Partial, Missing, Blocked, or Intentionally Different.
- **FR-004**: The audit MUST include command options in the parity decision, not only command names.
- **FR-005**: The audit MUST cover authentication parity, including default login behavior, browser-source selection, QR login, status validation, logout, and profile display.
- **FR-006**: The audit MUST cover job seeker workflows: search filters, pagination, show/detail navigation, export, recommendations, history, applied jobs, interviews, chat list, greet, batch greet, and cities.
- **FR-007**: The audit MUST cover recruiter workflows: jobs, search, recommendations, greet, batch-view, inbox, reply, chat history, request resume, phone exchange, WeChat exchange, interview invite, unsuitable marking, resume display, resume download, labels, export, job close, job reopen, and reference aliases.
- **FR-008**: The audit MUST cover structured output behavior, including JSON support, YAML support, schema envelope shape, error envelope shape, and whether machine-readable output is kept separate from human-readable progress.
- **FR-009**: The audit MUST identify behavior gaps that are observable even when a command exists, such as missing required request context, missing safety confirmation, incompatible default values, or unsupported authenticated flows.
- **FR-010**: The audit MUST include a prioritized remediation list with severity, affected users, expected benefit, and recommended next phase for each gap.
- **FR-011**: The audit MUST document local extensions that are not present in the reference project, so maintainers can decide whether to keep them as intentional improvements.
- **FR-012**: The audit MUST state the comparison baseline, including the reference repository URL, the retrieval date, and the local feature branch or working state used for comparison.

### Key Entities *(include if feature involves data)*

- **Reference Command**: A command, subcommand, alias, argument, option, or output mode exposed by `jackwener/boss-cli`.
- **Local Command**: A command, subcommand, alias, argument, option, or output mode exposed by this CLI.
- **Parity Finding**: A comparison result for one command or behavior, including status, evidence, user impact, and recommended next action.
- **Workflow Area**: A user-facing grouping such as authentication, job search, personal center, social interaction, recruiter management, export, or structured output.
- **Remediation Priority**: The suggested order for closing gaps based on user impact and dependency relationships.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of reference top-level commands and recruiter subcommands are represented in the audit with a parity status.
- **SC-002**: 100% of non-full-parity findings include a named gap, severity, affected workflow, and recommended next action.
- **SC-003**: At least 95% of command options documented by the reference project are either matched locally or explicitly recorded as a gap or intentional difference.
- **SC-004**: A maintainer can identify the top five remediation items from the report in under 5 minutes.
- **SC-005**: The audit can be rerun later against the same baseline and produce comparable categories without reinterpreting the scope.

## Assumptions

- The first deliverable is an audit and planning baseline, not automatic implementation of every missing command.
- The reference project is `https://github.com/jackwener/boss-cli`, using its README, help output, tests, and command definitions as the comparison source.
- The reference baseline for this specification was retrieved on 2026-06-01 from commit `dcd8331` (`feat: add recruiter (雇主端) mode — 20 commands for employers (#17)`).
- Behavioral validation may use mocked or help-based evidence when live BOSS account role, anti-bot checks, or authentication restrictions prevent safe live execution.
- Local commands that intentionally exceed the reference project should be preserved unless the audit identifies a compatibility problem.
- Command parity includes user-visible behavior and machine-readable output compatibility, not just command names.
