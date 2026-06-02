import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { saveVerifiedCredential, verifyCandidateCredential } from '../../src/auth.js';
import { NotAuthenticatedError } from '../../src/exceptions.js';
import { candidate, profileResponse } from '../helpers/auth-fixtures.js';
import { clientFactoryWithError, clientFactoryWithResponse } from '../helpers/auth-mocks.js';

const originalConfigHome = process.env.XDG_CONFIG_HOME;

afterEach(() => {
  if (originalConfigHome === undefined) {
    delete process.env.XDG_CONFIG_HOME;
  } else {
    process.env.XDG_CONFIG_HOME = originalConfigHome;
  }
});

describe('verifyCandidateCredential', () => {
  it('returns verified account summary when protected identity lookup succeeds', async () => {
    const result = await verifyCandidateCredential(
      candidate(),
      clientFactoryWithResponse(profileResponse),
    );

    expect(result.status).toBe('verified');
    expect(result.accountSummary?.displayName).toBe('测试用户');
    expect(result.accountSummary?.accountType).toBe('geek');
    expect(result.accountSummary?.source).toBe('browser');
  });

  it('rejects empty candidate credentials', async () => {
    const result = await verifyCandidateCredential(candidate({ cookies: [] }));

    expect(result.status).toBe('rejected');
    expect(result.accountSummary).toBeNull();
    expect(result.nextActions).toContain('boss login --qrcode');
  });

  it('returns rejected when protected identity lookup reports unauthenticated', async () => {
    const result = await verifyCandidateCredential(
      candidate(),
      clientFactoryWithError(new NotAuthenticatedError('会话已过期')),
    );

    expect(result.status).toBe('rejected');
    expect(result.message).toContain('授权验证失败');
  });

  it('returns unknown when verification cannot complete', async () => {
    const result = await verifyCandidateCredential(
      candidate(),
      clientFactoryWithError(new Error('network down')),
    );

    expect(result.status).toBe('unknown');
    expect(result.message).toContain('network down');
  });

  it('does not persist credentials that failed authorization verification', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boss-cli-auth-'));
    process.env.XDG_CONFIG_HOME = tmpDir;

    expect(() => saveVerifiedCredential(candidate(), {
      status: 'rejected',
      stage: 'authorization_verification',
      accountSummary: null,
      message: 'rejected',
      nextActions: ['boss login --qrcode'],
    })).toThrow('拒绝保存未通过授权验证的凭证');
    expect(fs.existsSync(path.join(tmpDir, 'boss-cli', 'credential.json'))).toBe(false);
  });
});
