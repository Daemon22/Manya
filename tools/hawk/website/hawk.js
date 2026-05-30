/**
 * Hawk - Device Detection Monitor
 * A cross-platform, embeddable module for environment detection
 *
 * Author: Uviwe Menyiwe (Azura)
 * Organization: Hael Foundation
 * License: MIT
 */

class DeviceMonitor {
  constructor(options = {}) {
    this.options = {
      enableCache: options.enableCache !== false,
      cacheTTL: options.cacheTTL || 300000,
      debugMode: options.debugMode || false,
      customDetectors: options.customDetectors || []
    };
    this._cache = null;
    this._cacheTimestamp = null;
    this._detectors = this._initializeDetectors();
  }

  _initializeDetectors() {
    const builtInDetectors = [
      new UserAgentDetector(),
      new PlatformAPIDetector(),
      new ScreenDetector(),
      new ArchitectureDetector(),
      new EnvironmentDetector()
    ];
    return [...builtInDetectors, ...this.options.customDetectors];
  }

  async detect() {
    if (this.options.enableCache && this._isCacheValid()) {
      this._log('Returning cached device profile');
      return this._cache;
    }
    try {
      this._log('Starting device detection...');
      const profile = {
        timestamp: new Date().toISOString(),
        os: await this._detectOS(),
        deviceType: await this._detectDeviceType(),
        screen: await this._detectScreenInfo(),
        architecture: await this._detectArchitecture(),
        environment: await this._detectEnvironment(),
        capabilities: await this._detectCapabilities(),
        userAgent: this._getUserAgentString(),
        metadata: this._gatherMetadata()
      };
      if (this.options.enableCache) {
        this._cache = profile;
        this._cacheTimestamp = Date.now();
      }
      this._log('Device detection completed:', profile);
      return profile;
    } catch (error) {
      this._log('Error during device detection:', error);
      throw new Error(`Device detection failed: ${error.message}`);
    }
  }

  _isCacheValid() {
    return this._cache &&
           this._cacheTimestamp &&
           (Date.now() - this._cacheTimestamp) < this.options.cacheTTL;
  }

  async _detectOS() {
    const results = {};
    for (const detector of this._detectors) {
      if (detector.canDetect('os')) {
        const osInfo = await detector.detectOS();
        if (osInfo) Object.assign(results, osInfo);
      }
    }
    return {
      name: results.name || 'Unknown',
      version: results.version || null,
      family: results.family || null,
      platform: results.platform || null,
      kernel: results.kernel || null,
      distribution: results.distribution || null
    };
  }

  async _detectDeviceType() {
    const results = {};
    for (const detector of this._detectors) {
      if (detector.canDetect('deviceType')) {
        const deviceInfo = await detector.detectDeviceType();
        if (deviceInfo) Object.assign(results, deviceInfo);
      }
    }
    return {
      type: results.type || 'unknown',
      formFactor: results.formFactor || null,
      manufacturer: results.manufacturer || null,
      model: results.model || null,
      isMobile: results.isMobile || false,
      isTablet: results.isTablet || false,
      isDesktop: results.isDesktop || false,
      isTV: results.isTV || false,
      isWearable: results.isWearable || false,
      isTerminal: results.isTerminal || false
    };
  }

  async _detectScreenInfo() {
    const results = {};
    for (const detector of this._detectors) {
      if (detector.canDetect('screen')) {
        const screenInfo = await detector.detectScreen();
        if (screenInfo) Object.assign(results, screenInfo);
      }
    }
    return {
      width: results.width || null,
      height: results.height || null,
      pixelRatio: results.pixelRatio || null,
      colorDepth: results.colorDepth || null,
      orientation: results.orientation || null,
      touchSupport: results.touchSupport || false,
      maxTouchPoints: results.maxTouchPoints || 0
    };
  }

  async _detectArchitecture() {
    const results = {};
    for (const detector of this._detectors) {
      if (detector.canDetect('architecture')) {
        const archInfo = await detector.detectArchitecture();
        if (archInfo) Object.assign(results, archInfo);
      }
    }
    return {
      cpu: results.cpu || null,
      bits: results.bits || null,
      endian: results.endian || null,
      cores: results.cores || null
    };
  }

