# BOSS CLI Command Parity Audit

## Baseline

| Field | Value |
| --- | --- |
| Reference repository | `https://github.com/jackwener/boss-cli` |
| Reference commit | `dcd8331` |
| Retrieval date | `2026-06-01` |
| Local branch | `004-boss-cli-parity` |
| Local artifact source | `node dist/index.js --help`, command help, and `src/commands/*.ts` |
| Scope | Audit artifacts only; no CLI behavior changes are implemented by this feature. |

Evidence was captured from:

- `reference-readme`: `/tmp/boss-cli-reference/README.md`
- `reference-source`: `/tmp/boss-cli-reference/boss_cli/cli.py` and `/tmp/boss-cli-reference/boss_cli/commands/*.py`
- `reference-tests`: `/tmp/boss-cli-reference/tests/*.py`
- `local-help`: `node dist/index.js --help`, `node dist/index.js <command> --help`, and `node dist/index.js recruiter <command> --help`
- `local-source`: `src/index.ts` and `src/commands/*.ts`
- `local-tests`: existing unit and smoke tests under `tests/`

Reference runtime help was not executed because the pinned checkout lacked Python runtime dependencies such as `httpx` in the local environment. The reference README and Click command decorators were used as primary evidence.

## Scope Rules

- Command paths are normalized with spaces, for example `recruiter resume-download`.
- Reference top-level commands and recruiter subcommands are represented exactly once in the JSON inventory.
- Local-only commands, aliases, and options are classified as extensions or compatibility deviations.
- Live BOSS values are excluded. Do not record Cookie, token, phone number, chat body, resume content, or private account data.
- Live-sensitive findings are allowed when static/source/help evidence proves the surface gap but account role or anti-bot state prevents safe verification.

## Command Parity Summary

| Area | Reference Surface | Local Surface | Status | Notes |
| --- | --- | --- | --- | --- |
| Auth | `login`, `logout`, `status`, `me` | Same commands | Partial | `--cookie-source`, default QR fallback, and YAML differ; local adds `--web`, `--browser`, `--cookie-path`, `--profile`. |
| Job search | `search`, `recommend`, `detail`, `show`, `export`, `history`, `cities` | Same commands | Partial | Surface exists; `history` has a reported live parameter failure. |
| Personal center | `applied`, `interviews`, `chat` | Same commands | Full surface | Live behavior still requires authenticated verification. |
| Social | `greet`, `batch-greet` | Same commands | Partial | Core surface exists; `greet --lid` and exact defaults/choice validation differ. |
| Recruiter | 20 subcommands including `geek` | 19 subcommands plus `hr` alias | Partial | `recruiter geek` is missing; several option-level differences remain. |
| Structured output | JSON, YAML, non-TTY auto YAML, rich stderr | JSON envelope, rich stderr | Partial | JSON envelope and stdout/stderr separation match; YAML missing. |

## Top-Level Command Coverage

| Reference Command | Local Command | Status | Finding |
| --- | --- | --- | --- |
| `login` | `login` | Partial | `login-cookie-source-option-renamed`, `login-default-fallback-behavior-different`, `login-web-local-extension-blocked` |
| `logout` | `logout` | Full | `top-level-command-surface-full` |
| `status` | `status` | Partial | `structured-output-yaml-missing` |
| `me` | `me` | Partial | `structured-output-yaml-missing` |
| `search` | `search` | Partial | `job-search-option-coverage-partial`, `structured-output-yaml-missing` |
| `recommend` | `recommend` | Partial | `structured-output-yaml-missing` |
| `detail` | `detail` | Partial | `structured-output-yaml-missing` |
| `show` | `show` | Partial | `structured-output-yaml-missing` |
| `export` | `export` | Partial | `job-search-option-coverage-partial` |
| `history` | `history` | Blocked | `history-live-params-blocked` |
| `applied` | `applied` | Partial | `structured-output-yaml-missing` |
| `interviews` | `interviews` | Partial | `structured-output-yaml-missing` |
| `chat` | `chat` | Partial | `structured-output-yaml-missing` |
| `greet` | `greet` | Partial | `job-search-option-coverage-partial` |
| `batch-greet` | `batch-greet` | Partial | `job-search-option-coverage-partial` |
| `cities` | `cities` | Full | `top-level-command-surface-full` |

