/**
 * Hawk Performance Benchmark Suite
 * Measures detection speed, memory usage, and optimization effectiveness
 */

const DeviceMonitor = require('../src/hawk');

// Benchmark utilities
class Benchmark {
    constructor(name) {
        this.name = name;
        this.runs = [];
        this.startTime = null;
        this.startMemory = null;
    }

    start() {
        this.startTime = process.hrtime.bigint();
        this.startMemory = process.memoryUsage();
    }

    end() {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - this.startTime) / 1_000_000; // Convert to milliseconds
        const endMemory = process.memoryUsage();
        
        return {
            duration,
            memoryDelta: {
                heapUsed: endMemory.heapUsed - this.startMemory.heapUsed,
                external: endMemory.external - this.startMemory.external
            }
        };
    }

    addRun(result) {
        this.runs.push(result);
    }

    getStats() {
        const durations = this.runs.map(r => r.duration);
        const sorted = [...durations].sort((a, b) => a - b);
        
        return {
            count: this.runs.length,
            min: Math.min(...durations),
            max: Math.max(...durations),
            avg: durations.reduce((a, b) => a + b, 0) / durations.length,
            median: sorted[Math.floor(sorted.length / 2)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)]
        };
    }

    report() {
        const stats = this.getStats();
        console.log(`\n${this.name}`);
        console.log('─'.repeat(50));
        console.log(`  Runs:    ${stats.count}`);
        console.log(`  Min:     ${stats.min.toFixed(2)}ms`);
        console.log(`  Max:     ${stats.max.toFixed(2)}ms`);
        console.log(`  Avg:     ${stats.avg.toFixed(2)}ms`);
        console.log(`  Median:  ${stats.median.toFixed(2)}ms`);
        console.log(`  P95:     ${stats.p95.toFixed(2)}ms`);
        console.log(`  P99:     ${stats.p99.toFixed(2)}ms`);
        return stats;
    }
}

// ============================================================================
// BENCHMARKS
// ============================================================================

