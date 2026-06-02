import { Cookie, SearchParams } from './types/index.js';
import { BASE_URL, DEFAULT_HEADERS, RATE_LIMIT_CONFIG, CITY_MAP, SALARY_CODES, EXP_CODES, DEGREE_CODES, INDUSTRY_CODES, SCALE_CODES, STAGE_CODES, JOB_TYPE_CODES, SEARCH_API, RECOMMEND_API, JOB_HISTORY_API, JOB_DETAIL_API, GREET_API, CHAT_LIST_API, WEB_GEEK_JOB_URL, WEB_GEEK_RECOMMEND_URL, WEB_GEEK_CHAT_URL, WEB_GEEK_HISTORY_URL, WEB_BOSS_CHAT_URL } from './constants.js';
import { NotAuthenticatedError, RateLimitedError, ApiError } from './exceptions.js';

// 高斯随机数（Box-Muller 方法）
function gaussRandom(mean: number, std: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * std + mean;
}

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class ApiClient {
  private cookies: Cookie[] = [];
  private verbose = false;
  private cooldownUntil = 0;
  private cooldownStep = 0;
  private consecutiveErrors = 0;
  private requestDelay = 0;

  constructor(cookies: Cookie[] = [], verbose = false) {
    this.cookies = cookies;
    this.verbose = verbose;
  }

  setCookies(cookies: Cookie[]): void {
    this.cookies = cookies;
  }

  getCookies(): Cookie[] {
    return this.cookies;
  }

  setVerbose(v: boolean): void {
    this.verbose = v;
  }

  // 构建 Cookie Header
  private getCookieHeader(): string {
    return this.cookies
      .filter(c => c.name && c.value)
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
  }

  // 合并响应 Set-Cookie
  private mergeCookies(headers: Headers): void {
    const setCookie = headers.get('set-cookie');
    if (!setCookie) return;

    // 简单解析 Set-Cookie header
    const parts = setCookie.split(';');
    const [nameValue] = parts;
    if (!nameValue) return;

    const [name, ...valueParts] = nameValue.split('=');
    const value = valueParts.join('=');

    if (!name || !value) return;

    const existing = this.cookies.findIndex(c => c.name === name.trim());
    if (existing >= 0) {
      this.cookies[existing].value = value.trim();
    } else {
      this.cookies.push({
        name: name.trim(),
        value: value.trim(),
        domain: '.zhipin.com',
        path: '/',
      });
    }
  }

  // 检查冷却状态
  private async checkCooldown(): Promise<void> {
    if (Date.now() < this.cooldownUntil) {
      const waitTime = this.cooldownUntil - Date.now();
      const waitSec = Math.ceil(waitTime / 1000);
      throw new RateLimitedError(
        `请求过于频繁，请在 ${waitSec} 秒后重试`
      );
    }
  }

  // 反检测抖动
  private async antiDetectionDelay(): Promise<void> {
    // 高斯抖动
    const jitter = Math.max(0, gaussRandom(
      RATE_LIMIT_CONFIG.gaussianJitterMean,
      RATE_LIMIT_CONFIG.gaussianJitterStd
    ));

    // 累计延迟（冷却后加倍）
    const baseDelay = jitter + this.requestDelay;

    if (baseDelay > 0) {
      await delay(baseDelay * 1000);
    }

    // 5% 概率随机长暂停（模拟阅读行为）
    if (Math.random() < RATE_LIMIT_CONFIG.longPauseProbability) {
      const longPause = RATE_LIMIT_CONFIG.longPauseMin +
        Math.random() * (RATE_LIMIT_CONFIG.longPauseMax - RATE_LIMIT_CONFIG.longPauseMin);
      await delay(longPause * 1000);
    }
  }

  // 处理 API 响应（对齐 Python 版 _handle_response）
  private async handleApiResponse<T>(response: Response): Promise<T> {
    // HTML redirect detection — 被重定向到登录页
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const text = await response.text();
      if (text.includes('login') || text.includes('passport')) {
        throw new NotAuthenticatedError();
      }
      throw new ApiError('Received HTML response instead of JSON');
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new ApiError('Failed to parse API response');
    }

    const code = data.code as number | undefined;
    const message = data.message as string || '';

    if (this.verbose && code !== 0) {
      console.error(`[API] code=${code ?? 'unknown'} message=${message || '<empty>'}`);
    }

    // 成功 — 返回 zpData
    if (code === 0) {
      this.consecutiveErrors = 0;
      this.cooldownStep = Math.max(0, this.cooldownStep - 1);
      this.requestDelay = Math.max(0, this.requestDelay - 0.1);
      return (data.zpData || data) as T;
    }

    // 频率限制 (code=9)
    if (code === 9) {
      this.consecutiveErrors++;
      const stepIndex = Math.min(this.cooldownStep, RATE_LIMIT_CONFIG.cooldownSteps.length - 1);
      const cooldownSec = RATE_LIMIT_CONFIG.cooldownSteps[stepIndex];
      this.cooldownUntil = Date.now() + cooldownSec * 1000;
      this.cooldownStep++;
      this.requestDelay = Math.min(this.requestDelay + 0.5, 5);
      throw new RateLimitedError(`频率限制，系统正在自动冷却 ${cooldownSec} 秒...`);
    }

    // 会话过期 (code=37)
    if (code === 37) {
      throw new NotAuthenticatedError(message || '会话已过期，请重新登录');
    }

    // 参数错误 (code=17, 19)
    if (code === 17 || code === 19) {
      throw new ApiError(`${message} (code=${code})`);
    }

    // 安全拦截 (code=121, 122)
    if (code === 121 || code === 122) {
      throw new ApiError(
        `请求被安全系统拦截 (code=${code})。此操作需要浏览器环境的安全验证，CLI 暂不支持。请在 BOSS直聘 网页端完成此操作。`
      );
    }

    // 其他错误
    throw new ApiError(`${message} (code=${code})`);
  }

  // 端点专用 Referer（对齐 Python _headers_for_request）
  private getRefererForUrl(path: string, params?: Record<string, string | number | undefined>): string {
    // 搜索相关
    if (path.includes('/search/joblist')) {
      const query = params?.query ? `?query=${encodeURIComponent(String(params.query))}` : '';
      return `${WEB_GEEK_JOB_URL}${query}`;
    }
    if (path.includes('/interaction/geekGetJob')) {
      return params?.tag === 5 ? WEB_GEEK_RECOMMEND_URL : WEB_GEEK_CHAT_URL;
    }
    if (path.includes('/job/detail') || path.includes('/job/card')) {
      return WEB_GEEK_JOB_URL;
    }
    if (path.includes('/history/joblist')) {
      return WEB_GEEK_HISTORY_URL;
    }
    // 社交相关
    if (path.includes('/friend/getGeekFriendList') || path.includes('/friend/add')) {
      return WEB_GEEK_CHAT_URL;
    }
    // 招聘方 (Boss) 端点
    if (path.includes('/boss/search/geek')) {
      return `${BASE_URL}/web/chat/search`;
    }
    if (path.includes('/view/geek') || path.includes('/fastReply/sendReplyMsg')) {
      return WEB_BOSS_CHAT_URL;
    }
    if (path.includes('/friend/filterByLabel') || path.includes('/friend/getBossFriendList') ||
        path.includes('/chat/boss/') || path.includes('/chat/geek/info') ||
        path.includes('/friend/label/') || path.includes('/friend/greet') ||
        path.includes('/job/chatted/') || path.includes('/interview/boss/') ||
        path.includes('/chat/exchange/') || path.includes('/friend/getExchange') ||
        path.includes('/friend/bossRemove') || path.includes('/chat/session/') ||
        path.includes('/job/offline') || path.includes('/job/online')) {
      return WEB_BOSS_CHAT_URL;
    }
    return BASE_URL + '/';
  }

  // 核心请求方法
  async request<T = Record<string, unknown>>(
    method: string,
    path: string,
    params?: Record<string, string | number | undefined>,
    body?: Record<string, unknown>
  ): Promise<T> {
    await this.checkCooldown();
    await this.antiDetectionDelay();

    // 构建 URL
    let url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    // 构建 Headers（端点专用 Referer 对齐 Python _headers_for_request）
    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
      'Referer': this.getRefererForUrl(path, params),
    };

    // zp_token: 从 bst cookie 提取
    const bstCookie = this.cookies.find(c => c.name === 'bst');
    if (bstCookie?.value) {
      headers['zp_token'] = bstCookie.value;
    }

    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const startTime = Date.now();

    // 重试循环
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= RATE_LIMIT_CONFIG.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          RATE_LIMIT_CONFIG.requestTimeout
        );

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (this.verbose) {
          const elapsed = Date.now() - startTime;
          console.error(`[HTTP] ${method} ${url} → ${response.status} (${elapsed}ms)`);
        }

        // 处理 429/5xx 重试
        if (response.status === 429 || response.status >= 500) {
          if (attempt < RATE_LIMIT_CONFIG.maxRetries) {
            const backoff = Math.pow(2, attempt) * 1000;
            await delay(backoff);
            continue;
          }
          throw new ApiError(`Server error: ${response.status}`);
        }

        this.mergeCookies(response.headers);
        return await this.handleApiResponse<T>(response);
      } catch (err) {
        lastError = err as Error;

        // AbortError — 超时
        if (err instanceof Error && err.name === 'AbortError') {
          if (attempt < RATE_LIMIT_CONFIG.maxRetries) {
            await delay(1000);
            continue;
          }
          throw new ApiError('Request timeout');
        }

        // 已知异常直接抛出
        if (err instanceof NotAuthenticatedError ||
            err instanceof RateLimitedError ||
            err instanceof ApiError) {
          throw err;
        }

        // 网络错误重试
        if (attempt < RATE_LIMIT_CONFIG.maxRetries) {
          await delay(1000 * (attempt + 1));
          continue;
        }
      }
    }

    throw new ApiError(lastError?.message || 'Unknown request error');
  }

  // 便捷方法
  async get<T = Record<string, unknown>>(
    path: string,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    return this.request<T>('GET', path, params);
  }

  async post<T = Record<string, unknown>>(
    path: string,
    body?: Record<string, unknown>,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    return this.request<T>('POST', path, params, body);
  }

  // 解析搜索参数为 API 参数
  buildSearchParams(params: SearchParams): Record<string, string | number | undefined> {
    const apiParams: Record<string, string | number | undefined> = {
      query: params.keyword,
      city: CITY_MAP['全国'] || '100010000', // 默认全国
      page: params.page || 1,
      pageSize: 15,
    };

    // 城市名转编码
    if (params.city) {
      apiParams.city = CITY_MAP[params.city] || params.city;
    }
    if (params.salary) apiParams.salary = SALARY_CODES[params.salary] || params.salary;
    if (params.exp) apiParams.experience = EXP_CODES[params.exp] || params.exp;
    if (params.degree) apiParams.degree = DEGREE_CODES[params.degree] || params.degree;
    if (params.industry) apiParams.industry = INDUSTRY_CODES[params.industry] || params.industry;
    if (params.scale) apiParams.scale = SCALE_CODES[params.scale] || params.scale;
    if (params.stage) apiParams.stage = STAGE_CODES[params.stage] || params.stage;
    if (params.jobType) apiParams.jobType = JOB_TYPE_CODES[params.jobType] || params.jobType;

    return apiParams;
  }
}
