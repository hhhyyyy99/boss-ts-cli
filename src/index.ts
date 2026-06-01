#!/usr/bin/env node

import { Command } from 'commander';
import { setVerbose, setJsonMode } from './commands/common.js';

// 读取 package.json 获取版本号
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 尝试读取 package.json
let version = '0.1.0';
try {
  const pkgPath = join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  version = pkg.version || version;
} catch {
  // 使用默认版本
}

const program = new Command();

program
  .name('boss')
  .description('BOSS直聘 CLI 工具 — 搜索职位、管理投递、与招聘方沟通')
  .version(version, '--version', '显示版本号')
  .option('-v, --verbose', '详细日志模式（显示请求 URL、状态码、耗时）')
  .option('--json', 'JSON 格式输出到 stdout')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.json) {
      setJsonMode(true);
    }
    if (opts.verbose) {
      setVerbose(true);
    }
  });

import { registerAuthCommands } from './commands/auth.js';
import { registerSearchCommands } from './commands/search.js';
import { registerPersonalCommands } from './commands/personal.js';
import { registerSocialCommands } from './commands/social.js';
import { registerRecruiterCommands } from './commands/recruiter.js';
import { ApiClient } from './client.js';
import { loadCredential, refreshIfNeeded } from './auth.js';

// 创建共享的 API 客户端实例
const client = new ApiClient();

// 自动加载已保存的凭证
try {
  const savedCredential = loadCredential();
  if (savedCredential) {
    const refreshed = refreshIfNeeded(savedCredential);
    if (refreshed) {
      client.setCookies(refreshed.cookies);
    }
  }
} catch (err) {
  // 凭证加载静默失败（已由 loadCredential 输出错误信息）
  // 用户可通过 boss login 重新登录
}

// 注册所有命令模块
registerAuthCommands(program, client);
registerSearchCommands(program, client);
registerPersonalCommands(program, client);
registerSocialCommands(program, client);
registerRecruiterCommands(program, client);

program.parse(process.argv);