  async _detectEnvironment() {
    const results = {};
    for (const detector of this._detectors) {
      if (detector.canDetect('environment')) {
        const envInfo = await detector.detectEnvironment();
        if (envInfo) Object.assign(results, envInfo);
      }
    }
    return {
      runtime: results.runtime || null,
      runtimeVersion: results.runtimeVersion || null,
      isBrowser: results.isBrowser || false,
      isNode: results.isNode || false,
      isElectron: results.isElectron || false,
      isReactNative: results.isReactNative || false,
      isShell: results.isShell || false,
      isHybrid: results.isHybrid || false,
      container: results.container || null,
      virtualization: results.virtualization || null
    };
  }

  async _detectCapabilities() {
    return {
      webgl: this._checkWebGL(),
      webgpu: this._checkWebGPU(),
      serviceWorker: this._checkServiceWorker(),
      localStorage: this._checkLocalStorage(),
      sessionStorage: this._checkSessionStorage(),
      indexedDB: this._checkIndexedDB(),
      geolocation: this._checkGeolocation(),
      camera: this._checkCamera(),
      microphone: this._checkMicrophone(),
      bluetooth: this._checkBluetooth(),
      usb: this._checkUSB(),
      nfc: this._checkNFC(),
      vibration: this._checkVibration(),
      battery: this._checkBattery(),
      networkInformation: this._checkNetworkInformation(),
      shareAPI: this._checkShareAPI(),
      clipboard: this._checkClipboard(),
      notifications: this._checkNotifications(),
      pushNotifications: this._checkPushNotifications(),
      paymentRequest: this._checkPaymentRequest(),
      credentials: this._checkCredentials()
    };
  }

  _getUserAgentString() {
    if (typeof navigator !== 'undefined' && navigator.userAgent) return navigator.userAgent;
    if (typeof process !== 'undefined' && process.version) return `Node.js/${process.version}`;
    return 'Unknown';
  }

  _gatherMetadata() {
    return {
      timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
      language: typeof navigator !== 'undefined' ? navigator.language : null,
      languages: typeof navigator !== 'undefined' ? navigator.languages : [],
      cookiesEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : null,
      doNotTrack: typeof navigator !== 'undefined' ? navigator.doNotTrack : null,
      onlineStatus: typeof navigator !== 'undefined' ? navigator.onLine : null,
      hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : null,
      deviceMemory: typeof navigator !== 'undefined' ? navigator.deviceMemory : null,
      maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0
    };
  }

  _checkWebGL() {
    try {
      if (typeof document === 'undefined') return false;
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) { return false; }
  }
  _checkWebGPU() { return typeof navigator !== 'undefined' && 'gpu' in navigator; }
  _checkServiceWorker() { return typeof navigator !== 'undefined' && 'serviceWorker' in navigator; }
  _checkLocalStorage() { try { return typeof localStorage !== 'undefined'; } catch (e) { return false; } }
  _checkSessionStorage() { try { return typeof sessionStorage !== 'undefined'; } catch (e) { return false; } }
  _checkIndexedDB() { return typeof indexedDB !== 'undefined'; }
  _checkGeolocation() { return typeof navigator !== 'undefined' && 'geolocation' in navigator; }
  _checkCamera() { return typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'; }
  _checkMicrophone() { return this._checkCamera(); }
  _checkBluetooth() { return typeof navigator !== 'undefined' && 'bluetooth' in navigator; }
  _checkUSB() { return typeof navigator !== 'undefined' && 'usb' in navigator; }
  _checkNFC() { return typeof navigator !== 'undefined' && 'nfc' in navigator; }
  _checkVibration() { return typeof navigator !== 'undefined' && 'vibrate' in navigator; }
  _checkBattery() { return typeof navigator !== 'undefined' && 'getBattery' in navigator; }
  _checkNetworkInformation() { return typeof navigator !== 'undefined' && 'connection' in navigator; }
  _checkShareAPI() { return typeof navigator !== 'undefined' && 'share' in navigator; }
  _checkClipboard() { return typeof navigator !== 'undefined' && 'clipboard' in navigator; }
  _checkNotifications() { return typeof Notification !== 'undefined'; }
  _checkPushNotifications() { return typeof PushManager !== 'undefined'; }
  _checkPaymentRequest() { return typeof PaymentRequest !== 'undefined'; }
  _checkCredentials() { return typeof navigator !== 'undefined' && 'credentials' in navigator; }

  clearCache() {
    this._cache = null;
    this._cacheTimestamp = null;
    this._log('Cache cleared');
  }

  _log(...args) {
    if (this.options.debugMode) console.log('[Hawk]', ...args);
  }
}

// ─────────────────────────────────────────────
// DETECTOR IMPLEMENTATIONS
// ─────────────────────────────────────────────

class UserAgentDetector {
  canDetect(type) { return ['os', 'deviceType'].includes(type); }

