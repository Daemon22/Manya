# Hawk Architecture Design

## Goal

Transform the existing Hawk repository into an autonomous, zero-configuration device monitoring tool that self-activates on installation, scans and monitors all device metrics, and is deployed as a serverless API/tool via Netlify.

## Current Hawk Capabilities (from `src/hawk.js` and `src/features/realtime-monitor.js`)

The current Hawk library (`hawk.js`) is a JavaScript-based device detection module that identifies operating system, device type, screen information, architecture, environment, and various browser capabilities. It utilizes a modular detector system and includes caching. The `RealtimeMonitor` (`realtime-monitor.js`) provides event-driven and polling-based monitoring for network changes, orientation changes, visibility changes, and basic device state (network, screen, memory, battery, connection) primarily within a browser environment.

## Proposed Architecture

To achieve the goal of an autonomous, zero-configuration, cross-platform monitoring tool with a serverless backend, the Hawk architecture will be extended to include three main components:

1.  **Hawk Agent (Device-side)**: An enhanced client-side component responsible for comprehensive device data collection and secure transmission.
2.  **Hawk Backend (Netlify Functions)**: A serverless API layer hosted on Netlify to ingest, store, and serve monitoring data.
3.  **Hawk Dashboard (Optional Frontend)**: A simple web interface for visualizing collected data, also hosted on Netlify.

### 1. Hawk Agent (Device-side)

This component will be deployed directly on the target devices. It will be designed for minimal footprint and autonomous operation.

**Sub-components:**

*   **Core Detection Module (Enhanced `hawk.js`)**:
    *   **Functionality**: Extends existing device detection to include more granular system information (e.g., CPU usage, memory usage, disk I/O, running processes, network interface details, installed software). This will require platform-specific implementations for Node.js environments or native executables.
    *   **Technology**: JavaScript/Node.js for cross-platform compatibility, potentially leveraging native modules or external commands for deeper system insights.
*   **Real-time Monitoring Module (Enhanced `realtime-monitor.js`)**:
    *   **Functionality**: Adapts the existing real-time monitoring to capture system-level changes (e.g., process starts/stops, resource spikes, network connectivity changes, disk space alerts). It will operate continuously in the background.
    *   **Technology**: JavaScript/Node.js, potentially using OS-level event listeners or polling mechanisms.
*   **Data Collector**: 
    *   **Functionality**: Aggregates data from the detection and monitoring modules into a structured format (e.g., JSON).
    *   **Technology**: JavaScript/Node.js.
*   **Data Sender**: 
    *   **Functionality**: Securely transmits collected data to the Hawk Backend API endpoint. Implements retry mechanisms and potentially batching to handle intermittent network connectivity.
    *   **Technology**: JavaScript/Node.js with `fetch` or `axios` for HTTP POST requests. Authentication via API keys.
*   **Installation Script/Mechanism**: 
    *   **Functionality**: Provides a zero-configuration installation experience. This will be platform-specific.
    *   **Technology**: Shell scripts (Bash, PowerShell) for initial setup, potentially leveraging existing package managers (npm, apt, yum, brew) for dependency management.

### 2. Hawk Backend (Netlify Functions)

This serverless component will handle data ingestion and retrieval.

**Sub-components:**

*   **API Endpoint (Data Ingestion)**: 
    *   **Functionality**: A Netlify Function (AWS Lambda) that receives `POST` requests containing monitoring data from Hawk Agents. It will validate the data, authenticate the agent (using API keys), and store the data in a database.
    *   **Technology**: Node.js for Netlify Function, integrated with a serverless database.
    *   **Endpoint**: `/api/v1/monitor`
*   **Data Storage**: 
    *   **Functionality**: A scalable, serverless database to persist the monitoring data. Each device's data will be stored, allowing for historical analysis.
    *   **Technology**: Considering options like FaunaDB, MongoDB Atlas Serverless, or a similar NoSQL database for flexibility and scalability with serverless functions.
