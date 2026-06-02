# Feature Specification: Login and History Authorization Reliability

**Feature Branch**: `005-login-history-auth`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "修复 login --web/default login 和 history -p=1 的授权与参数问题"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recover Browser Login Reliably (Priority: P1)

As a user who is already logged in to BOSS in a local browser, I want `login --web` to either reuse that browser session successfully or tell me exactly why it cannot, so I can complete CLI authentication without being left waiting.

**Why this priority**: The user reported that the browser is already logged in, but `login --web` opens or waits without completing. This blocks all authenticated CLI workflows.

**Independent Test**: Can be tested by running `login --web` with a browser session that is already logged in and confirming the command reaches a clear success, timeout, or actionable failure state without indefinite waiting.

**Acceptance Scenarios**:

1. **Given** a supported local browser has an active BOSS login session, **When** the user runs `boss login --web`, **Then** the CLI verifies and saves a usable session and reports the authenticated account summary.
2. **Given** the browser cannot be opened automatically, **When** the user runs `boss login --web`, **Then** the CLI provides the login URL, continues a bounded recovery attempt, and exits with an actionable message if recovery is not possible.
3. **Given** the browser page is open but the CLI cannot recover usable credentials, **When** the recovery window ends, **Then** the CLI reports which recovery condition failed and suggests the next login method.

---

### User Story 2 - Make Default Login Complete a Usable Flow (Priority: P1)

As a first-time or returning user, I want `boss login` without flags to try the best available login path and not fail immediately when browser cookie extraction misses a session, so the default command is a dependable entry point.

**Why this priority**: The default `login` currently reports no verifiable session and asks the user to choose another mode. The reference behavior and user expectation are that the default login should guide or continue to a usable authentication path.

**Independent Test**: Can be tested by running `boss login` in three states: valid browser session, no browser session, and unsupported browser recovery. Each state must end with verified login or a clear next action.

**Acceptance Scenarios**:

1. **Given** a supported browser has a valid BOSS session, **When** the user runs `boss login`, **Then** the CLI verifies and saves that session without requiring extra flags.
2. **Given** no browser session can be recovered, **When** the user runs `boss login`, **Then** the CLI offers or proceeds to a fallback login path instead of ending with only a generic failure.
3. **Given** authentication cannot be completed automatically, **When** the command exits, **Then** the user sees a concise explanation and the exact command to run next.

---

### User Story 3 - Fetch Browsing History Without Missing Parameters (Priority: P1)

As an authenticated job seeker, I want `history -p=1` to return browsing history or a meaningful empty-state message, so I can rely on the personal center workflow after login.

**Why this priority**: The user reported `history -p=1` returns "缺少必要参数 (code=17)", which means the command surface exists but the live request is not valid.

**Independent Test**: Can be tested with an authenticated account by running `boss history -p=1` and confirming the command does not fail with missing-parameter errors.

**Acceptance Scenarios**:

1. **Given** the user has a verified authenticated session, **When** they run `boss history -p=1`, **Then** the command returns browsing history results or a clear no-history message.
2. **Given** the user is not authenticated, **When** they run `boss history -p=1`, **Then** the command reports that login is required and does not expose a low-level missing-parameter error.
3. **Given** BOSS requires additional request context for browsing history, **When** the command runs, **Then** the CLI supplies the required context or reports an actionable compatibility error without leaking sensitive values.

### Edge Cases

