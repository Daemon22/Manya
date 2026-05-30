/**
 * Hawk Backend - Data Retrieval Endpoint
 * Netlify Function: /api/v1/data
 * 
 * Retrieves monitoring data for authorized clients
 * Supports filtering by device ID, time range, and metric type
 */

const crypto = require('crypto');

// Reference to the monitor function's data store
// In production, both functions would share a database
let deviceDataStore = new Map();
let eventLog = [];

/**
 * Set the data store (called from monitor function)
 */
function setDataStore(store, log) {
  deviceDataStore = store;
  eventLog = log;
}

/**
 * Validate API key
 */
function validateApiKey(apiKey) {
  return apiKey && apiKey.length > 0;
}

/**
 * Filter data by time range
 */
function filterByTimeRange(data, startTime, endTime) {
  return data.filter(item => {
    const itemTime = new Date(item.timestamp).getTime();
    const start = startTime ? new Date(startTime).getTime() : 0;
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    return itemTime >= start && itemTime <= end;
  });
}

/**
 * Get device data
 */
function getDeviceData(deviceId, options = {}) {
  try {
    if (!deviceDataStore.has(deviceId)) {
      return null;
    }

    let data = deviceDataStore.get(deviceId);

    // Filter by time range if provided
    if (options.startTime || options.endTime) {
      data = filterByTimeRange(data, options.startTime, options.endTime);
    }

    // Limit results
    const limit = Math.min(options.limit || 100, 1000);
    data = data.slice(-limit);

    return {
      deviceId: deviceId,
      recordCount: data.length,
      data: data
    };
  } catch (error) {
    console.error('Error retrieving device data:', error);
    return null;
  }
}

/**
 * Get all devices
 */
function getAllDevices() {
  try {
    const devices = [];

    for (const [deviceId, data] of deviceDataStore.entries()) {
      if (data.length > 0) {
        devices.push({
          deviceId: deviceId,
          lastUpdate: data[data.length - 1].timestamp,
          recordCount: data.length,
          latestData: data[data.length - 1]
        });
      }
    }

    return devices;
  } catch (error) {
    console.error('Error retrieving all devices:', error);
    return [];
  }
}

/**
 * Get device summary
 */
function getDeviceSummary(deviceId) {
  try {
    if (!deviceDataStore.has(deviceId)) {
      return null;
    }

    const data = deviceDataStore.get(deviceId);
    if (data.length === 0) {
      return null;
    }

    const latestData = data[data.length - 1];
    const firstData = data[0];

    return {
      deviceId: deviceId,
      firstSeen: firstData.timestamp,
      lastSeen: latestData.timestamp,
      recordCount: data.length,
      os: latestData.deviceProfile?.os,
      deviceType: latestData.deviceProfile?.deviceType,
      environment: latestData.deviceProfile?.environment,
      latestMetrics: {
        cpu: latestData.systemMetrics?.cpuUsage,
        memory: latestData.systemMetrics?.memoryUsage,
        systemLoad: latestData.systemMetrics?.systemLoad
      }
    };
  } catch (error) {
    console.error('Error getting device summary:', error);
    return null;
  }
}

/**
 * Main handler for GET requests
 */
exports.handler = async (event, context) => {
  // Only accept GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract headers and query parameters
    const apiKey = event.headers['x-api-key'];
    const queryParams = event.queryStringParameters || {};

    // Validate API key
    if (!validateApiKey(apiKey)) {
      console.warn('Invalid API key attempt for data retrieval');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: Invalid API key' })
      };
    }

    // Parse query parameters
    const deviceId = queryParams.deviceId;
    const action = queryParams.action || 'get';
    const startTime = queryParams.startTime;
    const endTime = queryParams.endTime;
    const limit = parseInt(queryParams.limit) || 100;

    let result;

    switch (action) {
      case 'list':
        // List all devices
        result = {
          action: 'list',
          devices: getAllDevices()
        };
        break;

      case 'summary':
        // Get device summary
        if (!deviceId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'deviceId is required for summary action' })
          };
        }
        result = getDeviceSummary(deviceId);
        if (!result) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Device not found' })
          };
        }
        break;

      case 'get':
      default:
        // Get device data
        if (!deviceId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'deviceId is required' })
          };
        }
        result = getDeviceData(deviceId, { startTime, endTime, limit });
        if (!result) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Device not found' })
          };
        }
        break;
    }

    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        data: result
      })
    };
  } catch (error) {
    console.error('Error in data handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

/**
 * Export for testing
 */
exports.getDeviceData = getDeviceData;
exports.getAllDevices = getAllDevices;
exports.getDeviceSummary = getDeviceSummary;
exports.validateApiKey = validateApiKey;
exports.setDataStore = setDataStore;
