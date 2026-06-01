/**
 * 二维码登录完整流程
 * 获取 QR session → 终端渲染二维码 → 轮询扫码 → 获取 Cookie
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import QRCode from 'qrcode-terminal';
import { Cookie } from '../types/index.js';
import { QR_RANDKEY_URL, QR_CODE_URL, QR_SCAN_URL, QR_LOGIN_URL, QR_DISPATCHER_URL, DEFAULT_HEADERS } from '../constants.js';
import { createTempFile, registerCleanup, immediateCleanup } from './cleanup.js';

const MAX_SCAN_ATTEMPTS = 60;  // 120 秒 (2 秒间隔)
const MAX_CONFIRM_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function qrcodeLogin(): Promise<Cookie[]> {
  // Step 1: 获取 QR session
  console.error('正在获取二维码...');

  const randKeyResp = await fetch(QR_RANDKEY_URL, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
  });

  if (!randKeyResp.ok) {
    throw new Error(`获取 QR session 失败: HTTP ${randKeyResp.status}`);
  }

  let randKeyData: Record<string, unknown>;
  try {
    randKeyData = await randKeyResp.json() as Record<string, unknown>;
  } catch {
    throw new Error('获取 QR session 失败: 服务器返回非预期响应格式');
  }

  if (randKeyData.code !== 0) {
    throw new Error(`获取 QR session 失败: ${randKeyData.message || '未知错误'}`);
  }

  const sessionData = randKeyData.zpData as Record<string, unknown>;
  const qrId = String(sessionData.qrId || '');
  const randKey = String(sessionData.randKey || '');

  if (!qrId) {
    throw new Error('获取二维码失败：未返回有效的 qrId');
  }

  // Step 2: 二维码 URL（从 randkey 响应中获取原始内容，避免图片下载→解码→重渲染）
  // qrContent 就是二维码包含的 URL，直接渲染即可
  let qrContent = String(sessionData.qrContent || sessionData.qrcode || qrId);

  // 下载二维码图片（供 GUI 环境打开）
  let tmpFile = '';
  try {
    const qrImgResp = await fetch(`${QR_CODE_URL}?content=${encodeURIComponent(qrId)}`, {
      headers: DEFAULT_HEADERS,
    });
    if (qrImgResp.ok) {
      const qrImageBuffer = Buffer.from(await qrImgResp.arrayBuffer());
      tmpFile = createTempFile('boss_qr', 'png');
      fs.writeFileSync(tmpFile, qrImageBuffer);
      registerCleanup(tmpFile);
      console.error(`  📁 二维码图片: ${tmpFile}`);
    }
  } catch {
    // 下载图片失败不影响终端渲染
  }

  // Step 3: 终端渲染二维码
  console.error('\n请使用 BOSS直聘 APP 扫描二维码登录:\n');
  QRCode.generate(qrContent, { small: true });

  if (tmpFile) {
    console.error(`\n如终端二维码无法识别，请直接打开图片: ${tmpFile}`);
  }
  console.error('等待扫码中（2 分钟内有效）...\n');

  // 尝试打开系统图片查看器
  if (tmpFile) {
    tryOpenImageViewer(tmpFile);
  }

  // Step 4: 轮询扫码
  let scanned = false;
  for (let i = 0; i < MAX_SCAN_ATTEMPTS; i++) {
    await delay(POLL_INTERVAL_MS);

    try {
      const scanResp = await fetch(`${QR_SCAN_URL}?uuid=${encodeURIComponent(qrId)}`, {
        headers: DEFAULT_HEADERS,
      });
      const scanData = await scanResp.json() as Record<string, unknown>;

      if (scanData.scaned) {
        scanned = true;
        console.error('已扫码，等待确认...');
        break;
      }

      // 检查是否过期
      if (scanData.code && scanData.code !== 0) {
        throw new Error(`二维码已过期: ${scanData.message || '请重新生成'}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('过期')) throw err;
      // 网络错误，继续轮询
    }
  }

  if (!scanned) {
    immediateCleanup(tmpFile);
    throw new Error('二维码登录超时（2 分钟内未扫码），请重试');
  }

  // Step 5: 轮询确认
  for (let j = 0; j < MAX_CONFIRM_ATTEMPTS; j++) {
    await delay(POLL_INTERVAL_MS);

    try {
      const confirmResp = await fetch(`${QR_LOGIN_URL}?qrId=${encodeURIComponent(qrId)}`, {
        headers: DEFAULT_HEADERS,
      });
      const confirmData = await confirmResp.json() as Record<string, unknown>;

      if (confirmData.login === true) {
        console.error('已确认登录，获取凭证...');

        // Step 6: 通过 dispatcher 获取登录 Cookie
        const dispatchResp = await fetch(
          `${QR_DISPATCHER_URL}?qrId=${encodeURIComponent(qrId)}&pk=header-login`,
          { headers: DEFAULT_HEADERS },
        );

        const cookies = parseSetCookieHeader(dispatchResp);

        // 如果 set-cookie header 为空，尝试从 body 中提取重定向 URL
        if (cookies.length === 0) {
          try {
            const dispatchData = await dispatchResp.json() as Record<string, unknown>;
            const zpRoute = dispatchData.zpData as Record<string, unknown> | undefined;
            const redirectUrl = String(zpRoute?.redirectUrl || zpRoute?.redirect || '');
            if (redirectUrl) {
              const redirectResp = await fetch(redirectUrl, {
                headers: DEFAULT_HEADERS,
                redirect: 'manual',
              });
              const redirectCookies = parseSetCookieHeader(redirectResp);
              if (redirectCookies.length > 0) {
                immediateCleanup(tmpFile);
                console.error('✓ 已获取扫码候选凭证，正在验证授权...');
                return redirectCookies;
              }
            }
          } catch {
            // body 解析失败，继续
          }
        }

        immediateCleanup(tmpFile);
        if (cookies.length > 0) {
          console.error('✓ 已获取扫码候选凭证，正在验证授权...');
        } else {
          console.error('扫码确认完成，但未获取到可验证候选凭证');
        }
        return cookies;
      }

      // 检查是否过期
      if (confirmData.code && confirmData.code !== 0) {
        immediateCleanup(tmpFile);
        throw new Error(`二维码确认超时: ${confirmData.message || '请在 App 中确认登录'}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('超时')) {
        immediateCleanup(tmpFile);
        throw err;
      }
      // 网络错误，继续轮询
    }
  }

  immediateCleanup(tmpFile);
  throw new Error('二维码确认超时（2 分钟内未确认），请重试');
}

/**
 * 解析 HTTP 响应的 Set-Cookie 头
 * 正确处理 expires 中的逗号（避免在日期中的逗号处分割）
 */
