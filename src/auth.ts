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
import { BROWSER_PATHS, CREDENTIAL_FILE, COOKIE_TTL_MS, QR_LOGIN_API, QR_CHECK_API, DEFAULT_HEADERS } from './constants.js';
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
    // macOS: 使用 security CLI 从钥匙链获取
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
      // macOS <10.15: Chrome 使用 "Chrome" 而非 "Chrome Safe Storage"
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
    // Linux: PBKDF2-HMAC-SHA1, password="peanuts", salt="saltysalt", iterations=1
    return crypto.pbkdf2Sync('peanuts', 'saltysalt', 1, 16, 'sha1');
  }

  if (platform === 'win32') {
    // Windows: 不需要额外获取密钥（DPAPI 由系统处理）
    return null;
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
  // 1. 生成二维码
  const qrResponse = await fetch(QR_LOGIN_API, {
    headers: DEFAULT_HEADERS,
  });
  const qrData = await qrResponse.json() as Record<string, unknown>;
  const qrCodeData = qrData.zpData || qrData;

  const qrId = String((qrCodeData as Record<string, unknown>).qrCode || '');
  const qrUrl = String((qrCodeData as Record<string, unknown>).url || '');

  if (!qrId) {
    throw new Error('获取二维码失败，请重试');
  }

  // 2. 终端显示二维码
  console.error('\n请使用 BOSS直聘 APP 扫描以下二维码登录:\n');
  QRCode.generate(qrUrl || qrId, { small: true });
  console.error('\n等待扫码中...\n');

  // 3. 轮询检查扫码状态（每 2 秒，最多 120 秒）
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await delay(2000);

    try {
      const checkResponse = await fetch(`${QR_CHECK_API}?qrId=${qrId}`, {
        headers: DEFAULT_HEADERS,
      });
      const checkData = await checkResponse.json() as Record<string, unknown>;

      const status = checkData.code || (checkData.zpData as Record<string, unknown>)?.code;
      if (status === 0 || status === '0') {
        // 扫码成功，提取 Cookie
        const setCookieHeader = checkResponse.headers.get('set-cookie');
        const cookies = parseSetCookie(setCookieHeader || '');
        if (cookies.length > 0) {
          console.error('✓ 扫码登录成功');
          return cookies;
        }
      }

      const msg = String(checkData.message || (checkData.zpData as Record<string, unknown>)?.message || '');
      if (msg.includes('已扫码') || msg.includes('确认')) {
        console.error('已扫码，等待确认...');
      }
    } catch {
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
