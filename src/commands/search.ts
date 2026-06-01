import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { writeFileSync } from 'node:fs';
import { ApiClient } from '../client.js';
import { handleCommand, isJsonMode, printInfo } from './common.js';
import { readCache, writeCache } from '../index-cache.js';
import { SEARCH_API, RECOMMEND_API, JOB_HISTORY_API, JOB_DETAIL_API, CITY_MAP } from '../constants.js';
import { InvalidParamsError } from '../exceptions.js';
import type { Job, SearchResponse, RecommendResponse, ApiResponse } from '../types/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a city identifier (name or code) to an API city code.
 * Returns the original value if no mapping is found.
 */
function resolveCityCode(input: string): string {
  return CITY_MAP[input] ?? input;
}

/**
 * Escape a field value for CSV output, handling commas, quotes, and newlines.
 */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Rich display of a single job's full details.
 */
function displayJobDetail(job: Job): void {
  const divider = '═'.repeat(60);

  printInfo('');
  printInfo(chalk.bold.cyan(divider));
  printInfo(chalk.bold.yellow(`  ${job.jobName}`));
  printInfo(chalk.bold.cyan(divider));
  printInfo('');

  printInfo(`${chalk.gray('公司:')}     ${chalk.white(job.companyName)}`);
  printInfo(`${chalk.gray('薪资:')}     ${chalk.green(job.salaryDesc)}`);

  // City / district / business district
  const location = [job.cityName, job.districtName, job.businessDistrict]
    .filter(Boolean)
    .join(' · ');
  if (location) {
    printInfo(`${chalk.gray('位置:')}     ${location}`);
  }

  printInfo(`${chalk.gray('经验:')}     ${job.experienceName || '不限'}`);
  printInfo(`${chalk.gray('学历:')}     ${job.degreeName || '不限'}`);

  if (job.bossName) {
    const boss = [job.bossName, job.bossTitle].filter(Boolean).join(' · ');
    printInfo(`${chalk.gray('HR:')}       ${boss}`);
  }

  if (job.jobLabels && job.jobLabels.length > 0) {
    const labels = job.jobLabels.map((l) => chalk.blue(l)).join('  ');
    printInfo(`${chalk.gray('标签:')}     ${labels}`);
  }

  if (job.skills && job.skills.length > 0) {
    printInfo(`${chalk.gray('技能:')}     ${job.skills.join(', ')}`);
  }

  if (job.jobDesc) {
    printInfo('');
    printInfo(chalk.bold('职位描述:'));
    printInfo(chalk.gray('─'.repeat(40)));
    printInfo(job.jobDesc);
  }

  printInfo('');
  printInfo(chalk.gray(`Security ID: ${job.securityId}`));
  printInfo('');
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

export function registerSearchCommands(program: Command, client: ApiClient): void {
  // -----------------------------------------------------------------------
  // boss search <keyword>
  // -----------------------------------------------------------------------
  program
    .command('search <keyword>')
    .description('搜索职位')
    .option('-c, --city <city>', '城市名称或编码')
    .option('-s, --salary <salary>', '薪资范围')
    .option('-e, --exp <exp>', '经验要求')
    .option('-d, --degree <degree>', '学历要求')
    .option('--industry <industry>', '行业')
    .option('--scale <scale>', '公司规模')
    .option('--stage <stage>', '融资阶段')
    .option('--job-type <jobType>', '职位类型')
    .option('-p, --page <page>', '页码', '1')
    .option('--json', 'JSON 格式输出')
    .action(async (keyword: string, options: Record<string, unknown>) => {
      await handleCommand(async () => {
        const pageNum = parseInt(String(options.page ?? '1'), 10) || 1;

        const searchParams = {
          keyword,
          city: options.city ? resolveCityCode(String(options.city)) : undefined,
          salary: options.salary ? String(options.salary) : undefined,
          exp: options.exp ? String(options.exp) : undefined,
          degree: options.degree ? String(options.degree) : undefined,
          industry: options.industry ? String(options.industry) : undefined,
          scale: options.scale ? String(options.scale) : undefined,
          stage: options.stage ? String(options.stage) : undefined,
          jobType: options.jobType ? String(options.jobType) : undefined,
          page: pageNum,
        };

        const params = client.buildSearchParams(searchParams);

        if (!isJsonMode()) {
          printInfo(chalk.gray(`正在搜索: ${keyword}`));
        }

        const response = await client.get<ApiResponse<SearchResponse>>(
          SEARCH_API,
          params,
        );

        // handleApiResponse 已返回 zpData，直接使用
        const jobList: Job[] = (response as unknown as SearchResponse)?.jobList ?? [];
        const totalCount: number = (response as unknown as SearchResponse)?.totalCount ?? 0;

        // 空结果 — 显示提示但不算错误
        if (jobList.length === 0) {
          if (!isJsonMode()) {
            if (pageNum > 1) {
              printInfo(chalk.yellow('已到达最后一页'));
            } else {
              printInfo(chalk.yellow('未找到匹配职位，请调整搜索条件'));
            }
          }
          return { jobList: [], totalCount: 0, page: pageNum };
        }

        // --- Write cache ---
        const cacheEntries = jobList.map((job: Job, idx: number) => ({
          index: (pageNum - 1) * 15 + idx + 1,
          securityId: job.securityId,
        }));

        // Collect filters as plain strings for the cache record
        const filters: Record<string, string> = {};
        if (options.city) filters.city = String(options.city);
        if (options.salary) filters.salary = String(options.salary);
        if (options.exp) filters.exp = String(options.exp);
        if (options.degree) filters.degree = String(options.degree);
        if (options.industry) filters.industry = String(options.industry);
        if (options.scale) filters.scale = String(options.scale);
        if (options.stage) filters.stage = String(options.stage);
        if (options.jobType) filters.jobType = String(options.jobType);

        writeCache(keyword, filters, cacheEntries);

        // --- Rich output ---
        if (!isJsonMode()) {
          const table = new Table({
            head: [
              chalk.cyan('#'),
              chalk.cyan('职位名称'),
              chalk.cyan('公司'),
              chalk.cyan('薪资'),
              chalk.cyan('城市'),
              chalk.cyan('经验'),
              chalk.cyan('学历'),
              chalk.cyan('Security ID'),
            ],
            colWidths: [5, 24, 18, 12, 10, 12, 8, 22],
            wordWrap: true,
            style: { compact: false },
          });

          for (const [idx, job] of jobList.entries()) {
            const rowIndex = (pageNum - 1) * 15 + idx + 1;
            table.push([
              chalk.yellow(String(rowIndex)),
              job.jobName,
              job.companyName,
              chalk.green(job.salaryDesc),
              job.cityName,
              job.experienceName || '',
              job.degreeName || '',
              chalk.gray(job.securityId),
            ]);
          }

          printInfo(table.toString());
          printInfo(
            chalk.gray(
              `共 ${totalCount} 个职位，第 ${pageNum} 页` +
              (totalCount > 15 * pageNum ? `（下一页: -p ${pageNum + 1}）` : ''),
            ),
          );
        }

        return response;
      }, { json: options.json === true });
    });

  // -----------------------------------------------------------------------
  // boss show <index>
  // -----------------------------------------------------------------------
  program
    .command('show <index>')
    .description('从搜索缓存中查看指定序号的职位详情')
    .option('--json', 'JSON 格式输出')
    .action(async (indexStr: string, options: Record<string, unknown>) => {
      await handleCommand(async () => {
        const index = parseInt(indexStr, 10);
        if (isNaN(index) || index < 1) {
          throw new InvalidParamsError('无效的索引号，请输入一个正整数（如: boss show 1）');
        }

        const cache = readCache();
        if (!cache || !cache.jobList || cache.jobList.length === 0) {
          throw new InvalidParamsError('缓存为空，请先执行搜索命令 boss search');
        }

        const entry = cache.jobList.find((j) => j.index === index);
        if (!entry) {
          throw new InvalidParamsError(
            `未找到索引 ${index} 对应的职位，可用范围: 1–${cache.jobList.length}`,
          );
        }

        if (!isJsonMode()) {
          printInfo(chalk.gray(`正在获取职位详情: ${entry.securityId}`));
        }

        const response = await client.get<ApiResponse<Job>>(JOB_DETAIL_API, {
          securityId: entry.securityId,
        });

        const job: Job =
          response.zpData ?? (response as unknown as Job);

        if (!isJsonMode()) {
          displayJobDetail(job);
        }

        return job;
      }, { json: options.json === true });
    });

  // -----------------------------------------------------------------------
  // boss detail <securityId>
  // -----------------------------------------------------------------------
  program
    .command('detail <securityId>')
    .description('直接通过 Security ID 查看职位详情')
    .option('--json', 'JSON 格式输出')
    .action(async (securityId: string, options: Record<string, unknown>) => {
      await handleCommand(async () => {
        if (!isJsonMode()) {
          printInfo(chalk.gray(`正在获取职位详情: ${securityId}`));
        }

        const response = await client.get<ApiResponse<Job>>(JOB_DETAIL_API, {
          securityId,
        });

        const job: Job =
          response.zpData ?? (response as unknown as Job);

        if (!isJsonMode()) {
          displayJobDetail(job);
        }

        return job;
      }, { json: options.json === true });
    });

  // -----------------------------------------------------------------------
  // boss cities
  // -----------------------------------------------------------------------
  program
    .command('cities')
    .description('列出所有支持的城市名称及编码')
    .action(async () => {
      await handleCommand(async () => {
        const entries = Object.entries(CITY_MAP);

        if (!isJsonMode()) {
          const table = new Table({
            head: [chalk.cyan('城市名称'), chalk.cyan('城市编码')],
            colWidths: [14, 14],
            style: { compact: false },
          });

          for (const [name, code] of entries) {
            table.push([name, code]);
          }

          printInfo(table.toString());
          printInfo(chalk.gray(`共 ${entries.length} 个城市`));
        }

        return entries.map(([name, code]) => ({ name, code }));
      });
    });

  // -----------------------------------------------------------------------
  // boss recommend
  // -----------------------------------------------------------------------
  program
    .command('recommend')
    .description('查看推荐职位')
    .option('-p, --page <page>', '页码', '1')
    .option('--json', 'JSON 格式输出')
    .action(async (options: Record<string, unknown>) => {
      await handleCommand(async () => {
        const pageNum = parseInt(String(options.page ?? '1'), 10) || 1;

        if (!isJsonMode()) {
          printInfo(chalk.gray('正在获取推荐职位...'));
        }

        const response = await client.get<ApiResponse<RecommendResponse>>(
          RECOMMEND_API,
          { page: pageNum, tag: 5, isActive: 'true', pageSize: 15 },
        );

        const zpData = response.zpData ?? (response as unknown as RecommendResponse);
        const jobList: Job[] = zpData?.jobList ?? [];

        if (jobList.length === 0) {
          if (!isJsonMode()) {
            printInfo(chalk.yellow('暂无推荐职位'));
          }
          return { jobList: [], page: pageNum, hasMore: false };
        }

        if (!isJsonMode()) {
          const table = new Table({
            head: [
              chalk.cyan('#'),
              chalk.cyan('职位名称'),
              chalk.cyan('公司'),
              chalk.cyan('薪资'),
              chalk.cyan('城市'),
              chalk.cyan('经验'),
              chalk.cyan('学历'),
              chalk.cyan('Security ID'),
            ],
            colWidths: [5, 24, 18, 12, 10, 12, 8, 22],
            wordWrap: true,
            style: { compact: false },
          });

          for (const [idx, job] of jobList.entries()) {
            const rowIndex = (pageNum - 1) * 15 + idx + 1;
            table.push([
              chalk.yellow(String(rowIndex)),
              job.jobName,
              job.companyName,
              chalk.green(job.salaryDesc),
              job.cityName,
              job.experienceName || '',
              job.degreeName || '',
              chalk.gray(job.securityId),
            ]);
          }

          printInfo(table.toString());
          if (zpData?.hasMore) {
            printInfo(chalk.gray(`第 ${pageNum} 页（下一页: -p ${pageNum + 1}）`));
          } else {
            printInfo(chalk.gray(`第 ${pageNum} 页`));
          }
        }

        return response;
      }, { json: options.json === true });
    });

  // -----------------------------------------------------------------------
  // boss history
  // -----------------------------------------------------------------------
  program
    .command('history')
    .description('查看最近浏览职位')
    .option('--json', 'JSON 格式输出')
    .action(async (options: Record<string, unknown>) => {
      await handleCommand(async () => {
        if (!isJsonMode()) {
          printInfo(chalk.gray('正在获取浏览历史...'));
        }

        const response = await client.get<ApiResponse<{ jobList: Job[] }>>(
          JOB_HISTORY_API,
        );

        const zpData = response.zpData ?? (response as unknown as { jobList: Job[] });
        const jobList: Job[] = zpData?.jobList ?? [];

        if (jobList.length === 0) {
          throw new InvalidParamsError('暂无浏览历史');
        }

        if (!isJsonMode()) {
          const table = new Table({
            head: [
              chalk.cyan('职位名称'),
              chalk.cyan('公司'),
              chalk.cyan('薪资'),
              chalk.cyan('城市'),
            ],
            colWidths: [28, 20, 12, 12],
            wordWrap: true,
            style: { compact: false },
          });

          for (const job of jobList) {
            table.push([
              job.jobName,
              job.companyName,
              chalk.green(job.salaryDesc),
              job.cityName,
            ]);
          }

          printInfo(table.toString());
          printInfo(chalk.gray(`共 ${jobList.length} 条记录`));
        }

        return response;
      }, { json: options.json === true });
    });

  // -----------------------------------------------------------------------
  // boss export <keyword>
  // -----------------------------------------------------------------------
  program
    .command('export <keyword>')
    .description('导出搜索结果')
    .option('-n, --count <count>', '导出数量', '20')
    .option('-o, --output <output>', '输出文件路径')
    .option('--format <format>', '输出格式 (csv|json)', 'csv')
    .option('-c, --city <city>', '城市名称或编码')
    .option('-s, --salary <salary>', '薪资范围')
    .option('-e, --exp <exp>', '经验要求')
    .option('-d, --degree <degree>', '学历要求')
    .option('--industry <industry>', '行业')
    .option('--scale <scale>', '公司规模')
    .option('--stage <stage>', '融资阶段')
    .option('--job-type <jobType>', '职位类型')
    .option('--json', 'JSON 格式输出')
    .action(async (keyword: string, options: Record<string, unknown>) => {
      await handleCommand(async () => {
        const count = parseInt(String(options.count ?? '20'), 10) || 20;
        const format = (String(options.format ?? 'csv')).toLowerCase();

        if (format !== 'csv' && format !== 'json') {
          throw new InvalidParamsError('导出格式仅支持 csv 或 json');
        }

        if (count < 0) {
          throw new InvalidParamsError('导出数量不能为负数');
        }

        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        const defaultOutput = `boss-export-${keyword}-${timestamp}.${format}`;
        const outputPath = String(options.output ?? defaultOutput);

        const allJobs: Job[] = [];
        const pageSize = 15;
        const totalPages = count === 0 ? 0 : Math.ceil(count / pageSize);
        let failedPage = -1;

        for (let page = 1; page <= totalPages; page++) {
          const searchParams = {
            keyword,
            city: options.city ? resolveCityCode(String(options.city)) : undefined,
            salary: options.salary ? String(options.salary) : undefined,
            exp: options.exp ? String(options.exp) : undefined,
            degree: options.degree ? String(options.degree) : undefined,
            industry: options.industry ? String(options.industry) : undefined,
            scale: options.scale ? String(options.scale) : undefined,
            stage: options.stage ? String(options.stage) : undefined,
            jobType: options.jobType ? String(options.jobType) : undefined,
            page,
          };

          const params = client.buildSearchParams(searchParams);

          if (!isJsonMode()) {
            process.stderr.write(`正在获取第 ${page}/${totalPages} 页...\n`);
          }

          try {
            const response = await client.get<ApiResponse<SearchResponse>>(
              SEARCH_API,
              params,
            );

            const zpData = response.zpData ?? (response as unknown as SearchResponse);
            const jobList: Job[] = zpData?.jobList ?? [];

            if (jobList.length === 0) break;

            for (const job of jobList) {
              if (allJobs.length < count) {
                allJobs.push(job);
              }
            }

            if (allJobs.length >= count) break;
          } catch {
            failedPage = page;
            break;
          }
        }

        if (count === 0 && !isJsonMode()) {
          process.stderr.write('警告: 导出数量为 0，将生成空文件\n');
        } else if (allJobs.length === 0 && count > 0 && !isJsonMode()) {
          process.stderr.write('警告: 未获取到任何数据，将生成空文件\n');
        }

        if (format === 'json') {
          writeFileSync(outputPath, JSON.stringify(allJobs, null, 2), 'utf-8');
        } else {
          const header = '职位名称,公司,薪资,城市,经验,学历,securityId';
          const rows = allJobs.map((job) =>
            [
              escapeCsvField(job.jobName),
              escapeCsvField(job.companyName),
              escapeCsvField(job.salaryDesc),
              escapeCsvField(job.cityName),
              escapeCsvField(job.experienceName || ''),
              escapeCsvField(job.degreeName || ''),
              escapeCsvField(job.securityId),
            ].join(','),
          );
          writeFileSync(outputPath, [header, ...rows].join('\n') + '\n', 'utf-8');
        }

        if (!isJsonMode()) {
          if (failedPage > 0) {
            process.stderr.write(
              `\n警告: 第 ${failedPage} 页获取失败，已保留已获取的 ${allJobs.length} 条数据\n`,
            );
          }
          process.stderr.write(`已导出 ${allJobs.length} 条记录到 ${outputPath}\n`);
        }

        return { count: allJobs.length, file: outputPath, format };
      }, { json: options.json === true });
    });
}