*   **API Endpoint (Data Retrieval/Dashboard)**: 
    *   **Functionality**: A Netlify Function that allows the Hawk Dashboard (or other authorized clients) to retrieve monitoring data. It will support filtering by device ID, time range, and metric type.
    *   **Technology**: Node.js for Netlify Function, querying the chosen serverless database.
    *   **Endpoint**: `/api/v1/data` (with query parameters for filtering)

### 3. Hawk Dashboard (Optional Frontend)

A web-based interface for visualizing the collected monitoring data.

**Sub-components:**

*   **Frontend Application**: 
    *   **Functionality**: Displays real-time and historical monitoring data in an intuitive way (charts, tables, alerts). Allows users to view device profiles, performance metrics, and event logs.
    *   **Technology**: React.js or Vue.js, hosted as a static site on Netlify.
    *   **Data Source**: Consumes data from the Hawk Backend's Data Retrieval API Endpoint.

## Data Schema (Example for Data Ingestion)

```json
{
  "deviceId": "unique-device-identifier-123",
  "timestamp": "2026-05-30T10:30:00Z",
  "os": {
    "name": "macOS",
    "version": "14.4.1",
    "platform": "darwin",
    "kernel": "Darwin Kernel Version 23.4.0"
  },
  "deviceType": {
    "type": "desktop",
    "manufacturer": "Apple",
    "model": "MacBookPro18,1",
    "isMobile": false
  },
  "screen": {
    "width": 2560,
    "height": 1600,
    "pixelRatio": 2,
    "orientation": "landscape"
  },
  "architecture": {
    "cpu": "arm64",
    "bits": 64,
    "cores": 10
  },
  "environment": {
    "runtime": "node",
    "runtimeVersion": "v20.12.2",
    "isNode": true
  },
  "capabilities": {
    "webgl": true,
    "bluetooth": true
  },
  "systemMetrics": {
    "cpuUsage": 15.5,
    "memoryUsage": {
      "total": 16777216000,
      "free": 8388608000,
      "used": 8388608000,
      "percentage": 50
    },
    "diskUsage": [
      {
        "path": "/",
        "total": 500000000000,
        "free": 250000000000,
        "used": 250000000000,
        "percentage": 50
      }
    ],
    "networkInterfaces": [
      {
        "name": "en0",
        "ipAddress": "192.168.1.100",
        "macAddress": "00:11:22:33:44:55",
        "rxBytes": 123456789,
        "txBytes": 987654321
      }
    ],
    "runningProcesses": [
      {
        "pid": 1234,
        "name": "node",
        "cpu": 2.1,
        "memory": 50.5
      }
    ]
  },
  "events": [
    {
      "type": "network:online",
      "details": {"connectionType": "wifi"},
      "timestamp": "2026-05-30T10:29:50Z"
    }
  ]
}
```

## Netlify Deployment Model

*   **Repository Structure**: The project will be structured to facilitate Netlify deployment, with the frontend (if any) in a `web` directory and Netlify Functions in an `netlify/functions` directory.
*   **Build Process**: Netlify will automatically build and deploy the project on every push to the main branch of the GitHub repository.
*   **Environment Variables**: Sensitive information like database credentials and API keys will be managed via Netlify Environment Variables.
*   **Continuous Deployment**: Leverages Netlify's CI/CD capabilities for seamless updates.

## Next Steps

1.  **Refine Data Schema**: Detail all metrics to be collected.
2.  **Choose Serverless Database**: Select and integrate a suitable serverless database.
3.  **Implement Hawk Agent Extensions**: Develop platform-specific modules for deeper system monitoring.
4.  **Develop Netlify Functions**: Create the API endpoints for data ingestion and retrieval.
5.  **Develop Installation Scripts**: Create zero-configuration installation scripts for target OSes.
6.  **Develop Dashboard (Optional)**: Build a basic dashboard for data visualization.
