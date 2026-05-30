# Hawk Integration Guide

Complete guide for integrating Hawk into popular frameworks and platforms.

## Table of Contents

1. [React Integration](#react-integration)
2. [Vue.js Integration](#vuejs-integration)
3. [Angular Integration](#angular-integration)
4. [Express.js Integration](#expressjs-integration)
5. [Next.js Integration](#nextjs-integration)
6. [Electron Integration](#electron-integration)
7. [React Native Integration](#react-native-integration)
8. [Browser Extension Integration](#browser-extension-integration)

---

## React Integration

### Using Hawk Hook

Create a custom React hook for device detection:

```javascript
import { useState, useEffect } from 'react';
import DeviceMonitor from 'hawk-device-detection';

export function useDeviceProfile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const monitor = new DeviceMonitor();

        monitor.detect()
            .then(setProfile)
            .catch(setError)
            .finally(() => setLoading(false));
    }, []);

    return { profile, loading, error };
}

// Usage in component
function DeviceInfo() {
    const { profile, loading, error } = useDeviceProfile();

    if (loading) return <div>Detecting device...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div>
            <h2>Device Information</h2>
            <p>OS: {profile.os.name}</p>
            <p>Device: {profile.deviceType.type}</p>
            <p>Architecture: {profile.architecture.cpu}</p>
        </div>
    );
}
```

### Device-Specific Rendering

Render different components based on device type:

```javascript
import { useDeviceProfile } from './hooks/useDeviceProfile';

function ResponsiveApp() {
    const { profile } = useDeviceProfile();

    if (!profile) return null;

    if (profile.deviceType.isMobile) {
        return <MobileLayout />;
    }

    if (profile.deviceType.isDesktop) {
        return <DesktopLayout />;
    }

    return <TabletLayout />;
}
```

---

## Vue.js Integration

### Vue Composable

Create a Vue 3 composable for device detection:

```javascript
import { ref, onMounted } from 'vue';
import DeviceMonitor from 'hawk-device-detection';

export function useDeviceProfile() {
    const profile = ref(null);
    const loading = ref(true);
    const error = ref(null);

    onMounted(async () => {
        try {
            const monitor = new DeviceMonitor();
            profile.value = await monitor.detect();
        } catch (err) {
            error.value = err;
        } finally {
            loading.value = false;
        }
    });

    return { profile, loading, error };
}

// Usage in template
<template>
    <div v-if="loading">Detecting device...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
        <h2>Device Information</h2>
        <p>OS: {{ profile.os.name }}</p>
        <p>Device: {{ profile.deviceType.type }}</p>
    </div>
</template>

<script setup>
import { useDeviceProfile } from './composables/useDeviceProfile';

const { profile, loading, error } = useDeviceProfile();
</script>
```

---

## Angular Integration

### Angular Service

Create an Angular service for device detection:

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import DeviceMonitor from 'hawk-device-detection';

@Injectable({
    providedIn: 'root'
})
export class DeviceService {
    private profileSubject = new BehaviorSubject(null);
    public profile$: Observable = this.profileSubject.asObservable();

    constructor() {
        this.detectDevice();
    }

    private async detectDevice() {
        try {
            const monitor = new DeviceMonitor();
            const profile = await monitor.detect();
            this.profileSubject.next(profile);
        } catch (error) {
            console.error('Device detection failed:', error);
        }
    }

    getProfile(): Observable {
        return this.profile$;
    }
}

// Usage in component
import { Component } from '@angular/core';
import { DeviceService } from './services/device.service';

@Component({
    selector: 'app-device-info',
    template: `
        <div *ngIf="profile$ | async as profile">
            <h2>Device Information</h2>
            <p>OS: {{ profile.os.name }}</p>
            <p>Device: {{ profile.deviceType.type }}</p>
        </div>
    `
})
export class DeviceInfoComponent {
    profile$ = this.deviceService.getProfile();

    constructor(private deviceService: DeviceService) {}
}
```

---

## Express.js Integration

### Middleware for Device Detection

Add device detection to Express middleware:

```javascript
const express = require('express');
const DeviceMonitor = require('hawk-device-detection');

const app = express();
const monitor = new DeviceMonitor();

// Middleware to attach device profile to request
app.use(async (req, res, next) => {
    try {
        req.deviceProfile = await monitor.detect();
        next();
    } catch (error) {
        console.error('Device detection failed:', error);
        next();
    }
});

// Route using device profile
app.get('/device-info', (req, res) => {
    res.json(req.deviceProfile);
});

// Device-specific content
app.get('/content', (req, res) => {
    if (req.deviceProfile.deviceType.isMobile) {
        res.json({ layout: 'mobile', content: 'Mobile optimized' });
    } else {
        res.json({ layout: 'desktop', content: 'Desktop optimized' });
    }
});

app.listen(3000);
```

---

## Next.js Integration

### Server-Side Detection

Detect device on server-side in Next.js:

```javascript
// pages/api/device-profile.js
import DeviceMonitor from 'hawk-device-detection';

export default async function handler(req, res) {
    try {
        const monitor = new DeviceMonitor();
        const profile = await monitor.detect();
        res.status(200).json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// pages/device-info.js
import { useEffect, useState } from 'react';

export default function DeviceInfo() {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        fetch('/api/device-profile')
            .then(res => res.json())
            .then(setProfile);
    }, []);

    if (!profile) return <div>Loading...</div>;

    return (
        <div>
            <h1>Device Information</h1>
            <p>OS: {profile.os.name}</p>
            <p>Device: {profile.deviceType.type}</p>
        </div>
    );
}
```

---

## Electron Integration

### Desktop Application Detection

Detect device information in Electron apps:

```javascript
// main.js
const { app, BrowserWindow } = require('electron');
const DeviceMonitor = require('hawk-device-detection');

let mainWindow;

app.on('ready', async () => {
    const monitor = new DeviceMonitor();
    const profile = await monitor.detect();

    console.log('Running on:', profile.os.name);
    console.log('Architecture:', profile.architecture.cpu);

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: __dirname + '/preload.js'
        }
    });

    // Pass device profile to renderer
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('device-profile', profile);
    });

    mainWindow.loadFile('index.html');
});

// preload.js
const { ipcRenderer } = require('electron');

window.deviceProfile = null;

ipcRenderer.on('device-profile', (event, profile) => {
    window.deviceProfile = profile;
    console.log('Device profile available:', profile);
});
```

---

## React Native Integration

### Custom Detector for React Native

Create a custom detector for React Native:

```javascript
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

class ReactNativeDetector {
    canDetect(type) {
        return type === 'reactNative';
    }

    async detectReactNative() {
        return {
            platform: Platform.OS,
            osVersion: Platform.Version,
            deviceName: await DeviceInfo.getDeviceName(),
            uniqueId: await DeviceInfo.getUniqueId(),
            manufacturer: await DeviceInfo.getManufacturer(),
            model: await DeviceInfo.getModel(),
            totalMemory: await DeviceInfo.getTotalMemory(),
            freeMemory: await DeviceInfo.getFreeMemory(),
            isTablet: await DeviceInfo.isTablet(),
            isLandscape: await DeviceInfo.isLandscape()
        };
    }
}

// Usage
import DeviceMonitor from 'hawk-device-detection';

const monitor = new DeviceMonitor({
    customDetectors: [new ReactNativeDetector()]
});

monitor.detect().then(profile => {
    console.log('React Native profile:', profile.reactNative);
});
```

---

## Browser Extension Integration

### Manifest V3 Extension

Integrate Hawk into a Chrome extension:

```javascript
// manifest.json
{
    "manifest_version": 3,
    "name": "Device Info Extension",
    "version": "1.0",
    "permissions": ["activeTab", "scripting"],
    "action": {
        "default_popup": "popup.html"
    },
    "background": {
        "service_worker": "background.js"
    }
}

// background.js
const DeviceMonitor = require('hawk-device-detection');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getDeviceProfile') {
        const monitor = new DeviceMonitor();
        monitor.detect().then(profile => {
            sendResponse(profile);
        });
        return true; // Keep channel open
    }
});

