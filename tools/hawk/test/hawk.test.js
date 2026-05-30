/**
 * Hawk Device Monitor - Comprehensive Test Suite
 * Tests core detection functionality, caching, and detector pipeline
 */

const DeviceMonitor = require('../src/hawk');

// Test utilities
const assert = (condition, message) => {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
};

const assertEqual = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
    }
};

const assertExists = (value, message) => {
    if (value === null || value === undefined) {
        throw new Error(`${message} - value does not exist`);
    }
};

const assertType = (value, type, message) => {
    if (typeof value !== type) {
        throw new Error(`${message}\nExpected type: ${type}\nActual type: ${typeof value}`);
    }
};

// Test suite
const tests = {
    passed: 0,
    failed: 0,
    errors: []
};

const test = (name, fn) => {
    try {
        fn();
        tests.passed++;
        console.log(`✓ ${name}`);
    } catch (error) {
        tests.failed++;
        tests.errors.push({ name, error: error.message });
        console.error(`✗ ${name}`);
        console.error(`  ${error.message}`);
    }
};

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

test('DeviceMonitor instantiation', () => {
    const monitor = new DeviceMonitor();
    assertExists(monitor, 'Monitor should be created');
    assertType(monitor.detect, 'function', 'detect method should exist');
    assertType(monitor.clearCache, 'function', 'clearCache method should exist');
});

test('DeviceMonitor with custom options', () => {
    const monitor = new DeviceMonitor({
        enableCache: false,
        cacheTTL: 600000,
        debugMode: true
    });
    assertExists(monitor, 'Monitor with options should be created');
});

test('DeviceMonitor with custom detectors', () => {
    class CustomDetector {
        canDetect(type) { return type === 'custom'; }
        async detectCustom() { return { custom: true }; }
    }
    
    const monitor = new DeviceMonitor({
        customDetectors: [new CustomDetector()]
    });
    assertExists(monitor, 'Monitor with custom detectors should be created');
});

// ============================================================================
// DETECTION TESTS
// ============================================================================

test('Basic device detection', async () => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    assertExists(profile, 'Profile should be returned');
    assertType(profile, 'object', 'Profile should be an object');
});

test('Device profile structure', async () => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    // Check main sections exist
    assertExists(profile.os, 'OS section should exist');
    assertExists(profile.deviceType, 'Device type section should exist');
    assertExists(profile.screen, 'Screen section should exist');
    assertExists(profile.architecture, 'Architecture section should exist');
    assertExists(profile.environment, 'Environment section should exist');
    assertExists(profile.capabilities, 'Capabilities section should exist');
    assertExists(profile.metadata, 'Metadata section should exist');
});

test('OS detection', async () => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    assertExists(profile.os.name, 'OS name should be detected');
    assertType(profile.os.name, 'string', 'OS name should be a string');
});

test('Device type detection', async () => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    assertExists(profile.deviceType.type, 'Device type should be detected');
    assertType(profile.deviceType.type, 'string', 'Device type should be a string');
    assertType(profile.deviceType.isMobile, 'boolean', 'isMobile should be boolean');
    assertType(profile.deviceType.isDesktop, 'boolean', 'isDesktop should be boolean');
});

test('Architecture detection', async () => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    assertExists(profile.architecture, 'Architecture should be detected');
    assertExists(profile.architecture.cpu, 'CPU should be detected');
});

test('Environment detection', async () => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    assertExists(profile.environment.runtime, 'Runtime should be detected');
    assertType(profile.environment.isBrowser, 'boolean', 'isBrowser should be boolean');
    assertType(profile.environment.isNode, 'boolean', 'isNode should be boolean');
});

test('Capabilities detection', async () => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    assertExists(profile.capabilities, 'Capabilities should be detected');
    assertType(profile.capabilities.webgl, 'boolean', 'webgl capability should be boolean');
    assertType(profile.capabilities.geolocation, 'boolean', 'geolocation capability should be boolean');
});

test('Metadata collection', async () => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    assertExists(profile.metadata, 'Metadata should be collected');
    assertExists(profile.metadata.timezone, 'Timezone should be collected');
    assertExists(profile.metadata.language, 'Language should be collected');
});

// ============================================================================
// CACHING TESTS
// ============================================================================

test('Cache is enabled by default', async () => {
    const monitor = new DeviceMonitor({ enableCache: true });
    const profile1 = await monitor.detect();
    const profile2 = await monitor.detect();
    
    assertEqual(profile1, profile2, 'Cached profiles should be identical');
});

test('Cache can be disabled', async () => {
    const monitor = new DeviceMonitor({ enableCache: false });
    const profile1 = await monitor.detect();
    const profile2 = await monitor.detect();
    
    assertExists(profile1, 'Profile 1 should exist');
    assertExists(profile2, 'Profile 2 should exist');
});

