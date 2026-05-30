# Hawk - Quick Start Guide

Get started with Hawk in 5 minutes.

## Installation

### Option 1: Direct Script Tag (Browser)

```html
<script src="path/to/hawk.js"></script>
```

### Option 2: NPM Package

```bash
npm install hawk-device-detection
```

### Option 3: Clone Repository

```bash
git clone https://github.com/Daemon22/hawk.git
cd hawk
```

## Basic Usage

### Browser

```html
<!DOCTYPE html>
<html>
<body>
    <script src="hawk.js"></script>
    <script>
        const monitor = new DeviceMonitor();
        monitor.detect().then(profile => {
            console.log('Device:', profile.deviceType.type);
            console.log('OS:', profile.os.name);
            console.log('Architecture:', profile.architecture.cpu);
        });
    </script>
</body>
</html>
```

### Node.js

```javascript
const DeviceMonitor = require('hawk-device-detection');

async function detectDevice() {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    console.log('Device:', profile.deviceType.type);
    console.log('OS:', profile.os.name);
    console.log('Runtime:', profile.environment.runtime);
}

detectDevice();
```

## Common Use Cases

### Detect Mobile vs Desktop

```javascript
monitor.detect().then(profile => {
    if (profile.deviceType.isMobile) {
        // Load mobile version
    } else {
        // Load desktop version
    }
});
```

### Check Device Capabilities

```javascript
monitor.detect().then(profile => {
    if (profile.capabilities.geolocation) {
        // Use geolocation
    }
    
    if (profile.capabilities.camera) {
        // Use camera
    }
});
```

### Get System Information

```javascript
monitor.detect().then(profile => {
    console.log('CPU Cores:', profile.metadata.hardwareConcurrency);
    console.log('RAM:', profile.metadata.deviceMemory, 'GB');
    console.log('Timezone:', profile.metadata.timezone);
});
```

## Configuration Options

```javascript
const monitor = new DeviceMonitor({
    enableCache: true,        // Cache results for 5 minutes
    cacheTTL: 600000,         // Custom cache duration (ms)
    debugMode: true           // Enable console logging
});
```

## Website Demo

To view the interactive demo:

1. Navigate to the `website` directory
2. Serve it with any web server:
   ```bash
   python -m http.server 8000
   # or
   npx http-server
   ```
3. Open `http://localhost:8000` in your browser
4. Click "Scan Your Device" to see live detection

## Next Steps

- Read [README.md](README.md) for complete documentation
- Check [EXAMPLES.md](EXAMPLES.md) for more code samples
- See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment options
- Review [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for file organization

## Troubleshooting

### Module not found

Ensure `hawk.js` is in the correct path and properly referenced.

### Detection not working

Check browser console for errors. Enable debug mode:
```javascript
const monitor = new DeviceMonitor({ debugMode: true });
```

### Performance concerns

Use caching (enabled by default):
```javascript
const monitor = new DeviceMonitor({ enableCache: true });
```

## Support

- Documentation: [README.md](README.md)
- Examples: [EXAMPLES.md](EXAMPLES.md)
- Issues: Open GitHub issue with details
- Contact: Hael Foundation team

## License

MIT License - See [LICENSE](LICENSE) file

---

**Author:** Uviwe Menyiwe (Azura)  
**Organization:** Hael Foundation  
**Version:** 1.0.0