// popup.js
document.getElementById('detectBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage(
        { action: 'getDeviceProfile' },
        (profile) => {
            document.getElementById('result').innerHTML = `
                <p>OS: ${profile.os.name}</p>
                <p>Device: ${profile.deviceType.type}</p>
                <p>Architecture: ${profile.architecture.cpu}</p>
            `;
        }
    );
});
```

---

## Advanced Patterns

### Caching Strategy

Implement efficient caching across frameworks:

```javascript
class CachedDeviceMonitor {
    constructor(cacheDuration = 300000) {
        this.monitor = new DeviceMonitor();
        this.cache = null;
        this.cacheTime = null;
        this.cacheDuration = cacheDuration;
    }

    async detect() {
        const now = Date.now();

        if (this.cache && (now - this.cacheTime) < this.cacheDuration) {
            return this.cache;
        }

        this.cache = await this.monitor.detect();
        this.cacheTime = now;
        return this.cache;
    }

    clearCache() {
        this.cache = null;
        this.cacheTime = null;
    }
}

// Export for use in any framework
export default CachedDeviceMonitor;
```

---

## Summary

Hawk integrates seamlessly with modern frameworks and platforms. Choose the integration pattern that best fits your architecture.

For more examples, see [ADVANCED-EXAMPLES.md](./ADVANCED-EXAMPLES.md).
