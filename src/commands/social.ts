/**
 * BOSS直聘 CLI - 社交命令模块
 * greet（打招呼）、batch-greet（批量打招呼）
 */
import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { ApiClient } from '../client.js';
import { handleCommand, isJsonMode, printInfo, printError } from './common.js';
import { BASE_URL, SEARCH_API, GREET_API, RATE_LIMIT_CONFIG } from '../constants.js';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function registerSocialCommands(program: Command, client: ApiClient): void {
  // boss greet <securityId>
  program
    .command('greet <securityId>')
    .description('向招聘方发送打招呼')
    .action(async (securityId: string, options: { json?: boolean }) => {
      await handleCommand(async () => {
        const result = await client.get(GREET_API, { securityId });

        if (!isJsonMode()) {
          const data = result as Record<string, unknown>;
          if (data.code === 0) {
            printInfo(chalk.green('✓ 打招呼发送成功'));
          } else {
            printError(`打招呼失败: ${data.message || '未知错误'}`);
          }
        }

        return result;
      }, options);

      // 防检测延迟
      await delay(RATE_LIMIT_CONFIG.batchGreetDelay);
    });

  // boss batch-greet <keyword>
  program
    .command('batch-greet <keyword>')
    .description('批量打招呼')
    .option('-n, --count <number>', '打招呼数量', '5')
    .option('--city <city>', '城市筛选')
    .option('--salary <salary>', '薪资筛选')
    .option('--exp <exp>', '经验筛选')
    .option('--degree <degree>', '学历筛选')
    .option('--industry <industry>', '行业筛选')
    .option('--scale <scale>', '公司规模筛选')
    .option('--stage <stage>', '融资阶段筛选')
    .option('--job-type <jobType>', '职位类型筛选')
    .option('--dry-run', '仅预览，不实际发送')
    .option('-y, --yes', '跳过确认提示')
    .action(async (keyword: string, options: Record<string, unknown>) => {
      await handleCommand(async () => {
        const count = parseInt(String(options.count), 10);
        const dryRun = Boolean(options.dryRun);

        // 1. 搜索职位
        const params = client.buildSearchParams({
          keyword,
          city: options.city as string | undefined,
          salary: options.salary as string | undefined,
          exp: options.exp as string | undefined,
          degree: options.degree as string | undefined,
          industry: options.industry as string | undefined,
          scale: options.scale as string | undefined,
          stage: options.stage as string | undefined,
          jobType: options.jobType as string | undefined,
          page: 1,
        });
        params.pageSize = count;

        const searchResult = await client.get(SEARCH_API, params);
        const data = searchResult as Record<string, unknown>;
        const jobList = (data.jobList || []) as Array<{
          securityId: string;
          jobName: string;
          companyName: string;
          bossName?: string;
        }>;

        if (!Array.isArray(jobList) || jobList.length === 0) {
          printError('未找到匹配的职位，请调整搜索条件');
          return { searched: 0, greeted: 0, list: [] };
        }

        const targets = jobList.slice(0, count);

        if (!isJsonMode()) {
          // 预览目标列表
          const table = new Table({
            head: [chalk.cyan('#'), chalk.cyan('职位'), chalk.cyan('公司'), chalk.cyan('招聘者')],
            colWidths: [5, 25, 25, 15],
          });
          targets.forEach((job, i) => {
            table.push([String(i + 1), job.jobName, job.companyName, job.bossName || '未知']);
          });
          printInfo(table.toString());
          printInfo(chalk.yellow(`共 ${targets.length} 个目标`));
        }

        if (dryRun) {
          if (!isJsonMode()) {
            printInfo(chalk.blue('[干跑模式] 未实际发送打招呼'));
          }
          return { searched: jobList.length, targets: targets.length, dryRun: true, list: targets };
        }

        // 2. 确认（非 JSON 模式）
        if (!isJsonMode() && !options.yes) {
          // 自动确认（在 CLI 环境中默认不交互）
          // 用户可以用 --yes 跳过或 Ctrl+C 取消
          printInfo(chalk.gray('开始批量打招呼...（使用 --dry-run 可预览）'));
        }

        // 3. 逐个打招呼
        const results: Array<{ securityId: string; jobName: string; success: boolean; error?: string }> = [];
        let successCount = 0;
        let failCount = 0;

        const spinner = !isJsonMode() ? ora('打招呼中...').start() : null;

        for (let i = 0; i < targets.length; i++) {
          const job = targets[i];
          try {
            await client.get(GREET_API, { securityId: job.securityId });
            results.push({ securityId: job.securityId, jobName: job.jobName, success: true });
            successCount++;

            if (spinner) {
              spinner.text = `打招呼中... ${i + 1}/${targets.length} (成功: ${successCount}, 失败: ${failCount})`;
            }
          } catch (err) {
            results.push({
              securityId: job.securityId,
              jobName: job.jobName,
              success: false,
              error: err instanceof Error ? err.message : '未知错误',
            });
            failCount++;
          }

          // 防检测延迟
          if (i < targets.length - 1) {
            await delay(RATE_LIMIT_CONFIG.batchGreetDelay);
          }
        }

        if (spinner) {
          spinner.stop();
        }

        if (!isJsonMode()) {
          printInfo(chalk.green(`\n✓ 批量打招呼完成: 成功 ${successCount}/${targets.length}`));
          if (failCount > 0) {
            printInfo(chalk.red(`✗ 失败 ${failCount} 个`));
            results.filter(r => !r.success).forEach(r => {
              printInfo(chalk.red(`  - ${r.jobName}: ${r.error}`));
            });
          }
        }

        return {
          total: results.length,
          success: successCount,
          failed: failCount,
          results,
        };
      }, { json: Boolean((options as Record<string, unknown>).json) });
    });
}
