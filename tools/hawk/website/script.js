// Hawk Website - Device Scanner Script

document.addEventListener('DOMContentLoaded', function() {
    const scanButton = document.getElementById('scan-button');
    const resultsContainer = document.getElementById('results');

    scanButton.addEventListener('click', function() {
        scanButton.disabled = true;
        scanButton.textContent = 'Scanning...';
        resultsContainer.style.display = 'none';

        // Create monitor instance
        const monitor = new DeviceMonitor({ debugMode: false });

        // Perform detection
        monitor.detect().then(profile => {
            displayResults(profile);
            scanButton.disabled = false;
            scanButton.textContent = 'Scan Your Device';
        }).catch(error => {
            resultsContainer.innerHTML = '<p style="color: #ff6b6b;">Error: ' + error.message + '</p>';
            resultsContainer.style.display = 'block';
            scanButton.disabled = false;
            scanButton.textContent = 'Scan Your Device';
        });
    });

    function displayResults(profile) {
        let html = '<h3>Device Profile Results</h3>';

        // Operating System
        html += '<div class="result-item">';
        html += '<strong>Operating System:</strong><br>';
        html += `Name: <span>${profile.os.name}</span><br>`;
        if (profile.os.version) html += `Version: <span>${profile.os.version}</span><br>`;
        if (profile.os.platform) html += `Platform: <span>${profile.os.platform}</span>`;
        html += '</div>';

        // Device Type
        html += '<div class="result-item">';
        html += '<strong>Device Type:</strong><br>';
        html += `Type: <span>${profile.deviceType.type}</span><br>`;
        html += `Mobile: <span>${profile.deviceType.isMobile ? 'Yes' : 'No'}</span><br>`;
        html += `Tablet: <span>${profile.deviceType.isTablet ? 'Yes' : 'No'}</span><br>`;
        html += `Desktop: <span>${profile.deviceType.isDesktop ? 'Yes' : 'No'}</span>`;
        html += '</div>';

        // Screen Information
        html += '<div class="result-item">';
        html += '<strong>Screen Information:</strong><br>';
        if (profile.screen.width) html += `Resolution: <span>${profile.screen.width}×${profile.screen.height}</span><br>`;
        if (profile.screen.pixelRatio) html += `Pixel Ratio: <span>${profile.screen.pixelRatio.toFixed(2)}</span><br>`;
        if (profile.screen.colorDepth) html += `Color Depth: <span>${profile.screen.colorDepth} bits</span><br>`;
        if (profile.screen.orientation) html += `Orientation: <span>${profile.screen.orientation}</span>`;
        html += '</div>';

        // Architecture
        html += '<div class="result-item">';
        html += '<strong>CPU Architecture:</strong><br>';
        if (profile.architecture.cpu) html += `CPU: <span>${profile.architecture.cpu}</span><br>`;
        if (profile.architecture.bits) html += `Bits: <span>${profile.architecture.bits}-bit</span>`;
        html += '</div>';

        // Environment
        html += '<div class="result-item">';
        html += '<strong>Runtime Environment:</strong><br>';
        if (profile.environment.runtime) html += `Runtime: <span>${profile.environment.runtime}</span><br>`;
        html += `Browser: <span>${profile.environment.isBrowser ? 'Yes' : 'No'}</span><br>`;
        html += `Node.js: <span>${profile.environment.isNode ? 'Yes' : 'No'}</span>`;
        html += '</div>';

        // Capabilities
        const supportedCapabilities = Object.entries(profile.capabilities)
            .filter(([_, supported]) => supported)
            .map(([capability, _]) => capability);

        html += '<div class="result-item">';
        html += '<strong>Supported Capabilities:</strong><br>';
        if (supportedCapabilities.length > 0) {
            html += `<span>${supportedCapabilities.join(', ')}</span>`;
        } else {
            html += '<span>No capabilities detected</span>';
        }
        html += '</div>';

        // Metadata
        html += '<div class="result-item">';
        html += '<strong>Metadata:</strong><br>';
        if (profile.metadata.timezone) html += `Timezone: <span>${profile.metadata.timezone}</span><br>`;
        if (profile.metadata.language) html += `Language: <span>${profile.metadata.language}</span><br>`;
        if (profile.metadata.hardwareConcurrency) html += `CPU Cores: <span>${profile.metadata.hardwareConcurrency}</span><br>`;
        if (profile.metadata.deviceMemory) html += `Device Memory: <span>${profile.metadata.deviceMemory}GB</span>`;
        html += '</div>';

        // Timestamp
        html += '<div class="result-item">';
        html += `<strong>Detected at:</strong> <span>${new Date(profile.timestamp).toLocaleString()}</span>`;
        html += '</div>';

        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
    }
});
