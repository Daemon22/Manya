/**
 * Performance Optimizer
 * Advanced optimization strategies for device detection
 */

class PerformanceOptimizer {
    constructor(options = {}) {
        this.options = {
            enableLazyDetection: options.enableLazyDetection !== false,
            enableParallelDetection: options.enableParallelDetection !== false,
            enableMemoryOptimization: options.enableMemoryOptimization !== false,
            enableCPUOptimization: options.enableCPUOptimization !== false,
            ...options
        };

        this.metrics = {
            detectionTime: [],
            memoryUsage: [],
            cacheHits: 0,
            cacheMisses: 0
        };
    }

    /**
     * Lazy Detection Strategy
     * Detect only what's needed, defer expensive operations
     */
    async lazyDetect(detectors, priority = 'speed') {
        if (!this.options.enableLazyDetection) {
            return this.runAllDetectors(detectors);
        }

        const startTime = performance.now();

        // Sort detectors by priority
        const sorted = this.sortDetectorsByPriority(detectors, priority);

        // Run high-priority detectors first
        const results = {};

        for (const detector of sorted) {
            if (detector.priority === 'high') {
                results[detector.name] = await this.runDetector(detector);
            }
        }

        // Defer medium and low priority
        if (priority === 'speed') {
            setImmediate(() => {
                sorted.forEach(detector => {
                    if (detector.priority !== 'high') {
                        this.runDetector(detector).then(result => {
                            results[detector.name] = result;
                        });
                    }
                });
            });
        } else {
            for (const detector of sorted) {
                if (detector.priority !== 'high') {
                    results[detector.name] = await this.runDetector(detector);
                }
            }
        }

        const duration = performance.now() - startTime;
        this.metrics.detectionTime.push(duration);

        return results;
    }

    /**
     * Parallel Detection Strategy
     * Run multiple detectors in parallel
     */
    async parallelDetect(detectors) {
        if (!this.options.enableParallelDetection) {
            return this.runAllDetectors(detectors);
        }

        const startTime = performance.now();

        // Group detectors by dependency
        const groups = this.groupDetectorsByDependency(detectors);

        const results = {};

        for (const group of groups) {
            const promises = group.map(detector =>
                this.runDetector(detector).then(result => {
                    results[detector.name] = result;
                })
            );

            await Promise.all(promises);
        }

        const duration = performance.now() - startTime;
        this.metrics.detectionTime.push(duration);

        return results;
    }

    /**
     * Memory Optimization Strategy
     * Minimize memory footprint during detection
     */
    async optimizedDetect(detectors) {
        if (!this.options.enableMemoryOptimization) {
            return this.runAllDetectors(detectors);
        }

        const initialMemory = this.getMemoryUsage();
        const results = {};

        for (const detector of detectors) {
            const result = await this.runDetector(detector);
            results[detector.name] = result;

            // Clean up intermediate data
            this.cleanupMemory();
        }

        const finalMemory = this.getMemoryUsage();
        this.metrics.memoryUsage.push(finalMemory - initialMemory);

        return results;
    }

    /**
     * CPU Optimization Strategy
     * Reduce CPU usage during detection
     */
    async cpuOptimizedDetect(detectors) {
        if (!this.options.enableCPUOptimization) {
            return this.runAllDetectors(detectors);
        }

        const results = {};

        for (const detector of detectors) {
            // Throttle CPU-intensive operations
            await this.throttle(100);

            const result = await this.runDetector(detector);
            results[detector.name] = result;
        }

        return results;
    }

    /**
     * Adaptive Detection Strategy
     * Adjust detection based on device capabilities
     */
    async adaptiveDetect(detectors, deviceCapabilities) {
        const results = {};

        for (const detector of detectors) {
            // Skip detectors not supported on this device
            if (!this.isDetectorSupported(detector, deviceCapabilities)) {
                results[detector.name] = this.getDefaultResult(detector);
                continue;
            }

            // Use optimized path for low-end devices
            if (deviceCapabilities.isLowEnd) {
                results[detector.name] = await this.runDetectorOptimized(detector);
            } else {
                results[detector.name] = await this.runDetector(detector);
            }
        }

        return results;
    }

    /**
     * Helper Methods
     */

    async runAllDetectors(detectors) {
        const results = {};

        for (const detector of detectors) {
            results[detector.name] = await this.runDetector(detector);
        }

        return results;
    }

    async runDetector(detector) {
        try {
            return await detector.detect();
        } catch (error) {
            console.error(`Detector ${detector.name} failed:`, error);
            return null;
        }
    }

    async runDetectorOptimized(detector) {
        // Run detector with reduced overhead
        try {
            if (detector.detectOptimized) {
                return await detector.detectOptimized();
            }
            return await detector.detect();
        } catch (error) {
            return null;
        }
    }

    sortDetectorsByPriority(detectors, priority) {
        const priorityMap = {
            speed: { high: 0, medium: 1, low: 2 },
            accuracy: { high: 0, medium: 1, low: 2 },
            balanced: { high: 0, medium: 1, low: 2 }
        };

        return [...detectors].sort((a, b) => {
            const aPriority = priorityMap[priority][a.priority] || 2;
            const bPriority = priorityMap[priority][b.priority] || 2;
            return aPriority - bPriority;
        });
    }

    groupDetectorsByDependency(detectors) {
        const groups = [];
        const processed = new Set();

        for (const detector of detectors) {
            if (processed.has(detector.name)) continue;

            const group = [detector];
            processed.add(detector.name);

            // Find detectors that depend on this one
            for (const other of detectors) {
                if (!processed.has(other.name) && other.dependsOn?.includes(detector.name)) {
                    group.push(other);
                    processed.add(other.name);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    getMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    cleanupMemory() {
        // Trigger garbage collection if available
        if (typeof gc !== 'undefined') {
            gc();
        }
    }

    async throttle(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isDetectorSupported(detector, capabilities) {
        if (!detector.requires) return true;

        return detector.requires.every(requirement => {
            return capabilities[requirement] !== false;
        });
    }

    getDefaultResult(detector) {
        return {
            supported: false,
            reason: `${detector.name || 'Detector'} is not supported on this device`
        };
    }

    /**
     * Metrics and Reporting
     */

    getMetrics() {
        return {
            averageDetectionTime: this.getAverageDetectionTime(),
            averageMemoryUsage: this.getAverageMemoryUsage(),
            cacheHitRate: this.getCacheHitRate(),
            totalDetections: this.metrics.detectionTime.length
        };
    }

    getAverageDetectionTime() {
        if (this.metrics.detectionTime.length === 0) return 0;

        const sum = this.metrics.detectionTime.reduce((a, b) => a + b, 0);
        return sum / this.metrics.detectionTime.length;
    }

    getAverageMemoryUsage() {
        if (this.metrics.memoryUsage.length === 0) return 0;

        const sum = this.metrics.memoryUsage.reduce((a, b) => a + b, 0);
        return sum / this.metrics.memoryUsage.length;
    }

    getCacheHitRate() {
        const total = this.metrics.cacheHits + this.metrics.cacheMisses;
        if (total === 0) return 0;

        return (this.metrics.cacheHits / total) * 100;
    }

    recordCacheHit() {
        this.metrics.cacheHits++;
    }

    recordCacheMiss() {
        this.metrics.cacheMisses++;
    }

    resetMetrics() {
        this.metrics = {
            detectionTime: [],
            memoryUsage: [],
            cacheHits: 0,
            cacheMisses: 0
        };
    }
}

module.exports = PerformanceOptimizer;
