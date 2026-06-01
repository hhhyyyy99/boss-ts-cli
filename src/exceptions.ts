export class BossApiError extends Error {
  public code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'BossApiError';
    this.code = code;
  }
}

export class NotAuthenticatedError extends BossApiError {
  constructor(message = '未登录或会话已过期，请执行 boss login') {
    super('not_authenticated', message);
    this.name = 'NotAuthenticatedError';
  }
}

export class RateLimitedError extends BossApiError {
  constructor(message = '请求过于频繁，系统正在自动冷却中...') {
    super('rate_limited', message);
    this.name = 'RateLimitedError';
  }
}

export class InvalidParamsError extends BossApiError {
  constructor(message: string) {
    super('invalid_params', message);
    this.name = 'InvalidParamsError';
  }
}

export class ApiError extends BossApiError {
  constructor(message: string) {
    super('api_error', message);
    this.name = 'ApiError';
  }
}

export class UnknownError extends BossApiError {
  constructor(message = '发生未知错误') {
    super('unknown_error', message);
    this.name = 'UnknownError';
  }
}

export class AuthFlowError extends BossApiError {
  public readonly stage: string;
  public readonly nextActions: string[];

  constructor(code: string, message: string, stage: string, nextActions: string[] = []) {
    super(code, message);
    this.name = 'AuthFlowError';
    this.stage = stage;
    this.nextActions = nextActions;
  }
}