All reference top-level command names are present locally. The top-level parity gaps are option aliases, structured output modes, default login behavior, and live behavior for `history`.

## Recruiter Command Coverage

| Reference Command | Local Command | Status | Finding |
| --- | --- | --- | --- |
| `recruiter search` | `recruiter search` | Partial | `recruiter-search-options-partial` |
| `recruiter recommend` | `recruiter recommend` | Partial | `recruiter-recommend-limit-option-missing` |
| `recruiter greet` | `recruiter greet` | Partial | `recruiter-greet-job-option-missing`, `local-recruiter-message-extension` |
| `recruiter batch-view` | `recruiter batch-view` | Partial | `recruiter-batch-view-options-partial` |
| `recruiter inbox` | `recruiter inbox` | Partial | `recruiter-inbox-options-partial` |
| `recruiter reply` | `recruiter reply` | Partial | `recruiter-reply-confirmation-missing` |
| `recruiter chat` | `recruiter chat` | Partial | `recruiter-chat-count-option-different` |
| `recruiter request-resume` | `recruiter request-resume` | Partial | `structured-output-yaml-missing` |
| `recruiter exchange-phone` | `recruiter exchange-phone` | Partial | `structured-output-yaml-missing` |
| `recruiter exchange-wechat` | `recruiter exchange-wechat` | Partial | `structured-output-yaml-missing` |
| `recruiter invite-interview` | `recruiter invite-interview` | Partial | `recruiter-invite-interview-options-partial` |
| `recruiter mark-unsuitable` | `recruiter mark-unsuitable` | Partial | `structured-output-yaml-missing` |
| `recruiter resume` | `recruiter resume` | Partial | `recruiter-resume-options-partial` |
| `recruiter geek` | None | Missing | `recruiter-geek-command-missing` |
| `recruiter resume-download` | `recruiter resume-download` | Partial | `recruiter-resume-download-security-option-missing` |
| `recruiter jobs` | `recruiter jobs` | Partial | `structured-output-yaml-missing` |
| `recruiter job-close` | `recruiter job-close` | Partial | `structured-output-yaml-missing` |
| `recruiter job-reopen` | `recruiter job-reopen` | Partial | `structured-output-yaml-missing` |
| `recruiter labels` | `recruiter labels` | Partial | `structured-output-yaml-missing` |
| `recruiter export` | `recruiter export` | Partial | `recruiter-export-job-filter-missing` |

Local also exposes `hr` as an alias for `recruiter`, recorded as `local-hr-alias-extension`.

## Option Coverage

Reference options were counted from README examples and source decorators. At least 95% of reference options are either matched locally or represented as a gap/intentionally different finding:

| Bucket | Reference Options | Matched Locally | Recorded Gap/Difference | Coverage |
| --- | ---: | ---: | ---: | ---: |
| Auth | 2 | 1 | 1 | 100% |
| Job seeker commands | 43 | 35 | 8 | 100% |
| Recruiter commands | 64 | 34 | 30 | 100% |
| Structured output | 2 modes | 1 | 1 | 100% |

Notable option gaps:

- `login --cookie-source` is absent locally; local equivalent is `--browser`.
- `--yaml` is absent locally.
- `recruiter geek` and its `--security-id` / `--job-id` options are absent locally.
- `recruiter search --salary` and `recruiter search --job` are absent locally.
- `recruiter batch-view` lacks reference safety/filter options.
- `recruiter invite-interview` lacks `--address`, `--time`, and `--desc`.
- `recruiter resume` lacks `--job` and `--security-id`.

## Structured Output

| Behavior | Reference | Local | Status | Finding |
| --- | --- | --- | --- | --- |
| JSON success envelope | `{ok, schema_version, data}` | `schema.ts` emits same envelope | Full | `json-envelope-full` |
| JSON error envelope | `{ok:false, schema_version, data:null, error}` | `schema.ts` emits same envelope | Full | `json-envelope-full` |
| YAML output | `--yaml` and non-TTY auto YAML | Not supported | Missing | `structured-output-yaml-missing` |
| Human progress separation | Rich output to stderr | Tables/progress to stderr; JSON to stdout | Full | `stdout-stderr-separation-full` |

