/**
 * Device Profile Analyzer
 * Analyzes device profiles for insights and recommendations
 */

class ProfileAnalyzer {
    analyze(profile) {
        return {
            summary: this.generateSummary(profile),
            insights: this.generateInsights(profile),
            recommendations: this.generateRecommendations(profile),
            compatibility: this.checkCompatibility(profile),
            performance: this.analyzePerformance(profile),
            security: this.analyzeSecurityProfile(profile)
        };
    }

    generateSummary(profile) {
        return {
            deviceClass: this.classifyDevice(profile),
            usageContext: this.determineUsageContext(profile),
            capabilities: this.summarizeCapabilities(profile),
            riskFactors: this.identifyRiskFactors(profile)
        };
    }

    classifyDevice(profile) {
        if (profile.deviceType.isMobile) {
            return 'Mobile Device';
        } else if (profile.deviceType.isDesktop) {
            return 'Desktop Computer';
        } else if (profile.deviceType.type === 'tablet') {
            return 'Tablet';
        } else if (profile.deviceType.type === 'tv') {
            return 'Smart TV';
        } else if (profile.deviceType.type === 'wearable') {
            return 'Wearable Device';
        }
        return 'Unknown Device';
    }

    determineUsageContext(profile) {
        const contexts = [];

        if (profile.environment.isBrowser) {
            contexts.push('Web Browsing');
        }
        if (profile.environment.isNode) {
            contexts.push('Server-side Processing');
        }
        if (profile.deviceType.isMobile) {
            contexts.push('Mobile Applications');
        }

        return contexts;
    }

    summarizeCapabilities(profile) {
        const capabilities = Object.entries(profile.capabilities)
            .filter(([_, value]) => value)
            .map(([key]) => key);

        return {
            total: capabilities.length,
            list: capabilities,
            advanced: this.identifyAdvancedCapabilities(profile)
        };
    }

    identifyAdvancedCapabilities(profile) {
        const advanced = [];

        if (profile.capabilities.webgl) advanced.push('3D Graphics');
        if (profile.capabilities.geolocation) advanced.push('Location Services');
        if (profile.capabilities.camera) advanced.push('Camera Access');
        if (profile.capabilities.microphone) advanced.push('Audio Input');
        if (profile.capabilities.bluetooth) advanced.push('Wireless Connectivity');
        if (profile.capabilities.nfc) advanced.push('NFC');
        if (profile.capabilities.vibration) advanced.push('Haptic Feedback');

        return advanced;
    }

    identifyRiskFactors(profile) {
        const risks = [];

        if (profile.os.name === 'Windows' && !profile.os.version) {
            risks.push('Unidentified Windows version');
        }

        if (profile.environment.isBrowser && !profile.capabilities.https) {
            risks.push('No HTTPS support');
        }

        if (profile.capabilities.plugins) {
            risks.push('Browser plugins enabled (potential security risk)');
        }

        return risks;
    }

    generateInsights(profile) {
        return {
            performanceProfile: this.assessPerformanceProfile(profile),
            securityProfile: this.assessSecurityProfile(profile),
            compatibilityNotes: this.generateCompatibilityNotes(profile),
            recommendations: this.generateOptimizationRecommendations(profile)
        };
    }

    assessPerformanceProfile(profile) {
        let score = 100;

        if (profile.architecture.cpu === 'ARM') score -= 10;
        if (profile.deviceType.isMobile) score -= 15;
        if (!profile.capabilities.webgl) score -= 5;

        return {
            score,
            level: score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low',
            factors: this.identifyPerformanceFactors(profile)
        };
    }

    identifyPerformanceFactors(profile) {
        const factors = [];

        if (profile.architecture.cores && profile.architecture.cores > 4) {
            factors.push('Multi-core processor');
        }

        if (profile.metadata.deviceMemory && profile.metadata.deviceMemory > 4) {
            factors.push('Sufficient RAM');
        }

        if (profile.deviceType.isDesktop) {
            factors.push('Desktop processing power');
        }

        return factors;
    }

    assessSecurityProfile(profile) {
        let score = 100;

        if (profile.environment.isBrowser) {
            if (!profile.capabilities.crypto) score -= 20;
            if (profile.capabilities.plugins) score -= 15;
        }

        return {
            score,
            level: score >= 80 ? 'Secure' : score >= 60 ? 'Moderate' : 'At Risk',
            recommendations: this.securityRecommendations(profile)
        };
    }

    securityRecommendations(profile) {
        const recommendations = [];

        if (profile.environment.isBrowser && !profile.capabilities.crypto) {
            recommendations.push('Enable cryptographic APIs for secure communication');
        }

        if (profile.capabilities.plugins) {
            recommendations.push('Disable browser plugins to reduce attack surface');
        }

        return recommendations;
    }

    generateCompatibilityNotes(profile) {
        const notes = [];

        if (profile.os.name === 'iOS') {
            notes.push('iOS: Limited background processing capabilities');
        }

        if (profile.os.name === 'Android') {
            notes.push('Android: Fragmented device landscape, test on multiple devices');
        }

        if (profile.deviceType.type === 'tablet') {
            notes.push('Tablet: Consider responsive design for larger screens');
        }

        return notes;
    }

    generateOptimizationRecommendations(profile) {
        const recommendations = [];

        if (profile.deviceType.isMobile) {
            recommendations.push('Optimize for mobile: reduce bundle size, minimize network requests');
        }

        if (profile.architecture.cpu === 'ARM') {
            recommendations.push('Test on ARM devices: ensure compatibility with ARM architecture');
        }

        if (profile.metadata.deviceMemory && profile.metadata.deviceMemory < 2) {
            recommendations.push('Low memory device: implement memory-efficient algorithms');
        }

        return recommendations;
    }

