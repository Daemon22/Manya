/**
 * Real-Time Device Monitor
 * Continuous monitoring of device state changes and events
 */

class RealtimeMonitor {
    constructor(options = {}) {
        this.options = {
            interval: options.interval || 5000,
            trackChanges: options.trackChanges !== false,
            trackNetworkChanges: options.trackNetworkChanges !== false,
            trackOrientationChanges: options.trackOrientationChanges !== false,
            trackVisibilityChanges: options.trackVisibilityChanges !== false,
            ...options
        };

        this.listeners = new Map();
        this.previousState = null;
        this.isMonitoring = false;
        this.monitoringInterval = null;
    }

    /**
     * Start Real-Time Monitoring
     */
    start() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.setupEventListeners();
        this.startPolling();
    }

    /**
     * Stop Real-Time Monitoring
     */
    stop() {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        this.removeEventListeners();
        this.stopPolling();
    }

    /**
     * Setup Event Listeners
     */
    setupEventListeners() {
        if (this.options.trackNetworkChanges) {
            this.setupNetworkListeners();
        }

        if (this.options.trackOrientationChanges) {
            this.setupOrientationListeners();
        }

        if (this.options.trackVisibilityChanges) {
            this.setupVisibilityListeners();
        }
    }

    /**
     * Network Change Listeners
     */
    setupNetworkListeners() {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', () => this.emit('network:online'));
        window.addEventListener('offline', () => this.emit('network:offline'));

        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            connection.addEventListener('change', () => this.emit('network:change'));
        }
    }

    /**
     * Orientation Change Listeners
     */
    setupOrientationListeners() {
        if (typeof window === 'undefined') return;

        window.addEventListener('orientationchange', () => {
            this.emit('orientation:change', {
                angle: window.orientation,
                type: this.getOrientationType()
            });
        });

        window.addEventListener('resize', () => {
            this.emit('screen:resize', {
                width: window.innerWidth,
                height: window.innerHeight
            });
        });
    }

    /**
     * Visibility Change Listeners
     */
    setupVisibilityListeners() {
        if (typeof document === 'undefined') return;

        document.addEventListener('visibilitychange', () => {
            this.emit('visibility:change', {
                hidden: document.hidden,
                visibilityState: document.visibilityState
            });
        });
    }

    /**
     * Start Polling for Changes
     */
    startPolling() {
        this.monitoringInterval = setInterval(() => {
            this.checkForChanges();
        }, this.options.interval);
    }

    /**
     * Stop Polling
     */
    stopPolling() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * Check for Device Changes
     */
    async checkForChanges() {
        if (!this.options.trackChanges) return;

        const currentState = this.getCurrentState();

        if (this.previousState) {
            const changes = this.findChanges(this.previousState, currentState);

            if (Object.keys(changes).length > 0) {
                this.emit('device:change', changes);
            }
        }

        this.previousState = currentState;
    }

    /**
     * Get Current Device State
     */
    getCurrentState() {
        return {
            timestamp: Date.now(),
            network: this.getNetworkState(),
            screen: this.getScreenState(),
            memory: this.getMemoryState(),
            battery: this.getBatteryState(),
            connection: this.getConnectionState()
        };
    }

    /**
     * Get Network State
     */
    getNetworkState() {
        if (typeof navigator === 'undefined') return null;

        return {
            online: navigator.onLine,
            type: this.getNetworkType(),
            effectiveType: this.getEffectiveType(),
            downlink: this.getDownlink(),
            rtt: this.getRTT(),
            saveData: this.getSaveData()
        };
    }

    /**
     * Get Screen State
     */
    getScreenState() {
        if (typeof window === 'undefined') return null;

        return {
            width: window.innerWidth,
            height: window.innerHeight,
            colorDepth: window.screen.colorDepth,
            pixelDepth: window.screen.pixelDepth,
            orientation: this.getOrientationType(),
            devicePixelRatio: window.devicePixelRatio
        };
    }

    /**
     * Get Memory State
     */
    getMemoryState() {
        if (typeof performance === 'undefined' || !performance.memory) return null;

        return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            percentageUsed: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
        };
    }

    /**
     * Get Battery State
     */
    async getBatteryState() {
        if (typeof navigator === 'undefined' || !navigator.getBattery) return null;

        try {
            const battery = await navigator.getBattery();
            return {
                level: battery.level,
                charging: battery.charging,
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get Connection State
     */
    getConnectionState() {
        if (typeof navigator === 'undefined') return null;

        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        if (!connection) return null;

        return {
            type: connection.type,
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
        };
    }

    /**
     * Helper Methods
     */

    getNetworkType() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return connection ? connection.type : 'unknown';
    }

    getEffectiveType() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return connection ? connection.effectiveType : 'unknown';
    }

    getDownlink() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return connection ? connection.downlink : null;
    }

    getRTT() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return connection ? connection.rtt : null;
    }

    getSaveData() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return connection ? connection.saveData : false;
    }

    getOrientationType() {
        if (typeof window === 'undefined') return 'unknown';

        if (window.screen && window.screen.orientation) {
            return window.screen.orientation.type;
        }

        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    findChanges(oldState, newState, path = '') {
        const changes = {};

        for (const key in oldState) {
            const currentPath = path ? `${path}.${key}` : key;

            if (typeof oldState[key] === 'object' && oldState[key] !== null) {
                const nested = this.findChanges(oldState[key], newState[key] || {}, currentPath);
                Object.assign(changes, nested);
            } else if (oldState[key] !== newState[key]) {
                changes[currentPath] = {
                    old: oldState[key],
                    new: newState[key]
                };
            }
        }

        return changes;
    }

    /**
     * Event Listener Management
     */

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        this.listeners.get(event).push(callback);

        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);

        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    emit(event, data = null) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in listener for ${event}:`, error);
            }
        });
    }

    /**
     * Remove Event Listeners
     */
    removeEventListeners() {
        // Event listeners are automatically cleaned up when removed
        // This is a placeholder for future cleanup logic
    }

    /**
     * Get Monitor Status
     */
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            interval: this.options.interval,
            listeners: Array.from(this.listeners.keys()),
            listenerCount: Array.from(this.listeners.values()).reduce((sum, arr) => sum + arr.length, 0)
        };
    }
}

module.exports = RealtimeMonitor;