- The browser is already logged in but cookies are locked, encrypted, stale, or stored in a non-default profile.
- The browser opens successfully but the user never completes login or closes the browser before recovery.
- The system cannot open a browser and the user manually opens the login URL.
- QR login or browser-assisted login returns a partial credential that cannot pass authorization verification.
- Saved credentials exist but are expired, partially valid, or valid for search but not for history.
- Browsing history is empty for the account.
- BOSS returns anti-bot, authorization, or missing-parameter errors that need user-friendly classification.
- JSON output mode is requested; machine-readable output must remain parseable and must not be mixed with progress text.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CLI MUST complete `login --web` with one of three bounded outcomes: verified login success, actionable recovery failure, or user-cancelled/timeout state.
- **FR-002**: The CLI MUST detect and verify a usable authenticated session when the user is already logged in through a supported local browser.
- **FR-003**: The CLI MUST avoid indefinite waiting during browser-based login recovery and MUST communicate the current recovery state to the user.
- **FR-004**: The CLI MUST provide a manual login URL when automatic browser opening is unavailable or fails.
- **FR-005**: The default `login` command MUST attempt a complete user-facing authentication flow, including a fallback path when browser session extraction does not produce a verifiable session.
- **FR-006**: The CLI MUST save credentials only after they pass authorization verification for authenticated job-seeker workflows.
- **FR-007**: Failed login attempts MUST include a clear failure reason and at least one concrete next action, without exposing cookies, tokens, or private account values.
- **FR-008**: The CLI MUST preserve existing explicit login modes for QR login and browser/source selection.
- **FR-009**: The CLI MUST support compatibility with the reference browser-source wording so users can map `--cookie-source` style instructions to the local login flow.
- **FR-010**: The `history` command MUST send all required non-sensitive request context for the first page and subsequent pages.
- **FR-011**: `history -p=1` MUST NOT fail with a generic "缺少必要参数" error when the user has a verified session; it must return results, an empty state, or an actionable classified error.
- **FR-012**: The `history` command MUST distinguish unauthenticated, expired-session, missing-request-context, empty-history, and remote-service failure cases in user-visible output.
- **FR-013**: The feature MUST support both human-readable output and machine-readable JSON behavior for affected commands without mixing progress text into JSON output.
- **FR-014**: The feature MUST include regression coverage for successful login recovery, login failure diagnostics, default login fallback, and history page parameter handling.
- **FR-015**: The feature MUST NOT store or display raw cookies, tokens, phone numbers, chat content, resume content, or private browsing-history details in logs or test artifacts.

### Key Entities *(include if feature involves data)*

- **Login Attempt**: A single authentication run, including requested mode, browser/source selection, recovery state, verification result, and next actions.
- **Credential Candidate**: A potential session recovered from browser, QR, web, or saved storage before authorization verification.
- **Verified Session**: A credential set that has passed authorization checks and can be saved for later commands.
- **History Request**: A browsing-history retrieval attempt, including page number, required request context, authentication state, and classified outcome.
- **Diagnostic Outcome**: A user-facing classification such as success, timeout, unsupported browser, expired session, missing request context, empty history, or remote-service failure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a browser environment with an existing BOSS login session, `login --web` completes with verified login success or an actionable classified failure within 90 seconds.
- **SC-002**: The default `login` command no longer ends with only "未检测到可验证的登录会话" when a fallback login path can still be attempted or offered.
- **SC-003**: `history -p=1` produces history results, an empty-state message, or a classified actionable error in 100% of authenticated test runs; it does not surface raw "缺少必要参数" as the final user-facing outcome.
- **SC-004**: 100% of affected error paths include at least one concrete next action that a user can run or perform.
- **SC-005**: 100% of affected JSON-mode outputs remain valid JSON and contain no human progress text on stdout.
- **SC-006**: Regression tests cover at least one success and one failure path for login recovery, default login fallback, and history parameter handling.
- **SC-007**: No test fixture, log, or generated artifact contains raw cookies, tokens, phone numbers, chat content, resume content, or private browsing-history values.

## Assumptions

- The target user is running the CLI on a local developer machine with access to a browser or QR login path.
- Browser recovery is best-effort because browser storage, encryption, profile names, and OS support vary.
- Live BOSS verification may require a real account, but automated tests can use mocked responses for deterministic regression coverage.
- The scope is limited to authentication reliability and job-seeker browsing history; recruiter parity, YAML output, and other audit findings are out of scope for this feature.
- Existing saved credentials and explicit login flags should continue to work unless they are invalid or unverifiable.
