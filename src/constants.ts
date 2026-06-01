// BOSS直聘 API 基础 URL
export const BASE_URL = 'https://www.zhipin.com';

// ====== 搜索 ======
export const SEARCH_API = `${BASE_URL}/wapi/zpgeek/search/joblist.json`;
export const JOB_DETAIL_API = `${BASE_URL}/wapi/zpgeek/job/detail.json`;
export const JOB_HISTORY_API = `${BASE_URL}/wapi/zpgeek/history/joblist.json`;

// ====== 推荐 ======
export const RECOMMEND_API = `${BASE_URL}/wapi/zprelation/interaction/geekGetJob`;

// ====== 个人中心 ======
export const PROFILE_API = `${BASE_URL}/wapi/zpuser/wap/getUserInfo.json`;
export const RESUME_BASEINFO_URL = `${BASE_URL}/wapi/zpgeek/resume/baseinfo/query.json`;
export const RESUME_EXPECT_URL = `${BASE_URL}/wapi/zpgeek/resume/expect/query.json`;
export const APPLIED_API = `${BASE_URL}/wapi/zprelation/resume/geekDeliverList`;
export const INTERVIEWS_API = `${BASE_URL}/wapi/zpinterview/geek/interview/data.json`;

// ====== 沟通 ======
export const CHAT_LIST_API = `${BASE_URL}/wapi/zprelation/friend/getGeekFriendList.json`;
export const GREET_API = `${BASE_URL}/wapi/zpgeek/friend/add.json`;

// ====== Web 页面 URL (用于 Referer) ======
export const WEB_GEEK_JOB_URL = `${BASE_URL}/web/geek/job`;
export const WEB_GEEK_RECOMMEND_URL = `${BASE_URL}/web/geek/recommend`;
export const WEB_GEEK_CHAT_URL = `${BASE_URL}/web/geek/chat`;
export const WEB_GEEK_HISTORY_URL = `${BASE_URL}/web/geek/history`;
export const WEB_BOSS_CHAT_URL = `${BASE_URL}/web/chat/index`;

// ====== 招聘方 (Boss) API ======
export const BOSS_SEARCH_GEEK_URL = `${BASE_URL}/wapi/zpitem/web/boss/search/geek/info`;
export const BOSS_VIEW_GEEK_URL = `${BASE_URL}/wapi/zpjob/view/geek/info`;
export const BOSS_CHATTED_JOB_LIST_URL = `${BASE_URL}/wapi/zpjob/job/chatted/jobList`;
export const BOSS_FRIEND_LIST_URL = `${BASE_URL}/wapi/zprelation/friend/filterByLabel`;
export const BOSS_FRIEND_DETAIL_URL = `${BASE_URL}/wapi/zprelation/friend/getBossFriendListV2.json`;
export const BOSS_LAST_MSG_URL = `${BASE_URL}/wapi/zpchat/boss/userLastMsg`;
export const BOSS_HISTORY_MSG_URL = `${BASE_URL}/wapi/zpchat/boss/historyMsg`;
export const BOSS_SEND_MSG_URL = `${BASE_URL}/wapi/zpchat/fastReply/sendReplyMsg`;
export const BOSS_CHAT_GEEK_INFO_URL = `${BASE_URL}/wapi/zpjob/chat/geek/info`;
export const BOSS_FRIEND_LABELS_URL = `${BASE_URL}/wapi/zprelation/friend/label/get`;
export const BOSS_GREET_REC_SORT_URL = `${BASE_URL}/wapi/zprelation/friend/greetRecSortList`;
export const BOSS_JOB_OFFLINE_URL = `${BASE_URL}/wapi/zpjob/job/offline`;
export const BOSS_JOB_ONLINE_URL = `${BASE_URL}/wapi/zpjob/job/online`;
export const BOSS_EXCHANGE_REQUEST_URL = `${BASE_URL}/wapi/zpchat/exchange/request`;
export const BOSS_REMOVE_FILTER_URL = `${BASE_URL}/wapi/zprelation/friend/bossRemoveFilter`;
export const BOSS_INTERVIEW_INVITE_URL = `${BASE_URL}/wapi/zpinterview/boss/interview/invite`;

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
  'Sec-Ch-Ua': '"Chromium";v="145", "Not(A:Brand";v="99", "Google Chrome";v="145"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'X-Requested-With': 'XMLHttpRequest',
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

// ====== 筛选编码映射 ======
export const SALARY_CODES: Record<string, string> = {
  '3K以下': '401', '3-5K': '402', '5-10K': '403', '10-15K': '404',
  '15-20K': '405', '20-30K': '406', '30-50K': '407', '50K以上': '408',
};

export const EXP_CODES: Record<string, string> = {
  '不限': '0', '在校/应届': '108', '1年以内': '101', '1-3年': '102',
  '3-5年': '103', '5-10年': '104', '10年以上': '105',
};

export const DEGREE_CODES: Record<string, string> = {
  '不限': '0', '初中及以下': '209', '中专/中技': '208', '高中': '206',
  '大专': '202', '本科': '203', '硕士': '204', '博士': '205',
};

export const INDUSTRY_CODES: Record<string, string> = {
  '不限': '0', '互联网': '100020', '电子商务': '100021', '游戏': '100024',
  '人工智能': '100901', '金融': '100101', '教育培训': '100200',
  '医疗健康': '100300', '移动互联网': '100020', '数据服务': '100032', '企业服务': '100032',
};

export const SCALE_CODES: Record<string, string> = {
  '不限': '0', '0-20人': '301', '20-99人': '302', '100-499人': '303',
  '500-999人': '304', '1000-9999人': '305', '10000人以上': '306',
};

export const STAGE_CODES: Record<string, string> = {
  '不限': '0', '未融资': '801', '天使轮': '802', 'A轮': '803',
  'B轮': '804', 'C轮': '805', 'D轮及以上': '806', '已上市': '807', '不需要融资': '808',
};

export const JOB_TYPE_CODES: Record<string, string> = {
  '全职': '1901', '实习': '1902', '兼职': '1903',
};

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
