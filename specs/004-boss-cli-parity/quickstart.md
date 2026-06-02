# Quickstart: BOSS CLI Command Parity Audit

This feature produces audit artifacts only. It does not implement missing commands.

## Prerequisites

- Current branch: `004-boss-cli-parity`
- Built local CLI available via `node dist/index.js`
- Reference baseline available from `https://github.com/jackwener/boss-cli` at commit `dcd8331`

## 1. Capture Local CLI Surface

```bash
node dist/index.js --help
node dist/index.js recruiter --help
```

For commands with important option surfaces, inspect individual help output, for example:

```bash
node dist/index.js login --help
node dist/index.js search --help
node dist/index.js batch-greet --help
node dist/index.js recruiter search --help
node dist/index.js recruiter resume-download --help
```

## 2. Capture Reference CLI Surface

Use the pinned reference checkout or source files to inspect:

```text
/tmp/jackwener-boss-cli/README.md
/tmp/jackwener-boss-cli/boss_cli/cli.py
/tmp/jackwener-boss-cli/boss_cli/commands/*.py
/tmp/jackwener-boss-cli/tests/test_cli.py
```

If the reference checkout is missing, clone it outside the project tree and pin it to commit `dcd8331`.

## 3. Create Audit Artifacts

Create:

```text
specs/004-boss-cli-parity/parity-audit.md
specs/004-boss-cli-parity/parity-matrix.json
```

The Markdown report should include:

- Baseline and local sources
- Top-level command parity
- Recruiter command parity
- Option and alias gaps
- Structured output gaps
- Live-verification-required items
- P0/P1/P2/P3 remediation list

The JSON matrix must follow [contracts/parity-matrix.schema.md](./contracts/parity-matrix.schema.md).

## 4. Validate

Confirm:

- Every reference command is represented.
- Every discovered missing item appears in both artifacts.
- Every non-full finding has exactly one P0/P1/P2/P3 priority.
- Any live-only finding records why live verification is required.
- No sensitive credential or private account data is included.

Recommended local checks:

```bash
npm run typecheck
npm run test
```

These checks validate the repo remains healthy; the audit itself is artifact-based.

## 5. Use for Follow-Up Planning

After artifacts are complete, use `/speckit-tasks` to create tasks for the audit artifact work. Separate implementation features can later consume the remediation list by priority.
