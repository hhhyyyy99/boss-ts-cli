/**
 * 登录调度入口
 * 根据参数分发到 Cookie 提取 / QR 登录 / Web 登录
 */
import { CandidateCredential, Cookie, LoginMethodName, LoginSource } from '../types/index.js';

// 各登录模块的接口
export interface LoginMethod {
  name: string;
  description: string;
  login(params: LoginParams): Promise<Cookie[]>;
}

export interface LoginParams {
  browser?: string;
  cookiePath?: string;
  profile?: string;
}

// 延迟注册，避免循环依赖
const methods: Map<string, LoginMethod> = new Map();

export function registerLoginMethod(method: LoginMethod): void {
  methods.set(method.name, method);
}

export function getLoginMethods(): LoginMethod[] {
  return Array.from(methods.values());
}

export function getLoginMethod(name: string): LoginMethod | undefined {
  return methods.get(name);
}

export function createCandidateCredential(params: {
  cookies: Cookie[];
  source: LoginSource;
  method: LoginMethodName;
  sourceDetail?: string | null;
  acquiredAt?: string;
}): CandidateCredential {
  return {
    cookies: params.cookies.filter(cookie =>
      Boolean(cookie.name) &&
      Boolean(cookie.value) &&
      cookie.domain.includes('zhipin.com'),
    ),
    source: params.source,
    method: params.method,
    sourceDetail: params.sourceDetail ?? null,
    acquiredAt: params.acquiredAt ?? new Date().toISOString(),
  };
}

export function candidateFromCookies(
  cookies: Cookie[],
  source: LoginSource,
  method: LoginMethodName,
  sourceDetail?: string | null,
): CandidateCredential {
  return createCandidateCredential({ cookies, source, method, sourceDetail });
}
