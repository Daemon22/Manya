# Hawk — Architecture & Design

This document explains the internal architecture of Hawk, how it works, and how to extend it with custom detectors.

## System Overview

Hawk is built on a **modular detection pipeline** that combines multiple detection strategies to provide accurate, comprehensive device intelligence.

```
┌─────────────────────────────────────────────────────────┐
│                   DeviceMonitor                         │
│                   (Main Interface)                      │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌──────────┐
   │ Cache   │  │ Detector│  │ Detector │
   │ Layer   │  │ Pipeline│  │ Registry │
   └─────────┘  └────┬────┘  └──────────┘
                     │
        ┌────────────┼────────────┬─────────────┐
        │            │            │             │
        ▼            ▼            ▼             ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ UserAgent│ │ Platform │ │ Screen   │ │ Arch     │
   │ Detector │ │ Detector │ │ Detector │ │ Detector │
   └──────────┘ └──────────┘ └──────────┘ └──────────┘
        │            │            │             │
        └────────────┼────────────┴─────────────┘
                     │
        ┌────────────▼────────────┐
        │   Device Profile        │
        │   (Standardized Output) │
        └─────────────────────────┘
```

## Core Components

### 1. DeviceMonitor (Main Class)

The entry point for all device detection operations.

**Responsibilities**:
- Initialize detector pipeline
- Manage cache lifecycle
- Orchestrate detection flow
- Expose public API

**Key Methods**:
- `detect()` — Perform device detection
- `clearCache()` — Clear cached results
- `_initializeDetectors()` — Set up detector pipeline

```javascript
class DeviceMonitor {
    constructor(options = {}) {
        this.options = {
            enableCache: true,
            cacheTTL: 300000,
            debugMode: false,
            customDetectors: []
        };
        this._cache = null;
        this._cacheTimestamp = null;
        this._detectors = this._initializeDetectors();
    }

    async detect() {
        // Check cache
        if (this._isCacheValid()) {
            return this._cache;
        }

        // Run detection pipeline
        const profile = await this._runDetectionPipeline();

        // Update cache
        if (this.options.enableCache) {
            this._cache = profile;
            this._cacheTimestamp = Date.now();
        }

        return profile;
    }
}
```

### 2. Detector Interface

All detectors implement a standard interface for consistency.

**Detector Contract**:
```javascript
class BaseDetector {
    canDetect(type) {
        // Return true if this detector handles the given type
        return ['os', 'deviceType'].includes(type);
    }

    async detectOS() {
        // Return OS information or null
        return { name, version, platform };
    }

    async detectDeviceType() {
        // Return device type information or null
        return { type, isMobile, isDesktop };
    }

    async detectScreen() {
        // Return screen information or null
        return { width, height, pixelRatio };
    }

    async detectArchitecture() {
        // Return architecture information or null
        return { cpu, bits, endian };
    }

    async detectEnvironment() {
        // Return environment information or null
        return { runtime, isBrowser, isNode };
    }
}
```

### 3. Built-in Detectors

#### UserAgentDetector
Parses the user agent string to extract OS and device information.

**Detection Methods**:
- User agent string parsing
- Regex pattern matching
- Known device signatures

**Detects**:
- Operating system (Windows, macOS, Linux, iOS, Android)
- Device type (mobile, desktop, tablet)
- OS version

**Limitations**:
- Can be spoofed
- May be inaccurate on new devices
- Limited to browser environments

#### PlatformAPIDetector
Uses native browser and Node.js APIs for accurate detection.

**Detection Methods**:
- `navigator` object inspection
- `process` object inspection (Node.js)
- `userAgentData` API (modern browsers)
- Platform-specific APIs

**Detects**:
- OS via platform APIs
- Device type via user agent data
- CPU architecture
- Runtime environment
- Screen properties

**Advantages**:
- More reliable than user agent parsing
- Works across different environments
- Detects runtime-specific information

#### ScreenDetector
Detects screen and display properties.

**Detection Methods**:
- `window.screen` object
- Media queries
- Touch event support

**Detects**:
- Screen resolution
- Pixel ratio
- Color depth
- Orientation
- Touch support

#### ArchitectureDetector
Identifies CPU architecture and hardware properties.

**Detection Methods**:
- User agent pattern matching
- `process.arch` (Node.js)
- WebAssembly feature detection

**Detects**:
- CPU type (x64, ARM, MIPS, etc.)
- Bit depth (32-bit, 64-bit)
- Endianness
- Core count

