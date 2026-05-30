/**
 * Hawk Backend - Data Ingestion Endpoint
 * Netlify Function: /api/v1/monitor
 * 
 * Receives monitoring data from Hawk Agents, validates it, and stores it
 */

const crypto = require('crypto');

// In-memory storage (in production, use a database)
// This is a simple example; replace with FaunaDB, MongoDB Atlas, or similar
const deviceDataStore = new Map();
const eventLog = [];

/**
 * Validate API key
 */
function validateApiKey(apiKey) {
  // In production, validate against a database of valid API keys
  // For now, we'll accept any non-empty API key
  return apiKey && apiKey.length > 0;
}

/**
 * Validate signature
 */
function validateSignature(payload, signature, apiKey) {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  } catch (error) {
    console.error('Error validating signature:', error);
    return false;
  }
}

/**
 * Store device data
 */
function storeDeviceData(deviceId, data) {
  try {
    if (!deviceDataStore.has(deviceId)) {
      deviceDataStore.set(deviceId, []);
    }

    const deviceData = deviceDataStore.get(deviceId);
    deviceData.push({
      ...data,
      receivedAt: new Date().toISOString()
    });

    // Keep only last 100 records per device (in production, use a database)
    if (deviceData.length > 100) {
      deviceData.shift();
    }

    // Log event
    eventLog.push({
      type: 'data_received',
      deviceId: deviceId,
      timestamp: new Date().toISOString(),
      dataSize: JSON.stringify(data).length
    });

    // Keep only last 1000 events (in production, use a database)
    if (eventLog.length > 1000) {
      eventLog.shift();
    }

    return true;
  } catch (error) {
    console.error('Error storing device data:', error);
    return false;
  }
}

/**
 * Main handler for POST requests
 */
exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract headers
    const apiKey = event.headers['x-api-key'];
    const signature = event.headers['x-signature'];
    const contentType = event.headers['content-type'];

    // Validate content type
    if (!contentType || !contentType.includes('application/json')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Content-Type must be application/json' })
      };
    }

    // Validate API key
    if (!validateApiKey(apiKey)) {
      console.warn('Invalid API key attempt');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: Invalid API key' })
      };
    }

    // Parse request body
    let data;
    try {
      data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    // Validate signature
    if (!validateSignature(event.body, signature, apiKey)) {
      console.warn('Invalid signature for device:', data.deviceId);
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: Invalid signature' })
      };
    }

    // Validate required fields
    if (!data.deviceId || !data.timestamp) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: deviceId, timestamp' })
      };
    }

    // Store device data
    const stored = storeDeviceData(data.deviceId, data);

    if (!stored) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to store device data' })
      };
    }

    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Data received and stored',
        deviceId: data.deviceId,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error in monitor handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

/**
 * Export for testing
 */
exports.storeDeviceData = storeDeviceData;
exports.validateApiKey = validateApiKey;
exports.validateSignature = validateSignature;
exports.getDeviceDataStore = () => deviceDataStore;
exports.getEventLog = () => eventLog;