## Findings

| ID | Status | Priority | Severity | Summary |
| --- | --- | --- | --- | --- |
| `top-level-command-surface-full` | Full | None | None | All reference top-level commands are registered locally. |
| `recruiter-command-surface-partial` | Partial | P1 | high | Recruiter group lacks the reference legacy `recruiter geek` command. |
| `recruiter-geek-command-missing` | Missing | P1 | high | `boss recruiter geek <encryptGeekId>` is absent locally. |
| `structured-output-yaml-missing` | Missing | P1 | high | Reference YAML output mode is absent locally. |
| `login-cookie-source-option-renamed` | Partial | P2 | medium | Reference `--cookie-source` is renamed to local `--browser`. |
| `login-default-fallback-behavior-different` | Partial | P1 | high | Reference default login falls back to QR; local default login stops with instructions. |
| `login-web-local-extension-blocked` | Blocked | P1 | high | Local `--web` extension was reported to stall after browser login. |
| `history-live-params-blocked` | Blocked | P0 | critical | Local `history -p=1` was reported to fail with BOSS code 17, missing necessary parameter. |
| `recruiter-search-options-partial` | Partial | P2 | medium | `recruiter search` lacks `--salary` and `--job`. |
| `recruiter-recommend-limit-option-missing` | Missing | P3 | low | `recruiter recommend` lacks `-n/--limit`. |
| `recruiter-greet-job-option-missing` | Partial | P2 | medium | `recruiter greet` lacks `--job`; local adds `--message`. |
| `recruiter-batch-view-options-partial` | Partial | P2 | medium | `recruiter batch-view` lacks several filters and safety options. |
| `recruiter-inbox-options-partial` | Partial | P3 | low | `recruiter inbox` lacks `--label` and `-n/--limit`. |
| `recruiter-reply-confirmation-missing` | Partial | P2 | medium | `recruiter reply` lacks confirmation / `--yes` safety parity. |
| `recruiter-chat-count-option-different` | Partial | P3 | low | Reference uses `--count`; local uses `--page`. |
| `recruiter-invite-interview-options-partial` | Partial | P2 | medium | `--address`, `--time`, and `--desc` are missing locally. |
| `recruiter-resume-options-partial` | Partial | P2 | medium | `recruiter resume` lacks `--job` and `--security-id`. |
| `recruiter-resume-download-security-option-missing` | Missing | P3 | low | `recruiter resume-download --security-id` is missing locally. |
| `recruiter-export-job-filter-missing` | Missing | P3 | low | `recruiter export --job` is missing locally. |
| `job-search-option-coverage-partial` | Partial | P3 | low | Job seeker filters mostly match, but defaults/choices/short aliases differ. |
| `json-envelope-full` | Full | None | None | JSON envelope shape matches reference contract. |
| `stdout-stderr-separation-full` | Full | None | None | Machine-readable stdout and human stderr separation matches. |
| `local-hr-alias-extension` | Intentionally Different | P3 | low | Local `hr` alias is an intentional extension. |
| `local-login-browser-options-extension` | Intentionally Different | P3 | low | Local browser/profile login options are extensions. |
| `local-recruiter-message-extension` | Intentionally Different | P3 | low | Local `recruiter greet --message` is an extension, not reference parity. |

## Live Verification Required

