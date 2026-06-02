# Contract: Authentication Flow Behavior

This contract describes user-visible behavior for `boss login`, `boss login --web`, and related browser-source options.

## Commands

```text
boss login [--qrcode] [--web] [--browser <name>] [--cookie-source <name>] [--cookie-path <path>] [--profile <name>] [--json]
```

## Compatibility Rules

- `--cookie-source <name>` is accepted as compatibility wording for selecting a browser source.
- `--browser <name>` remains accepted.
- If both `--browser` and `--cookie-source` are supplied, the command must reject the ambiguous input with a clear message.
- Existing explicit modes remain available:
  - `--qrcode`: QR-only login path.
  - `--web`: browser-page login and recovery path.
  - `--browser` or `--cookie-source`: specified browser cookie extraction.

## Default Login Contract

When the user runs:

```text
boss login
```

Expected behavior:

1. Attempt automatic browser session recovery.
2. If a candidate credential is found, verify it before saving.
3. If no verifiable browser credential is found, proceed to or offer a fallback login path.
4. Exit with verified success or an actionable classified failure.

The command must not end with only:

```text
未检测到可验证的登录会话
```

when a fallback login path can still be attempted or offered.

## Web Login Contract

When the user runs:

```text
boss login --web
```

Expected behavior:

1. Print that browser-page login has started.
2. Print a manual login URL if automatic browser opening is unavailable or may fail.
3. Attempt to recover a browser session using bounded polling and/or page-cookie import.
4. Verify recovered credentials before saving.
5. Finish within the configured bounded window with one of:
   - verified login success
   - classified timeout
   - classified credential recovery failure
   - user-cancelled state

## Human Output Requirements

- Progress and guidance are written to human-readable output channels, not JSON stdout.
- Failure messages include:
  - what failed
  - whether login was recovered, verified, or timed out
  - at least one concrete next action
- Messages must not include raw cookie values, token values, phone numbers, chat content, resume content, or private account values.

## JSON Output Requirements

In JSON mode, success output must remain a valid envelope with non-sensitive login metadata:

```json
{
  "ok": true,
  "schema_version": "1",
  "data": {
    "message": "登录成功",
    "cookieCount": 3,
    "source": "browser",
    "user": {
      "displayName": "masked-or-non-sensitive-name"
    }
  }
}
```

Failure output must remain a valid envelope with a stable code and message:

```json
{
  "ok": false,
  "schema_version": "1",
  "data": null,
  "error": {
    "code": "authorization_pending_timeout",
    "message": "浏览器登录超时..."
  }
}
```

## Required Regression Coverage

- `login --web` returns recovered browser/page-import credentials before shared verification.
- `login --web` timeout produces a structured auth-flow error with next actions.
- Default `login` has a fallback path when automatic browser extraction yields no candidate credential.
- `--cookie-source` maps to specified browser behavior and conflicts with `--browser` are rejected.
- JSON mode remains parseable for success and error outputs.
