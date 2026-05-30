# Hawk - Usage Examples

## Browser Usage

### Basic Detection
```html
<!DOCTYPE html>
<html>
<head>
    <title>Hawk Device Detection</title>
</head>
<body>
    <div id="result"></div>
    
    <script src="src/hawk.js"></script>
    <script>
        const monitor = new DeviceMonitor({ debugMode: true });
        
        monitor.detect().then(profile => {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = `
                <h2>Device Profile</h2>
                <p><strong>OS:</strong> ${profile.os.name} ${profile.os.version || ''}</p>
                <p><strong>Device Type:</strong> ${profile.deviceType.type}</p>
                <p><strong>Architecture:</strong> ${profile.architecture.cpu} (${profile.architecture.bits}-bit)</p>
                <p><strong>Runtime:</strong> ${profile.environment.runtime}</p>
                <p><strong>Screen:</strong> ${profile.screen.width}x${profile.screen.height}</p>
            `;
        });
    </script>
</body>
</html>
```

### Conditional Logic Based on Device Type
```javascript
const monitor = new DeviceMonitor();

monitor.detect().then(profile => {
    if (profile.deviceType.isMobile) {
        // Load mobile-optimized resources
        console.log('Loading mobile version');
    } else if (profile.deviceType.isTablet) {
        // Load tablet-optimized resources
        console.log('Loading tablet version');
    } else {
        // Load desktop resources
        console.log('Loading desktop version');
    }
});
```

### Checking Device Capabilities
```javascript
const monitor = new DeviceMonitor();

monitor.detect().then(profile => {
    if (profile.capabilities.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            console.log('User location:', position.coords);
        });
    } else {
        console.log('Geolocation not supported');
    }
    
    if (profile.capabilities.camera) {
        console.log('Camera is available');
    }
    
    if (profile.capabilities.notifications) {
        console.log('Notifications are supported');
    }
});
```

## Node.js Usage

### Server-Side Detection
```javascript
const DeviceMonitor = require('./src/hawk.js');

async function detectUserDevice(userAgent) {
    const monitor = new DeviceMonitor({ debugMode: true });
    const profile = await monitor.detect();
    
    console.log('User Device Profile:');
    console.log(`OS: ${profile.os.name}`);
    console.log(`Architecture: ${profile.architecture.cpu}`);
    console.log(`Runtime: ${profile.environment.runtime}`);
    
    return profile;
}

detectUserDevice();
```

### Express.js Middleware
```javascript
const express = require('express');
const DeviceMonitor = require('./src/hawk.js');

const app = express();

// Middleware to detect device info
app.use(async (req, res, next) => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();
    
    req.deviceProfile = profile;
    res.locals.deviceType = profile.deviceType.type;
    
    next();
});

app.get('/', (req, res) => {
    res.json({
        message: 'Device detected',
        deviceType: req.deviceProfile.deviceType.type,
        os: req.deviceProfile.os.name
    });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

## React Usage

### React Hook for Device Detection
```javascript
import { useEffect, useState } from 'react';

function useDeviceDetection() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const monitor = new DeviceMonitor();
        
        monitor.detect().then(profile => {
            setProfile(profile);
            setLoading(false);
        }).catch(error => {
            console.error('Detection error:', error);
            setLoading(false);
        });
    }, []);
    
    return { profile, loading };
}

// Usage in component
function DeviceInfo() {
    const { profile, loading } = useDeviceDetection();
    
    if (loading) return <div>Detecting device...</div>;
    
    return (
        <div>
            <h2>Your Device</h2>
            <p>OS: {profile.os.name}</p>
            <p>Type: {profile.deviceType.type}</p>
            <p>Architecture: {profile.architecture.cpu}</p>
        </div>
    );
}
```

### Responsive Component Based on Device
```javascript
function ResponsiveComponent() {
    const { profile } = useDeviceDetection();
    
    if (!profile) return null;
    
    if (profile.deviceType.isMobile) {
        return <MobileLayout />;
    } else if (profile.deviceType.isTablet) {
        return <TabletLayout />;
    } else {
        return <DesktopLayout />;
    }
}
```

## Performance Optimization

### Using Cache
```javascript
const monitor = new DeviceMonitor({
    enableCache: true,
    cacheTTL: 600000  // Cache for 10 minutes
});

// First call - performs detection
monitor.detect().then(profile => {
    console.log('First detection:', profile);
});

// Second call within 10 minutes - uses cache
monitor.detect().then(profile => {
    console.log('Cached result:', profile);
});

// Clear cache manually
monitor.clearCache();
```

### Custom Detector
```javascript
class CustomDetector {
    canDetect(type) {
        return type === 'custom';
    }
    
    async detectCustom() {
        return {
            customProperty: 'custom value'
        };
    }
}

const monitor = new DeviceMonitor({
    customDetectors: [new CustomDetector()]
});

monitor.detect().then(profile => {
    console.log(profile);
});
```

## Error Handling

```javascript
const monitor = new DeviceMonitor({ debugMode: true });

monitor.detect()
    .then(profile => {
        console.log('Detection successful:', profile);
    })
    .catch(error => {
        console.error('Detection failed:', error.message);
        // Fallback logic
    });
```

## Advanced: Feature Detection for Progressive Enhancement

```javascript
const monitor = new DeviceMonitor();

monitor.detect().then(profile => {
    const features = {
        webgl: profile.capabilities.webgl,
        serviceWorker: profile.capabilities.serviceWorker,
        localStorage: profile.capabilities.localStorage,
        geolocation: profile.capabilities.geolocation
    };
    
    // Load appropriate polyfills or fallbacks
    if (!features.localStorage) {
        console.log('Using fallback storage mechanism');
    }
    
    if (!features.serviceWorker) {
        console.log('Service Worker not available');
    }
    
    // Store feature detection results
    sessionStorage.setItem('deviceFeatures', JSON.stringify(features));
});
```
