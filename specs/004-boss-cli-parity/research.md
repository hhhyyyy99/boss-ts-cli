# Research: BOSS CLI Command Parity Audit

## Decision: Treat the feature as an audit artifact, not remediation implementation

**Rationale**: The clarified spec explicitly says missing parity items must be added to the report, JSON matrix, and remediation list, but command behavior must not be automatically modified. Keeping this feature artifact-only prevents scope creep and makes the later implementation work easier to task by priority.

**Alternatives considered**:

- Implement P0/P1 gaps immediately: rejected because it contradicts FR-016 and mixes discovery with remediation.
- Only produce a human-readable report: rejected because the JSON matrix is required for stable downstream planning and regression checks.

## Decision: Use the reference repository at commit `dcd8331` as the comparison baseline

**Rationale**: The spec records `jackwener/boss-cli` commit `dcd8331` as the retrieved baseline. Pinning the baseline prevents moving-target comparisons when the reference project changes.

**Alternatives considered**:

- Compare against the latest remote branch each time: rejected because results would drift over time.
- Compare against README only: rejected because README can diverge from actual command definitions and tests.

## Decision: Validate primarily with static inventory, help output, and tests

**Rationale**: Some BOSS flows require valid login state, recruiter role, browser-generated request context, or anti-bot-sensitive cookies. Static/help/test evidence can fully validate command surface parity while live behavior is flagged separately when not safe or practical to verify.

**Alternatives considered**:

- Require full live verification for every command: rejected because account role and anti-bot constraints would block completion.
- Use README-only comparison: rejected because it misses local behavior and options.

## Decision: Model every comparison as a parity finding with status and priority

**Rationale**: The audit must support actionable planning. A normalized finding model ensures each missing or partial item has evidence, impact, verification source, and exactly one P0/P1/P2/P3 priority.

**Alternatives considered**:

- Free-form notes: rejected because they cannot reliably drive tasks or rechecks.
- Module-only summary: rejected because it hides option-level and output-mode gaps.

## Decision: Store artifacts in the feature directory

**Rationale**: Feature-local artifacts are discoverable by `/speckit-plan`, `/speckit-tasks`, and future review without creating project-root documentation churn. Long-term docs can be promoted after remediation decisions.

**Alternatives considered**:

- Store under `docs/`: rejected for now because this is a planning baseline rather than stable user documentation.
- Store only in `plan.md`: rejected because the spec requires separate report and JSON matrix artifacts.

## Decision: Do not include sensitive live account data

**Rationale**: Command parity can be assessed without persisting cookies, tokens, phone numbers, chat content, or resume data. Live-only findings should record the missing verification condition, not the underlying secret or private response payload.

**Alternatives considered**:

- Capture live request/response fixtures: rejected unless sanitized and separately approved in a later testing feature.
- Store raw CLI outputs from authenticated commands: rejected due to privacy and credential risk.
