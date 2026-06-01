/**
 * BOSS直聘 CLI - 认证命令模块
 * login, logout, status, me
 */
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { ApiClient } from '../client.js';
import { CandidateCredential, Cookie } from '../types/index.js';
import { qrcodeLogin } from '../login/qrcode.js';
import { webLogin } from '../login/web-login.js';
import { candidateFromCookies } from '../login/index.js';
import { handleCommand, isJsonMode, printInfo } from './common.js';
import { autoDetectCandidate, extractCandidateFromBrowser, getBrowserProfiles } from '../browsers/index.js';
import { loadCredential, refreshIfNeeded, saveVerifiedCredential, verifyCandidateCredential } from '../auth.js';
import { RESUME_BASEINFO_URL, SEARCH_API, RECOMMEND_API, CREDENTIAL_FILE } from '../constants.js';
import { ErrorCodes } from '../schema.js';
import { AuthFlowError } from '../exceptions.js';

export function registerAuthCommands(program: Command, client: ApiClient): void {
  // boss login
  program
    .command('login')
    .description('登录 BOSS直聘（默认自动提取浏览器 Cookie，也可扫码或浏览器页面登录）')
    .option('--qrcode', '使用二维码扫码登录')
    .option('--web', '使用浏览器页面登录')
    .option('--browser <name>', '指定浏览器 (chrome/edge/brave/firefox)')
    .option('--cookie-path <path>', '指定 Cookie 数据库文件路径（仅 Chromium 系列）')
    .option('--profile <name>', '指定浏览器用户配置文件名称 (如 "Default", "Profile 1")')
    .action(async (options: { qrcode?: boolean; web?: boolean; browser?: string; cookiePath?: string; profile?: string; json?: boolean }) => {
      await handleCommand(async () => {
        let candidate: CandidateCredential;

        if (options.qrcode) {
          // 二维码登录
          const spinner = ora('生成二维码...').start();
          try {
            const cookies = await qrcodeLogin();
            candidate = candidateFromCookies(cookies, 'qrcode', 'qrcode', 'qrcode');
            spinner.stop();
          } catch (err) {
            spinner.stop();
            throw err;
          }
        } else if (options.web) {
          // 浏览器页面登录
          try {
            const cookies = await webLogin();
            candidate = candidateFromCookies(cookies, 'web', 'web', 'browser cookie recovery');
          } catch (err) {
            if (!isJsonMode() && !(err instanceof AuthFlowError)) {
              printInfo(chalk.red('浏览器登录失败。请确认系统支持打开浏览器，或使用 --qrcode 方式登录'));
            }
            throw err;
          }
        } else {
          // 浏览器 Cookie 自动提取
          const spinner = ora('正在从浏览器提取 Cookie...').start();

          if (options.browser) {
            candidate = extractCandidateFromBrowser(options.browser, {
              cookiePath: options.cookiePath,
              profile: options.profile,
            });
          } else {
            candidate = autoDetectCandidate();
          }

          spinner.stop();

          if (candidate.cookies.length > 0) {
            if (!isJsonMode()) {
              printInfo(chalk.green(`✓ 已从浏览器提取 ${candidate.cookies.length} 个候选 Cookie，正在验证授权...`));
            }
          } else {
            // 未找到有效 Cookie，提示备选方案
            if (!isJsonMode()) {
              printInfo(chalk.yellow('未检测到有效登录会话'));
              if (options.browser) {
                const profiles = getBrowserProfiles(options.browser);
                if (profiles.length > 0) {
                  printInfo(chalk.gray(`检测到以下配置文件: ${profiles.join(', ')}`));
                  printInfo(chalk.gray('使用 --profile <name> 指定配置文件'));
                }
              }
              printInfo(chalk.gray('\n可使用以下方式登录:'));
              printInfo(chalk.gray('  boss login --qrcode  扫码登录'));
              printInfo(chalk.gray('  boss login --web     浏览器页面登录'));
              printInfo(chalk.gray(`  boss login --browser <name>  指定浏览器 (chrome/edge/brave/firefox)`));
            }
            throw new AuthFlowError(
              ErrorCodes.CREDENTIAL_ACQUISITION_FAILED,
              '未检测到可验证的登录会话',
              'credential_acquisition',
              ['boss login --qrcode', 'boss login --web'],
            );
          }
        }

        if (!candidate.cookies.length) {
          throw new AuthFlowError(
            ErrorCodes.CREDENTIAL_ACQUISITION_FAILED,
            '登录失败，未获取到可验证的候选凭证',
            'credential_acquisition',
            ['boss login --qrcode', 'boss login --web', 'boss login'],
          );
        }

        const verification = await verifyCandidateCredential(candidate);
        if (verification.status !== 'verified' || !verification.accountSummary) {
          const code = verification.status === 'unknown'
            ? ErrorCodes.AUTH_VERIFICATION_UNKNOWN
            : ErrorCodes.AUTH_VERIFICATION_FAILED;
          throw new AuthFlowError(
            code,
            `${verification.message}。${verification.nextActions.length ? `可尝试：${verification.nextActions.join(' / ')}` : ''}`,
            'authorization_verification',
            verification.nextActions,
          );
        }

        const credential = saveVerifiedCredential(candidate, verification);
        client.setCookies(candidate.cookies);
        const userInfo = verification.accountSummary.displayName || '已验证账号';

        if (!isJsonMode()) {
          printInfo(chalk.green(`\n✓ 登录成功！当前用户: ${userInfo}`));
          printInfo(chalk.gray(`登录来源: ${credential.source}`));
        }

        return {
          message: '登录成功',
          cookieCount: candidate.cookies.length,
          source: credential.source,
          user: verification.accountSummary,
          expiresAt: credential.expiresAt,
        };
      }, { json: options.json });
    });

  // boss logout
  program
    .command('logout')
    .description('清除登录凭证')
    .action(async (options: { json?: boolean }) => {
      await handleCommand(async () => {
        const credential = loadCredential();
        if (!credential) {
          if (!isJsonMode()) {
            printInfo('未登录，无需退出');
          }
          return { message: '未登录' };
        }

        // 彻底清除凭证文件
        client.setCookies([]);
        const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        const credPath = path.join(base, 'boss-cli', CREDENTIAL_FILE);
        try {
          fs.unlinkSync(credPath);
        } catch {
          // 文件可能已被删除
        }

        if (!isJsonMode()) {
          printInfo(chalk.green('✓ 已退出登录，本地凭证已清除'));
        }

        return { message: '已退出登录' };
      }, { json: options.json });
    });

  // boss status
  program
    .command('status')
    .description('检查登录状态')
    .action(async (options: { json?: boolean }) => {
      await handleCommand(async () => {
        const credential = loadCredential();
        if (!credential) {
          return {
            authenticated: false,
            cookieCount: 0,
            source: null,
          };
        }

        // 刷新凭证
        const refreshed = refreshIfNeeded(credential);
        if (!refreshed) {
          return {
            authenticated: false,
            cookieCount: 0,
            source: null,
          };
        }

        client.setCookies(refreshed.cookies);

        // 验证搜索 API 可用性
        let searchAuthenticated = false;
        let recommendAuthenticated = false;

        try {
          await client.get(SEARCH_API, { query: 'test', pageSize: 1 });
          searchAuthenticated = true;
        } catch {
          // 搜索 API 不可用
        }

        try {
          await client.get(RECOMMEND_API, { page: 1, tag: 5, isActive: 'true' });
          recommendAuthenticated = true;
        } catch {
          // 推荐 API 不可用
        }

        if (!isJsonMode()) {
          const table = new Table();
          table.push(
            { '认证状态': chalk.green('✓ 已认证') },
            { 'Cookie 数量': String(refreshed.cookies.length) },
            { '凭证来源': refreshed.source },
            { '凭证有效期': refreshed.expiresAt },
            { '最近验证': refreshed.verifiedAt || '旧版凭证未记录' },
            { '搜索 API': searchAuthenticated ? chalk.green('✓') : chalk.red('✗') },
            { '推荐 API': recommendAuthenticated ? chalk.green('✓') : chalk.red('✗') },
          );
          printInfo(table.toString());
        }

        return {
          authenticated: true,
          cookieCount: refreshed.cookies.length,
          source: refreshed.source,
          expiresAt: refreshed.expiresAt,
          user: refreshed.accountSummary || null,
          verifiedAt: refreshed.verifiedAt || null,
          searchAuthenticated,
          recommendAuthenticated,
        };
      }, { json: options.json });
    });

  // boss me
  program
    .command('me')
    .description('查看个人信息')
    .action(async (options: { json?: boolean }) => {
      await handleCommand(async () => {
        // 确保已认证
        const credential = loadCredential();
        if (!credential) {
          if (!isJsonMode()) {
            printInfo(chalk.red('未登录，请先执行 boss login'));
          }
          const { error } = await import('../schema.js');
          const envelope = error(ErrorCodes.NOT_AUTHENTICATED, '未登录');
          process.stdout.write(JSON.stringify(envelope) + '\n');
          process.exit(1);
          return null;
        }

        const refreshed = refreshIfNeeded(credential);
        if (!refreshed) {
          if (!isJsonMode()) {
            printInfo(chalk.red('凭证已过期，请重新登录'));
          }
          process.exit(1);
          return null;
        }

        client.setCookies(refreshed.cookies);
        const data = await client.get(RESUME_BASEINFO_URL);
        const profileData = (data as Record<string, unknown>).zpData || data;

        if (!isJsonMode()) {
          const profile = profileData as Record<string, unknown>;
          const table = new Table();
          table.push(
            { '姓名': String(profile.name || profile.nickName || '未知') },
            { '性别': profile.gender === 1 ? '男' : profile.gender === 2 ? '女' : '未知' },
            { '年龄': String(profile.age || '未知') },
            { '学历': String(profile.degreeCategory || '未知') },
            { '账号': String(profile.account || '未知') },
          );
          printInfo(table.toString());
        }

        return profileData;
      }, { json: options.json });
    });
}