#### EnvironmentDetector
Determines the runtime environment and container status.

**Detection Methods**:
- Global object inspection
- Environment variable checking
- Container detection

**Detects**:
- Runtime (browser, Node.js, Electron, React Native)
- Container (Docker, Kubernetes)
- Virtualization (VM, sandbox)

## Detection Pipeline

The detection pipeline orchestrates multiple detectors to build a comprehensive device profile.

### Pipeline Flow

```
1. Check Cache
   ├─ Valid? → Return cached profile
   └─ Invalid? → Continue to detection

2. Initialize Detectors
   └─ Load built-in + custom detectors

3. Run Detection Methods
   ├─ For each detector:
   │  ├─ canDetect('os')? → detectOS()
   │  ├─ canDetect('deviceType')? → detectDeviceType()
   │  ├─ canDetect('screen')? → detectScreen()
   │  ├─ canDetect('architecture')? → detectArchitecture()
   │  └─ canDetect('environment')? → detectEnvironment()
   └─ Merge results

4. Aggregate Results
   ├─ Combine detector outputs
   ├─ Resolve conflicts
   └─ Fill standardized profile

5. Detect Capabilities
   ├─ WebGL support
   ├─ Geolocation support
   ├─ Camera/Microphone access
   ├─ Bluetooth support
   └─ ... (20+ capabilities)

6. Gather Metadata
   ├─ Timezone
   ├─ Language
   ├─ Hardware concurrency
   └─ Device memory

7. Cache & Return
   ├─ Store in cache (if enabled)
   └─ Return complete profile
```

### Result Merging Strategy

When multiple detectors provide information about the same property, Hawk uses this priority:

1. **Explicit Values** — Non-null values take precedence
2. **Specificity** — More specific information overrides general
3. **Recency** — Later detectors can override earlier ones
4. **Confidence** — Higher-confidence methods take precedence

```javascript
// Example: OS detection merging
const osResults = [];

// UserAgentDetector: { name: 'Windows', version: '10' }
osResults.push({ name: 'Windows', version: '10' });

// PlatformAPIDetector: { name: 'Windows', platform: 'win32' }
osResults.push({ name: 'Windows', platform: 'win32' });

// Merged result
// { name: 'Windows', version: '10', platform: 'win32' }
```

## Caching System

Hawk implements a time-based caching system to optimize performance.

### Cache Lifecycle

```
detect() called
    ↓
Check cache validity
    ├─ Valid (within TTL)? → Return cached profile
    └─ Invalid (expired)? → Run detection
        ↓
    Detection complete
        ↓
    Store in cache with timestamp
        ↓
    Return profile
```

### Cache Configuration

```javascript
const monitor = new DeviceMonitor({
    enableCache: true,        // Enable/disable caching
    cacheTTL: 300000         // 5 minutes (default)
});

// Cache is valid for 5 minutes
// After 5 minutes, next detect() runs fresh detection

// Manual cache clearing
monitor.clearCache();
```

### Performance Impact

| Scenario | Time | Memory |
|----------|------|--------|
| First detection | ~5ms | ~1MB |
| Cached detection | <1ms | ~1MB |
| Cache miss (expired) | ~5ms | ~1MB |

## Device Profile Structure

The standardized device profile returned by `detect()`:

```javascript
{
    timestamp: string,           // ISO 8601 timestamp
    os: {
        name: string,            // e.g., "Windows", "macOS", "Linux"
        version: string | null,  // e.g., "10", "14.4"
        family: string | null,   // OS family
        platform: string | null, // e.g., "win32", "darwin", "linux"
        kernel: string | null,   // Kernel version (Node.js)
        distribution: string | null // Linux distribution
    },
    deviceType: {
        type: string,            // "desktop", "mobile", "tablet", etc.
        formFactor: string | null,
        manufacturer: string | null,
        model: string | null,
        isMobile: boolean,
        isTablet: boolean,
        isDesktop: boolean,
        isTV: boolean,
        isWearable: boolean,
        isTerminal: boolean
    },
    screen: {
        width: number | null,    // Pixels
        height: number | null,   // Pixels
        pixelRatio: number | null,
        colorDepth: number | null, // Bits
        orientation: string | null,
        touchSupport: boolean,
        maxTouchPoints: number
    },
    architecture: {
        cpu: string | null,      // "x64", "arm64", "x86"
        bits: number | null,     // 32 or 64
        endian: string | null,   // "little" or "big"
        cores: number | null     // CPU core count
    },
    environment: {
        runtime: string | null,  // "browser", "node", "electron"
        runtimeVersion: string | null,
        isBrowser: boolean,
        isNode: boolean,
        isElectron: boolean,
        isReactNative: boolean,
        isShell: boolean,
        isHybrid: boolean,
        container: string | null, // "docker", "kubernetes"
        virtualization: string | null // "vm", "sandbox"
    },
    capabilities: {
        webgl: boolean,
        webgpu: boolean,
        serviceWorker: boolean,
        localStorage: boolean,
        sessionStorage: boolean,
        indexedDB: boolean,
        geolocation: boolean,
        camera: boolean,
        microphone: boolean,
        bluetooth: boolean,
        usb: boolean,
        nfc: boolean,
        vibration: boolean,
        battery: boolean,
        networkInformation: boolean,
        shareAPI: boolean,
        clipboard: boolean,
        notifications: boolean,
        pushNotifications: boolean,
        paymentRequest: boolean,
        credentials: boolean
    },
    userAgent: string,           // Full user agent string
    metadata: {
        timezone: string | null,
        language: string | null,
        languages: string[],
        cookiesEnabled: boolean | null,
        doNotTrack: string | null,
        onlineStatus: boolean | null,
        hardwareConcurrency: number | null,
        deviceMemory: number | null,
        maxTouchPoints: number
    }
}
```

## Extending Hawk with Custom Detectors

### Creating a Custom Detector

```javascript
class FarmingDeviceDetector {
    canDetect(type) {
        // Specify which detection types this detector handles
        return ['deviceType', 'environment'].includes(type);
    }

    async detectDeviceType() {
        // Detect if this is a farming device
        const isFarmingDevice = await this._checkFarmingHardware();
        
        if (isFarmingDevice) {
            return {
                type: 'iot',
                formFactor: 'industrial',
                manufacturer: 'FarmTech',
                model: 'SoilMonitor-v3'
            };
        }
        
        return null;
    }

    async detectEnvironment() {
        // Detect farming-specific environment
        return {
            container: 'farming-platform',
            virtualization: null
        };
    }

    async _checkFarmingHardware() {
        // Custom hardware detection logic
        // Check for specific sensors, APIs, etc.
        return false;
    }
}
```

### Registering a Custom Detector

```javascript
const customDetector = new FarmingDeviceDetector();

const monitor = new DeviceMonitor({
    customDetectors: [customDetector]
});

const profile = await monitor.detect();
// Profile now includes data from FarmingDeviceDetector
```

### Detector Best Practices

1. **Implement the Interface** — Implement `canDetect()` and detection methods
2. **Return Standardized Data** — Follow the profile structure
3. **Handle Errors Gracefully** — Return null on detection failure
4. **Avoid Side Effects** — Don't modify global state
5. **Optimize Performance** — Cache expensive operations
6. **Document Behavior** — Explain what your detector does

## Performance Considerations

### Optimization Strategies

1. **Caching** — Enabled by default, configurable TTL
2. **Lazy Detection** — Only run detectors that can detect requested type
3. **Parallel Execution** — Run independent detectors concurrently
4. **Early Exit** — Stop detection when sufficient data collected

### Memory Management

- Module size: ~15KB unminified
- Runtime memory: <1MB
- No memory leaks (proper cleanup)
- Efficient string handling

### Browser Compatibility

- Works in all modern browsers
- Graceful degradation for older browsers
- No external dependencies
- Minimal polyfill requirements

## Security Considerations

### Privacy

- **Client-side Only** — All detection happens locally
- **No Transmission** — Device data never sent without explicit action
- **No Tracking** — No cookies or tracking mechanisms
- **User Control** — Users can disable capabilities

### Safety

- **No Code Injection** — Safe string parsing
- **No External Dependencies** — Reduced attack surface
- **Input Validation** — Sanitized data handling
- **Error Handling** — Graceful failure modes

## Future Architecture Improvements

### Planned Enhancements

1. **Event System** — Real-time monitoring of device changes
2. **Plugin System** — Formal plugin architecture for extensions
3. **WebAssembly** — Performance optimization via WASM
4. **Machine Learning** — ML-based device classification
5. **Cloud Integration** — Optional cloud-based intelligence

---

## Questions & Support

- **Architecture Questions**: Open GitHub discussion
- **Bug Reports**: Create GitHub issue
- **Feature Requests**: Propose on roadmap
- **Contributions**: See CONTRIBUTING.md

---

**Last Updated**: May 2026  
**Maintained By**: Hael Foundation
