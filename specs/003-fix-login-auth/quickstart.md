# Quickstart: 登录授权验证修复

**Target**: 开发者实现和验证统一登录授权闭环。

## Implementation Outline

1. Define shared auth result types in `src/types/index.ts`.
   - `CandidateCredential`
   - `AuthorizationVerificationResult`
   - `AccountSummary`
   - `AuthenticatedSession`
   - login stage/error code union types

2. Add a single verification function in `src/auth.ts`.
   - Input: candidate cookies and source metadata
   - Behavior: create an `ApiClient` with candidate cookies and request the protected current-user identity endpoint
   - Output: verified account summary or structured verification failure
   - Rule: no persistence inside candidate acquisition functions

3. Update credential persistence in `src/auth.ts`.
   - Save only verified sessions.
   - Preserve existing valid credential when a new login attempt fails.
   - Include `accountSummary` and `verifiedAt` in the persisted credential format while remaining tolerant of older files.

4. Update `src/commands/auth.ts`.
   - Route each login method through candidate acquisition.
   - Call the shared verification function before `saveCredential`.
   - Treat failed profile fetch as login failure, not a warning.
   - Keep `--browser` strict: no silent fallback.
   - Return stage-specific Chinese errors and JSON error codes.

5. Update `src/login/qrcode.ts` and `src/login/web-login.ts`.
   - They should report candidate acquisition outcomes, not final login success.
   - Remove or reword success messages before authorization verification.
   - Ensure timeout/cancel paths clean temporary state and return structured failures.

6. Update `src/browsers/*`.
   - Preserve current browser extraction behavior.
   - Ensure specified browser/Profile failures are explicit.
   - Do not claim browser login is successful until shared verification passes.

## Manual Verification

Run typecheck and tests:

```bash
npm run typecheck
npm run test
```

Build the CLI:

```bash
npm run build
```

Default login:

```bash
node dist/index.js login
node dist/index.js status
node dist/index.js me
```

QRCode login:

```bash
node dist/index.js login --qrcode
node dist/index.js status
```

Web login:

```bash
node dist/index.js login --web
node dist/index.js status
```

Specified browser:

```bash
node dist/index.js login --browser chrome
node dist/index.js login --browser firefox
```

JSON contract spot checks:

```bash
node dist/index.js login --json
node dist/index.js status --json
```

## Expected Results

- `login` prints success only after current account identity is verified.
- If verification fails, the CLI says which stage failed and suggests the next command.
- Failed login attempts do not delete or overwrite an existing valid credential.
- `status` reports authenticated only for a verified persisted session.
- No command prints Cookie values or token material.

## Implementation Notes

- Shared candidate validation is implemented in `src/auth.ts` through `verifyCandidateCredential`.
- New login attempts are persisted only through `saveVerifiedCredential`.
- Browser, QR, and Web flows now produce candidate credentials first; final success is owned by the shared verification path in `src/commands/auth.ts`.
- Unit coverage lives under `tests/unit/*auth*.test.ts`, `tests/unit/login-*.test.ts`, and browser candidate tests.

## Test Strategy

- Unit test `verifyCandidateCredential` with mocked `ApiClient` success, rejected auth, malformed response and network failure.
- Unit test `saveVerifiedCredential` to ensure unverified candidates cannot be saved.
- Unit test existing credential preservation when new login fails.
- Mock QR fetch responses for scanned, confirmed, timeout and empty-cookie cases.
- Mock Web callback behavior for valid callback, no Cookie callback, timeout and server error.
- CLI smoke tests assert exit code and JSON envelope for success and failure paths.
