/**
 * Data Sender
 * Securely transmits aggregated data to the Hawk Backend API
 * Implements retry logic, batching, and error handling
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

class DataSender {
  constructor(options = {}) {
    this.options = {
      apiEndpoint: options.apiEndpoint || 'https://hawk-backend.netlify.app/api/v1/monitor',
      apiKey: options.apiKey || process.env.HAWK_API_KEY || null,
      batchSize: options.batchSize || 1,
      batchInterval: options.batchInterval || 60000, // 1 minute
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000, // 5 seconds
      timeout: options.timeout || 30000, // 30 seconds
      debugMode: options.debugMode || false
    };

    if (!this.options.apiKey) {
      throw new Error('API key is required for DataSender');
    }

    this.queue = [];
    this.batchTimer = null;
    this.isProcessing = false;
  }

  /**
   * Queue data for transmission
   */
  queueData(data) {
    try {
      this._log('Queuing data for transmission...');
      this.queue.push(data);

      // Process immediately if batch size is reached
      if (this.queue.length >= this.options.batchSize) {
        this._processBatch();
      } else if (!this.batchTimer) {
        // Set timer to process batch after interval
        this.batchTimer = setTimeout(() => {
          this._processBatch();
        }, this.options.batchInterval);
      }

      return true;
    } catch (error) {
      this._log('Error queuing data:', error);
      return false;
    }
  }

  /**
   * Process queued data and send to backend
   */
  async _processBatch() {
    try {
      if (this.isProcessing || this.queue.length === 0) return;

      this.isProcessing = true;

      // Clear batch timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }

      // Get batch from queue
      const batch = this.queue.splice(0, this.options.batchSize);

      this._log(`Processing batch of ${batch.length} items...`);

      // Send each item in the batch
      for (const data of batch) {
        await this._sendWithRetry(data);
      }

      this.isProcessing = false;

      // Process next batch if queue is not empty
      if (this.queue.length > 0) {
        this._processBatch();
      }
    } catch (error) {
      this._log('Error processing batch:', error);
      this.isProcessing = false;
    }
  }

  /**
   * Send data with retry logic
   */
  async _sendWithRetry(data, attempt = 0) {
    try {
      await this._send(data);
      this._log(`Data sent successfully on attempt ${attempt + 1}`);
      return true;
    } catch (error) {
      if (attempt < this.options.maxRetries) {
        this._log(`Send failed (attempt ${attempt + 1}), retrying in ${this.options.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
        return this._sendWithRetry(data, attempt + 1);
      } else {
        this._log(`Failed to send data after ${this.options.maxRetries} attempts:`, error);
        return false;
      }
    }
  }

  /**
   * Send data to backend API
   */
  _send(data) {
    return new Promise((resolve, reject) => {
      try {
        const payload = JSON.stringify(data);
        const signature = this._generateSignature(payload);

        const url = new URL(this.options.apiEndpoint);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'X-API-Key': this.options.apiKey,
            'X-Signature': signature,
            'User-Agent': 'Hawk-Agent/1.0.0'
          },
          timeout: this.options.timeout
        };

        this._log('Sending data to:', this.options.apiEndpoint);

        const request = client.request(options, (response) => {
          let responseData = '';

          response.on('data', (chunk) => {
            responseData += chunk;
          });

          response.on('end', () => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
              this._log(`Data sent successfully. Status: ${response.statusCode}`);
              resolve({ statusCode: response.statusCode, data: responseData });
            } else {
              reject(new Error(`HTTP ${response.statusCode}: ${responseData}`));
            }
          });
        });

        request.on('error', (error) => {
          reject(new Error(`Request error: ${error.message}`));
        });

        request.on('timeout', () => {
          request.destroy();
          reject(new Error('Request timeout'));
        });

        request.write(payload);
        request.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate HMAC signature for data integrity
   */
  _generateSignature(payload) {
    try {
      return crypto
        .createHmac('sha256', this.options.apiKey)
        .update(payload)
        .digest('hex');
    } catch (error) {
      this._log('Error generating signature:', error);
      return '';
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      apiEndpoint: this.options.apiEndpoint,
      maxRetries: this.options.maxRetries
    };
  }

  /**
   * Flush all queued data immediately
   */
  async flush() {
    try {
      this._log('Flushing all queued data...');

      while (this.queue.length > 0) {
        await this._processBatch();
      }

      this._log('All data flushed');
      return true;
    } catch (error) {
      this._log('Error flushing data:', error);
      return false;
    }
  }

  /**
   * Clear queue without sending
   */
  clearQueue() {
    this.queue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this._log('Queue cleared');
  }

  _log(...args) {
    if (this.options.debugMode) console.log('[DataSender]', ...args);
  }
}

module.exports = DataSender;
