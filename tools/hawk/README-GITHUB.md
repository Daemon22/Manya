# Hawk — Production-Grade Device Intelligence Engine

[![npm version](https://img.shields.io/npm/v/hawk-device-detection.svg)](https://www.npmjs.com/package/hawk-device-detection)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Support](https://img.shields.io/badge/node-%3E%3D12.0.0-brightgreen)](https://nodejs.org/)
[![Browser Support](https://img.shields.io/badge/browsers-all%20modern-brightgreen)](https://caniuse.com/)

Hawk is a comprehensive, multi-layer device detection and environment monitoring system that identifies operating systems, device types, hardware architectures, runtime environments, and device capabilities in real-time. Built with a modular architecture, Hawk scales from simple web applications to complex IoT and AI-powered platforms.

## Why Hawk?

Modern applications require more than basic device detection. They need **context awareness**. Hawk provides:

| Feature | Benefit |
|---------|---------|
| **Multi-Layer Detection** | Combines user agent parsing, platform APIs, and runtime inspection for accuracy | 
| **Standardized Profiles** | Consistent device data structure for all platforms and environments |
| **Capability Scanning** | Detects 20+ device capabilities (WebGL, geolocation, camera, Bluetooth, etc.) |
| **Zero Dependencies** | Lightweight (2.5KB gzipped), secure, and fast |
| **Modular Architecture** | Extensible design for custom detectors and adapters |
| **Performance Optimized** | Built-in caching reduces detection overhead to <1ms |
| **Production-Ready** | Battle-tested detection methods used in enterprise systems |

## Quick Start

### Installation

**NPM**
```bash
npm install hawk-device-detection
```

**Browser**
```html
<script src="https://cdn.example.com/hawk.js"></script>
```

**Clone Repository**
```bash
git clone https://github.com/Daemon22/hawk.git
cd hawk
```

### Basic Usage

**Browser**
```javascript
const monitor = new DeviceMonitor();

monitor.detect().then(profile => {
    console.log('Device Type:', profile.deviceType.type);
    console.log('OS:', profile.os.name);
    console.log('Architecture:', profile.architecture.cpu);
    console.log('Capabilities:', profile.capabilities);
});
```

**Node.js**
```javascript
const DeviceMonitor = require('hawk-device-detection');

async function detectEnvironment() {
    const monitor = new DeviceMonitor({ debugMode: true });
    const profile = await monitor.detect();
    
    console.log('Runtime:', profile.environment.runtime);
    console.log('Platform:', profile.os.platform);
    console.log('Hardware Cores:', profile.metadata.hardwareConcurrency);
}

detectEnvironment();
```

## Core Capabilities

### Device Detection
Accurately identifies mobile, desktop, tablet, TV, wearable, and terminal devices across all platforms.

```javascript
monitor.detect().then(profile => {
    if (profile.deviceType.isMobile) {
        // Serve mobile-optimized experience
    } else if (profile.deviceType.isTablet) {
        // Serve tablet layout
    } else {
        // Serve desktop interface
    }
});
```

### Operating System Identification
Detects OS name, version, platform, kernel, and distribution information.

```javascript
const profile = await monitor.detect();
console.log(profile.os);
// Output:
// {
//   name: "Windows",
//   version: "10",
//   platform: "win32",
//   family: null,
//   kernel: null,
//   distribution: null
// }
```

### Hardware Architecture Detection
Identifies CPU architecture, bit depth, endianness, and core count.

```javascript
const profile = await monitor.detect();
console.log(profile.architecture);
// Output:
// {
//   cpu: "x64",
//   bits: 64,
//   endian: null,
//   cores: 8
// }
```

### Runtime Environment Detection
Determines if running in browser, Node.js, Electron, React Native, or shell environments.

```javascript
const profile = await monitor.detect();
console.log(profile.environment);
// Output:
// {
//   runtime: "browser",
//   isBrowser: true,
//   isNode: false,
//   isElectron: false,
//   isReactNative: false,
//   isShell: false,
//   container: null,
//   virtualization: null
// }
```

### Device Capability Scanning
Probes 20+ capabilities including WebGL, geolocation, camera, microphone, Bluetooth, NFC, and more.

```javascript
const profile = await monitor.detect();

if (profile.capabilities.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
        console.log('Location:', position.coords);
    });
}

if (profile.capabilities.camera) {
    // Enable video features
}

if (profile.capabilities.bluetooth) {
    // Enable Bluetooth connectivity
}
```

### Metadata Collection
Gathers timezone, language, hardware concurrency, device memory, and more.

```javascript
const profile = await monitor.detect();
console.log(profile.metadata);
// Output:
// {
//   timezone: "America/New_York",
//   language: "en-US",
//   languages: ["en-US", "en"],
//   hardwareConcurrency: 8,
//   deviceMemory: 16,
//   maxTouchPoints: 0
// }
```

## Configuration

Initialize Hawk with custom options:

```javascript
const monitor = new DeviceMonitor({
    enableCache: true,              // Cache results for performance
    cacheTTL: 600000,               // Cache duration in milliseconds (10 minutes)
    debugMode: true,                // Enable console logging
    customDetectors: [              // Add custom detection logic
        new MyCustomDetector()
    ]
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableCache` | boolean | `true` | Enable/disable result caching |
| `cacheTTL` | number | `300000` | Cache time-to-live in milliseconds |
| `debugMode` | boolean | `false` | Enable console logging |
| `customDetectors` | Array | `[]` | Array of custom detector instances |

## API Reference

### `DeviceMonitor` Class

#### Constructor
```javascript
new DeviceMonitor(options)
```

Creates a new DeviceMonitor instance with optional configuration.

#### `detect()`
```javascript
monitor.detect() → Promise<Object>
```

Asynchronously detects and returns a comprehensive device profile. Returns a promise that resolves with the device profile object containing OS, device type, screen info, architecture, environment, capabilities, and metadata.

#### `clearCache()`
```javascript
monitor.clearCache() → void
```

Clears the internally cached device profile, forcing a fresh detection on the next `detect()` call.

## Use Cases

### Adaptive Web Applications
Serve optimized experiences based on device capabilities and screen size.

```javascript
monitor.detect().then(profile => {
    const config = {
        quality: profile.deviceType.isMobile ? 'low' : 'high',
        features: profile.capabilities.webgl ? 'advanced' : 'basic',
        layout: profile.screen.width < 768 ? 'mobile' : 'desktop'
    };
    initializeApp(config);
});
```

### Smart Farming & IoT
Detect and monitor agricultural devices and sensors in field environments.

```javascript
// Custom detector for farming devices
class FarmingDeviceDetector {
    canDetect(type) {
        return type === 'deviceType';
    }
    
    async detectDeviceType() {
        // Detect irrigation controller, soil sensor, weather station, etc.
        return { type: 'iot', manufacturer: 'FarmTech' };
    }
}

const monitor = new DeviceMonitor({
    customDetectors: [new FarmingDeviceDetector()]
});
```

### AI Context Awareness
Provide device intelligence to AI systems for adaptive behavior.

```javascript
const profile = await monitor.detect();

const aiContext = {
    device: profile.deviceType.type,
    capabilities: profile.capabilities,
    performance: {
        cores: profile.metadata.hardwareConcurrency,
        memory: profile.metadata.deviceMemory
    }
};

// Pass to AI system for context-aware responses
const response = await aiSystem.chat(userMessage, aiContext);
```

### Security & Fraud Detection
Identify suspicious environments, emulators, and virtual machines.

```javascript
const profile = await monitor.detect();

const suspiciousIndicators = {
    isVM: profile.environment.virtualization !== null,
    isContainer: profile.environment.container !== null,
    isEmulator: detectEmulator(profile)
};

if (suspiciousIndicators.isVM || suspiciousIndicators.isContainer) {
    // Implement security measures
}
```

## Advanced Features

### Custom Detectors
Extend Hawk with custom detection logic for specialized environments.

```javascript
class CustomDetector {
    canDetect(type) {
        return type === 'custom';
    }
    
    async detectCustom() {
        return {
            customProperty: 'custom value'
        };
    }
}

const monitor = new DeviceMonitor({
    customDetectors: [new CustomDetector()]
});
```

### Performance Optimization
Hawk includes built-in caching for optimal performance.

```javascript
const monitor = new DeviceMonitor({
    enableCache: true,
    cacheTTL: 600000  // 10 minutes
});

// First call: performs detection
const profile1 = await monitor.detect();

// Subsequent calls within 10 minutes: returns cached result
const profile2 = await monitor.detect();

// Clear cache when needed
monitor.clearCache();
```

### Error Handling
Implement robust error handling in your applications.

```javascript
monitor.detect()
    .then(profile => {
        console.log('Detection successful:', profile);
    })
    .catch(error => {
        console.error('Detection failed:', error.message);
        // Implement fallback logic
    });
```

## Browser Compatibility

Hawk works in all modern browsers and Node.js environments:

| Environment | Support |
|-------------|---------|
| Chrome | ✓ Latest 2 versions |
| Firefox | ✓ Latest 2 versions |
| Safari | ✓ Latest 2 versions |
| Edge | ✓ Latest 2 versions |
| Node.js | ✓ 12.0.0+ |
| Electron | ✓ All versions |
| React Native | ✓ With custom detectors |

## Performance

Hawk is optimized for performance with minimal overhead:

| Metric | Value |
|--------|-------|
| Module Size (unminified) | ~15KB |
| Module Size (minified) | ~8KB |
| Module Size (gzipped) | ~2.5KB |
| First Detection | <5ms |
| Cached Detection | <1ms |
| Memory Footprint | <1MB |
| Dependencies | 0 |

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** — Get started in 5 minutes
- **[EXAMPLES.md](EXAMPLES.md)** — 15+ practical code examples
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Deployment guides for all platforms
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — System design and extensibility
- **[ROADMAP.md](ROADMAP.md)** — Future features and improvements

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Reporting bugs
- Suggesting features
- Submitting pull requests
- Code style standards
- Testing requirements

## Support

- **Issues**: [GitHub Issues](https://github.com/Daemon22/hawk/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Daemon22/hawk/discussions)
- **Email**: contact@haelfoundation.org

## Roadmap

### Version 1.1 (Q2 2026)
- Real-time event monitoring (screen resize, network change, battery status)
- Device fingerprinting layer (ethical, permission-based)
- Enhanced IoT device detection

### Version 1.2 (Q3 2026)
- WebAssembly optimization for performance
- Extended capability detection (AR, VR, 5G)
- Machine learning-based device classification

### Version 2.0 (Q4 2026)
- Cloud-based device intelligence API
- Advanced security detection (emulator, VM, sandbox detection)
- Multi-device ecosystem monitoring

See [ROADMAP.md](ROADMAP.md) for detailed feature planning.

## License

Hawk is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Author

**Uviwe Menyiwe (Azura)**  
Hael Foundation

---

**Made with ❤️ by the Hael Foundation**

[GitHub](https://github.com/Daemon22/hawk) • [NPM](https://www.npmjs.com/package/hawk-device-detection) • [Website](https://haelfoundation.org)
