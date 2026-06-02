# Contract: History Command Behavior

This contract describes user-visible behavior for browsing history retrieval.

## Command

```text
boss history [-p, --page <page>] [--json]
```

## Request Rules

- Page defaults to `1`.
- Page values below `1` or invalid page input must be rejected or normalized consistently with other commands.
- The history request must include all required non-sensitive request context for BOSS browsing-history retrieval.
- The first page and subsequent pages must use the same context construction rules.
- The command must not expose raw request headers, cookies, tokens, or private history data in diagnostics.

## Human Output Outcomes

The final user-facing outcome must be one of:

| Outcome | Required Behavior |
| --- | --- |
| Success | Show browsing-history rows and pagination context. |
| Empty history | Show a clear empty-state message, not an error stack. |
| Unauthenticated | Tell the user to run `boss login`. |
| Expired session | Tell the user to refresh login. |
| Missing request context | Explain that the CLI cannot satisfy BOSS request context yet and provide a next action. |
| Remote failure | Show a concise classified service failure with retry guidance. |

The final message must not be only:

```text
缺少必要参数 (code=17)
```

## JSON Output Outcomes

Success output must be a valid JSON envelope:

```json
{
  "ok": true,
  "schema_version": "1",
  "data": {
    "jobList": [],
    "page": 1,
    "hasMore": false
  }
}
```

Failure output must be a valid JSON envelope with a stable error code:

```json
{
  "ok": false,
  "schema_version": "1",
  "data": null,
  "error": {
    "code": "history_missing_context",
    "message": "浏览历史请求缺少必要上下文..."
  }
}
```

## Required Regression Coverage

- `history -p=1` request parameters include page and required page size/context fields.
- A BOSS code 17/19 response from history is classified as a history request-context failure, not a raw final message.
- Empty history produces an empty-state success or classified non-error outcome.
- Unauthenticated history does not make a remote request when no verified credential is available.
- JSON mode remains parseable and progress text does not appear on stdout.
