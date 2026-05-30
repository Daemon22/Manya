# 🦅 Hawk - Autonomous Device Monitoring System

## Overview

Hawk is a revolutionary autonomous device monitoring system designed for zero-configuration installation and deployment. Once installed on a device, Hawk **instantly** begins scanning and monitoring everything about that device according to its capabilities and functions. The system is deployed as a serverless API on Netlify, making it highly scalable and easy to manage.

## Key Features

- **🚀 Zero-Configuration Installation**: One-command installation that works across Linux, macOS, and Windows
- **🔍 Comprehensive Device Detection**: Detects OS, device type, screen info, architecture, environment, and capabilities
- **📊 Real-Time Monitoring**: Continuously monitors CPU, memory, disk, network, and running processes
- **🌐 Serverless Backend**: Deployed on Netlify Functions for scalability and reliability
- **📈 Dashboard**: Web-based dashboard for visualizing collected data
- **🔐 Secure**: HMAC-SHA256 signature validation for data integrity
- **⚡ Autonomous**: Runs as a background service with automatic data collection and transmission
- **🛠️ Extensible**: Modular architecture for easy capability expansion

## Architecture

### Components

1. **Hawk Agent (Device-side)**
   - Autonomous monitoring daemon
   - Device detection and metrics collection
   - Real-time event tracking
   - Secure data transmission

2. **Hawk Backend (Netlify Functions)**
   - Data ingestion endpoint (`/api/v1/monitor`)
   - Data retrieval API (`/api/v1/data`)
   - Health check endpoint (`/health`)

3. **Hawk Dashboard**
   - Real-time device status visualization
   - Historical data analysis
   - API documentation

## Installation

### Prerequisites

- Node.js 14.0.0 or higher
- npm or yarn
- An API key (provided by your Hawk deployment)

### Quick Start

```bash
# Set your API key
export HAWK_API_KEY="your-api-key-here"

# Install Hawk Agent
npm install -g hawk-device-detection
npx hawk-install

# The agent will start automatically and begin monitoring
```

### Platform-Specific Installation

#### Linux (systemd)
```bash
export HAWK_API_KEY="your-api-key-here"
npx hawk-install
sudo systemctl status hawk-agent.service
```

#### macOS (LaunchAgent)
```bash
export HAWK_API_KEY="your-api-key-here"
npx hawk-install
launchctl list | grep hawk
```

#### Windows (Task Scheduler)
```powershell
$env:HAWK_API_KEY="your-api-key-here"
npx hawk-install
```

## Configuration

### Environment Variables

```bash
# Required
HAWK_API_KEY=your-api-key

# Optional
HAWK_API_ENDPOINT=https://hawk-backend.netlify.app/api/v1/monitor
HAWK_DEBUG=true  # Enable debug logging
```

### Configuration File

After installation, configuration is stored at:
- Linux/macOS: `~/.hawk/config.json`
- Windows: `%USERPROFILE%\.hawk\config.json`

## Usage

### Starting the Agent

```bash
# Automatic (installed as service)
# Linux
sudo systemctl start hawk-agent.service

# macOS
launchctl start com.hawk.agent

# Manual
npx hawk-agent
```

### Stopping the Agent

```bash
# Linux
sudo systemctl stop hawk-agent.service

# macOS
launchctl stop com.hawk.agent

# Manual
# Press Ctrl+C
```

### Checking Status

```bash
# Linux
sudo systemctl status hawk-agent.service

# macOS
launchctl list | grep hawk

# View logs
tail -f ~/.hawk/logs/hawk.log
```

## API Documentation

### Data Ingestion Endpoint

**POST** `/api/v1/monitor`

Sends device monitoring data from Hawk Agent.

**Headers:**
- `X-API-Key`: Your API key
- `X-Signature`: HMAC-SHA256 signature of the request body
- `Content-Type: application/json`

**Request Body:**
```json
{
  "deviceId": "unique-device-id",
  "timestamp": "2026-05-30T10:30:00Z",
  "deviceProfile": {
    "os": { "name": "Linux", "version": "5.15.0" },
    "deviceType": { "type": "desktop" },
    "architecture": { "cpu": "x64", "bits": 64 }
  },
  "systemMetrics": {
    "cpuUsage": 15.5,
    "memoryUsage": { "total": 16777216000, "used": 8388608000 },
    "diskUsage": [{ "path": "/", "total": 500000000000, "used": 250000000000 }]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data received and stored",
  "deviceId": "unique-device-id",
  "timestamp": "2026-05-30T10:30:00Z"
}
```

### Data Retrieval Endpoint

**GET** `/api/v1/data`

Retrieves monitoring data for authorized clients.

**Headers:**
- `X-API-Key`: Your API key

**Query Parameters:**
- `action`: `get` (default), `list`, or `summary`
- `deviceId`: Device ID (required for `get` and `summary`)
- `startTime`: ISO 8601 timestamp (optional)
- `endTime`: ISO 8601 timestamp (optional)
- `limit`: Number of records (default: 100, max: 1000)

**Examples:**

Get device data:
```
GET /api/v1/data?deviceId=abc123&action=get&limit=50
```

List all devices:
```
GET /api/v1/data?action=list
```

Get device summary:
```
GET /api/v1/data?deviceId=abc123&action=summary
```

### Health Check Endpoint

**GET** `/health`

Simple health check for backend availability.

**Response:**
```json
{
  "status": "healthy",
  "service": "Hawk Backend",
  "version": "1.0.0",
  "timestamp": "2026-05-30T10:30:00Z",
  "uptime": 3600.5
}
```

