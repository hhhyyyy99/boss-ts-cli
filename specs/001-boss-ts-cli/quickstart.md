# 快速开始: BOSS直聘 TypeScript CLI

**日期**: 2026-06-01

## 安装

```bash
# npm 全局安装
npm install -g boss-ts-cli

# 验证安装
boss --version
```

## 首次使用

### 1. 登录

确保在 Chrome（或 Firefox/Edge 等支持的浏览器）中已登录 [zhipin.com](https://www.zhipin.com)，然后：

```bash
boss login
```

系统会自动从浏览器提取 Cookie。如需指定浏览器：

```bash
boss login --cookie-source chrome
boss login --cookie-source firefox
```

如果浏览器提取失败，会自动回退到二维码登录，终端会显示二维码，用 BOSS 直聘 APP 扫码即可。

### 2. 检查状态

```bash
boss status
```

### 3. 搜索职位

```bash
# 基础搜索
boss search "golang"

# 带筛选条件
boss search "Python" --city 杭州 --salary 20-30K

# 翻页
boss search "后端" -p 2
```

### 4. 查看详情

```bash
# 从搜索结果中查看第 3 个
boss show 3

# 使用 securityId 直接查看
boss detail <securityId>
```

### 5. 导出结果

```bash
boss export "Python" -n 50 -o jobs.csv
boss export "golang" --format json -o jobs.json
```

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `boss login` | 登录 |
| `boss logout` | 退出登录 |
| `boss status` | 检查认证状态 |
| `boss search <kw>` | 搜索职位 |
| `boss show <n>` | 查看搜索结果第 n 条 |
| `boss recommend` | 个性化推荐 |
| `boss me` | 个人资料 |
| `boss applied` | 已投递列表 |
| `boss interviews` | 面试邀请 |
| `boss chat` | 沟通列表 |
| `boss greet <id>` | 打招呼 |
| `boss batch-greet <kw>` | 批量打招呼 |
| `boss export <kw>` | 导出结果 |
| `boss cities` | 城市列表 |
| `boss history` | 浏览历史 |

## JSON 输出

所有命令支持 `--json` 标志，输出统一格式：

```json
{"ok":true,"schema_version":"1","data":{...}}
```

管道中无 TTY 时自动输出 JSON，适合脚本和 AI Agent 使用：

```bash
boss search "golang" --city 杭州 --json | jq '.data.jobList[0].jobName'
```

## 认证说明

- 凭证加密存储在 `~/.config/boss-cli/credential.json`
- Cookie 有效期 7 天，过期自动从浏览器刷新
- 如遇"环境异常"错误，执行 `boss logout && boss login`

## 后续

- 完整命令列表：参见 [CLI 合约](contracts/cli-commands.md)
- 数据模型：参见 [数据模型](data-model.md)
- 技术细节：参见 [实现规划](plan.md)
