/**
 * Hawk Backend - Health Check Endpoint
 * Netlify Function: /health
 * 
 * Simple health check endpoint for monitoring backend availability
 */

exports.handler = async (event, context) => {
  try {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'healthy',
        service: 'Hawk Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      })
    };
  } catch (error) {
    console.error('Health check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'unhealthy',
        error: error.message
      })
    };
  }
};
