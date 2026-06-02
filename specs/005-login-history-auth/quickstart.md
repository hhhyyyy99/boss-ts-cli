# Quickstart: Login and History Authorization Reliability

This feature fixes user-visible reliability for `login --web`, default `login`, and `history -p=1`.

## Prerequisites

- Current feature directory: `specs/005-login-history-auth`
- Local CLI build available via `node dist/index.js`
- For live checks only: a BOSS account and a browser profile that may already be logged in

Do not paste or store raw cookies, tokens, phone numbers, chat content, resume content, or private browsing-history rows in artifacts.

## 1. Automated Validation

Run:

```bash
npm run typecheck
npm run test
```

Expected:

- Type checking passes.
- Unit tests cover login web recovery, default login fallback, `--cookie-source` compatibility, and history request classification.
- Existing smoke tests still pass.

## 2. Help Surface Checks

Run:

```bash
node dist/index.js login --help
node dist/index.js history --help
```

Expected:

- Login help includes the preserved explicit modes and browser-source compatibility wording.
- History help still exposes page selection.

Observed after implementation:

- `node dist/index.js login --help` lists `--qrcode`, `--web`, `--browser <name>`, `--cookie-source <name>`, `--cookie-path <path>`, and `--profile <name>`.
- `node dist/index.js history --help` lists `-p, --page <page>` with default `1` and `--json`.

## 3. Manual Login Checks

Run with a browser that is already logged in to BOSS:

```bash
node dist/index.js login --web
```

Expected:

- Command reaches verified success or classified actionable failure within 90 seconds.
- It does not wait indefinitely.
- It does not print raw cookie values.

Run default login:

```bash
node dist/index.js login
```

Expected:

- If browser cookies are recoverable, login succeeds after verification.
- If browser cookies are not recoverable, the command continues to or offers a fallback path instead of ending with only "未检测到可验证的登录会话".

Run compatibility option:

```bash
node dist/index.js login --cookie-source chrome
```

Expected:

- It behaves like selecting the Chrome browser source.

## 4. Manual History Check

After verified login, run:

```bash
node dist/index.js history -p=1
```

Expected:

- Command returns history rows, a no-history message, or a classified actionable error.
- It does not end with raw "缺少必要参数 (code=17)" as the final user-facing outcome.

JSON mode:

```bash
node dist/index.js --json history -p=1
```

Expected:

- stdout is valid JSON.
- human progress or diagnostics do not pollute stdout.

Observed after implementation in the local non-interactive environment:

- Without saved credentials, `node dist/index.js history -p=1` exits with a classified `not_authenticated` envelope instead of calling the remote API and surfacing raw `code=17`.
- `node dist/index.js --json history -p=1` returns the same parseable JSON error envelope.
- Live `login --web` success with a real BOSS browser session remains an operator/manual check because it requires the user's browser and account state.

## 5. Out of Scope

- Recruiter parity gaps from `004-boss-cli-parity`
- YAML output parity
- New long-term credential storage format
- Live account data capture in repository artifacts