  async detectOS() {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    if (!ua) return null;

    let osName = 'Unknown', osVersion = null, platform = null;

    if (ua.indexOf('Windows') !== -1) {
      osName = 'Windows';
      if (ua.indexOf('Windows NT 10.0') !== -1) osVersion = '10';
      else if (ua.indexOf('Windows NT 6.3') !== -1) osVersion = '8.1';
      else if (ua.indexOf('Windows NT 6.2') !== -1) osVersion = '8';
      else if (ua.indexOf('Windows NT 6.1') !== -1) osVersion = '7';
      platform = 'win32';
    } else if (ua.indexOf('Mac OS X') !== -1) {
      osName = 'macOS';
      const match = ua.match(/Mac OS X (\d+[._]\d+)/);
      if (match) osVersion = match[1].replace('_', '.');
      platform = 'darwin';
    } else if (/iPad|iPhone|iPod/.test(ua)) {
      osName = 'iOS';
      const match = ua.match(/OS (\d+_\d+)/);
      if (match) osVersion = match[1].replace('_', '.');
      platform = 'ios';
    } else if (ua.indexOf('Android') !== -1) {
      osName = 'Android';
      const match = ua.match(/Android (\d+\.?\d*)/);
      if (match) osVersion = match[1];
      platform = 'android';
    } else if (ua.indexOf('Linux') !== -1) {
      osName = 'Linux';
      platform = 'linux';
    }

    return { name: osName, version: osVersion, platform };
  }

  async detectDeviceType() {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    if (!ua) return null;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua);
    let type = 'desktop';
    if (isTablet) type = 'tablet';
    else if (isMobile) type = 'mobile';

    return { type, isMobile: type === 'mobile', isTablet: type === 'tablet', isDesktop: type === 'desktop' };
  }
}

class PlatformAPIDetector {
  canDetect(type) { return ['os', 'deviceType', 'architecture', 'environment', 'screen'].includes(type); }

  async detectOS() {
    if (typeof navigator !== 'undefined') {
      const platform = navigator.platform || '';
      const userAgentData = navigator.userAgentData;
      if (userAgentData) {
        const platformInfo = await userAgentData.getHighEntropyValues(['platformVersion']);
        return { name: platformInfo.platform || platform, platform: platform.toLowerCase() };
      }
      return { name: platform, platform: platform.toLowerCase() };
    }
    if (typeof process !== 'undefined' && process.platform) {
      const platformMap = {
        win32: 'Windows', darwin: 'macOS', linux: 'Linux',
        freebsd: 'FreeBSD', openbsd: 'OpenBSD', android: 'Android', aix: 'AIX'
      };
      return {
        name: platformMap[process.platform] || process.platform,
        platform: process.platform,
        version: process.release?.name,
        kernel: process.version
      };
    }
    return null;
  }

