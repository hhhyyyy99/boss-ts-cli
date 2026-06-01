/**
 * 浏览器 Cookie 自动检测与提取入口
 * Chrome → Edge → Brave → Firefox 顺序，比较 Cookie 新鲜度选择最佳会话
 */
import { CandidateCredential, Cookie, LoginMethodName } from '../types/index.js';
import { SUPPORTED_BROWSERS, getBrowserDbPath, getAllBrowserProfiles, getFirefoxProfile } from './paths.js';
import { extractChromiumCookies } from './chromium.js';
import { extractFirefoxCookies } from './firefox.js';
import { candidateFromCookies } from '../login/index.js';

/**
 * 自动检测所有已登录的浏览器，返回最新鲜的 Cookie 会话
 * Chrome 优先；如其他浏览器中有更新鲜的会话，自动选择最新会话
 */
export function autoDetectCookies(): Cookie[] {
  let bestCookies: Cookie[] = [];
  let bestFreshness = 0;

  for (const browser of SUPPORTED_BROWSERS) {
    const cookies = extractFromBrowser(browser);
    if (cookies.length === 0) continue;

    // 验证必须包含 __zp_stoken__
    const hasStoken = cookies.some(c => c.name === '__zp_stoken__');
    if (!hasStoken) continue;

    // 比较新鲜度（取最近更新的 Cookie 时间戳）
    const freshness = Math.max(...cookies.map(c => c.expires || 0));
    if (freshness > bestFreshness) {
      bestFreshness = freshness;
      bestCookies = cookies;
    }
  }

  // 如果 Chrome 也有有效会话，且新鲜度差距在 24h 内，优先选 Chrome
  if (bestCookies.length > 0) {
    const chromeCookies = extractFromBrowser('chrome');
    if (chromeCookies.some(c => c.name === '__zp_stoken__')) {
      const chromeFreshness = Math.max(...chromeCookies.map(c => c.expires || 0));
      const diffMs = Math.abs(chromeFreshness - bestFreshness);
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (diffMs < oneDayMs || chromeFreshness >= bestFreshness) {
        return chromeCookies;
      }
    }
  }

  return bestCookies;
}

export function autoDetectCandidate(): CandidateCredential {
  return candidateFromCookies(autoDetectCookies(), 'browser', 'browser_auto', 'auto');
}

/**
 * 从指定浏览器提取 Cookie
 */
export function extractFromBrowser(browser: string): Cookie[] {
  if (browser === 'firefox') {
    const dbPath = getFirefoxProfile();
    if (!dbPath) return [];
    return extractFirefoxCookies(dbPath).filter(c =>
      c.domain.includes('zhipin.com') && c.name && c.value,
    );
  }

  // Chromium 系列
  const dbPath = getBrowserDbPath(browser);
  if (!dbPath) return [];

  const cookies = extractChromiumCookies(dbPath);
  return cookies.filter(c => c.domain.includes('zhipin.com') && c.name && c.value);
}

export function extractCandidateFromBrowser(
  browser: string,
  options: { profile?: string; cookiePath?: string } = {},
): CandidateCredential {
  let cookies: Cookie[] = [];
  let sourceDetail = browser;

  if (options.cookiePath) {
    cookies = extractChromiumCookies(options.cookiePath);
    sourceDetail = `${browser}:${options.cookiePath}`;
  } else if (browser === 'firefox') {
    const dbPath = getFirefoxProfile();
    sourceDetail = dbPath ? `${browser}:${dbPath}` : browser;
    cookies = dbPath ? extractFirefoxCookies(dbPath).filter(c =>
      c.domain.includes('zhipin.com') && c.name && c.value,
    ) : [];
  } else {
    const dbPath = getBrowserDbPath(browser, options.profile);
    sourceDetail = options.profile ? `${browser}:${options.profile}` : browser;
    cookies = dbPath ? extractChromiumCookies(dbPath).filter(c =>
      c.domain.includes('zhipin.com') && c.name && c.value,
    ) : [];
  }

  const method: LoginMethodName = browser ? 'browser_specified' : 'browser_auto';
  return candidateFromCookies(cookies, 'browser', method, sourceDetail);
}

/**
 * 获取指定浏览器的所有 Profile 路径（用于多 Profile 提示）
 */
export function getBrowserProfiles(browser: string): string[] {
  if (browser === 'firefox') {
    const p = getFirefoxProfile();
    return p ? [p] : [];
  }
  return getAllBrowserProfiles(browser);
}