    generateRecommendations(profile) {
        return {
            development: this.developmentRecommendations(profile),
            deployment: this.deploymentRecommendations(profile),
            testing: this.testingRecommendations(profile),
            optimization: this.optimizationRecommendations(profile)
        };
    }

    developmentRecommendations(profile) {
        const recommendations = [];

        if (profile.environment.isBrowser) {
            recommendations.push('Use progressive enhancement for browser compatibility');
            recommendations.push('Implement feature detection instead of user agent sniffing');
        }

        if (profile.deviceType.isMobile) {
            recommendations.push('Design mobile-first approach');
            recommendations.push('Implement touch event handlers');
        }

        return recommendations;
    }

    deploymentRecommendations(profile) {
        const recommendations = [];

        if (profile.os.name === 'Windows') {
            recommendations.push('Test on Windows 10 and 11 for maximum compatibility');
        }

        if (profile.os.name === 'macOS') {
            recommendations.push('Ensure macOS-specific features work correctly');
        }

        return recommendations;
    }

    testingRecommendations(profile) {
        const recommendations = [];

        if (profile.deviceType.isMobile) {
            recommendations.push('Test on real mobile devices, not just emulators');
            recommendations.push('Test network conditions: 3G, 4G, 5G, WiFi');
        }

        if (profile.environment.isBrowser) {
            recommendations.push('Test in multiple browsers: Chrome, Firefox, Safari, Edge');
        }

        return recommendations;
    }

    optimizationRecommendations(profile) {
        const recommendations = [];

        if (profile.metadata.deviceMemory && profile.metadata.deviceMemory < 4) {
            recommendations.push('Implement lazy loading for images and resources');
        }

        if (profile.deviceType.isMobile) {
            recommendations.push('Minimize JavaScript bundle size');
            recommendations.push('Use image optimization and WebP format');
        }

        return recommendations;
    }

    checkCompatibility(profile) {
        return {
            webStandards: this.checkWebStandards(profile),
            frameworks: this.checkFrameworkCompatibility(profile),
            apis: this.checkAPICompatibility(profile)
        };
    }

    checkWebStandards(profile) {
        return {
            es6: true,
            es2015: true,
            es2020: profile.environment.runtime !== 'old-browser',
            webComponents: profile.capabilities.customElements || false,
            serviceWorker: profile.capabilities.serviceWorker || false
        };
    }

    checkFrameworkCompatibility(profile) {
        const compatible = [];
        const incompatible = [];

        if (profile.environment.isBrowser) {
            compatible.push('React', 'Vue', 'Angular');
        }

        if (profile.environment.isNode) {
            compatible.push('Express', 'Next.js', 'Nest.js');
        }

        return { compatible, incompatible };
    }

    checkAPICompatibility(profile) {
        return {
            fetch: profile.capabilities.fetch || false,
            websocket: profile.capabilities.websocket || false,
            webrtc: profile.capabilities.webrtc || false,
            indexeddb: profile.capabilities.indexeddb || false,
            localStorage: profile.capabilities.localStorage || false
        };
    }

    analyzePerformance(profile) {
        return {
            estimatedLoadTime: this.estimateLoadTime(profile),
            renderingCapability: this.assessRenderingCapability(profile),
            networkCapability: this.assessNetworkCapability(profile)
        };
    }

    estimateLoadTime(profile) {
        let baseTime = 1000; // ms

        if (profile.deviceType.isMobile) baseTime += 500;
        if (profile.architecture.cpu === 'ARM') baseTime += 300;
        if (profile.metadata.deviceMemory && profile.metadata.deviceMemory < 2) baseTime += 200;

        return `${baseTime}ms - ${baseTime + 500}ms`;
    }

    assessRenderingCapability(profile) {
        if (profile.capabilities.webgl) return 'High (WebGL support)';
        if (profile.capabilities.canvas) return 'Medium (Canvas support)';
        return 'Basic (DOM rendering only)';
    }

    assessNetworkCapability(profile) {
        if (profile.environment.isBrowser) {
            if (profile.capabilities.http2) return 'HTTP/2 capable';
            if (profile.capabilities.http3) return 'HTTP/3 capable';
        }
        return 'Standard HTTP';
    }

    analyzeSecurityProfile(profile) {
        return {
            threatLevel: this.assessThreatLevel(profile),
            vulnerabilities: this.identifyVulnerabilities(profile),
            protections: this.identifyProtections(profile)
        };
    }

    assessThreatLevel(profile) {
        let score = 0;

        if (!profile.capabilities.crypto) score += 2;
        if (profile.capabilities.plugins) score += 3;
        if (profile.environment.isBrowser && !profile.capabilities.https) score += 2;

        if (score >= 5) return 'High';
        if (score >= 3) return 'Medium';
        return 'Low';
    }

    identifyVulnerabilities(profile) {
        const vulnerabilities = [];

        if (profile.os.name === 'Windows' && profile.os.version && profile.os.version < 10) {
            vulnerabilities.push('Outdated Windows version');
        }

        if (profile.capabilities.plugins) {
            vulnerabilities.push('Browser plugins enabled');
        }

        return vulnerabilities;
    }

    identifyProtections(profile) {
        const protections = [];

        if (profile.capabilities.crypto) {
            protections.push('Cryptographic APIs available');
        }

        if (profile.capabilities.https) {
            protections.push('HTTPS support');
        }

        if (profile.capabilities.csp) {
            protections.push('Content Security Policy');
        }

        return protections;
    }
}

module.exports = ProfileAnalyzer;