function parseSetCookieHeader(response: Response): Cookie[] {
  const cookies: Cookie[] = [];

  // 使用 response.headers.getSetCookie() 如果可用（更安全的解析）
  const setCookieHeaders = response.headers.getSetCookie ?
    response.headers.getSetCookie() :
    [response.headers.get('set-cookie') || ''];

  for (const header of setCookieHeaders) {
    if (!header) continue;

    // 第一个 ; 之前是 name=value
    const semicolonIdx = header.indexOf(';');
    const nameValue = semicolonIdx > 0 ? header.substring(0, semicolonIdx) : header;
    const eqIdx = nameValue.indexOf('=');

    if (eqIdx <= 0) continue;

    const name = nameValue.substring(0, eqIdx).trim();
    const value = nameValue.substring(eqIdx + 1).trim();

    if (!name || !value) continue;

    cookies.push({
      name,
      value,
      domain: '.zhipin.com',
      path: '/',
    });
  }

  return cookies;
}

/** 尝试用系统查看器打开图片 */
function tryOpenImageViewer(filePath: string): void {
  try {
    const platform = os.platform();
    if (platform === 'linux') {
      execSync(`xdg-open "${filePath}" 2>/dev/null || true`, { timeout: 3000 });
    } else if (platform === 'darwin') {
      execSync(`open "${filePath}"`, { timeout: 3000 });
    } else if (platform === 'win32') {
      execSync(`start "" "${filePath}"`, { timeout: 3000 });
    }
  } catch {
    // 无法打开查看器，继续终端渲染
  }
}
