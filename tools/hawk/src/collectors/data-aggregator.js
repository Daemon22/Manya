/**
 * Data Aggregator
 * Combines device detection, real-time monitoring, and system metrics
 * into a unified data structure for transmission
 */

const DeviceMonitor = require('../hawk');
const RealtimeMonitor = require('../features/realtime-monitor');
const SystemMetricsCollector = require('./system-metrics');
const crypto = require('crypto');
const os = require('os');

class DataAggregator {
  constructor(options = {}) {
    this.options = {
      deviceId: options.deviceId || this._generateDeviceId(),
      includeDeviceDetection: options.includeDeviceDetection !== false,
      includeSystemMetrics: options.includeSystemMetrics !== false,
      includeRealtimeData: options.includeRealtimeData !== false,
      debugMode: options.debugMode || false
    };

    this.deviceMonitor = new DeviceMonitor({ debugMode: this.options.debugMode });
    this.systemMetricsCollector = new SystemMetricsCollector({ debugMode: this.options.debugMode });
    this.realtimeMonitor = new RealtimeMonitor();
    this.eventLog = [];
  }

  /**
   * Generate a unique device ID based on system information
   */
  _generateDeviceId() {
    try {
      const hostname = os.hostname();
      const platform = os.platform();
      const cpus = os.cpus();
      const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown';

      const hash = crypto
        .createHash('sha256')
        .update(`${hostname}-${platform}-${cpuModel}`)
        .digest('hex');

      return hash.substring(0, 16);
    } catch (error) {
      return crypto.randomBytes(8).toString('hex');
    }
  }

  /**
   * Aggregate all data into a single payload
   */
  async aggregateData() {
    try {
      this._log('Starting data aggregation...');

      const payload = {
        deviceId: this.options.deviceId,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };

      if (this.options.includeDeviceDetection) {
        this._log('Collecting device detection data...');
        const deviceProfile = await this.deviceMonitor.detect();
        payload.deviceProfile = deviceProfile;
      }

      if (this.options.includeSystemMetrics) {
        this._log('Collecting system metrics...');
        const systemMetrics = await this.systemMetricsCollector.collectAll();
        payload.systemMetrics = systemMetrics;
      }

      if (this.options.includeRealtimeData) {
        this._log('Collecting real-time data...');
        payload.realtimeData = {
          status: this.realtimeMonitor.getStatus(),
          events: this.eventLog.slice(-100) // Last 100 events
        };
      }

      this._log('Data aggregation completed:', payload);
      return payload;
    } catch (error) {
      this._log('Error during data aggregation:', error);
      throw new Error(`Data aggregation failed: ${error.message}`);
    }
  }

  /**
   * Start monitoring and collecting real-time events
   */
  startMonitoring() {
    try {
      this._log('Starting real-time monitoring...');

      // Listen for all events and log them
      this.realtimeMonitor.on('network:online', (data) => {
        this._logEvent('network:online', data);
      });

      this.realtimeMonitor.on('network:offline', (data) => {
        this._logEvent('network:offline', data);
      });

      this.realtimeMonitor.on('network:change', (data) => {
        this._logEvent('network:change', data);
      });

      this.realtimeMonitor.on('device:change', (data) => {
        this._logEvent('device:change', data);
      });

      this.realtimeMonitor.on('screen:resize', (data) => {
        this._logEvent('screen:resize', data);
      });

      this.realtimeMonitor.on('orientation:change', (data) => {
        this._logEvent('orientation:change', data);
      });

      this.realtimeMonitor.on('visibility:change', (data) => {
        this._logEvent('visibility:change', data);
      });

      this.realtimeMonitor.start();
    } catch (error) {
      this._log('Error starting monitoring:', error);
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    try {
      this._log('Stopping real-time monitoring...');
      this.realtimeMonitor.stop();
    } catch (error) {
      this._log('Error stopping monitoring:', error);
    }
  }

  /**
   * Log an event
   */
  _logEvent(eventType, data) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      data: data
    };

    this.eventLog.push(event);

    // Keep only the last 1000 events in memory
    if (this.eventLog.length > 1000) {
      this.eventLog.shift();
    }

    this._log(`Event logged: ${eventType}`, event);
  }

  /**
   * Get device ID
   */
  getDeviceId() {
    return this.options.deviceId;
  }

  /**
   * Get event log
   */
  getEventLog(limit = 100) {
    return this.eventLog.slice(-limit);
  }

  /**
   * Clear event log
   */
  clearEventLog() {
    this.eventLog = [];
    this._log('Event log cleared');
  }

  _log(...args) {
    if (this.options.debugMode) console.log('[DataAggregator]', ...args);
  }
}

module.exports = DataAggregator;
