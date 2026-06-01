// Cookie 类型
export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
}

export type LoginSource = 'browser' | 'qrcode' | 'web';

export type LoginMethodName = 'browser_auto' | 'browser_specified' | 'qrcode' | 'web';

export type LoginStage =
  | 'credential_acquisition'
  | 'awaiting_authorization'
  | 'authorization_verification'
  | 'credential_persistence'
  | 'cancelled'
  | 'timeout';

export interface AccountSummary {
  displayName: string | null;
  accountType: string | null;
  source: LoginSource;
  verifiedAt: string;
}

export interface CandidateCredential {
  cookies: Cookie[];
  source: LoginSource;
  method: LoginMethodName;
  sourceDetail: string | null;
  acquiredAt: string;
}

export interface AuthorizationVerificationResult {
  status: 'verified' | 'rejected' | 'unknown';
  stage: 'authorization_verification';
  accountSummary: AccountSummary | null;
  message: string;
  nextActions: string[];
}

// 认证凭证
export interface Credential {
  version: number;       // 凭证格式版本（初始为 1），用于未来迁移
  cookies: Cookie[];
  source: LoginSource;
  createdAt: string;     // ISO 8601
  expiresAt: string;     // ISO 8601 (创建后7天)
  accountSummary?: AccountSummary;
  verifiedAt?: string;
}

export interface AuthenticatedSession extends Credential {
  accountSummary: AccountSummary;
  verifiedAt: string;
}

// 加密后的凭证存储格式
export interface EncryptedCredential {
  iv: string;        // Base64 IV
  authTag: string;   // Base64 auth tag
  ciphertext: string; // Base64 ciphertext
}

// 职位
export interface Job {
  securityId: string;
  jobName: string;
  salaryDesc: string;
  cityName: string;
  companyName: string;
  companyLogo?: string;
  bossName?: string;
  bossTitle?: string;
  jobLabels: string[];
  jobDesc?: string;
  skills?: string[];
  districtName?: string;
  businessDistrict?: string;
  degreeName?: string;
  experienceName?: string;
  encryptBossId?: string;
}

// 投递记录
export interface Application {
  securityId: string;
  jobName: string;
  companyName: string;
  status: string;
  appliedAt?: string;
}

// 面试邀请
export interface Interview {
  securityId: string;
  jobName: string;
  companyName: string;
  interviewTime?: string;
  address?: string;
  status: string;
}

// 沟通记录
export interface ChatMessage {
  friendId: string;
  bossName: string;
  bossTitle: string;
  companyName: string;
  lastMessage?: string;
  updatedAt?: string;
}

// 候选人（招聘方视角）
export interface Candidate {
  encryptGeekId: string;
  geekName: string;
  degreeName?: string;
  experienceName?: string;
  expectCity?: string;
  expectSalary?: string;
  skills: string[];
  resumeData?: Record<string, unknown>;
}

// 招聘方职位
export interface RecruiterJob {
  encryptJobId: string;
  jobName: string;
  cityName: string;
  salaryDesc: string;
  status: 'active' | 'closed';
  candidateCount?: number;
}

// 搜索缓存
export interface IndexCache {
  keyword: string;
  filters: Record<string, string>;
  jobList: Array<{ index: number; securityId: string }>;
  cachedAt: string;
}

// Schema 封装
export interface SchemaEnvelope<T = unknown> {
  ok: boolean;
  schema_version: string;
  data: T | null;
  error?: {
    code: string;
    message: string;
  };
}

// 搜索参数
export interface SearchParams {
  keyword: string;
  city?: string;
  salary?: string;
  exp?: string;
  degree?: string;
  industry?: string;
  scale?: string;
  stage?: string;
  jobType?: string;
  page?: number;
}

// 搜索响应
export interface SearchResponse {
  jobList: Job[];
  totalCount: number;
  page: number;
}

// 推荐响应
export interface RecommendResponse {
  jobList: Job[];
  page: number;
  hasMore: boolean;
}

// 个人信息
export interface ProfileData {
  name: string;
  age?: number;
  degreeCategory?: string;
  workYears?: string;
  cityName?: string;
  expectSalary?: string;
  expectCity?: string;
}

// API 通用响应
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  zpData?: T;
  [key: string]: unknown;
}

// 浏览器 Cookie 数据库
export interface BrowserCookieStore {
  browserName: string;
  platform: NodeJS.Platform;
  profilePath: string;
  dbPath: string;
  encryptionVersion: number;
  encryptedKey: Buffer | null;
}

// 候选人导出数据
export interface CandidateExport {
  encryptGeekId: string;
  geekName: string;
  degreeName?: string;
  experienceName?: string;
  expectCity?: string;
  expectSalary?: string;
  skills: string[];
  status?: string;
}
