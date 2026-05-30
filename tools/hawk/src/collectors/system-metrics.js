/**
 * System Metrics Collector
 * Collects CPU, memory, disk, network, and process information
 * Works in Node.js environments
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SystemMetricsCollector {
  constructor(options = {}) {
    this.options = {
      collectCPU: options.collectCPU !== false,
      collectMemory: options.collectMemory !== false,
      collectDisk: options.collectDisk !== false,
      collectNetwork: options.collectNetwork !== false,
      collectProcesses: options.collectProcesses !== false,
      debugMode: options.debugMode || false
    };
    this._previousCPUTime = null;
    this._previousUptime = null;
  }

  /**
   * Collect all system metrics
   */
  async collectAll() {
    const metrics = {
      timestamp: new Date().toISOString(),
      cpuUsage: null,
      memoryUsage: null,
      diskUsage: null,
      networkInterfaces: null,
      runningProcesses: null,
      systemLoad: null,
      uptime: null
    };

    try {
      if (this.options.collectCPU) {
        metrics.cpuUsage = await this.collectCPUUsage();
        metrics.systemLoad = this.collectSystemLoad();
      }
      if (this.options.collectMemory) {
        metrics.memoryUsage = this.collectMemoryUsage();
      }
      if (this.options.collectDisk) {
        metrics.diskUsage = await this.collectDiskUsage();
      }
      if (this.options.collectNetwork) {
        metrics.networkInterfaces = this.collectNetworkInterfaces();
      }
      if (this.options.collectProcesses) {
        metrics.runningProcesses = await this.collectRunningProcesses();
      }
      metrics.uptime = os.uptime();

      this._log('System metrics collected:', metrics);
      return metrics;
    } catch (error) {
      this._log('Error collecting system metrics:', error);
      throw new Error(`System metrics collection failed: ${error.message}`);
    }
  }

  /**
   * Collect CPU usage percentage
   */
  async collectCPUUsage() {
    try {
      const cpus = os.cpus();
      const currentTime = process.cpuUsage();
      const currentUptime = os.uptime();

      if (!this._previousCPUTime) {
        this._previousCPUTime = currentTime;
        this._previousUptime = currentUptime;
        return 0;
      }

      const userDiff = currentTime.user - this._previousCPUTime.user;
      const systemDiff = currentTime.system - this._previousCPUTime.system;
      const totalDiff = userDiff + systemDiff;
      const uptimeDiff = (currentUptime - this._previousUptime) * 1000000;

      this._previousCPUTime = currentTime;
      this._previousUptime = currentUptime;

      const cpuUsagePercent = (totalDiff / uptimeDiff) * 100;
      return Math.min(100, Math.max(0, cpuUsagePercent));
    } catch (error) {
      this._log('Error collecting CPU usage:', error);
      return null;
    }
  }

  /**
   * Collect system load average
   */
  collectSystemLoad() {
    try {
      const loadAvg = os.loadavg();
      const cpuCount = os.cpus().length;

      return {
        load1: loadAvg[0],
        load5: loadAvg[1],
        load15: loadAvg[2],
        cpuCount: cpuCount,
        normalized1: (loadAvg[0] / cpuCount) * 100,
        normalized5: (loadAvg[1] / cpuCount) * 100,
        normalized15: (loadAvg[2] / cpuCount) * 100
      };
    } catch (error) {
      this._log('Error collecting system load:', error);
      return null;
    }
  }

  /**
   * Collect memory usage
   */
  collectMemoryUsage() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      return {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        percentage: (usedMemory / totalMemory) * 100
      };
    } catch (error) {
      this._log('Error collecting memory usage:', error);
      return null;
    }
  }

  /**
   * Collect disk usage for all mounted filesystems
   */
  async collectDiskUsage() {
    try {
      const diskUsage = [];

      if (process.platform === 'win32') {
        // Windows disk usage collection
        try {
          const { stdout } = await execAsync('wmic logicaldisk get name,size,freespace /format:list');
          const lines = stdout.split('\n').filter(line => line.trim());
          let currentDrive = {};

          for (const line of lines) {
            if (line.startsWith('Name=')) {
              if (Object.keys(currentDrive).length > 0) {
                diskUsage.push(this._calculateDiskMetrics(currentDrive));
              }
              currentDrive = { path: line.split('=')[1] };
            } else if (line.startsWith('Size=')) {
              currentDrive.total = parseInt(line.split('=')[1]) || 0;
            } else if (line.startsWith('FreeSpace=')) {
              currentDrive.free = parseInt(line.split('=')[1]) || 0;
            }
          }

          if (Object.keys(currentDrive).length > 0) {
            diskUsage.push(this._calculateDiskMetrics(currentDrive));
          }
        } catch (error) {
          this._log('Error collecting Windows disk usage:', error);
        }
      } else {
        // Unix-like disk usage collection
        try {
          const { stdout } = await execAsync('df -B1 2>/dev/null | tail -n +2');
          const lines = stdout.split('\n').filter(line => line.trim());

          for (const line of lines) {
            const parts = line.split(/\s+/);
            if (parts.length >= 6) {
              diskUsage.push({
                path: parts[5],
                total: parseInt(parts[1]) || 0,
                used: parseInt(parts[2]) || 0,
                free: parseInt(parts[3]) || 0,
                percentage: parseInt(parts[4]) || 0
              });
            }
          }
        } catch (error) {
          this._log('Error collecting Unix disk usage:', error);
        }
      }

      return diskUsage.length > 0 ? diskUsage : null;
    } catch (error) {
      this._log('Error collecting disk usage:', error);
      return null;
    }
  }

  /**
   * Helper to calculate disk metrics
   */
  _calculateDiskMetrics(drive) {
    const total = drive.total || 0;
    const free = drive.free || 0;
    const used = total - free;

    return {
      path: drive.path,
      total: total,
      used: used,
      free: free,
      percentage: total > 0 ? (used / total) * 100 : 0
    };
  }

  /**
   * Collect network interface information
   */
  collectNetworkInterfaces() {
    try {
      const interfaces = os.networkInterfaces();
      const networkInfo = [];

      for (const [name, addrs] of Object.entries(interfaces)) {
        const interfaceInfo = {
          name: name,
          addresses: []
        };

        for (const addr of addrs) {
          interfaceInfo.addresses.push({
            family: addr.family,
            address: addr.address,
            netmask: addr.netmask,
            mac: addr.mac,
            internal: addr.internal
          });
        }

        networkInfo.push(interfaceInfo);
      }

      return networkInfo;
    } catch (error) {
      this._log('Error collecting network interfaces:', error);
      return null;
    }
  }

  /**
   * Collect running processes
   */
  async collectRunningProcesses() {
    try {
      const processes = [];

      if (process.platform === 'win32') {
        // Windows process collection
        try {
          const { stdout } = await execAsync('tasklist /FO LIST /V /FI "STATUS eq RUNNING" 2>nul', { maxBuffer: 10 * 1024 * 1024 });
          const lines = stdout.split('\n');
          let currentProcess = {};

          for (const line of lines) {
            if (line.startsWith('Image Name')) {
              if (Object.keys(currentProcess).length > 0) {
                processes.push(currentProcess);
              }
              currentProcess = { name: line.split(':')[1]?.trim() };
            } else if (line.startsWith('PID')) {
              currentProcess.pid = parseInt(line.split(':')[1]?.trim()) || 0;
            } else if (line.startsWith('Mem Usage')) {
              const memStr = line.split(':')[1]?.trim().replace(/[^0-9]/g, '');
              currentProcess.memory = parseInt(memStr) || 0;
            }
          }

          if (Object.keys(currentProcess).length > 0) {
            processes.push(currentProcess);
          }
        } catch (error) {
          this._log('Error collecting Windows processes:', error);
        }
      } else {
        // Unix-like process collection
        try {
          const { stdout } = await execAsync('ps aux --sort=-%cpu | head -n 21', { maxBuffer: 10 * 1024 * 1024 });
          const lines = stdout.split('\n').slice(1).filter(line => line.trim());

          for (const line of lines) {
            const parts = line.split(/\s+/);
            if (parts.length >= 11) {
              processes.push({
                user: parts[0],
                pid: parseInt(parts[1]) || 0,
                cpu: parseFloat(parts[2]) || 0,
                memory: parseFloat(parts[3]) || 0,
                name: parts[10]
              });
            }
          }
        } catch (error) {
          this._log('Error collecting Unix processes:', error);
        }
      }

      return processes.length > 0 ? processes : null;
    } catch (error) {
      this._log('Error collecting running processes:', error);
      return null;
    }
  }

  _log(...args) {
    if (this.options.debugMode) console.log('[SystemMetricsCollector]', ...args);
  }
}

module.exports = SystemMetricsCollector;
