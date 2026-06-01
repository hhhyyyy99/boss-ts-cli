#!/usr/bin/env node
// 从 Chrome DevTools 导出的 JSON 导入 Cookie 到 boss-ts-cli
// 用法: node scripts/import-cookies.mjs < cookies.json

import { readFileSync } from 'node:fs';

// 直接内联 saveCredential 逻辑（避免 tsx 依赖）
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ALGORITHM = 'aes-256-gcm';
function deriveKey() {
  const fingerprint = `${os.hostname()}-${os.userInfo().username}`;
  let machineId = '';
  try {
    if (fs.existsSync('/etc/machine-id')) machineId = fs.readFileSync('/etc/machine-id', 'utf-8').trim();
    else machineId = os.hostname() + '-' + os.platform();
  } catch { machineId = os.hostname(); }
  return crypto.createHash('sha256').update(`${fingerprint}-${machineId}`).digest();
}
const KEY = deriveKey();

function encrypt(obj) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv, { authTagLength: 16 });
  const json = JSON.stringify(obj);
  const encrypted = Buffer.concat([cipher.update(json, 'utf-8'), cipher.final()]);
  return { iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64'), ciphertext: encrypted.toString('base64') };
}

function saveCredential(cookies, source) {
  const dir = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'boss-cli');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const now = new Date();
  const credential = { cookies, source, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 7*24*60*60*1000).toISOString() };
  fs.writeFileSync(path.join(dir, 'credential.json'), JSON.stringify(encrypt(credential)));
}

// 主流程
let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => raw += chunk);
process.stdin.on('end', () => {
  try {
    const cookies = JSON.parse(raw);
    const list = Array.isArray(cookies) ? cookies : [cookies];
    const formatted = list.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain || '.zhipin.com',
      path: c.path || '/',
    }));
    saveCredential(formatted, 'chrome');
    console.log('✅ 已导入 ' + formatted.length + ' 个 Cookie');
    const has = (n) => formatted.some(c => c.name === n);
    console.log('   __zp_stoken__: ' + (has('__zp_stoken__') ? '✅' : '❌ 缺失'));
    if (!has('__zp_stoken__')) console.log('   ⚠️  search/history 等命令需要此 Cookie');
  } catch(e) {
    console.error('❌ ' + e.message);
  }
});
