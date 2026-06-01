/**
 * BOSS直聘 CLI - 认证模块
 * 浏览器 Cookie 提取、二维码登录、凭证持久化
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { execSync } from 'node:child_process';
import QRCode from 'qrcode-terminal';
import { Cookie, Credential } from './types/index.js';
import { BROWSER_PATHS, CREDENTIAL_FILE, COOKIE_TTL_MS, QR_RANDKEY_URL, QR_CODE_URL, QR_SCAN_URL, QR_LOGIN_URL, QR_DISPATCHER_URL, DEFAULT_HEADERS } from './constants.js';
import { encrypt, decrypt, EncryptedData } from './crypto.js';

// ====== 工具函数 ======

function expandPath(p: string): string {
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  if (p.includes('%LOCALAPPDATA%')) {
    return p.replace('%LOCALAPPDATA%', process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'));
  }
  if (p.includes('%APPDATA%')) {
    return p.replace('%APPDATA%', process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'));
  }
  return p;
}

function getConfigDir(): string {
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'boss-cli');
}

function getCredentialPath(): string {
  return path.join(getConfigDir(), CREDENTIAL_FILE);
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ====== 浏览器 Cookie 定位 (T019) ======

const SUPPORTED_BROWSERS = ['chrome', 'firefox', 'edge', 'brave', 'chromium', 'opera', 'vivaldi'] as const;
type SupportedBrowser = typeof SUPPORTED_BROWSERS[number];

function findFirefoxProfile(): string | null {
  const platform = os.platform();
  let firefoxDir = '';

  if (platform === 'linux') {
    firefoxDir = path.join(os.homedir(), '.mozilla', 'firefox');
  } else if (platform === 'darwin') {
    firefoxDir = path.join(os.homedir(), 'Library', 'Application Support', 'Firefox', 'Profiles');
  } else if (platform === 'win32') {
    firefoxDir = path.join(process.env.APPDATA || '', 'Mozilla', 'Firefox', 'Profiles');
  }

  try {
    if (!fs.existsSync(firefoxDir)) return null;
    const iniPath = path.join(firefoxDir, '..', 'profiles.ini');
    if (fs.existsSync(iniPath)) {
      const ini = fs.readFileSync(iniPath, 'utf-8');
      const match = ini.match(/Path=([^\r\n]+)/);
      if (match) {
        const profileDir = match[1];
        // 相对路径 vs 绝对路径
        if (path.isAbsolute(profileDir)) {
          return path.join(profileDir, 'cookies.sqlite');
        }
        // 检查 profiles.ini 所在目录
        const parentDir = path.dirname(iniPath);
        const resolved = path.join(parentDir, profileDir, 'cookies.sqlite');
        if (fs.existsSync(resolved)) return resolved;
        // 检查 firefoxDir 下
        const resolved2 = path.join(firefoxDir, profileDir, 'cookies.sqlite');
        if (fs.existsSync(resolved2)) return resolved2;
      }
    }
  } catch {
    // Firefox 未安装
  }
  return null;
}

export function findCookieDb(browser: string): string | null {
  const platform = os.platform();
  const platformPaths = BROWSER_PATHS[platform];
  if (!platformPaths) return null;

  const rawPath = platformPaths[browser];
  if (!rawPath) {
    // Firefox 特殊处理
    if (browser === 'firefox') {
      return findFirefoxProfile();
    }
    return null;
  }

  const expanded = expandPath(rawPath);
  return fs.existsSync(expanded) ? expanded : null;
}

// ====== Chromium Cookie 解密 (T020) ======

function getChromiumKey(browser: string): Buffer | null {
  const platform = os.platform();

  if (platform === 'darwin') {
    const keychainMap: Record<string, string> = {
      chrome: 'Chrome Safe Storage',
      'google-chrome': 'Chrome Safe Storage',
      brave: 'Brave Safe Storage',
      edge: 'Microsoft Edge Safe Storage',
      opera: 'Opera Safe Storage',
      vivaldi: 'Vivaldi Safe Storage',
      chromium: 'Chromium Safe Storage',
    };
    const keychainName = keychainMap[browser] || 'Chrome Safe Storage';
    try {
      const result = execSync(
        `security find-generic-password -wa '${keychainName}' 2>/dev/null`,
        { encoding: 'utf-8' }
      ).trim();
      if (result && result.length > 0) {
        return Buffer.from(result, 'utf-8');
      }
    } catch {
      try {
        const result = execSync(
          `security find-generic-password -wa 'Chrome' 2>/dev/null`,
          { encoding: 'utf-8' }
        ).trim();
        if (result && result.length > 0) {
          return Buffer.from(result, 'utf-8');
        }
      } catch {
        // 无法获取钥匙链
      }
    }
    return null;
  }

  if (platform === 'linux') {
    // 方法 1: 尝试 secret-tool (gnome-keyring)
    try {
      const result = execSync(
        'secret-tool lookup application chrome 2>/dev/null',
        { encoding: 'utf-8' }
      ).trim();
      if (result && result.length > 0 && result.length >= 16) {
        return Buffer.from(result, 'utf-8');
      }
    } catch {
      // secret-tool 不可用
    }

    // 方法 2: 尝试 kwallet (KDE)
    try {
      const result = execSync(
        'kwallet-query -r chrome kdewallet 2>/dev/null',
        { encoding: 'utf-8' }
      ).trim();
      if (result && result.length > 0 && result.length >= 16) {
        return Buffer.from(result, 'utf-8');
      }
    } catch {
      // kwallet 不可用
    }

    // 方法 3: 回退到 PBKDF2 (旧版 Chrome, 兼容无密钥环环境)
    return crypto.pbkdf2Sync('peanuts', 'saltysalt', 1, 16, 'sha1');
  }

  if (platform === 'win32') {
    return null; // Windows DPAPI 由系统处理
  }

  return null;
}

export function decryptChromiumCookies(profilePath: string): Cookie[] {
  const cookies: Cookie[] = [];
  const browser = path.basename(path.dirname(profilePath)).toLowerCase();
  const key = getChromiumKey(browser);

  try {
    const db = new Database(profilePath, { readonly: true });

    const rows = db.prepare(
      `SELECT host_key, name, value, encrypted_value, is_secure, is_httponly, expires_utc
       FROM cookies WHERE host_key LIKE '%zhipin.com%'`
    ).all() as Array<Record<string, unknown>>;

    for (const row of rows) {
      const hostKey = String(row.host_key || '');
      const name = String(row.name || '');
      const encryptedValue = row.encrypted_value as Buffer | null;

      let value = String(row.value || '');

      // 尝试解密 encrypted_value
      if (encryptedValue && encryptedValue.length > 0) {
        try {
          const decrypted = decryptChromiumValue(encryptedValue, key);
          if (decrypted) {
            value = decrypted;
          }
        } catch {
          // 解密失败，使用原始 value 或跳过
        }
      }

      cookies.push({
        name,
        value,
        domain: hostKey.startsWith('.') ? hostKey : `.${hostKey}`,
        path: '/',
        secure: Boolean(row.is_secure),
        httpOnly: Boolean(row.is_httponly),
        expires: row.expires_utc ? Number(row.expires_utc) : undefined,
      });
    }

    db.close();
  } catch (err) {
    // 数据库无法打开（可能被浏览器锁定）
    if (err instanceof Error) {
      console.error(`读取浏览器 Cookie 失败: ${err.message}`);
    }
  }

  return cookies;
}

function decryptChromiumValue(encryptedValue: Buffer, key: Buffer | null): string | null {
  // v10 格式: "v10" + nonce(12) + ciphertext + tag(16)
  const prefix = encryptedValue.subarray(0, 3).toString('utf-8');

  if (prefix === 'v10' || prefix === 'v11') {
    if (!key) return null;

    const nonce = encryptedValue.subarray(3, 15);  // 12 bytes
    const ciphertextWithTag = encryptedValue.subarray(15);

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
      const decrypted = Buffer.concat([
        decipher.update(ciphertextWithTag),
        decipher.final(),
      ]);
      return decrypted.toString('utf-8');
    } catch {
      return null;
    }
  }

  // v20 格式 (Chrome 127+): App-Bound Encryption
  // 暂不支持，跳过
  if (prefix === 'v20') {
    return null;
  }

  // 未加密，直接返回
  return encryptedValue.toString('utf-8');
}

// ====== Firefox Cookie 解密 (T021) ======

export function decryptFirefoxCookies(_profilePath: string): Cookie[] {
  // v1 暂不支持 Firefox Cookie 解密
  // 需要解析 key4.db (NSS cert9/key4 格式)
  // 提示用户使用 Chrome
  console.error('Firefox Cookie 解密暂未支持，请使用 Chrome、Edge 或其他 Chromium 系浏览器');
  return [];
}

// ====== 统一 Cookie 提取 (T022) ======

export function autoExtractCookies(cookieSource?: string): Cookie[] {
  // 白名单校验
  if (cookieSource) {
    if (!SUPPORTED_BROWSERS.includes(cookieSource as SupportedBrowser)) {
      console.error(
        `不支持的浏览器: ${cookieSource}\n` +
        `仅支持: ${SUPPORTED_BROWSERS.join('/')}`
      );
      return [];
    }

    const dbPath = findCookieDb(cookieSource);
    if (!dbPath) {
      console.error(`未找到 ${cookieSource} 的 Cookie 数据，请确认浏览器已安装且登录过 zhipin.com`);
      return [];
    }

    if (cookieSource === 'firefox') {
      return decryptFirefoxCookies(dbPath);
    }
    return decryptChromiumCookies(dbPath);
  }

  // 自动探测所有支持的浏览器
  for (const browser of SUPPORTED_BROWSERS) {
    if (browser === 'firefox') continue; // v1 跳过 Firefox

    const dbPath = findCookieDb(browser);
    if (dbPath) {
      const cookies = decryptChromiumCookies(dbPath);

      // 过滤 zhipin.com Cookie，验证必要字段
      const zhipinCookies = cookies.filter(c =>
        c.domain.includes('zhipin.com') && c.name && c.value
      );

      if (zhipinCookies.length > 0) {
        // 验证 __zp_stoken__ 是否存在
        const hasStoken = zhipinCookies.some(c => c.name === '__zp_stoken__');
        if (hasStoken) {
          return zhipinCookies;
        }
        // 即使没有 stoken，只要有足够多的 Cookie 也返回
        return zhipinCookies;
      }
    }
  }

  return [];
}

// ====== 二维码登录 (T023) ======

export async function qrcodeLogin(): Promise<Cookie[]> {
  // Step 1: 获取 QR session
  console.error('正在初始化二维码登录...');

  const randKeyResp = await fetch(QR_RANDKEY_URL, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
  });
  const randKeyData = await randKeyResp.json() as Record<string, unknown>;

  if (randKeyData.code !== 0) {
    throw new Error(`获取 QR session 失败: ${randKeyData.message || '未知错误'}`);
  }

  const sessionData = randKeyData.zpData as Record<string, unknown>;
  const qrId = String(sessionData.qrId || '');
  const randKey = String(sessionData.randKey || '');

  if (!qrId) {
    throw new Error('获取二维码失败：未返回有效的 qrId');
  }

  // Step 2: 获取二维码图片并渲染到终端
  try {
    const qrImgResp = await fetch(`${QR_CODE_URL}?content=${encodeURIComponent(qrId)}`, {
      headers: DEFAULT_HEADERS,
    });

    if (qrImgResp.ok) {
      // QR_CODE_URL 返回的是 PNG 图片，需要在终端渲染
      // 使用 qrcode-terminal 渲染 URL 格式的内容
      console.error('\n请使用 BOSS直聘 APP 扫描以下二维码登录:\n');
      QRCode.generate(`https://www.zhipin.com/m/?qrId=${qrId}`, { small: true });
      console.error('\n等待扫码中...\n');
    } else {
      // 回退到直接渲染 qrId
      console.error('\n请使用 BOSS直聘 APP 扫描以下二维码登录:\n');
      QRCode.generate(qrId, { small: true });
      console.error('\n等待扫码中...\n');
    }
  } catch {
    // 二维码图片获取失败，使用 qrId 直接渲染
    console.error('\n请使用 BOSS直聘 APP 扫描以下二维码登录:\n');
    QRCode.generate(qrId, { small: true });
    console.error('\n等待扫码中...\n');
  }

  // Step 3: 轮询等待扫码（最多 120 秒）
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await delay(2000);

    try {
      const scanResp = await fetch(`${QR_SCAN_URL}?uuid=${encodeURIComponent(qrId)}`, {
        headers: DEFAULT_HEADERS,
        signal: AbortSignal.timeout(35000), // 35s 长轮询
      });
      const scanData = await scanResp.json() as Record<string, unknown>;

      if (scanData.scaned) {
        console.error('已扫码，等待确认...');

        // Step 4: 等待用户确认登录
        for (let j = 0; j < 60; j++) {
          await delay(2000);

          try {
            const confirmResp = await fetch(`${QR_LOGIN_URL}?qrId=${encodeURIComponent(qrId)}`, {
              headers: DEFAULT_HEADERS,
              signal: AbortSignal.timeout(35000),
            });
            const confirmData = await confirmResp.json() as Record<string, unknown>;

            if (confirmData.login === true) {
              console.error('已确认登录，获取凭证...');

              // Step 5: 通过 dispatcher 获取登录 Cookie
              const dispatchResp = await fetch(
                `${QR_DISPATCHER_URL}?qrId=${encodeURIComponent(qrId)}&pk=header-login`,
                { headers: DEFAULT_HEADERS }
              );

              const setCookieHeader = dispatchResp.headers.get('set-cookie');
              const cookies = parseSetCookie(setCookieHeader || '');

              if (cookies.length > 0) {
                console.error('✓ 扫码登录成功');
                return cookies;
              }

              // 如果 set-cookie header 为空，尝试从 body 中提取
              try {
                const dispatchData = await dispatchResp.json() as Record<string, unknown>;
                const zpRoute = dispatchData.zpData as Record<string, unknown> | undefined;
                const redirectUrl = String(zpRoute?.redirectUrl || zpRoute?.redirect || '');
                if (redirectUrl) {
                  // 跟随重定向获取 Cookie
                  const redirectResp = await fetch(redirectUrl, {
                    headers: DEFAULT_HEADERS,
                    redirect: 'manual',
                  });
                  const redirectCookies = parseSetCookie(redirectResp.headers.get('set-cookie') || '');
                  if (redirectCookies.length > 0) {
                    console.error('✓ 扫码登录成功');
                    return redirectCookies;
                  }
                }
              } catch {
                // 忽略 body 解析错误
              }

              console.error('✓ 扫码登录成功（部分 Cookie 可能缺失）');
              return cookies;
            }
          } catch {
            // 网络超时，继续轮询
          }
        }

        throw new Error('二维码确认超时（120 秒未确认），请重试');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('超时')) {
        throw err;
      }
      // 网络错误，继续轮询
    }
  }

  throw new Error('二维码登录超时（120 秒未扫码），请重试');
}

function parseSetCookie(header: string): Cookie[] {
  const cookies: Cookie[] = [];
  if (!header) return cookies;

  for (const part of header.split(',')) {
    const trimmed = part.trim();
    const segments = trimmed.split(';');
    const [nameValue] = segments;
    if (!nameValue) continue;

    const [name, ...valueParts] = nameValue.split('=');
    const value = valueParts.join('=');

    if (!name || !name.trim()) continue;

    cookies.push({
      name: name.trim(),
      value: (value || '').trim(),
      domain: '.zhipin.com',
      path: '/',
    });
  }

  return cookies;
}

// ====== 凭证持久化 (T024) ======

export function saveCredential(cookies: Cookie[], source: string): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const now = new Date();
  const credential: Credential = {
    cookies,
    source: source as Credential['source'],
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + COOKIE_TTL_MS).toISOString(),
  };

  const encrypted = encrypt(credential as unknown as Record<string, unknown>);
  fs.writeFileSync(getCredentialPath(), JSON.stringify(encrypted), 'utf-8');
}

export function loadCredential(): Credential | null {
  try {
    const filePath = getCredentialPath();
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const encrypted: EncryptedData = JSON.parse(raw);

    // 验证加密数据结构
    if (!encrypted.iv || !encrypted.authTag || !encrypted.ciphertext) {
      throw new Error('凭证文件格式无效');
    }

    const decrypted = decrypt(encrypted);

    // 验证 Credential 数据结构
    if (!decrypted.cookies || !Array.isArray(decrypted.cookies) ||
        !decrypted.source || !decrypted.createdAt || !decrypted.expiresAt) {
      throw new Error('凭证数据结构不完整');
    }

    return decrypted as unknown as Credential;
  } catch (err) {
    // 格式损坏或解密失败 → 删除损坏文件
    const filePath = getCredentialPath();
    try {
      fs.unlinkSync(filePath);
    } catch {
      // 文件可能不存在
    }
    console.error('凭证文件已损坏，已清除。请重新登录: boss login');
    return null;
  }
}

export function refreshIfNeeded(cred: Credential): Credential | null {
  const now = new Date();
  const expiresAt = new Date(cred.expiresAt);

  if (now < expiresAt) {
    return cred; // 未过期
  }

  // 尝试从原始浏览器刷新
  const cookies = autoExtractCookies(cred.source !== 'qrcode' ? cred.source : undefined);
  if (cookies.length > 0) {
    saveCredential(cookies, cred.source);
    return loadCredential();
  }

  console.error('凭证已过期且无法自动刷新，请重新登录: boss login');
  return null;
}
