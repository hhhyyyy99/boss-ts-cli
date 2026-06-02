import { describe, expect, it } from 'vitest';
import { ApiError, NotAuthenticatedError } from '../../src/exceptions.js';
import {
  buildHistoryParams,
  classifyHistoryError,
  ensureHistoryAuthenticated,
  normalizeHistoryResponse,
} from '../../src/commands/search.js';
import { extractJobIdsFromHistoryStorageContent } from '../../src/browsers/history-storage.js';

describe('history request params', () => {
  it('matches the live BOSS history list API params', () => {
    expect(buildHistoryParams(['1', '2'])).toEqual({ jobIds: '1,2' });
  });

  it('classifies BOSS code 17/19 responses as missing history request context', () => {
    const err17 = classifyHistoryError(new ApiError('缺少必要参数 (code=17)'));
    const err19 = classifyHistoryError(new ApiError('参数错误 (code=19)'));

    expect(err17.code).toBe('history_missing_context');
    expect(err17.message).not.toBe('缺少必要参数 (code=17)');
    expect(err19.code).toBe('history_missing_context');
  });

  it('normalizes empty history as a non-error result', () => {
    const result = normalizeHistoryResponse({}, 1);

    expect(result).toEqual({ jobList: [], page: 1, hasMore: false });
  });

  it('fails unauthenticated history before a remote request', () => {
    expect(() => ensureHistoryAuthenticated({ getCookies: () => [] })).toThrow(NotAuthenticatedError);
  });

  it('keeps history errors suitable for JSON envelopes', () => {
    const err = classifyHistoryError(new ApiError('缺少必要参数 (code=17)'));

    expect({ ok: false, error: { code: err.code, message: err.message } }).toEqual({
      ok: false,
      error: {
        code: 'history_missing_context',
        message: err.message,
      },
    });
  });

  it('extracts active jobIds from browser _Job_History storage', () => {
    const content = `x_Job_History${JSON.stringify([
      { job_id: '101', storage_expire_time: 4_102_444_800_000 },
      { job_id: 'expired', storage_expire_time: 1 },
      { job_id: '102' },
    ])}`;

    expect(extractJobIdsFromHistoryStorageContent(content, 1_700_000_000_000)).toEqual(['101', '102']);
  });
});