| Finding | Condition |
| --- | --- |
| `login-default-fallback-behavior-different` | Needs a browser/QR environment and a BOSS account to verify full fallback behavior. |
| `login-web-local-extension-blocked` | Needs the user's real browser session or a controlled browser profile with BOSS login cookies. |
| `history-live-params-blocked` | Needs an authenticated BOSS account with browsing history. |
| `recruiter-search-options-partial` | Needs recruiter account access to verify salary and job parameter mapping. |
| `recruiter-greet-job-option-missing` | Needs recruiter account and candidate id to validate job-associated greet behavior. |
| `recruiter-batch-view-options-partial` | Needs recruiter account to verify candidate-view side effects safely. |
| `recruiter-inbox-options-partial` | Needs recruiter account with inbox labels to verify label filtering. |
| `recruiter-invite-interview-options-partial` | Needs recruiter account and controlled candidate/job identifiers. |
| `recruiter-resume-options-partial` | Needs recruiter account and candidate context. |
| `recruiter-resume-download-security-option-missing` | Needs recruiter account and candidate context. |
| `recruiter-export-job-filter-missing` | Needs recruiter account with multiple jobs. |
| `local-recruiter-message-extension` | Needs recruiter account to verify whether custom greeting messages are accepted. |

## Prioritized Remediation

### Top Five

1. `history-live-params-blocked` (P0): Fix missing request context/parameters for `history`.
2. `recruiter-geek-command-missing` (P1): Add `recruiter geek` compatibility command or declare intentional difference.
3. `structured-output-yaml-missing` (P1): Add YAML output support and decide on non-TTY auto-YAML behavior.
4. `login-default-fallback-behavior-different` (P1): Match reference default browser-cookie plus QR fallback or explicitly classify the deviation.
5. `login-web-local-extension-blocked` (P1): Stabilize local `--web` cookie recovery or remove it from recommended login paths.

### Batches

| Batch | Priority | Findings | Suggested Next Phase |
| --- | --- | --- | --- |
| P0 behavior blocker | P0 | `history-live-params-blocked` | behavior parity implementation feature |
| Authentication parity and reliability | P1-P2 | `login-default-fallback-behavior-different`, `login-web-local-extension-blocked`, `login-cookie-source-option-renamed`, `local-login-browser-options-extension` | auth parity implementation feature |
| Structured output compatibility | P1 | `structured-output-yaml-missing` | structured output implementation feature |
| Recruiter command and option parity | P1-P3 | `recruiter-command-surface-partial`, `recruiter-geek-command-missing`, `recruiter-search-options-partial`, `recruiter-recommend-limit-option-missing`, `recruiter-greet-job-option-missing`, `recruiter-batch-view-options-partial`, `recruiter-inbox-options-partial`, `recruiter-reply-confirmation-missing`, `recruiter-chat-count-option-different`, `recruiter-invite-interview-options-partial`, `recruiter-resume-options-partial`, `recruiter-resume-download-security-option-missing`, `recruiter-export-job-filter-missing`, `local-recruiter-message-extension` | recruiter parity implementation feature |
| Job seeker polish | P3 | `job-search-option-coverage-partial` | compatibility polish implementation feature |

## Remediation Counts

| Status | Count |
| --- | ---: |
| Full | 3 |
| Partial | 14 |
| Missing | 5 |
| Blocked | 2 |
| Intentionally Different | 3 |

| Priority | Count |
| --- | ---: |
| P0 | 1 |
| P1 | 5 |
| P2 | 8 |
| P3 | 10 |

## Rerun Procedure

1. Rebuild local CLI if source changed: `npm run build`.
2. Capture local help:
   - `node dist/index.js --help`
   - `node dist/index.js recruiter --help`
   - important command help under auth, search, social, and recruiter areas.
3. Refresh reference checkout outside the project tree and pin it to `dcd8331`.
4. Compare README, command source decorators, and tests against local help/source.
5. Update both `parity-audit.md` and `parity-matrix.json`; no missing item may remain only in notes or terminal output.
6. Validate JSON syntax and invariants.

## Evidence Conflict Rules

- Source decorators override README examples when README and actual command definitions disagree.
- Help output overrides assumptions about compiled local CLI behavior.
- Tests provide supporting evidence but do not override command registration source.
- Live-only failures are recorded as Blocked with a live verification condition instead of silently passing or failing command-surface parity.

## Artifact Consistency

- This report and `parity-matrix.json` contain the same finding ids.
- `parity-matrix.json` is the machine-readable source for status, priority, severity, affected users, expected benefit, and suggested next phase.
- This report is the human-readable planning baseline.
