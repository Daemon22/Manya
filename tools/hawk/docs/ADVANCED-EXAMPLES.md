# Hawk Advanced Examples

Comprehensive examples demonstrating advanced Hawk usage patterns, integrations, and real-world scenarios.

## Table of Contents

1. [Real-Time Monitoring](#real-time-monitoring)
2. [IoT Device Detection](#iot-device-detection)
3. [Security Analysis](#security-analysis)
4. [Custom Detectors](#custom-detectors)
5. [Performance Optimization](#performance-optimization)
6. [Integration Patterns](#integration-patterns)
7. [Error Handling](#error-handling)
8. [Advanced Caching](#advanced-caching)

---

## Real-Time Monitoring

### Monitor Device Changes

Track device property changes over time and react to them:

```javascript
const DeviceMonitor = require('hawk-device-detection');

class DeviceChangeTracker {
    constructor() {
        this.monitor = new DeviceMonitor({ enableCache: false });
        this.previousProfile = null;
        this.changes = [];
    }

    async trackChanges(interval = 5000, duration = 60000) {
        const startTime = Date.now();

        while (Date.now() - startTime < duration) {
            const currentProfile = await this.monitor.detect();

            if (this.previousProfile) {
                const deltas = this.findChanges(this.previousProfile, currentProfile);
                if (Object.keys(deltas).length > 0) {
                    this.changes.push({
                        timestamp: new Date(),
                        changes: deltas
                    });
                    this.onDeviceChange(deltas);
                }
            }

            this.previousProfile = currentProfile;
            await new Promise(resolve => setTimeout(resolve, interval));
        }

        return this.changes;
    }

    findChanges(oldProfile, newProfile, path = '') {
        const changes = {};

        for (const key in oldProfile) {
            const currentPath = path ? `${path}.${key}` : key;

            if (typeof oldProfile[key] === 'object' && oldProfile[key] !== null) {
                const nested = this.findChanges(oldProfile[key], newProfile[key] || {}, currentPath);
                Object.assign(changes, nested);
            } else if (oldProfile[key] !== newProfile[key]) {
                changes[currentPath] = {
                    old: oldProfile[key],
                    new: newProfile[key]
                };
            }
        }

        return changes;
    }

    onDeviceChange(changes) {
        console.log('Device changes detected:', changes);
        // Emit event, update UI, log analytics, etc.
    }
}

// Usage
const tracker = new DeviceChangeTracker();
tracker.trackChanges(1000, 30000).then(changes => {
    console.log('Total changes:', changes.length);
});
```

### Monitor Network Conditions

Track network connectivity and quality:

```javascript
const DeviceMonitor = require('hawk-device-detection');

class NetworkMonitor {
    constructor() {
        this.monitor = new DeviceMonitor();
    }

    async monitorNetworkQuality() {
        const profile = await this.monitor.detect();

        return {
            isOnline: navigator.onLine,
            connectionType: this.getConnectionType(profile),
            effectiveType: this.getEffectiveType(),
            bandwidth: this.estimateBandwidth(),
            latency: this.estimateLatency(),
            quality: this.assessQuality()
        };
    }

    getConnectionType(profile) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return connection ? connection.type : 'unknown';
    }

    getEffectiveType() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return connection ? connection.effectiveType : 'unknown';
    }

    estimateBandwidth() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return connection ? connection.downlink : null;
    }

    estimateLatency() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return connection ? connection.rtt : null;
    }

    assessQuality() {
        const effectiveType = this.getEffectiveType();

        if (effectiveType === '4g') return 'Excellent';
        if (effectiveType === '3g') return 'Good';
        if (effectiveType === '2g') return 'Poor';
        return 'Unknown';
    }
}

// Usage
const networkMonitor = new NetworkMonitor();
networkMonitor.monitorNetworkQuality().then(quality => {
    console.log('Network quality:', quality);
});
```

---

## IoT Device Detection

### Detect IoT Platforms

Identify specific IoT platforms and capabilities:

```javascript
const DeviceMonitor = require('hawk-device-detection');
const IoTDetector = require('hawk-device-detection/src/detectors/iot-detector');

class IoTDeviceIdentifier {
    constructor() {
        this.monitor = new DeviceMonitor({
            customDetectors: [new IoTDetector()]
        });
    }

    async identifyIoTDevice() {
        const profile = await this.monitor.detect();

        if (profile.iot && profile.iot.isIoT) {
            return {
                platform: profile.iot.platform,
                deviceClass: profile.iot.deviceClass,
                connectivity: profile.iot.connectivity,
                capabilities: profile.iot.capabilities,
                security: profile.iot.security,
                recommendations: this.getRecommendations(profile.iot)
            };
        }

        return null;
    }

    getRecommendations(iotProfile) {
        const recommendations = [];

        if (iotProfile.platform === 'esp8266') {
            recommendations.push('Use lightweight protocols like MQTT');
            recommendations.push('Implement OTA updates for firmware');
        }

        if (iotProfile.platform === 'raspberrypi') {
            recommendations.push('Leverage GPIO for sensor integration');
            recommendations.push('Consider Docker for containerization');
        }

        if (!iotProfile.security.hasTLS) {
            recommendations.push('Implement TLS for secure communication');
        }

        return recommendations;
    }
}

// Usage
const iotIdentifier = new IoTDeviceIdentifier();
iotIdentifier.identifyIoTDevice().then(iotInfo => {
    if (iotInfo) {
        console.log('IoT Device detected:', iotInfo);
    }
});
```

### Monitor IoT Sensor Data

Collect and analyze sensor data from IoT devices:

```javascript
class IoTSensorMonitor {
    constructor() {
        this.sensorData = [];
        this.thresholds = {
            temperature: { min: 0, max: 50 },
            humidity: { min: 20, max: 80 },
            pressure: { min: 950, max: 1050 }
        };
    }

    async collectSensorData(interval = 1000) {
        return new Promise((resolve) => {
            const timeout = setInterval(() => {
                const data = {
                    timestamp: new Date(),
                    temperature: this.readTemperature(),
                    humidity: this.readHumidity(),
                    pressure: this.readPressure()
                };

                this.sensorData.push(data);
                this.checkThresholds(data);

                if (this.sensorData.length >= 60) {
                    clearInterval(timeout);
                    resolve(this.sensorData);
                }
            }, interval);
        });
    }

    readTemperature() {
        // Read from actual sensor
        return 22 + Math.random() * 5;
    }

    readHumidity() {
        // Read from actual sensor
        return 50 + Math.random() * 20;
    }

    readPressure() {
        // Read from actual sensor
        return 1013 + Math.random() * 10;
    }

    checkThresholds(data) {
        if (data.temperature > this.thresholds.temperature.max) {
            console.warn('Temperature threshold exceeded:', data.temperature);
        }

        if (data.humidity > this.thresholds.humidity.max) {
            console.warn('Humidity threshold exceeded:', data.humidity);
        }
    }

    getAverages() {
        if (this.sensorData.length === 0) return null;

        return {
            avgTemperature: this.sensorData.reduce((sum, d) => sum + d.temperature, 0) / this.sensorData.length,
            avgHumidity: this.sensorData.reduce((sum, d) => sum + d.humidity, 0) / this.sensorData.length,
            avgPressure: this.sensorData.reduce((sum, d) => sum + d.pressure, 0) / this.sensorData.length
        };
    }
}

// Usage
const sensorMonitor = new IoTSensorMonitor();
sensorMonitor.collectSensorData().then(data => {
    console.log('Sensor averages:', sensorMonitor.getAverages());
});
```

---

## Security Analysis

### Comprehensive Security Audit

Perform a full security assessment:

```javascript
const DeviceMonitor = require('hawk-device-detection');
const SecurityDetector = require('hawk-device-detection/src/detectors/security-detector');

class SecurityAuditor {
    constructor() {
        this.monitor = new DeviceMonitor({
            customDetectors: [new SecurityDetector()]
        });
    }

    async auditSecurity() {
        const profile = await this.monitor.detect();

        return {
            threatLevel: profile.security.threatLevel,
            vulnerabilities: this.categorizeVulnerabilities(profile.security.vulnerabilities),
            protections: profile.security.protections,
            recommendations: this.generateSecurityRecommendations(profile.security),
            score: this.calculateSecurityScore(profile.security)
        };
    }

    categorizeVulnerabilities(vulnerabilities) {
        return {
            critical: Object.entries(vulnerabilities)
                .filter(([_, value]) => value)
                .filter(([key]) => ['noHTTPS', 'outdatedBrowser'].includes(key))
                .map(([key]) => key),
            high: Object.entries(vulnerabilities)
                .filter(([_, value]) => value)
                .filter(([key]) => ['weakTLS', 'noCSP'].includes(key))
                .map(([key]) => key),
            medium: Object.entries(vulnerabilities)
                .filter(([_, value]) => value)
                .filter(([key]) => !['noHTTPS', 'outdatedBrowser', 'weakTLS', 'noCSP'].includes(key))
                .map(([key]) => key)
        };
    }

    generateSecurityRecommendations(security) {
        const recommendations = [];

        if (security.vulnerabilities.noHTTPS) {
            recommendations.push({
                priority: 'Critical',
                action: 'Enable HTTPS/TLS encryption',
                impact: 'Protects data in transit'
            });
        }

        if (security.vulnerabilities.outdatedBrowser) {
            recommendations.push({
                priority: 'Critical',
                action: 'Update browser to latest version',
                impact: 'Patches known security vulnerabilities'
            });
        }

        if (!security.protections.csp) {
            recommendations.push({
                priority: 'High',
                action: 'Implement Content Security Policy',
                impact: 'Prevents XSS attacks'
            });
        }

        return recommendations;
    }

    calculateSecurityScore(security) {
        let score = 100;

        Object.values(security.vulnerabilities).forEach(vuln => {
            if (vuln) score -= 10;
        });

        Object.values(security.protections).forEach(prot => {
            if (prot) score += 5;
        });

        return Math.max(0, Math.min(100, score));
    }
}

// Usage
const auditor = new SecurityAuditor();
auditor.auditSecurity().then(audit => {
    console.log('Security Audit:', audit);
});
```

---

## Custom Detectors

### Create Custom Detector

Extend Hawk with custom detection logic:

```javascript
class CustomPlatformDetector {
    canDetect(type) {
        return type === 'customPlatform';
    }

    async detectCustomPlatform() {
        return {
            isCustomPlatform: this.detectCustomPlatform(),
            platformName: this.getPlatformName(),
            features: this.getCustomFeatures(),
            version: this.getVersion()
        };
    }

    detectCustomPlatform() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('myplatform');
    }

    getPlatformName() {
        if (typeof navigator === 'undefined') return 'unknown';
        const ua = navigator.userAgent.toLowerCase();

        if (ua.includes('myplatform-v1')) return 'MyPlatform v1';
        if (ua.includes('myplatform-v2')) return 'MyPlatform v2';

        return 'MyPlatform';
    }

    getCustomFeatures() {
        return {
            hasCustomAPI: typeof window.customAPI !== 'undefined',
            hasNativeModules: typeof window.nativeModules !== 'undefined',
            hasCustomStorage: typeof window.customStorage !== 'undefined'
        };
    }

    getVersion() {
        if (typeof navigator === 'undefined') return null;
        const match = navigator.userAgent.match(/myplatform\/(\d+\.\d+)/i);
        return match ? match[1] : null;
    }
}

// Usage
const DeviceMonitor = require('hawk-device-detection');

const monitor = new DeviceMonitor({
    customDetectors: [new CustomPlatformDetector()]
});

monitor.detect().then(profile => {
    console.log('Custom Platform:', profile.customPlatform);
});
```

---

## Performance Optimization

### Optimize for Low-End Devices

Adapt detection for resource-constrained devices:

```javascript
class OptimizedDeviceMonitor {
    constructor() {
        this.isLowEnd = this.detectLowEndDevice();
        this.monitor = new DeviceMonitor({
            enableCache: true,
            cacheTTL: this.isLowEnd ? 600000 : 300000 // Longer cache for low-end
        });
    }

    detectLowEndDevice() {
        if (typeof navigator === 'undefined') return false;

        const cores = navigator.hardwareConcurrency || 1;
        const memory = navigator.deviceMemory || 4;

        return cores <= 2 || memory <= 2;
    }

    async getOptimizedProfile() {
        if (this.isLowEnd) {
            // Return cached profile for low-end devices
            return await this.monitor.detect();
        } else {
            // Full detection for capable devices
            return await this.monitor.detect();
        }
    }

    async streamlineDetection() {
        const profile = await this.getOptimizedProfile();

        // Return only essential information for low-end devices
        if (this.isLowEnd) {
            return {
                os: profile.os,
                deviceType: profile.deviceType,
                environment: profile.environment
            };
        }

        return profile;
    }
}

// Usage
const optimizedMonitor = new OptimizedDeviceMonitor();
optimizedMonitor.streamlineDetection().then(profile => {
    console.log('Optimized profile:', profile);
});
```

---

## Integration Patterns

### Analytics Integration

Send device data to analytics service:

```javascript
class AnalyticsIntegration {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.monitor = new DeviceMonitor();
        this.queue = [];
    }

    async trackDeviceProfile() {
        const profile = await this.monitor.detect();

        const event = {
            type: 'device_profile',
            timestamp: new Date(),
            data: {
                os: profile.os.name,
                deviceType: profile.deviceType.type,
                architecture: profile.architecture.cpu,
                capabilities: Object.keys(profile.capabilities).filter(k => profile.capabilities[k])
            }
        };

        this.queue.push(event);

        if (this.queue.length >= 10) {
            await this.flush();
        }
    }

    async flush() {
        if (this.queue.length === 0) return;

        try {
            await fetch('https://analytics.example.com/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({ events: this.queue })
            });

            this.queue = [];
        } catch (error) {
            console.error('Analytics flush failed:', error);
        }
    }
}

// Usage
const analytics = new AnalyticsIntegration('your-api-key');
analytics.trackDeviceProfile();
```

---

## Error Handling

### Robust Error Handling

Handle errors gracefully:

```javascript
class RobustDeviceMonitor {
    constructor() {
        this.monitor = new DeviceMonitor({ debugMode: true });
    }

    async detectWithFallback() {
        try {
            return await this.monitor.detect();
        } catch (error) {
            console.error('Detection failed:', error);
            return this.getDefaultProfile();
        }
    }

    getDefaultProfile() {
        return {
            os: { name: 'Unknown', version: null },
            deviceType: { type: 'unknown', isMobile: false, isDesktop: true },
            architecture: { cpu: 'unknown' },
            environment: { runtime: 'unknown', isBrowser: true, isNode: false },
            capabilities: {},
            metadata: { timestamp: new Date().toISOString() }
        };
    }

    async detectWithRetry(maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await this.monitor.detect();
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }
}

// Usage
const robustMonitor = new RobustDeviceMonitor();
robustMonitor.detectWithFallback().then(profile => {
    console.log('Device profile:', profile);
});
```

---

## Advanced Caching

### Custom Caching Strategy

Implement sophisticated caching:

```javascript
class AdvancedCacheManager {
    constructor() {
        this.cache = new Map();
        this.monitor = new DeviceMonitor({ enableCache: false });
    }

    async detectWithCustomCache(key = 'default') {
        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes
                return cached.profile;
            }
        }

        const profile = await this.monitor.detect();
        this.cache.set(key, {
            profile,
            timestamp: Date.now()
        });

        return profile;
    }

    clearCache(key) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    getCacheStats() {
        return {
            entries: this.cache.size,
            keys: Array.from(this.cache.keys()),
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    estimateMemoryUsage() {
        let size = 0;
        for (const [key, value] of this.cache.entries()) {
            size += key.length + JSON.stringify(value).length;
        }
        return `${(size / 1024).toFixed(2)} KB`;
    }
}

// Usage
const cacheManager = new AdvancedCacheManager();
cacheManager.detectWithCustomCache('device1').then(profile => {
    console.log('Profile:', profile);
    console.log('Cache stats:', cacheManager.getCacheStats());
});
```

---

## Summary

These advanced examples demonstrate Hawk's flexibility and power for real-world applications. Combine these patterns to build sophisticated device detection and monitoring systems.

For more information, see [README.md](../README.md) and [ARCHITECTURE.md](../ARCHITECTURE.md).
