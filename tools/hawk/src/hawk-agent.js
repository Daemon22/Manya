/**
 * Hawk Agent
 * Main orchestrator for the autonomous device monitoring system
 * Manages device detection, metrics collection, real-time monitoring, and data transmission
 */

const DataAggregator = require('./collectors/data-aggregator');
const DataSender = require('./collectors/data-sender');
const fs = require('fs');
const path = require('path');

class HawkAgent {
  constructor(options = {}) {
    this.options = {
      apiEndpoint: options.apiEndpoint || process.env.HAWK_API_ENDPOINT || 'https://hawk-backend.netlify.app/api/v1/monitor',
      apiKey: options.apiKey || process.env.HAWK_API_KEY || null,
      deviceId: options.deviceId || null,
      collectionInterval: options.collectionInterval || 300000, // 5 minutes
      autoStart: options.autoStart !== false,
      debugMode: options.debugMode || false,
      configFile: options.configFile || path.join(process.env.HOME || '.', '.hawk', 'config.json')
    };

    if (!this.options.apiKey) {
      throw new Error('API key is required. Set HAWK_API_KEY environment variable or pass apiKey option.');
    }

    this.dataAggregator = new DataAggregator({
      deviceId: this.options.deviceId,
      debugMode: this.options.debugMode
    });

    this.dataSender = new DataSender({
      apiEndpoint: this.options.apiEndpoint,
      apiKey: this.options.apiKey,
      debugMode: this.options.debugMode
    });

    this.isRunning = false;
    this.collectionTimer = null;
    this.config = this._loadConfig();

    if (this.options.autoStart) {
      this.start();
    }
  }

  /**
   * Start the Hawk Agent
   */
  start() {
    try {
      if (this.isRunning) {
        this._log('Hawk Agent is already running');
        return;
      }

      this._log('Starting Hawk Agent...');
      this.isRunning = true;

      // Start real-time monitoring
      this.dataAggregator.startMonitoring();

      // Initial data collection
      this._collectAndSend();

      // Set up periodic collection
      this.collectionTimer = setInterval(() => {
        this._collectAndSend();
      }, this.options.collectionInterval);

      this._log('Hawk Agent started successfully');
      this._saveConfig();
    } catch (error) {
      this._log('Error starting Hawk Agent:', error);
      this.isRunning = false;
    }
  }

  /**
   * Stop the Hawk Agent
   */
  async stop() {
    try {
      this._log('Stopping Hawk Agent...');
      this.isRunning = false;

      // Clear collection timer
      if (this.collectionTimer) {
        clearInterval(this.collectionTimer);
        this.collectionTimer = null;
      }

      // Stop real-time monitoring
      this.dataAggregator.stopMonitoring();

      // Flush any remaining data
      await this.dataSender.flush();

      this._log('Hawk Agent stopped');
    } catch (error) {
      this._log('Error stopping Hawk Agent:', error);
    }
  }

  /**
   * Collect data and send to backend
   */
  async _collectAndSend() {
    try {
      this._log('Collecting and sending data...');

      // Aggregate all data
      const aggregatedData = await this.dataAggregator.aggregateData();

      // Queue for transmission
      this.dataSender.queueData(aggregatedData);

      this._log('Data queued for transmission');
    } catch (error) {
      this._log('Error during collection and send:', error);
    }
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      deviceId: this.dataAggregator.getDeviceId(),
      collectionInterval: this.options.collectionInterval,
      senderStatus: this.dataSender.getStatus(),
      eventLogSize: this.dataAggregator.getEventLog().length
    };
  }

  /**
   * Get event log
   */
  getEventLog(limit = 100) {
    return this.dataAggregator.getEventLog(limit);
  }

  /**
   * Load configuration from file
   */
  _loadConfig() {
    try {
      if (fs.existsSync(this.options.configFile)) {
        const configData = fs.readFileSync(this.options.configFile, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      this._log('Error loading config:', error);
    }

    return {
      createdAt: new Date().toISOString(),
      deviceId: this.dataAggregator.getDeviceId()
    };
  }

  /**
   * Save configuration to file
   */
  _saveConfig() {
    try {
      const configDir = path.dirname(this.options.configFile);

      // Create config directory if it doesn't exist
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Update config with current status
      this.config.lastUpdated = new Date().toISOString();
      this.config.deviceId = this.dataAggregator.getDeviceId();
      this.config.isRunning = this.isRunning;

      fs.writeFileSync(this.options.configFile, JSON.stringify(this.config, null, 2), 'utf8');
      this._log('Config saved');
    } catch (error) {
      this._log('Error saving config:', error);
    }
  }

  /**
   * Manually trigger data collection
   */
  async collectNow() {
    try {
      this._log('Manual data collection triggered');
      await this._collectAndSend();
      return true;
    } catch (error) {
      this._log('Error during manual collection:', error);
      return false;
    }
  }

  /**
   * Flush all queued data immediately
   */
  async flushData() {
    try {
      this._log('Flushing all queued data');
      return await this.dataSender.flush();
    } catch (error) {
      this._log('Error flushing data:', error);
      return false;
    }
  }

  _log(...args) {
    if (this.options.debugMode) console.log('[HawkAgent]', ...args);
  }
}

module.exports = HawkAgent;
