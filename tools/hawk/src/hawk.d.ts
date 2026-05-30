declare namespace Hawk {
  export interface DeviceMonitorOptions {
    enableCache?: boolean;
    cacheTTL?: number;
    debugMode?: boolean;
    customDetectors?: Array<{
      canDetect(type: string): boolean;
      [methodName: string]: unknown;
    }>;
  }

  export interface OSInfo {
    name: string;
    version: string | null;
    family: string | null;
    platform: string | null;
    kernel: string | null;
    distribution: string | null;
  }

  export interface DeviceTypeInfo {
    type: 'desktop' | 'mobile' | 'tablet' | 'tv' | 'wearable' | 'terminal' | 'unknown' | string;
    formFactor: string | null;
    manufacturer: string | null;
    model: string | null;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isTV: boolean;
    isWearable: boolean;
    isTerminal: boolean;
  }

  export interface ScreenInfo {
    width: number | null;
    height: number | null;
    pixelRatio: number | null;
    colorDepth: number | null;
    orientation: string | null;
    touchSupport: boolean;
    maxTouchPoints: number;
  }

  export interface ArchitectureInfo {
    cpu: string | null;
    bits: number | null;
    endian: 'little' | 'big' | null;
    cores: number | null;
  }

  export interface EnvironmentInfo {
    runtime: 'browser' | 'node' | 'electron' | 'react-native' | 'shell' | string | null;
    runtimeVersion: string | null;
    isBrowser: boolean;
    isNode: boolean;
    isElectron: boolean;
    isReactNative: boolean;
    isShell: boolean;
    isHybrid: boolean;
    container: 'docker' | 'kubernetes' | string | null;
    virtualization: 'vm' | string | null;
  }

  export interface CapabilityInfo {
    webgl: boolean;
    webgpu: boolean;
    serviceWorker: boolean;
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
    geolocation: boolean;
    camera: boolean;
    microphone: boolean;
    bluetooth: boolean;
    usb: boolean;
    nfc: boolean;
    vibration: boolean;
    battery: boolean;
    networkInformation: boolean;
    shareAPI: boolean;
    clipboard: boolean;
    notifications: boolean;
    pushNotifications: boolean;
    paymentRequest: boolean;
    credentials: boolean;
  }

  export interface MetadataInfo {
    timezone: string | null;
    language: string | null;
    languages: readonly string[];
    cookiesEnabled: boolean | null;
    doNotTrack: string | null;
    onlineStatus: boolean | null;
    hardwareConcurrency: number | null;
    deviceMemory: number | null;
    maxTouchPoints: number;
  }

  export interface DeviceProfile {
    timestamp: string;
    os: OSInfo;
    deviceType: DeviceTypeInfo;
    screen: ScreenInfo;
    architecture: ArchitectureInfo;
    environment: EnvironmentInfo;
    capabilities: CapabilityInfo;
    userAgent: string;
    metadata: MetadataInfo;
  }
}

declare class DeviceMonitor {
  constructor(options?: Hawk.DeviceMonitorOptions);
  detect(): Promise<Hawk.DeviceProfile>;
  clearCache(): void;
}

export = DeviceMonitor;
