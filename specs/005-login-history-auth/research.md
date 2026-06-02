# Research: Login and History Authorization Reliability

## Decision: Treat Web Login as a Bounded Recovery State Machine

**Decision**: Model `login --web` as a sequence of visible recovery states: open/manual URL, browser-cookie polling, optional page-cookie import, credential verification, success, timeout, or classified failure.

**Rationale**: The reported problem is not only credential extraction; the command can leave the user with no visible outcome. A bounded state model makes each branch independently testable and gives users a clear end state.

**Alternatives considered**:

- Keep the current long polling loop and only adjust timeout copy. Rejected because it still hides which recovery path failed.
- Require QR login for all failures. Rejected because the user specifically has a logged-in browser session that should be recoverable when possible.

## Decision: Verify Before Persisting Credentials

**Decision**: Continue saving credentials only after authorization verification succeeds for job-seeker workflows.

**Rationale**: Persisting unverified cookies would make later commands fail unpredictably and could make `history` errors look unrelated to login. The spec explicitly requires verified sessions.

**Alternatives considered**:

- Save any recovered cookies and verify later. Rejected because it creates stale/invalid saved state.
- Accept partial QR credentials without verification. Rejected for this feature; partial QR behavior can remain explicit but must be clearly diagnosed.

## Decision: Default Login Should Fall Back Without Losing Explicit Modes

**Decision**: Default `boss login` should first attempt automatic browser-cookie recovery, then offer or proceed to a fallback path when no verifiable session is found. Existing explicit flags (`--qrcode`, `--web`, `--browser`, `--cookie-path`, `--profile`) remain supported, and `--cookie-source` is added as compatibility wording for `--browser`.

**Rationale**: The default command is the user entry point. It should not stop at a generic "no session" state when the CLI can guide a user to a next login mode.

**Alternatives considered**:

- Make `--qrcode` mandatory after browser extraction fails. Rejected because it keeps the default command weak.
- Replace local `--browser` with `--cookie-source`. Rejected because existing local users may already depend on `--browser`.

## Decision: Classify History Outcomes Instead of Passing Raw BOSS Errors Through

**Decision**: The history command should classify outcomes into unauthenticated, expired session, missing request context, empty history, remote service failure, or success.

**Rationale**: The user-facing failure "缺少必要参数 (code=17)" is not actionable. Classification lets the CLI preserve diagnostic value while giving the user a next action and allows JSON mode to expose stable error codes.

**Alternatives considered**:

- Only add more request parameters. Rejected as incomplete because other auth/context failures would still surface as raw API errors.
- Hide all remote errors behind a generic message. Rejected because it makes debugging harder.

## Decision: Keep Live BOSS Coverage Manual and Mock External State in Tests

**Decision**: Automated tests should use mocked browser/session/API responses for deterministic login and history behavior. Quickstart includes optional manual live checks with sensitive-data restrictions.

**Rationale**: Live browser profile, BOSS account state, and anti-bot checks vary by machine and cannot be required for CI. Mocked tests can still prove the command builds the right state and classifies errors correctly.

**Alternatives considered**:

- Require a real BOSS account for tests. Rejected for privacy, reliability, and CI portability.
- Skip tests for browser login. Rejected because regression risk is high and the current issue is user-facing.
