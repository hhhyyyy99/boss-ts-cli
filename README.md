# boss-ts-cli

BOSS直聘 CLI 工具（TypeScript 版）— 搜索职位、管理投递、与招聘方沟通

基于 [jackwener/boss-cli](https://github.com/jackwener/boss-cli)（Python 版）的 TypeScript 重写。

## 安装

```bash
npm install -g boss-ts-cli
```

需要 Node.js >= 18。

## 快速开始

```bash
# 1. 登录（自动提取浏览器 Cookie）
boss login

# 2. 检查状态
boss status

# 3. 搜索职位
boss search "golang" --city 杭州 --salary 20-30K

# 4. 查看详情
boss show 1

# 5. 导出结果
boss export "Python" -n 50 -o jobs.csv
```

## 命令

### 认证
| 命令 | 说明 |
|------|------|
| `boss login [--cookie-source <browser>] [--qrcode]` | 登录 |
| `boss logout` | 退出 |
| `boss status` | 检查登录状态 |
| `boss me` | 个人信息 |

### 搜索 & 浏览
| 命令 | 说明 |
|------|------|
| `boss search <keyword> [options]` | 搜索职位 |
| `boss show <index>` | 查看搜索结果第 N 条 |
| `boss detail <securityId>` | 查看职位详情 |
| `boss recommend [-p <page>]` | 个性化推荐 |
| `boss history` | 浏览历史 |
| `boss cities` | 城市列表 |
| `boss export <keyword> [options]` | 导出 CSV/JSON |

### 个人中心
| 命令 | 说明 |
|------|------|
| `boss applied [-p <page>]` | 已投递 |
| `boss interviews` | 面试邀请 |
| `boss chat` | 沟通列表 |

### 社交
| 命令 | 说明 |
|------|------|
| `boss greet <securityId>` | 打招呼 |
| `boss batch-greet <keyword> [options]` | 批量打招呼 |

### 招聘方
| 命令 | 说明 |
|------|------|
| `boss recruiter search <keyword>` | 搜索候选人 |
| `boss recruiter recommend` | 推荐候选人 |
| `boss recruiter jobs` | 职位管理 |
| `boss recruiter inbox` | 候选人消息 |
| `boss recruiter resume <id>` | 查看简历 |
| `boss recruiter export` | 导出候选人 |
| `boss recruiter --help` | 查看全部 19 个子命令 |

## 选项

- `--json` — JSON 格式输出
- `-v, --verbose` — 详细日志
- `--version` — 版本号

## JSON 输出格式

```json
{
  "ok": true,
  "schema_version": "1",
  "data": { ... }
}
```

## 认证

支持 Chrome、Edge、Brave、Chromium、Opera、Vivaldi 浏览器的 Cookie 提取，以及二维码扫码登录。凭证 AES-256-GCM 加密存储在 `~/.config/boss-cli/`。

## License

MIT
