#!/usr/bin/env node

/**
 * Hawk Installation CLI
 * Zero-configuration installation script for the Hawk Agent
 * Supports installation as a daemon/service on various platforms
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

class HawkInstaller {
  constructor() {
    this.platform = process.platform;
    this.homeDir = process.env.HOME || process.env.USERPROFILE;
    this.hawkDir = path.join(this.homeDir, '.hawk');
    this.configFile = path.join(this.hawkDir, 'config.json');
    this.logDir = path.join(this.hawkDir, 'logs');
  }

  /**
   * Main installation flow
   */
  async install() {
    console.log('🦅 Hawk Agent Installation');
    console.log('============================\n');

    try {
      // Check for required environment variables
      const apiKey = process.env.HAWK_API_KEY;
      if (!apiKey) {
        console.error('❌ Error: HAWK_API_KEY environment variable is not set');
        console.error('Please set your API key: export HAWK_API_KEY="your-api-key"');
        process.exit(1);
      }

      // Create necessary directories
      this._createDirectories();

      // Create configuration
      this._createConfig(apiKey);

      // Install as service based on platform
      switch (this.platform) {
        case 'linux':
          this._installLinuxService();
          break;
        case 'darwin':
          this._installMacService();
          break;
        case 'win32':
          this._installWindowsService();
          break;
        default:
          console.warn(`⚠️  Unsupported platform: ${this.platform}`);
          console.log('Manual installation required');
          break;
      }

      console.log('\n✅ Hawk Agent installed successfully!');
      console.log(`📁 Configuration: ${this.configFile}`);
      console.log(`📝 Logs: ${this.logDir}`);
      console.log('\nStart the agent with: hawk-agent start');
    } catch (error) {
      console.error('❌ Installation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Create necessary directories
   */
  _createDirectories() {
    console.log('📁 Creating directories...');

    if (!fs.existsSync(this.hawkDir)) {
      fs.mkdirSync(this.hawkDir, { recursive: true });
    }

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    console.log('✓ Directories created');
  }

  /**
   * Create configuration file
   */
  _createConfig(apiKey) {
    console.log('⚙️  Creating configuration...');

    const config = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      apiKey: apiKey,
      apiEndpoint: process.env.HAWK_API_ENDPOINT || 'https://hawk-backend.netlify.app/api/v1/monitor',
      collectionInterval: 300000, // 5 minutes
      debugMode: process.env.HAWK_DEBUG === 'true'
    };

    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf8');
    console.log('✓ Configuration created');
  }

  /**
   * Install as Linux systemd service
   */
  _installLinuxService() {
    console.log('🐧 Installing Linux systemd service...');

    const serviceFile = `/etc/systemd/system/hawk-agent.service`;
    const agentScript = path.join(this.hawkDir, 'agent.js');

    // Copy agent script
    const agentCode = this._getAgentScript();
    fs.writeFileSync(agentScript, agentCode, 'utf8');
    fs.chmodSync(agentScript, '755');

    // Create systemd service file
    const serviceContent = `[Unit]
Description=Hawk Device Monitoring Agent
After=network.target

[Service]
Type=simple
User=${process.env.USER || 'root'}
WorkingDirectory=${this.hawkDir}
ExecStart=/usr/bin/node ${agentScript}
Restart=always
RestartSec=10
StandardOutput=append:${path.join(this.logDir, 'hawk.log')}
StandardError=append:${path.join(this.logDir, 'hawk-error.log')}
Environment="HAWK_API_KEY=${process.env.HAWK_API_KEY}"
Environment="HAWK_API_ENDPOINT=${process.env.HAWK_API_ENDPOINT || 'https://hawk-backend.netlify.app/api/v1/monitor'}"

[Install]
WantedBy=multi-user.target
`;

    try {
      // Try to write service file (may require sudo)
      if (process.getuid && process.getuid() === 0) {
        fs.writeFileSync(serviceFile, serviceContent, 'utf8');
        execSync('systemctl daemon-reload', { stdio: 'inherit' });
        execSync('systemctl enable hawk-agent.service', { stdio: 'inherit' });
        execSync('systemctl start hawk-agent.service', { stdio: 'inherit' });
        console.log('✓ Linux service installed and started');
      } else {
        console.log('⚠️  Requires sudo to install as service');
        console.log(`Run: sudo tee ${serviceFile} > /dev/null << 'EOF'`);
        console.log(serviceContent);
        console.log('EOF');
        console.log('Then: sudo systemctl daemon-reload && sudo systemctl enable hawk-agent.service && sudo systemctl start hawk-agent.service');
      }
    } catch (error) {
      console.warn('⚠️  Could not install as systemd service:', error.message);
      console.log('You can run the agent manually with: node ' + agentScript);
    }
  }

  /**
   * Install as macOS LaunchAgent
   */
  _installMacService() {
    console.log('🍎 Installing macOS LaunchAgent...');

    const launchAgentDir = path.join(this.homeDir, 'Library', 'LaunchAgents');
    const launchAgentFile = path.join(launchAgentDir, 'com.hawk.agent.plist');
    const agentScript = path.join(this.hawkDir, 'agent.js');

    // Copy agent script
    const agentCode = this._getAgentScript();
    fs.writeFileSync(agentScript, agentCode, 'utf8');
    fs.chmodSync(agentScript, '755');

    // Create LaunchAgent plist
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.hawk.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>${agentScript}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${path.join(this.logDir, 'hawk.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(this.logDir, 'hawk-error.log')}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>HAWK_API_KEY</key>
        <string>${process.env.HAWK_API_KEY}</string>
        <key>HAWK_API_ENDPOINT</key>
        <string>${process.env.HAWK_API_ENDPOINT || 'https://hawk-backend.netlify.app/api/v1/monitor'}</string>
    </dict>
</dict>
</plist>`;

    try {
      if (!fs.existsSync(launchAgentDir)) {
        fs.mkdirSync(launchAgentDir, { recursive: true });
      }

      fs.writeFileSync(launchAgentFile, plistContent, 'utf8');
      execSync(`launchctl load ${launchAgentFile}`, { stdio: 'inherit' });
      console.log('✓ macOS LaunchAgent installed and started');
    } catch (error) {
      console.warn('⚠️  Could not install as LaunchAgent:', error.message);
      console.log('You can run the agent manually with: node ' + agentScript);
    }
  }

  /**
   * Install as Windows service
   */
  _installWindowsService() {
    console.log('🪟 Installing Windows service...');

    const agentScript = path.join(this.hawkDir, 'agent.js');

    // Copy agent script
    const agentCode = this._getAgentScript();
    fs.writeFileSync(agentScript, agentCode, 'utf8');

    console.log('⚠️  Windows service installation requires additional setup');
    console.log('You can run the agent manually with: node ' + agentScript);
    console.log('\nFor automatic startup, you can:');
    console.log('1. Use Task Scheduler to run: node ' + agentScript);
    console.log('2. Or use a service wrapper like NSSM (Non-Sucking Service Manager)');
  }

  /**
   * Get the agent startup script
   */
  _getAgentScript() {
    return `#!/usr/bin/env node

const HawkAgent = require('${path.join(__dirname, '..', 'src', 'hawk-agent.js')}');

const agent = new HawkAgent({
  apiKey: process.env.HAWK_API_KEY,
  apiEndpoint: process.env.HAWK_API_ENDPOINT,
  debugMode: process.env.HAWK_DEBUG === 'true',
  autoStart: true
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await agent.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await agent.stop();
  process.exit(0);
});

console.log('🦅 Hawk Agent started');
console.log('Device ID:', agent.getStatus().deviceId);
`;
  }

  /**
   * Uninstall Hawk Agent
   */
  async uninstall() {
    console.log('🦅 Hawk Agent Uninstallation');
    console.log('============================\n');

    try {
      switch (this.platform) {
        case 'linux':
          this._uninstallLinuxService();
          break;
        case 'darwin':
          this._uninstallMacService();
          break;
        case 'win32':
          this._uninstallWindowsService();
          break;
      }

      // Remove directories
      if (fs.existsSync(this.hawkDir)) {
        fs.rmSync(this.hawkDir, { recursive: true });
      }

      console.log('\n✅ Hawk Agent uninstalled successfully');
    } catch (error) {
      console.error('❌ Uninstallation failed:', error.message);
      process.exit(1);
    }
  }

  _uninstallLinuxService() {
    try {
      execSync('systemctl stop hawk-agent.service', { stdio: 'inherit' });
      execSync('systemctl disable hawk-agent.service', { stdio: 'inherit' });
      execSync('rm /etc/systemd/system/hawk-agent.service', { stdio: 'inherit' });
      execSync('systemctl daemon-reload', { stdio: 'inherit' });
      console.log('✓ Linux service removed');
    } catch (error) {
      console.warn('⚠️  Could not remove Linux service:', error.message);
    }
  }

  _uninstallMacService() {
    try {
      const launchAgentFile = path.join(this.homeDir, 'Library', 'LaunchAgents', 'com.hawk.agent.plist');
      execSync(`launchctl unload ${launchAgentFile}`, { stdio: 'inherit' });
      fs.unlinkSync(launchAgentFile);
      console.log('✓ macOS LaunchAgent removed');
    } catch (error) {
      console.warn('⚠️  Could not remove macOS LaunchAgent:', error.message);
    }
  }

  _uninstallWindowsService() {
    console.log('⚠️  Manual removal required for Windows');
    console.log('Please remove the scheduled task or service manually');
  }
}

// CLI argument parsing
const command = process.argv[2] || 'install';
const installer = new HawkInstaller();

if (command === 'install') {
  installer.install().catch(error => {
    console.error('Installation error:', error);
    process.exit(1);
  });
} else if (command === 'uninstall') {
  installer.uninstall().catch(error => {
    console.error('Uninstallation error:', error);
    process.exit(1);
  });
} else {
  console.log('Usage: hawk-install [install|uninstall]');
  process.exit(1);
}
