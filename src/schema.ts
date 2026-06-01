import { SchemaEnvelope } from './types/index.js';

const SCHEMA_VERSION = '1';

export function success<T>(data: T): SchemaEnvelope<T> {
  return {
    ok: true,
    schema_version: SCHEMA_VERSION,
    data,
  };
}

export function error(code: string, message: string): SchemaEnvelope<null> {
  return {
    ok: false,
    schema_version: SCHEMA_VERSION,
    data: null,
    error: { code, message },
  };
}

// 错误码常量
export const ErrorCodes = {
  NOT_AUTHENTICATED: 'not_authenticated',
  RATE_LIMITED: 'rate_limited',
  INVALID_PARAMS: 'invalid_params',
  API_ERROR: 'api_error',
  UNKNOWN_ERROR: 'unknown_error',
} as const;
