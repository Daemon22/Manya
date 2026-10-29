/** Device info returned by detect(). */
export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop' | 'bot';
  brand: string;
  model: string;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  engine: string;
  isBot: boolean;
  language?: string;
  languages?: string[];
  onLine?: boolean | null;
  cookieEnabled?: boolean | null;
}

/** Screen capability details. */
export interface ScreenInfo {
  supported: boolean;
  width?: number;
  height?: number;
  availWidth?: number;
  availHeight?: number;
  colorDepth?: number;
  pixelDepth?: number;
  devicePixelRatio?: number;
}

/** Touch capability details. */
export interface TouchInfo {
  supported: boolean;
  maxTouchPoints: number;
}

/** WebGL capability details. */
export interface WebGLInfo {
  supported: boolean;
  version?: string;
  vendor?: string;
  renderer?: string;
};

/** Audio capability details. */
export interface AudioInfo {
  supported: boolean;
  sampleRate?: number;
  maxChannelCount?: number | null;
}

/** Storage capability details. */
export interface StorageInfo {
  localStorage: boolean | null;
  sessionStorage: boolean | null;
  indexedDB: boolean;
}

/** Network capability details. */
export interface NetworkInfo {
  supported: boolean;
  type?: string;
  effectiveType?: string;
  downlink?: number | null;
  rtt?: number | null;
  saveData?: boolean;
}

/** Performance signal details. */
export interface PerformanceInfo {
  memory: number | null;
  cpuCores: number | null;
  timing: boolean;
}

/** All environment capabilities. */
export interface Capabilities {
  screen: ScreenInfo;
  touch: TouchInfo;
  webgl: WebGLInfo;
  audio: AudioInfo;
  sw: { supported: boolean };
  storage: StorageInfo;
  network: NetworkInfo;
  performance: PerformanceInfo;
  battery: { supported: boolean };
}

/** Fingerprint result. */
export interface FingerprintResult {
  hash: string;
  components: Record<string, string>;
  timestamp: number;
}

/** Monitor event. */
export interface MonitorEvent {
  type: 'visibility' | 'network' | 'connection' | 'battery';
  detail: Record<string, unknown>;
}

/** Monitor callback. */
export type MonitorCallback = (event: MonitorEvent) => void;

/** Complete device snapshot. */
export interface Snapshot {
  device: DeviceInfo;
  capabilities: Capabilities;
  fingerprint: FingerprintResult;
  timestamp: number;
}

/** Hawk API. */
export interface Hawk {
  detect(env?: typeof globalThis): DeviceInfo;
  fingerprint(env?: typeof globalThis): FingerprintResult;
  monitor(callback: MonitorCallback, env?: typeof globalThis): () => void;
  snapshot(env?: typeof globalThis): Snapshot;
}

export const hawk: Hawk;
export default hawk;
