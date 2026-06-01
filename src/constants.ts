// BOSS直聘 API 基础 URL
export const BASE_URL = 'https://www.zhipin.com';

// 搜索 API
export const SEARCH_API = `${BASE_URL}/wapi/zpgeek/search/joblist.json`;

// 推荐 API
export const RECOMMEND_API = `${BASE_URL}/wapi/zpgeek/recommend/geek.json`;

// 新版推荐 API
export const RECOMMEND_NEW_API = `${BASE_URL}/wapi/zpgeek/boss/recommend/geek.json`;

// 职位详情 API
export const JOB_DETAIL_API = `${BASE_URL}/wapi/zpgeek/job/detail.json`;

// 登录状态 API (用于验证认证)
export const STATUS_API = `${BASE_URL}/wapi/zpgeek/search/joblist.json`;

// 个人中心 API
export const PROFILE_API = `${BASE_URL}/wapi/zpgeek/user/info.json`;
export const APPLIED_API = `${BASE_URL}/wapi/zpgeek/apply/list.json`;
export const INTERVIEWS_API = `${BASE_URL}/wapi/zpgeek/interview/list.json`;
export const CHAT_LIST_API = `${BASE_URL}/wapi/zpgeek/chat/list.json`;
export const HISTORY_API = `${BASE_URL}/wapi/zpgeek/history/list.json`;

// 打招呼 API
export const GREET_API = `${BASE_URL}/wapi/zpgeek/chat/start.json`;

// 二维码登录
export const QR_RANDKEY_URL = `${BASE_URL}/wapi/zppassport/captcha/randkey`;
export const QR_CODE_URL = `${BASE_URL}/wapi/zpweixin/qrcode/getqrcode`;
export const QR_SCAN_URL = `${BASE_URL}/wapi/zppassport/qrcode/scan`;
export const QR_LOGIN_URL = `${BASE_URL}/wapi/zppassport/qrcode/scanLogin`;
export const QR_DISPATCHER_URL = `${BASE_URL}/wapi/zppassport/qrcode/dispatcher`;

// 默认 Headers（模拟 Chrome 145 on macOS）
export const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Sec-Ch-Ua': '"Chromium";v="145", "Google Chrome";v="145"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'DNT': '1',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
};

// 城市编码映射（完整列表，40+ 主要城市）
export const CITY_MAP: Record<string, string> = {
  '北京': '101010100',
  '上海': '101020100',
  '广州': '101280100',
  '深圳': '101280600',
  '杭州': '101210100',
  '成都': '101270100',
  '南京': '101190100',
  '武汉': '101200100',
  '西安': '101110100',
  '重庆': '101040100',
  '苏州': '101190400',
  '天津': '101030100',
  '长沙': '101250100',
  '郑州': '101180100',
  '东莞': '101281600',
  '青岛': '101120200',
  '合肥': '101220100',
  '佛山': '101280800',
  '宁波': '101210400',
  '昆明': '101290100',
  '沈阳': '101070100',
  '济南': '101120100',
  '无锡': '101190200',
  '厦门': '101230200',
  '福州': '101230100',
  '温州': '101210700',
  '大连': '101070200',
  '石家庄': '101090100',
  '哈尔滨': '101050100',
  '南昌': '101240100',
  '南宁': '101300100',
  '贵阳': '101260100',
  '长春': '101060100',
  '常州': '101191100',
  '珠海': '101280700',
  '惠州': '101280300',
  '中山': '101281700',
  '嘉兴': '101210300',
  '绍兴': '101210500',
  '太原': '101100100',
  '烟台': '101120500',
  '南通': '101190500',
  '徐州': '101190800',
};

// 薪资筛选选项
export const SALARY_OPTIONS = ['3K以下', '3-5K', '5-10K', '10-15K', '15-20K', '20-30K', '30-50K', '50K以上'];

// 经验筛选选项
export const EXP_OPTIONS = ['不限', '在校/应届', '1年以内', '1-3年', '3-5年', '5-10年', '10年以上'];

// 学历筛选选项
export const DEGREE_OPTIONS = ['不限', '大专', '本科', '硕士', '博士'];

// 行业选项
export const INDUSTRY_OPTIONS = ['互联网', '电子商务', '游戏', '人工智能', '金融', '教育培训', '医疗健康', '移动互联网', '数据服务', '企业服务'];

// 公司规模选项
export const SCALE_OPTIONS = ['0-20人', '20-99人', '100-499人', '500-999人', '1000-9999人', '10000人以上'];

// 融资阶段选项
export const STAGE_OPTIONS = ['未融资', '天使轮', 'A轮', 'B轮', 'C轮', 'D轮及以上', '已上市', '不需要融资'];

// 职位类型选项
export const JOB_TYPE_OPTIONS = ['全职', '兼职', '实习'];

// 浏览器 Cookie 数据库路径
export const BROWSER_PATHS: Record<string, Record<string, string | null>> = {
  linux: {
    chrome: '~/.config/google-chrome/Default/Cookies',
    'google-chrome': '~/.config/google-chrome/Default/Cookies',
    chromium: '~/.config/chromium/Default/Cookies',
    edge: '~/.config/microsoft-edge/Default/Cookies',
    brave: '~/.config/BraveSoftware/Brave-Browser/Default/Cookies',
    opera: '~/.config/opera/Default/Cookies',
    vivaldi: '~/.config/vivaldi/Default/Cookies',
    firefox: null, // Firefox 需要搜索 profiles.ini
  },
  darwin: {
    chrome: '~/Library/Application Support/Google/Chrome/Default/Cookies',
    chromium: '~/Library/Application Support/Chromium/Default/Cookies',
    edge: '~/Library/Application Support/Microsoft Edge/Default/Cookies',
    brave: '~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Cookies',
    opera: '~/Library/Application Support/com.operasoftware.Opera/Default/Cookies',
    vivaldi: '~/Library/Application Support/Vivaldi/Default/Cookies',
    firefox: null,
  },
  win32: {
    chrome: '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cookies',
    chromium: '%LOCALAPPDATA%\\Chromium\\User Data\\Default\\Cookies',
    edge: '%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\Cookies',
    brave: '%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cookies',
    opera: '%APPDATA%\\Opera Software\\Opera Stable\\Default\\Cookies',
    vivaldi: '%LOCALAPPDATA%\\Vivaldi\\User Data\\Default\\Cookies',
    firefox: null,
  },
};

// 凭证存储路径
export const CREDENTIAL_FILE = 'credential.json';
export const INDEX_CACHE_FILE = 'index.json';

// Cookie TTL (7天，单位毫秒)
export const COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// 反检测配置
export const RATE_LIMIT_CONFIG = {
  gaussianJitterMean: 0.3,    // 高斯抖动均值（秒）
  gaussianJitterStd: 0.15,    // 高斯抖动标准差
  longPauseProbability: 0.05, // 随机长暂停概率
  longPauseMin: 2,            // 长暂停最短（秒）
  longPauseMax: 5,            // 长暂停最长（秒）
  maxRetries: 3,              // 最大重试次数
  cooldownSteps: [10, 20, 40, 60], // code=9 冷却阶梯（秒）
  requestTimeout: 30000,      // 请求超时（毫秒）
  batchGreetDelay: 1500,      // 批量打招呼间隔（毫秒）
};
