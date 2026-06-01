/**
 * BOSS直聘 CLI - 认证命令模块
 * login, logout, status, me
 */
import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { ApiClient } from '../client.js';
import { handleCommand, isJsonMode, printInfo } from './common.js';
import { autoExtractCookies, qrcodeLogin, saveCredential, loadCredential, refreshIfNeeded } from '../auth.js';
import { PROFILE_API, SEARCH_API, RECOMMEND_API } from '../constants.js';
import { ErrorCodes } from '../schema.js';

export function registerAuthCommands(program: Command, client: ApiClient): void {
  // boss login
  program
    .command('login')
    .description('登录 BOSS直聘（自动提取浏览器 Cookie 或扫码登录）')
    .option('--cookie-source <browser>', '指定浏览器 (chrome/firefox/edge/brave/chromium/opera/vivaldi)')
    .option('--qrcode', '强制使用二维码登录')
    .action(async (options: { cookieSource?: string; qrcode?: boolean; json?: boolean }) => {
      await handleCommand(async () => {
        let cookies = null;
        let source = '';

        if (options.qrcode) {
          // 强制二维码
          const spinner = ora('生成二维码...').start();
          try {
            cookies = await qrcodeLogin();
            source = 'qrcode';
            spinner.stop();
          } catch (err) {
            spinner.stop();
            throw err;
          }
        } else {
          // 先尝试浏览器提取
          const spinner = ora('正在从浏览器提取 Cookie...').start();
          cookies = autoExtractCookies(options.cookieSource);
          spinner.stop();

          if (cookies.length > 0) {
            source = options.cookieSource || 'chrome';
            if (!isJsonMode()) {
              printInfo(chalk.green(`✓ 已从浏览器提取 ${cookies.length} 个 Cookie`));
            }
          } else {
            // 回退到二维码登录
            if (!isJsonMode()) {
              printInfo(chalk.yellow('浏览器 Cookie 提取失败，回退到二维码登录...'));
            }
            cookies = await qrcodeLogin();
            source = 'qrcode';
          }
        }

        if (!cookies || cookies.length === 0) {
          throw new Error('登录失败，未获取到有效 Cookie');
        }

        saveCredential(cookies, source);
        client.setCookies(cookies);

        if (!isJsonMode()) {
          printInfo(chalk.green('\n✓ 登录成功！'));
        }

        return { message: '登录成功', cookieCount: cookies.length, source };
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

        // 清除凭证文件
        client.setCookies([]);
        saveCredential([], 'qrcode'); // 覆盖为空

        if (!isJsonMode()) {
          printInfo(chalk.green('✓ 已退出登录'));
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
          await client.get(RECOMMEND_API);
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
        const data = await client.get(PROFILE_API);
        const profileData = (data as Record<string, unknown>).zpData || data;

        if (!isJsonMode()) {
          const profile = profileData as Record<string, unknown>;
          const table = new Table();
          table.push(
            { '姓名': String(profile.name || '未知') },
            { '年龄': String(profile.age || '未知') },
            { '学历': String(profile.degreeCategory || '未知') },
            { '工作经验': String(profile.workYears || '未知') },
            { '城市': String(profile.cityName || '未知') },
            { '期望薪资': String(profile.expectSalary || '未知') },
          );
          printInfo(table.toString());
        }

        return profileData;
      }, { json: options.json });
    });
}
