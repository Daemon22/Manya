/** Device detection via user-agent parsing and feature checks. */

const BOTS = /bot|crawl|spider|slurp|mediapartners|preview|fetch|curl|wget|headless/i;
const BROWSERS = [
  { name: 'Edge', re: /Edg(?:e|A|iOS)?\/(\d[\d.]*)/ },
  { name: 'Opera', re: /OPR\/(\d[\d.]*)/ },
  { name: 'Samsung Internet', re: /SamsungBrowser\/(\d[\d.]*)/ },
  { name: 'Firefox', re: /Firefox\/(\d[\d.]*)/ },
  { name: 'Chrome', re: /Chrome\/(\d[\d.]*)/ },
  { name: 'Safari', re: /Version\/(\d[\d.]*).*Safari/ },
];
const ENGINES = [
  { name: 'Blink', re: /Chrome\/\d/ },
  { name: 'Gecko', re: /Gecko\// },
  { name: 'WebKit', re: /AppleWebKit\// },
  { name: 'Trident', re: /Trident\// },
];
const OS_PATTERNS = [
  { name: 'Windows', re: /Windows NT (\d+\.\d+)/ },
  { name: 'macOS', re: /Mac OS X (\d+[._]\d+[._]?\d*)/ },
  { name: 'iOS', re: /(?:iPhone OS|iPad.*OS) (\d+[._]\d+)/ },
  { name: 'Android', re: /Android (\d[\d.]*)/ },
  { name: 'Linux', re: /Linux/ },
  { name: 'ChromeOS', re: /CrOS/ },
];
const MOBILE_HINTS = /Mobile|Android.*Mobile|iPhone|iPod|Opera Mini|IEMobile|WPDesktop/i;
const TABLET_HINTS = /iPad|Android(?!.*Mobile)|Silk|PlayBook|Kindle/i;

const BRANDS = [
  [/Samsung/i, 'Samsung'], [/Apple/i, 'Apple'], [/Google/i, 'Google'],
  [/Microsoft/i, 'Microsoft'], [/Huawei/i, 'Huawei'], [/Xiaomi/i, 'Xiaomi'], [/OnePlus/i, 'OnePlus'],
];

/** Parse a user-agent string into device info. */
export function parseUserAgent(ua = '') {
  const isBot = BOTS.test(ua);
  let type = 'desktop';
  if (isBot) type = 'bot';
  else if (TABLET_HINTS.test(ua)) type = 'tablet';
  else if (MOBILE_HINTS.test(ua)) type = 'mobile';

  const browser = BROWSERS.find(b => b.re.test(ua));
  const engine = ENGINES.find(e => e.re.test(ua));
  const os = OS_PATTERNS.find(o => o.re.test(ua));
  const brand = BRANDS.find(([re]) => re.test(ua))?.[1] || 'unknown';

  let model = 'unknown';
  const modelMatch = ua.match(/\(([^)]+)\)/);
  if (modelMatch) {
    const parts = modelMatch[1].split(';');
    model = parts[parts.length - 1].trim().replace(/^Mozilla\/\d[\d.]*$/, 'unknown') || 'unknown';
  }

  return {
    type, brand, model,
    os: os ? os.name : 'unknown',
    osVersion: os ? (os.re.exec(ua)?.[1] || 'unknown').replace(/_/g, '.') : 'unknown',
    browser: browser ? browser.name : 'unknown',
    browserVersion: browser ? browser.re.exec(ua)?.[1] || 'unknown' : 'unknown',
    engine: engine ? engine.name : 'unknown',
    isBot,
  };
}

/** Detect device info, combining UA parsing with feature checks. */
export function detectDevice(env = globalThis) {
  const ua = env?.navigator?.userAgent || '';
  const info = parseUserAgent(ua);
  if (env?.navigator) {
    if (info.type !== 'bot') {
      const coarse = env.matchMedia?.('(pointer: coarse)')?.matches;
      const fine = env.matchMedia?.('(pointer: fine)')?.matches;
      if (coarse && !fine && info.type === 'desktop') info.type = 'mobile';
    }
    info.language = env.navigator.language || 'unknown';
    info.languages = Array.from(env.navigator.languages || []);
    info.onLine = env.navigator.onLine ?? null;
    info.cookieEnabled = env.navigator.cookieEnabled ?? null;
  }
  return info;
}
