import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadCredential, saveVerifiedCredential } from '../../src/auth.js';
import { _setKeyForTesting } from '../../src/crypto.js';
import { candidate } from '../helpers/auth-fixtures.js';
import { AuthorizationVerificationResult } from '../../src/types/index.js';

const verified: AuthorizationVerificationResult = {
  status: 'verified',
  stage: 'authorization_verification',
  accountSummary: {
    displayName: '测试用户',
    accountType: 'geek',
    source: 'browser',
    verifiedAt: '2026-06-01T00:00:00.000Z',
  },
  message: '授权验证通过',
  nextActions: [],
};

describe('verified credential persistence', () => {
  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'boss-auth-test-'));
    process.env.XDG_CONFIG_HOME = dir;
    _setKeyForTesting(crypto.randomBytes(32));
  });

  it('persists verified credentials with account summary', () => {
    const saved = saveVerifiedCredential(candidate(), verified);
    const loaded = loadCredential();

    expect(saved.version).toBe(2);
    expect(loaded?.accountSummary?.displayName).toBe('测试用户');
    expect(loaded?.verifiedAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('refuses to persist unverified credentials and preserves existing credential', () => {
    saveVerifiedCredential(candidate(), verified);

    expect(() => saveVerifiedCredential(candidate({ cookies: [] }), {
      status: 'rejected',
      stage: 'authorization_verification',
      accountSummary: null,
      message: 'bad',
      nextActions: [],
    })).toThrow('拒绝保存未通过授权验证的凭证');

    const loaded = loadCredential();
    expect(loaded?.accountSummary?.displayName).toBe('测试用户');
  });
});
