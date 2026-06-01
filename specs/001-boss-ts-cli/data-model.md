# 数据模型: BOSS直聘 TypeScript CLI

**日期**: 2026-06-01 | **关联**: [spec.md](./spec.md)

## 实体定义

### Credential (凭证)

用户的 BOSS 直聘认证信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| `cookies` | `Cookie[]` | 会话 Cookie 列表（加密存储） |
| `source` | `'chrome' \| 'firefox' \| 'qrcode'` | 凭证来源 |
| `createdAt` | `string` (ISO 8601) | 创建时间 |
| `expiresAt` | `string` (ISO 8601) | 过期时间（创建后 7 天） |

**状态转换**:
```
[未认证] → login → [已认证] → TTL 过期 → [过期] → auto-refresh → [已认证]
[已认证] → logout → [未认证]
[过期] → auto-refresh 失败 → [未认证]
```

**存储**: `~/.config/boss-cli/credential.json` (AES-256-GCM 加密)

---

### Job (职位)

BOSS 直聘上的招聘职位信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| `securityId` | `string` | 职位唯一标识 |
| `jobName` | `string` | 职位名称 |
| `salaryDesc` | `string` | 薪资范围描述 |
| `cityName` | `string` | 城市名称 |
| `companyName` | `string` | 公司名称 |
| `companyLogo` | `string?` | 公司 logo URL |
| `bossName` | `string?` | 招聘者姓名 |
| `bossTitle` | `string?` | 招聘者职位 |
| `jobLabels` | `string[]` | 职位标签 |
| `jobDesc` | `string?` | 职位描述（详情接口返回） |
| `skills` | `string[]?` | 技能要求（详情接口返回） |
| `districtName` | `string?` | 区/县 |
| `businessDistrict` | `string?` | 商圈 |
| `degreeName` | `string?` | 学历要求 |
| `experienceName` | `string?` | 经验要求 |

---

### Application (投递记录)

用户的职位投递记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| `securityId` | `string` | 投递职位 ID |
| `jobName` | `string` | 职位名称 |
| `companyName` | `string` | 公司名称 |
| `status` | `string` | 投递状态（已投递/已查看/已沟通等） |
| `appliedAt` | `string?` (ISO 8601) | 投递时间 |

---

### Interview (面试邀请)

面试邀请记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| `securityId` | `string` | 关联职位 ID |
| `jobName` | `string` | 职位名称 |
| `companyName` | `string` | 公司名称 |
| `interviewTime` | `string?` | 面试时间 |
| `address` | `string?` | 面试地点 |
| `status` | `string` | 面试状态 |

---

### Chat (沟通记录)

与招聘方的沟通记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| `friendId` | `string` | 聊天对象 ID |
| `bossName` | `string` | 招聘者姓名 |
| `bossTitle` | `string` | 招聘者职位 |
| `companyName` | `string` | 公司名称 |
| `lastMessage` | `string?` | 最后一条消息内容 |
| `updatedAt` | `string?` | 最后消息时间 |

---

### Candidate (候选人)

招聘方视角的候选人信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| `encryptGeekId` | `string` | 候选人加密 ID |
| `geekName` | `string` | 候选人姓名 |
| `degreeName` | `string?` | 学历 |
| `experienceName` | `string?` | 工作经验 |
| `expectCity` | `string?` | 期望城市 |
| `expectSalary` | `string?` | 期望薪资 |
| `skills` | `string[]` | 技能标签 |
| `resumeData` | `object?` | 简历详细数据（查看简历时返回） |

---

### RecruiterJob (招聘方职位)

招聘方发布的职位信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| `encryptJobId` | `string` | 职位加密 ID |
| `jobName` | `string` | 职位名称 |
| `cityName` | `string` | 城市 |
| `salaryDesc` | `string` | 薪资描述 |
| `status` | `'active' \| 'closed'` | 职位状态 |
| `candidateCount` | `number?` | 候选人数量 |

**状态转换**:
```
[active] → job-close → [closed] → job-reopen → [active]
```

---

### IndexCache (搜索缓存)

最近一次搜索结果的序号映射。

| 字段 | 类型 | 说明 |
|------|------|------|
| `keyword` | `string` | 搜索关键词 |
| `filters` | `object` | 筛选条件 |
| `jobList` | `{index: number, securityId: string}[]` | 序号→职位 ID 映射 |
| `cachedAt` | `string` (ISO 8601) | 缓存时间 |

**存储**: `~/.cache/boss-cli/index.json`

---

### SchemaEnvelope (输出封装)

所有 JSON 输出的统一格式。

| 字段 | 类型 | 说明 |
|------|------|------|
| `ok` | `boolean` | 请求是否成功 |
| `schema_version` | `string` | Schema 版本号（固定 "1"） |
| `data` | `object \| null` | 业务数据 |
| `error` | `{code: string, message: string}?` | 错误信息（失败时） |

**错误码**:
- `not_authenticated` — 未认证或会话过期
- `rate_limited` — 请求过于频繁
- `invalid_params` — 参数无效
- `api_error` — 上游 API 错误
- `unknown_error` — 未知错误
