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
  CREDENTIAL_ACQUISITION_FAILED: 'credential_acquisition_failed',
  AUTHORIZATION_PENDING_TIMEOUT: 'authorization_pending_timeout',
  AUTH_VERIFICATION_FAILED: 'auth_verification_failed',
  AUTH_VERIFICATION_UNKNOWN: 'auth_verification_unknown',
  CREDENTIAL_PERSISTENCE_FAILED: 'credential_persistence_failed',
  LOGIN_CANCELLED: 'login_cancelled',
} as const;
