/**
 * 浏览器页面登录
 * 打开 BOSS直聘 登录页后，轮询本机浏览器 Cookie，直到检测到候选凭证。
 */
import { execSync } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import { Cookie } from '../types/index.js';
import { BASE_URL } from '../constants.js';
import { AuthFlowError } from '../exceptions.js';
import { ErrorCodes } from '../schema.js';
import { autoDetectCookies } from '../browsers/index.js';

const LOGIN_URL = `${BASE_URL}/web/user/?ka=header-login`;
export const WEB_LOGIN_TIMEOUT_MS = 90 * 1000;
const POLL_INTERVAL_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function openBrowser(url: string): void {
  const platform = os.platform();

  if (platform === 'darwin') {
    execSync(`open "${url}"`, { timeout: 5000 });
    return;
  }

  if (platform === 'linux') {
    execSync(`xdg-open "${url}" 2>/dev/null || sensible-browser "${url}" 2>/dev/null`, { timeout: 5000 });
    return;
  }

  if (platform === 'win32') {
    execSync(`start "" "${url}"`, { timeout: 5000 });
    return;
  }

  throw new Error(`当前系统不支持自动打开浏览器: ${platform}`);
}

export async function webLogin(): Promise<Cookie[]> {
  const platform = os.platform();

  if (platform !== 'darwin' && platform !== 'linux' && platform !== 'win32') {
    throw new AuthFlowError(
      ErrorCodes.CREDENTIAL_ACQUISITION_FAILED,
      '当前系统不支持浏览器页面登录，请使用 boss login --qrcode',
      'credential_acquisition',
      ['boss login --qrcode'],
    );
  }

  const importServer = await startCookieImportServer();

  console.error('正在打开浏览器登录页面...');
  console.error('请在浏览器中完成登录；如果浏览器已登录，CLI 会自动尝试回收本机浏览器 Cookie。');
  console.error(`如果浏览器没有自动打开，请手动打开: ${LOGIN_URL}`);
  if (importServer.importUrl) {
    console.error('\n如果页面已经登录但 CLI 仍无反应，请在 BOSS 页面地址栏或控制台执行：');
    console.error(`javascript:(()=>{new Image().src='${importServer.importUrl}?cookie='+encodeURIComponent(document.cookie)})()`);
    console.error('');
  }

  try {
    openBrowser(LOGIN_URL);
  } catch {
    console.error('无法自动打开浏览器，已继续等待手动打开登录 URL。');
  }

  try {
    const deadline = Date.now() + WEB_LOGIN_TIMEOUT_MS;
    let lastProgressAt = 0;

    while (Date.now() < deadline) {
      const imported = importServer.consumeCookies();
      if (imported.length > 0) {
        console.error('✓ 已从浏览器页面导入候选凭证，正在验证授权...');
        return imported;
      }

      const cookies = autoDetectCookies();
      if (cookies.length > 0) {
        console.error('✓ 已从浏览器 Cookie 数据库检测到候选凭证，正在验证授权...');
        return cookies;
      }

      if (Date.now() - lastProgressAt > 10000) {
        lastProgressAt = Date.now();
        console.error('仍在等待浏览器登录 Cookie；若页面已登录但无反应，通常是 Chrome 密钥环导致 CLI 无法解密，请执行上方 javascript 导入命令。');
      }

      await delay(POLL_INTERVAL_MS);
    }

    throw createWebLoginTimeoutError();
  } finally {
    importServer.close();
  }
}

export function createWebLoginTimeoutError(): AuthFlowError {
  return new AuthFlowError(
    ErrorCodes.AUTHORIZATION_PENDING_TIMEOUT,
    '浏览器登录超时（90 秒）：未能从本机浏览器检测或导入可验证 Cookie。请确认浏览器已登录 BOSS直聘；如果页面已登录但 CLI 无反应，请使用页面导入命令或改用扫码登录',
    'timeout',
    ['boss login --web', 'boss login --qrcode', 'boss login --browser <name>'],
  );
}

export async function startCookieImportServer(): Promise<{
  importUrl: string | null;
  consumeCookies: () => Cookie[];
  close: () => void;
}> {
  let importedCookies: Cookie[] = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/import') {
      importedCookies = parseRawCookieHeader(url.searchParams.get('cookie') || '');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><meta charset="utf-8"><title>BOSS CLI</title><p>Cookie 已发送到 CLI，可以关闭此页面。</p>');
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
  } catch {
    return {
      importUrl: null,
      consumeCookies: () => [],
      close: () => undefined,
    };
  }

  const addr = server.address();
  const importUrl = addr && typeof addr !== 'string'
    ? `http://127.0.0.1:${addr.port}/import`
    : null;

  return {
    importUrl,
    consumeCookies: () => {
      const cookies = importedCookies;
      importedCookies = [];
      return cookies;
    },
    close: () => server.close(),
  };
}

/** 解析原始 Cookie 头字符串 */
export function parseRawCookieHeader(header: string): Cookie[] {
  const cookies: Cookie[] = [];
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;

    const name = trimmed.substring(0, eqIdx).trim();
    const value = trimmed.substring(eqIdx + 1).trim();

    if (name && value) {
      cookies.push({ name, value, domain: '.zhipin.com', path: '/' });
    }
  }

  return cookies;
}