  async detectDeviceType() {
    if (typeof navigator !== 'undefined' && navigator.userAgentData) {
      const data = await navigator.userAgentData.getHighEntropyValues(['mobile', 'platform']);
      return { type: data.mobile ? 'mobile' : 'desktop', isMobile: data.mobile, isDesktop: !data.mobile };
    }
    return null;
  }

  async detectArchitecture() {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (ua.indexOf('WOW64') !== -1 || ua.indexOf('Win64') !== -1) return { cpu: 'x64', bits: 64 };
      if (ua.indexOf('x64') !== -1 || ua.indexOf('x86_64') !== -1) return { cpu: 'x64', bits: 64 };
      if (ua.indexOf('x86') !== -1 || ua.indexOf('i386') !== -1 || ua.indexOf('i686') !== -1) return { cpu: 'x86', bits: 32 };
      if (ua.indexOf('ARM64') !== -1) return { cpu: 'arm64', bits: 64 };
      if (ua.indexOf('ARM') !== -1) return { cpu: 'arm', bits: 32 };
    }
    if (typeof process !== 'undefined' && process.arch) {
      const archMap = {
        x64: { cpu: 'x64', bits: 64 }, x86: { cpu: 'x86', bits: 32 },
        arm: { cpu: 'arm', bits: 32 }, arm64: { cpu: 'arm64', bits: 64 },
        mips: { cpu: 'mips', bits: 32 }, mipsel: { cpu: 'mipsel', bits: 32 },
        ia32: { cpu: 'ia32', bits: 32 }, ppc: { cpu: 'ppc', bits: 32 },
        ppc64: { cpu: 'ppc64', bits: 64 }, s390: { cpu: 's390', bits: 64 },
        s390x: { cpu: 's390x', bits: 64 }
      };
      return archMap[process.arch] || { cpu: process.arch, bits: null };
    }
    return null;
  }

  async detectEnvironment() {
    const env = {};
    if (typeof window !== 'undefined') {
      env.isBrowser = true;
      env.runtime = 'browser';
      if (typeof process !== 'undefined' && process.versions?.electron) {
        env.isElectron = true;
        env.runtime = 'electron';
        env.runtimeVersion = process.versions.electron;
        env.isHybrid = true;
      }
    }
    if (typeof process !== 'undefined' && process.versions?.node) {
      env.isNode = true;
      env.runtime = env.isElectron ? env.runtime : 'node';
      env.runtimeVersion = process.versions.node;
    }
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      env.isReactNative = true;
      env.runtime = 'react-native';
      env.isHybrid = true;
    }
    if (typeof process !== 'undefined' && process.env?.TERM) {
      env.isShell = true;
      env.runtime = 'shell';
    }
    return Object.keys(env).length > 0 ? env : null;
  }

  async detectScreen() {
    if (typeof window !== 'undefined' && window.screen) {
      return {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio || 1,
        colorDepth: window.screen.colorDepth,
        orientation: window.screen.orientation?.type || null,
        touchSupport: 'ontouchstart' in window,
        maxTouchPoints: (typeof navigator !== 'undefined' && navigator.maxTouchPoints) || 0
      };
    }
    return null;
  }
}

class ScreenDetector {
  canDetect(type) { return type === 'screen'; }
  async detectScreen() { return null; }
}

class ArchitectureDetector {
  canDetect(type) { return type === 'architecture'; }
  async detectArchitecture() { return null; }
}

class EnvironmentDetector {
  canDetect(type) { return type === 'environment'; }
  async detectEnvironment() {
    const env = {};
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.DOCKER_CONTAINER || process.env.HOSTNAME?.endsWith('.docker')) env.container = 'docker';
      if (process.env.KUBERNETES_SERVICE_HOST) env.container = 'kubernetes';
      if (process.env.VIRTUAL_ENV || process.env.CONDA_DEFAULT_ENV) env.virtualization = 'vm';
    }
    return Object.keys(env).length > 0 ? env : null;
  }
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeviceMonitor;
} else if (typeof define === 'function' && define.amd) {
  define([], function() { return DeviceMonitor; });
} else if (typeof window !== 'undefined') {
  window.DeviceMonitor = DeviceMonitor;
}
