# Data Model: Login and History Authorization Reliability

## LoginAttempt

Represents one user-triggered authentication run.

**Fields**:

- `mode`: enum `default | web | qrcode | browser_specified`
- `requestedBrowser`: string or null
- `cookieSourceAliasUsed`: boolean
- `startedAt`: ISO datetime string
- `completedAt`: ISO datetime string or null
- `state`: enum `started | opening_browser | waiting_for_browser | importing_page_cookie | verifying | succeeded | failed | timed_out | cancelled`
- `diagnosticOutcome`: DiagnosticOutcome
- `nextActions`: string array

**Validation Rules**:

- Every terminal state must have a diagnostic outcome.
- Failed, timed-out, or cancelled attempts must include at least one next action.
- Raw cookie values and token values must never be stored in this entity.

## CredentialCandidate

Represents a potential login session before verification.

**Fields**:

- `source`: enum `browser | qrcode | web | saved`
- `method`: enum `browser_auto | browser_specified | qrcode | web`
- `sourceDetail`: string or null, such as browser/profile name without sensitive values
- `cookieCount`: number
- `hasRequiredSessionMarkers`: boolean
- `acquiredAt`: ISO datetime string

**Validation Rules**:

- Candidate metadata may include cookie names/counts only when needed for diagnostics.
- Candidate metadata must not include raw cookie values.
- A candidate cannot become a VerifiedSession until authorization verification succeeds.

## VerifiedSession

Represents credentials that are safe to save and use for authenticated job-seeker commands.

**Fields**:

- `source`: enum `browser | qrcode | web | saved`
- `method`: enum `browser_auto | browser_specified | qrcode | web`
- `accountSummary`: object with non-sensitive display information
- `verifiedAt`: ISO datetime string
- `expiresAt`: ISO datetime string or null

**Validation Rules**:

- Must be created only from a credential candidate that passes authorization verification.
- Must not expose raw cookies in command output.
- Must be usable by affected authenticated commands after persistence.

## HistoryRequest

Represents a browsing-history command invocation.

**Fields**:

- `page`: positive integer
- `pageSize`: positive integer
- `authenticated`: boolean
- `requestContextPresent`: boolean
- `outcome`: enum `success | empty | unauthenticated | expired_session | missing_request_context | remote_failure`
- `diagnosticOutcome`: DiagnosticOutcome

**Validation Rules**:

- `page` defaults to 1 when absent or invalid input is normalized.
- `pageSize` must be present for BOSS history list requests.
- Missing-request-context failures must include a user-facing next action and must not expose raw remote payloads with private data.

## DiagnosticOutcome

Represents the stable user-facing result for login and history failures.

**Fields**:

- `code`: stable string such as `web_login_timeout`, `credential_unverified`, `history_missing_context`
- `message`: human-readable summary
- `nextActions`: string array
- `safeForJson`: boolean
- `sensitiveValuesRedacted`: boolean

**Validation Rules**:

- `nextActions` is required for every failure outcome.
- `safeForJson` must be true for all values written to JSON output.
- Messages must not include raw cookie/token/private account values.

## State Transitions

```text
LoginAttempt:
started -> opening_browser -> waiting_for_browser -> verifying -> succeeded
started -> opening_browser -> waiting_for_browser -> timed_out
started -> waiting_for_browser -> importing_page_cookie -> verifying -> succeeded
started -> verifying -> failed

CredentialCandidate:
discovered -> verified -> persisted
discovered -> rejected
discovered -> unknown_verification

HistoryRequest:
created -> authenticated -> success
created -> authenticated -> empty
created -> unauthenticated
created -> authenticated -> missing_request_context
created -> authenticated -> remote_failure
```