async function runBenchmarks() {
    console.log('═'.repeat(70));
    console.log('HAWK PERFORMANCE BENCHMARKS');
    console.log('═'.repeat(70));

    // Benchmark 1: First Detection (No Cache)
    console.log('\n1. FIRST DETECTION (No Cache)');
    console.log('─'.repeat(70));

    // Warm the runtime so startup/JIT noise does not dominate detector timing.
    await new DeviceMonitor({ enableCache: false }).detect();
    
    const firstDetectionBench = new Benchmark('First Detection');
    for (let i = 0; i < 10; i++) {
        const monitor = new DeviceMonitor({ enableCache: false });
        firstDetectionBench.start();
        await monitor.detect();
        const result = firstDetectionBench.end();
        firstDetectionBench.addRun(result);
    }
    const firstStats = firstDetectionBench.report();

    // Benchmark 2: Cached Detection
    console.log('\n2. CACHED DETECTION');
    console.log('─'.repeat(70));
    
    const monitor = new DeviceMonitor({ enableCache: true });
    await monitor.detect(); // Prime the cache
    
    const cachedBench = new Benchmark('Cached Detection');
    for (let i = 0; i < 100; i++) {
        cachedBench.start();
        await monitor.detect();
        const result = cachedBench.end();
        cachedBench.addRun(result);
    }
    const cachedStats = cachedBench.report();

    // Benchmark 3: Cache Invalidation
    console.log('\n3. CACHE INVALIDATION & REFRESH');
    console.log('─'.repeat(70));
    
    const monitor2 = new DeviceMonitor({
        enableCache: true,
        cacheTTL: 100
    });
    
    const invalidationBench = new Benchmark('Cache Invalidation');
    for (let i = 0; i < 5; i++) {
        invalidationBench.start();
        await monitor2.detect();
        const result = invalidationBench.end();
        invalidationBench.addRun(result);
        
        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    invalidationBench.report();

    // Benchmark 4: Sequential Detections (Cache Enabled)
    console.log('\n4. SEQUENTIAL DETECTIONS (Cache Enabled)');
    console.log('─'.repeat(70));
    
    const monitor3 = new DeviceMonitor({ enableCache: true });
    const sequentialBench = new Benchmark('Sequential Detections');
    
    for (let i = 0; i < 50; i++) {
        sequentialBench.start();
        await monitor3.detect();
        const result = sequentialBench.end();
        sequentialBench.addRun(result);
    }
    const sequentialStats = sequentialBench.report();

    // Benchmark 5: Parallel Detections
    console.log('\n5. PARALLEL DETECTIONS (Cache Enabled)');
    console.log('─'.repeat(70));
    
    const monitor4 = new DeviceMonitor({ enableCache: true });
    const parallelBench = new Benchmark('Parallel Detections');
    
    for (let batch = 0; batch < 5; batch++) {
        parallelBench.start();
        await Promise.all([
            monitor4.detect(),
            monitor4.detect(),
            monitor4.detect(),
            monitor4.detect(),
            monitor4.detect(),
            monitor4.detect(),
            monitor4.detect(),
            monitor4.detect(),
            monitor4.detect(),
            monitor4.detect()
        ]);
        const result = parallelBench.end();
        parallelBench.addRun(result);
    }
    const parallelStats = parallelBench.report();

    // Benchmark 6: Memory Usage
    console.log('\n6. MEMORY USAGE ANALYSIS');
    console.log('─'.repeat(70));
    
    const initialMemory = process.memoryUsage();
    const monitor5 = new DeviceMonitor({ enableCache: true });
    
    for (let i = 0; i < 100; i++) {
        await monitor5.detect();
    }
    
    const finalMemory = process.memoryUsage();
    const memoryDelta = {
        heapUsed: (finalMemory.heapUsed - initialMemory.heapUsed) / 1024,
        heapTotal: (finalMemory.heapTotal - initialMemory.heapTotal) / 1024,
        external: (finalMemory.external - initialMemory.external) / 1024,
        rss: (finalMemory.rss - initialMemory.rss) / 1024
    };
    
    console.log(`  Heap Used Delta:   ${memoryDelta.heapUsed.toFixed(2)} KB`);
    console.log(`  Heap Total Delta:  ${memoryDelta.heapTotal.toFixed(2)} KB`);
    console.log(`  External Delta:    ${memoryDelta.external.toFixed(2)} KB`);
    console.log(`  RSS Delta:         ${memoryDelta.rss.toFixed(2)} KB`);

    // Summary Report
    console.log('\n' + '═'.repeat(70));
    console.log('PERFORMANCE SUMMARY');
    console.log('═'.repeat(70));
    
    console.log('\nDetection Performance:');
    console.log(`  First Detection:      ${firstStats.avg.toFixed(2)}ms avg (${firstStats.p99.toFixed(2)}ms p99)`);
    console.log(`  Cached Detection:     ${cachedStats.avg.toFixed(2)}ms avg (${cachedStats.p99.toFixed(2)}ms p99)`);
    console.log(`  Cache Speedup:        ${(firstStats.avg / cachedStats.avg).toFixed(1)}x faster`);
    
    console.log('\nThroughput:');
    console.log(`  Sequential (cached):  ${(1000 / sequentialStats.avg).toFixed(0)} ops/sec`);
    console.log(`  Parallel (cached):    ${(10000 / parallelStats.avg).toFixed(0)} ops/sec`);
    
    console.log('\nMemory Efficiency:');
    console.log(`  Per Detection:        ${(memoryDelta.heapUsed / 100).toFixed(2)} KB`);
    console.log(`  Total Used:           ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    // Performance Grade
    console.log('\n' + '═'.repeat(70));
    console.log('PERFORMANCE GRADE');
    console.log('═'.repeat(70));
    
    let grade = 'A+';
    if (firstStats.avg > 10) grade = 'A';
    if (firstStats.avg > 20) grade = 'B';
    if (firstStats.avg > 50) grade = 'C';
    if (firstStats.avg > 100) grade = 'D';
    
    console.log(`\nOverall Grade: ${grade}`);
    console.log('\nCriteria:');
    console.log(`  ✓ First detection < 5ms:     ${firstStats.avg < 5 ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Cached detection < 1ms:    ${cachedStats.avg < 1 ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Memory overhead < 5MB:     ${(finalMemory.heapUsed / 1024 / 1024) < 5 ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Cache speedup > 5x:        ${(firstStats.avg / cachedStats.avg) > 5 ? 'PASS' : 'FAIL'}`);

    console.log('\n' + '═'.repeat(70));
}

// Run benchmarks
runBenchmarks().catch(error => {
    console.error('Benchmark error:', error);
    process.exit(1);
});
