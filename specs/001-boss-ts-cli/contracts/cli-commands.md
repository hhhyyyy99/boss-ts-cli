# CLI 命令合约: BOSS直聘 TypeScript CLI

**日期**: 2026-06-01 | **关联**: [spec.md](../spec.md) | [data-model.md](../data-model.md)

所有命令遵循统一输出格式 `{ok, schema_version, data, error?}`。

---

## 全局选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `--json` | flag | JSON 格式输出到 stdout |
| `-v, --verbose` | flag | 详细日志模式（请求 URL、状态码、耗时） |
| `--version` | flag | 显示版本号 |

---

## 认证命令 (auth)

### `boss login`

```
boss login [--cookie-source <browser>] [--qrcode]
```

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `--cookie-source` | `string` | 否 | 指定浏览器 (chrome/firefox/edge/brave/chromium/opera/vivaldi) |
| `--qrcode` | flag | 否 | 强制使用二维码登录 |

行为：自动检测浏览器 Cookie → 回退到二维码 → 验证会话 → 加密存储凭证

### `boss logout`

```
boss logout
```

行为：删除本地凭证文件

### `boss status`

```
boss status [--json]
```

行为：检查认证状态，验证实际 API 可用性

---

## 搜索命令 (search)

### `boss search <keyword>`

```
boss search <keyword> [options]
```

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `keyword` | `string` | 是 | 搜索关键词 |
| `--city` | `string` | 否 | 城市筛选 |
| `--salary` | `string` | 否 | 薪资筛选 (如 20-30K) |
| `--exp` | `string` | 否 | 经验筛选 (如 3-5年) |
| `--degree` | `string` | 否 | 学历筛选 |
| `--industry` | `string` | 否 | 行业筛选 |
| `--scale` | `string` | 否 | 公司规模筛选 |
| `--stage` | `string` | 否 | 融资阶段筛选 |
| `--job-type` | `string` | 否 | 职位类型筛选 |
| `-p, --page` | `number` | 否 | 页码 (默认 1) |

数据输出 (`data` 字段):
```json
{
  "jobList": [{ "securityId": "...", "jobName": "...", ... }],
  "totalCount": 123,
  "page": 1
}
```

### `boss show <index>`

```
boss show <index>
```

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `index` | `number` | 是 | 最近搜索结果中的序号 |

行为：从 IndexCache 查找 securityId，调用详情接口

### `boss detail <securityId>`

```
boss detail <securityId> [--json]
```

### `boss recommend`

```
boss recommend [-p <page>] [--json]
```

### `boss export <keyword>`

```
boss export <keyword> [options]
```

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `keyword` | `string` | 是 | 搜索关键词 |
| `-n, --count` | `number` | 否 | 导出数量 (默认 20) |
| `-o, --output` | `string` | 否 | 输出文件路径 |
| `--format` | `csv \| json` | 否 | 导出格式 (默认 csv) |
| `--city`等 | — | 否 | 同 search 筛选参数 |

### `boss cities`

```
boss cities
```

行为：列出所有支持的城市及其编码

### `boss history`

```
boss history [--json]
```

---

## 个人中心命令 (personal)

### `boss me`

```
boss me [--json]
```

### `boss applied`

```
boss applied [-p <page>] [--json]
```

### `boss interviews`

```
boss interviews [--json]
```

### `boss chat`

```
boss chat [--json]
```

---

## 社交命令 (social)

### `boss greet <securityId>`

```
boss greet <securityId> [--json]
```

### `boss batch-greet <keyword>`

```
boss batch-greet <keyword> [options]
```

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `keyword` | `string` | 是 | 搜索关键词 |
| `-n, --count` | `number` | 否 | 打招呼数量 (默认 5) |
| `--city` | `string` | 否 | 城市筛选 |
| `--dry-run` | flag | 否 | 仅预览，不实际发送 |
| `-y, --yes` | flag | 否 | 跳过确认 |

行为：先搜索 → 预览列表 → 确认 → 逐个打招呼（间隔 ≥1.5s）→ 汇总结果

---

## 招聘方命令 (recruiter)

### `boss recruiter search <keyword>`

```
boss recruiter search <keyword> [options]
```

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `keyword` | `string` | 是 | 搜索候选人关键词 |
| `--city` | `string` | 否 | 城市 |
| `--exp` | `string` | 否 | 经验 |
| `--degree` | `string` | 否 | 学历 |
| `-p, --page` | `number` | 否 | 页码 |

### `boss recruiter recommend`

```
boss recruiter recommend [--job <encryptJobId>] [-p <page>]
```

### `boss recruiter greet <encryptGeekId>`

```
boss recruiter greet <encryptGeekId> [--json]
```

### `boss recruiter batch-view <keyword>`

```
boss recruiter batch-view <keyword> [--city] [-n <count>]
```

行为：批量查看候选人（触发"已被查看"通知）

### `boss recruiter inbox`

```
boss recruiter inbox [--job <encryptJobId>] [-p <page>]
```

### `boss recruiter reply <friendId> <message>`

```
boss recruiter reply <friendId> "<message>"
```

### `boss recruiter chat <friendId>`

```
boss recruiter chat <friendId>
```

### `boss recruiter request-resume <friendId>`

```
boss recruiter request-resume <friendId> [--yes]
```

### `boss recruiter exchange-phone <friendId>`

```
boss recruiter exchange-phone <friendId> [--yes]
```

### `boss recruiter exchange-wechat <friendId>`

```
boss recruiter exchange-wechat <friendId> [--yes]
```

### `boss recruiter invite-interview <geekId>`

```
boss recruiter invite-interview <geekId> --job <encryptJobId>
```

### `boss recruiter mark-unsuitable <geekId>`

```
boss recruiter mark-unsuitable <geekId> --job <encryptJobId>
```

### `boss recruiter resume <encryptGeekId>`

```
boss recruiter resume <encryptGeekId>
```

### `boss recruiter resume-download <id>`

```
boss recruiter resume-download <id> --job <encryptJobId>
```

行为：下载简历为 Markdown 文件

### `boss recruiter jobs`

```
boss recruiter jobs
```

### `boss recruiter job-close <encryptJobId>`

```
boss recruiter job-close <encryptJobId> [--yes]
```

### `boss recruiter job-reopen <encryptJobId>`

```
boss recruiter job-reopen <encryptJobId> [--yes]
```

### `boss recruiter labels`

```
boss recruiter labels
```

### `boss recruiter export`

```
boss recruiter export [-o <path>] [--format csv|json]
```

---

## 错误输出格式

所有命令在 `ok: false` 时输出：

```json
{
  "ok": false,
  "schema_version": "1",
  "data": null,
  "error": {
    "code": "not_authenticated | rate_limited | invalid_params | api_error | unknown_error",
    "message": "人类可读的中文错误描述"
  }
}
```
