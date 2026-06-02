# Data Model: BOSS CLI Command Parity Audit

## ReferenceBaseline

Represents the fixed reference source used for comparison.

**Fields**:

- `repositoryUrl`: string, must be `https://github.com/jackwener/boss-cli`
- `commit`: string, pinned reference commit such as `dcd8331`
- `retrievedAt`: ISO date string
- `sources`: array of EvidenceSource identifiers used to build the inventory

**Relationships**:

- Has many ReferenceCommand records.
- Is referenced by every ParityFinding.

## CommandInventory

Represents a complete command surface for either the reference CLI or local CLI.

**Fields**:

- `origin`: enum `reference | local`
- `generatedAt`: ISO datetime string
- `commands`: array of Command records
- `globalOptions`: array of Option records
- `structuredOutputModes`: array of strings such as `json` or `yaml`

**Validation Rules**:

- `origin` is required.
- Command paths must be unique within one inventory.

## Command

Represents one command or subcommand.

**Fields**:

- `path`: string, e.g. `search`, `recruiter resume-download`
- `aliases`: string array, e.g. `hr` for `recruiter`
- `description`: string or null
- `arguments`: array of Argument records
- `options`: array of Option records
- `workflowArea`: enum `auth | job_search | personal_center | social | recruiter | utility | structured_output`
- `requiresAuth`: boolean
- `requiresRecruiterRole`: boolean
- `liveVerificationSensitive`: boolean

**Validation Rules**:

- `path` is required and normalized with spaces between nested commands.
- Option names are normalized to long names when present, with short aliases retained.
- Commands requiring recruiter account behavior set `requiresRecruiterRole` to true.

## Argument

Represents a required or optional positional argument.

**Fields**:

- `name`: string
- `required`: boolean
- `valueHint`: string or null

## Option

Represents a command-line option.

**Fields**:

- `long`: string or null
- `short`: string or null
- `requiresValue`: boolean
- `defaultValue`: string, number, boolean, or null
- `description`: string or null
- `choices`: string array or null

**Validation Rules**:

- At least one of `long` or `short` is required.
- Options with values must record whether the value is required.

## EvidenceSource

Represents proof used to classify a command or behavior.

**Fields**:

- `type`: enum `readme | help_output | source | test | live_sample | manual_note`
- `location`: string, such as file path, command invocation, or reference URL
- `capturedAt`: ISO datetime string
- `summary`: string

**Validation Rules**:

- Sensitive values must be redacted or omitted.
- Live samples must not include Cookie, token, phone, chat message, or resume content values.

## ParityFinding

Represents a comparison result for one command, option, output mode, or behavior.

**Fields**:

- `id`: stable string identifier
- `referencePath`: string or null
- `localPath`: string or null
- `workflowArea`: same enum as Command
- `subject`: enum `command | alias | argument | option | output_mode | behavior`
- `status`: enum `Full | Partial | Missing | Blocked | Intentionally Different`
- `priority`: enum `P0 | P1 | P2 | P3 | null`
- `gap`: string or null
- `impact`: string
- `recommendedAction`: string or null
- `verificationSources`: EvidenceSource identifiers
- `liveVerificationRequired`: boolean
- `liveVerificationCondition`: string or null

**Validation Rules**:

- Any status other than `Full` must have `gap`, `impact`, `recommendedAction`, and exactly one `priority`.
- `Full` findings may have null `priority`.
- `liveVerificationRequired` requires a non-empty `liveVerificationCondition`.
- No discovered missing parity item may exist only in terminal output; it must be represented by a ParityFinding.

## RemediationSummary

Aggregates findings by priority and workflow.

**Fields**:

- `countsByStatus`: object keyed by parity status
- `countsByPriority`: object keyed by P0/P1/P2/P3
- `topItems`: ordered array of ParityFinding ids
- `recommendedBatches`: array of RemediationBatch records

## RemediationBatch

Groups follow-up work without implementing it in this feature.

**Fields**:

- `name`: string
- `priorityRange`: string, e.g. `P0-P1`
- `findingIds`: string array
- `rationale`: string
- `suggestedNextPhase`: string

## State Transitions

```text
Discovered -> Classified -> Prioritized -> IncludedInArtifacts
```

- `Discovered`: a command, option, alias, output mode, or behavior is found in either inventory.
- `Classified`: it receives a parity status.
- `Prioritized`: non-full findings receive exactly one P0/P1/P2/P3 priority.
- `IncludedInArtifacts`: the same finding appears in both `parity-audit.md` and `parity-matrix.json`.