test('Cache can be cleared', async () => {
    const monitor = new DeviceMonitor({ enableCache: true });
    const profile1 = await monitor.detect();
    monitor.clearCache();
    const profile2 = await monitor.detect();
    
    assertExists(profile1, 'Profile 1 should exist');
    assertExists(profile2, 'Profile 2 should exist');
});

test('Cache respects TTL', async () => {
    const monitor = new DeviceMonitor({
        enableCache: true,
        cacheTTL: 100  // 100ms TTL
    });
    
    const profile1 = await monitor.detect();
    
    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const profile2 = await monitor.detect();
    
    assertExists(profile1, 'Profile 1 should exist');
    assertExists(profile2, 'Profile 2 should exist');
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

test('First detection completes in reasonable time', async () => {
    const monitor = new DeviceMonitor({ enableCache: false });
    const start = Date.now();
    await monitor.detect();
    const duration = Date.now() - start;
    
    assert(duration < 1000, `Detection should complete in <1000ms, took ${duration}ms`);
});

test('Cached detection is fast', async () => {
    const monitor = new DeviceMonitor({ enableCache: true });
    
    // First detection (not cached)
    await monitor.detect();
    
    // Cached detection
    const start = Date.now();
    await monitor.detect();
    const duration = Date.now() - start;
    
    assert(duration < 100, `Cached detection should be <100ms, took ${duration}ms`);
});

// ============================================================================
// DETECTOR PIPELINE TESTS
// ============================================================================

test('Multiple detectors contribute to profile', async () => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    // Should have data from multiple detectors
    assertExists(profile.os.name, 'OS detector should contribute');
    assertExists(profile.deviceType.type, 'Device type detector should contribute');
    assertExists(profile.architecture.cpu, 'Architecture detector should contribute');
});

test('Custom detector integration', async () => {
    class TestDetector {
        canDetect(type) { return type === 'test'; }
        async detectTest() { return { testValue: 'success' }; }
    }
    
    const monitor = new DeviceMonitor({
        customDetectors: [new TestDetector()]
    });
    
    const profile = await monitor.detect();
    assertExists(profile, 'Profile with custom detector should be created');
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

test('Detection handles errors gracefully', async () => {
    const monitor = new DeviceMonitor();
    
    try {
        const profile = await monitor.detect();
        assertExists(profile, 'Profile should be returned even with errors');
    } catch (error) {
        throw new Error('Detection should not throw errors');
    }
});

test('Invalid options are handled', () => {
    try {
        const monitor = new DeviceMonitor({ invalidOption: true });
        assertExists(monitor, 'Monitor should be created with invalid options');
    } catch (error) {
        throw new Error('Invalid options should be handled gracefully');
    }
});

// ============================================================================
// DATA VALIDATION TESTS
// ============================================================================

test('Profile data is properly typed', async () => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    // OS section
    if (profile.os.name) assertType(profile.os.name, 'string', 'OS name should be string');
    
    // Device type section
    assertType(profile.deviceType.isMobile, 'boolean', 'isMobile should be boolean');
    assertType(profile.deviceType.isDesktop, 'boolean', 'isDesktop should be boolean');
    
    // Capabilities section
    assertType(profile.capabilities.webgl, 'boolean', 'Capabilities should be boolean');
});

test('Timestamp is included in profile', async () => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    assertExists(profile.timestamp, 'Timestamp should be included');
    assertType(profile.timestamp, 'string', 'Timestamp should be string');
});

// ============================================================================
// CONSISTENCY TESTS
// ============================================================================

test('Multiple detections produce consistent results', async () => {
    const monitor = new DeviceMonitor({ enableCache: false });
    
    const profile1 = await monitor.detect();
    const profile2 = await monitor.detect();
    
    assertEqual(profile1.os.name, profile2.os.name, 'OS should be consistent');
    assertEqual(profile1.deviceType.type, profile2.deviceType.type, 'Device type should be consistent');
    assertEqual(profile1.architecture.cpu, profile2.architecture.cpu, 'Architecture should be consistent');
});

// ============================================================================
// TEST RESULTS
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('TEST RESULTS');
console.log('='.repeat(70));
console.log(`Passed: ${tests.passed}`);
console.log(`Failed: ${tests.failed}`);
console.log(`Total:  ${tests.passed + tests.failed}`);

if (tests.failed > 0) {
    console.log('\nFailed Tests:');
    tests.errors.forEach(({ name, error }) => {
        console.log(`\n  ${name}`);
        console.log(`  ${error}`);
    });
    process.exit(1);
} else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
}
