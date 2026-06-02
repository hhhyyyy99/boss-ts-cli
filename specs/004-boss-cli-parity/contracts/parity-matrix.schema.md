# Contract: parity-matrix.json

`parity-matrix.json` is the machine-readable artifact for the BOSS CLI command parity audit. It must contain the same findings and priorities as `parity-audit.md`.

## File Location

```text
specs/004-boss-cli-parity/parity-matrix.json
```

## Top-Level Shape

```json
{
  "schemaVersion": "1",
  "feature": "004-boss-cli-parity",
  "generatedAt": "2026-06-01T00:00:00.000Z",
  "baseline": {
    "repositoryUrl": "https://github.com/jackwener/boss-cli",
    "commit": "dcd8331",
    "retrievedAt": "2026-06-01",
    "sources": ["reference-readme", "reference-source", "reference-tests"]
  },
  "local": {
    "branch": "004-boss-cli-parity",
    "sources": ["local-help", "local-source", "local-tests"]
  },
  "inventories": {
    "reference": [],
    "local": []
  },
  "findings": [],
  "remediation": {
    "countsByStatus": {},
    "countsByPriority": {},
    "topItems": [],
    "recommendedBatches": []
  }
}
```

## Command Object

```json
{
  "path": "recruiter resume-download",
  "aliases": [],
  "description": "Download candidate resume as Markdown",
  "arguments": [
    { "name": "encryptGeekId", "required": true, "valueHint": "candidate id" }
  ],
  "options": [
    { "long": "--job", "short": null, "requiresValue": true, "defaultValue": "", "description": "associated job id", "choices": null }
  ],
  "workflowArea": "recruiter",
  "requiresAuth": true,
  "requiresRecruiterRole": true,
  "liveVerificationSensitive": true
}
```

## Finding Object

```json
{
  "id": "recruiter-geek-alias-missing",
  "referencePath": "recruiter geek",
  "localPath": null,
  "workflowArea": "recruiter",
  "subject": "command",
  "status": "Missing",
  "priority": "P2",
  "gap": "Reference exposes the legacy recruiter geek command; local CLI has no equivalent alias.",
  "severity": "medium",
  "affectedUsers": ["recruiters using reference-compatible legacy shortcuts"],
  "impact": "Users following reference documentation cannot use the legacy shortcut.",
  "expectedBenefit": "Reference-compatible recruiter navigation can be planned without rediscovering this gap.",
  "recommendedAction": "Add compatibility alias or document intentional difference in a follow-up remediation feature.",
  "suggestedNextPhase": "follow-up implementation feature",
  "verificationSources": ["reference-source", "local-help"],
  "liveVerificationRequired": false,
  "liveVerificationCondition": null
}
```

## Enums

### `workflowArea`

- `auth`
- `job_search`
- `personal_center`
- `social`
- `recruiter`
- `utility`
- `structured_output`

### `subject`

- `command`
- `alias`
- `argument`
- `option`
- `output_mode`
- `behavior`

### `status`

- `Full`
- `Partial`
- `Missing`
- `Blocked`
- `Intentionally Different`

### `priority`

- `P0`: blocker that prevents core parity claims
- `P1`: high-impact workflow gap
- `P2`: compatibility or completeness gap
- `P3`: polish or low-risk documentation gap
- `null`: allowed only for `Full` findings

### `severity`

- `critical`: prevents credible parity baseline
- `high`: blocks a major workflow or machine-readable compatibility claim
- `medium`: creates incomplete compatibility or validation coverage
- `low`: polish, documentation, or low-risk compatibility issue

## Required Invariants

- Every reference command appears in `inventories.reference`.
- Every local command appears in `inventories.local`.
- Every discovered missing command, option, alias, output mode, or behavior appears in `findings`.
- Every finding with status other than `Full` has exactly one non-null priority.
- Every finding with status other than `Full` has non-empty `severity`, `affectedUsers`, `expectedBenefit`, `recommendedAction`, and `suggestedNextPhase` fields.
- Every `liveVerificationRequired: true` finding has a non-empty `liveVerificationCondition`.
- No Cookie, token, phone number, chat message body, or resume content value may appear in this file.
- The set of finding ids must match the finding ids listed in `parity-audit.md`.