## Data Schema

### Device Profile

```javascript
{
  os: {
    name: string,           // e.g., "Linux", "macOS", "Windows"
    version: string,        // e.g., "5.15.0"
    platform: string,       // e.g., "linux", "darwin", "win32"
    kernel: string,         // Kernel version
    distribution: string    // Linux distribution
  },
  deviceType: {
    type: string,           // "desktop", "mobile", "tablet", etc.
    manufacturer: string,
    model: string,
    isMobile: boolean,
    isTablet: boolean,
    isDesktop: boolean
  },
  architecture: {
    cpu: string,            // "x64", "arm64", etc.
    bits: number,           // 32 or 64
    cores: number           // CPU core count
  },
  environment: {
    runtime: string,        // "node", "browser", "electron", etc.
    runtimeVersion: string,
    isNode: boolean,
    isBrowser: boolean
  }
}
```

### System Metrics

```javascript
{
  cpuUsage: number,         // CPU usage percentage (0-100)
  memoryUsage: {
    total: number,          // Total memory in bytes
    free: number,           // Free memory in bytes
    used: number,           // Used memory in bytes
    percentage: number      // Usage percentage (0-100)
  },
  diskUsage: [
    {
      path: string,         // Mount point
      total: number,        // Total disk space in bytes
      used: number,         // Used disk space in bytes
      free: number,         // Free disk space in bytes
      percentage: number    // Usage percentage (0-100)
    }
  ],
  networkInterfaces: [
    {
      name: string,         // Interface name
      addresses: [
        {
          family: string,   // "IPv4" or "IPv6"
          address: string,  // IP address
          mac: string       // MAC address
        }
      ]
    }
  ],
  runningProcesses: [
    {
      pid: number,          // Process ID
      name: string,         // Process name
      cpu: number,          // CPU usage percentage
      memory: number        // Memory usage percentage
    }
  ]
}
```

## Uninstallation

### Remove Hawk Agent

```bash
# Using npm
npx hawk-uninstall

# Or manually
rm -rf ~/.hawk
```

### Linux
```bash
sudo systemctl stop hawk-agent.service
sudo systemctl disable hawk-agent.service
sudo rm /etc/systemd/system/hawk-agent.service
sudo systemctl daemon-reload
```

### macOS
```bash
launchctl unload ~/Library/LaunchAgents/com.hawk.agent.plist
rm ~/Library/LaunchAgents/com.hawk.agent.plist
```

## Troubleshooting

### Agent not starting

1. Check API key is set:
   ```bash
   echo $HAWK_API_KEY
   ```

2. Check logs:
   ```bash
   tail -f ~/.hawk/logs/hawk.log
   ```

3. Enable debug mode:
   ```bash
   export HAWK_DEBUG=true
   npx hawk-agent
   ```

### Data not being sent

1. Verify network connectivity:
   ```bash
   curl -I https://hawk-backend.netlify.app/health
   ```

2. Check API endpoint:
   ```bash
   echo $HAWK_API_ENDPOINT
   ```

3. Verify API key validity with backend

### High CPU/Memory usage

1. Increase collection interval:
   ```bash
   # Edit ~/.hawk/config.json
   # Change collectionInterval to a higher value (in milliseconds)
   ```

2. Disable certain collectors:
   - Edit configuration to disable CPU, memory, or process monitoring

## Security Considerations

- **API Key Management**: Keep your API key secure and never commit it to version control
- **Data Encryption**: Use HTTPS for all API communications
- **Signature Validation**: All data is signed with HMAC-SHA256 for integrity verification
- **Rate Limiting**: Implement rate limiting on the backend for production use
- **Authentication**: Extend the authentication mechanism for multi-tenant scenarios

## Development

### Project Structure

```
hawk/
├── src/
│   ├── hawk.js                 # Core device detection
│   ├── hawk-agent.js           # Main agent orchestrator
│   ├── hawk.d.ts               # TypeScript definitions
│   ├── collectors/
│   │   ├── system-metrics.js   # System metrics collector
│   │   ├── data-aggregator.js  # Data aggregation
│   │   └── data-sender.js      # Secure data transmission
│   ├── detectors/              # Device detectors
│   └── features/
│       └── realtime-monitor.js # Real-time monitoring
├── netlify/
│   └── functions/
│       ├── monitor.js          # Data ingestion endpoint
│       ├── data.js             # Data retrieval endpoint
│       └── health.js           # Health check endpoint
├── tools/
│   └── hawk-install.js         # Installation script
├── public/
│   └── index.html              # Dashboard
├── test/                       # Tests
├── netlify.toml                # Netlify configuration
└── package.json
```

### Building

```bash
npm install
npm run build
npm run test
npm run lint
```

### Deploying to Netlify

```bash
# Connect your GitHub repository to Netlify
# Set environment variables in Netlify UI:
# - HAWK_API_KEY

# Deploy
netlify deploy --prod
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or suggestions:
- GitHub Issues: https://github.com/Daemon22/hawk/issues
- Email: contact@haelfoundation.org
- Website: https://haelfoundation.org

## Roadmap

- [ ] Database integration (FaunaDB, MongoDB Atlas)
- [ ] Advanced analytics and reporting
- [ ] Mobile app for monitoring
- [ ] Webhook notifications
- [ ] Custom alert rules
- [ ] Multi-device dashboard
- [ ] Historical data retention policies
- [ ] Performance optimization

---

**🦅 Hawk - Autonomous Device Monitoring System**

*Monitor everything. Know everything. Instantly.*
