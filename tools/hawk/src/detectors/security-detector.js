/**
 * Security Detector
 * Identifies security features, threats, and vulnerability indicators
 */

class SecurityDetector {
    canDetect(type) {
        return type === 'security';
    }

    async detectSecurity() {
        const securityProfile = {
            threatLevel: this.assessThreatLevel(),
            vulnerabilities: this.detectVulnerabilities(),
            protections: this.getProtections(),
            privacy: this.getPrivacySettings(),
            authentication: this.getAuthenticationCapabilities(),
            encryption: this.getEncryptionSupport(),
            sandbox: this.getSandboxInfo(),
            malware: this.checkMalwareIndicators()
        };

        return securityProfile;
    }

    assessThreatLevel() {
        const threats = this.detectVulnerabilities();
        const threatCount = Object.values(threats).filter(v => v).length;

        if (threatCount >= 5) return 'critical';
        if (threatCount >= 3) return 'high';
        if (threatCount >= 1) return 'medium';
        return 'low';
    }

    detectVulnerabilities() {
        return {
            outdatedBrowser: this.isOutdatedBrowser(),
            noHTTPS: this.hasNoHTTPS(),
            weakTLS: this.hasWeakTLS(),
            noCSP: this.hasNoCSP(),
            noXFrameOptions: this.hasNoXFrameOptions(),
            noXContentTypeOptions: this.hasNoXContentTypeOptions(),
            noStrictTransportSecurity: this.hasNoStrictTransportSecurity(),
            vulnerableJavaScript: this.hasVulnerableJavaScript(),
            trackers: this.hasTrackers(),
            suspiciousExtensions: this.hasSuspiciousExtensions()
        };
    }

    isOutdatedBrowser() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        
        // Check for very old browsers
        return ua.includes('msie 6') || 
               ua.includes('msie 7') || 
               ua.includes('msie 8') ||
               ua.includes('firefox/3') ||
               ua.includes('safari/3');
    }

    hasNoHTTPS() {
        if (typeof window === 'undefined') return false;
        return window.location.protocol !== 'https:' && window.location.hostname !== 'localhost';
    }

    hasWeakTLS() {
        if (typeof navigator === 'undefined') return false;
        // This would require server-side verification in production
        return false;
    }

    hasNoCSP() {
        if (typeof document === 'undefined') return false;
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return meta === null;
    }

    hasNoXFrameOptions() {
        if (typeof document === 'undefined') return false;
        // This requires server headers, client-side detection is limited
        return false;
    }

    hasNoXContentTypeOptions() {
        if (typeof document === 'undefined') return false;
        // This requires server headers, client-side detection is limited
        return false;
    }

    hasNoStrictTransportSecurity() {
        if (typeof document === 'undefined') return false;
        // This requires server headers, client-side detection is limited
        return false;
    }

    hasVulnerableJavaScript() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        
        // Check for known vulnerable patterns
        return ua.includes('joomla') || ua.includes('wordpress');
    }

    hasTrackers() {
        if (typeof document === 'undefined') return false;
        
        const trackerPatterns = [
            'google-analytics',
            'facebook.com/tr',
            'mixpanel',
            'amplitude',
            'segment'
        ];

        const scripts = document.querySelectorAll('script');
        return Array.from(scripts).some(script => 
            trackerPatterns.some(pattern => 
                script.src.includes(pattern) || script.innerHTML.includes(pattern)
            )
        );
    }

    hasSuspiciousExtensions() {
        if (typeof navigator === 'undefined') return false;
        
        // Browser extensions can be detected through various methods
        // This is a basic check
        return navigator.plugins && navigator.plugins.length > 10;
    }

    getProtections() {
        return {
            https: this.hasHTTPS(),
            csp: this.hasCSP(),
            xframeOptions: this.hasXFrameOptions(),
            xContentTypeOptions: this.hasXContentTypeOptions(),
            strictTransportSecurity: this.hasStrictTransportSecurity(),
            subresourceIntegrity: this.hasSubresourceIntegrity(),
            referrerPolicy: this.hasReferrerPolicy(),
            permissionsPolicy: this.hasPermissionsPolicy()
        };
    }

    hasHTTPS() {
        if (typeof window === 'undefined') return false;
        return window.location.protocol === 'https:';
    }

    hasCSP() {
        if (typeof document === 'undefined') return false;
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return meta !== null;
    }

    hasXFrameOptions() {
        // Requires server headers
        return false;
    }

    hasXContentTypeOptions() {
        // Requires server headers
        return false;
    }

    hasStrictTransportSecurity() {
        // Requires server headers
        return false;
    }

    hasSubresourceIntegrity() {
        if (typeof document === 'undefined') return false;
        const scripts = document.querySelectorAll('script[integrity]');
        return scripts.length > 0;
    }

    hasReferrerPolicy() {
        if (typeof document === 'undefined') return false;
        const meta = document.querySelector('meta[name="referrer"]');
        return meta !== null;
    }

    hasPermissionsPolicy() {
        if (typeof document === 'undefined') return false;
        const meta = document.querySelector('meta[http-equiv="Permissions-Policy"]');
        return meta !== null;
    }

    getPrivacySettings() {
        return {
            doNotTrack: this.getDoNotTrack(),
            globalPrivacyControl: this.getGlobalPrivacyControl(),
            cookieConsent: this.hasCookieConsent(),
            privacyPolicy: this.hasPrivacyPolicy(),
            gdprCompliant: this.isGDPRCompliant(),
            ccpaCompliant: this.isCCPACompliant()
        };
    }

    getDoNotTrack() {
        if (typeof navigator === 'undefined') return null;
        return navigator.doNotTrack;
    }

    getGlobalPrivacyControl() {
        if (typeof navigator === 'undefined') return null;
        return navigator.globalPrivacyControl;
    }

    hasCookieConsent() {
        if (typeof document === 'undefined') return false;
        return document.cookie.includes('consent');
    }

    hasPrivacyPolicy() {
        if (typeof document === 'undefined') return false;
        const links = document.querySelectorAll('a[href*="privacy"]');
        return links.length > 0;
    }

    isGDPRCompliant() {
        if (typeof document === 'undefined') return false;
        const text = document.body.innerText.toLowerCase();
        return text.includes('gdpr') || text.includes('data protection');
    }

    isCCPACompliant() {
        if (typeof document === 'undefined') return false;
        const text = document.body.innerText.toLowerCase();
        return text.includes('ccpa') || text.includes('california');
    }

    getAuthenticationCapabilities() {
        return {
            webAuthn: this.hasWebAuthn(),
            fido2: this.hasFIDO2(),
            biometric: this.hasBiometric(),
            twoFactor: this.hasTwoFactor(),
            passwordManager: this.hasPasswordManager(),
            publicKeyInfrastructure: this.hasPKI()
        };
    }

    hasWebAuthn() {
        if (typeof navigator === 'undefined') return false;
        return navigator.credentials !== undefined;
    }

    hasFIDO2() {
        if (typeof navigator === 'undefined') return false;
        return navigator.credentials && navigator.credentials.create !== undefined;
    }

    hasBiometric() {
        if (typeof navigator === 'undefined') return false;
        return navigator.mediaDevices !== undefined;
    }

    hasTwoFactor() {
        // Application-specific detection
        return false;
    }

    hasPasswordManager() {
        // Difficult to detect reliably
        return false;
    }

    hasPKI() {
        if (typeof navigator === 'undefined') return false;
        return navigator.credentials !== undefined;
    }

    getEncryptionSupport() {
        return {
            aes: this.supportsAES(),
            rsa: this.supportsRSA(),
            ecdsa: this.supportsECDSA(),
            sha256: this.supportsSHA256(),
            tls12: this.supportsTLS12(),
            tls13: this.supportsTLS13()
        };
    }

    supportsAES() {
        if (typeof crypto === 'undefined') return false;
        return crypto.subtle !== undefined;
    }

    supportsRSA() {
        if (typeof crypto === 'undefined') return false;
        return crypto.subtle !== undefined;
    }

    supportsECDSA() {
        if (typeof crypto === 'undefined') return false;
        return crypto.subtle !== undefined;
    }

    supportsSHA256() {
        if (typeof crypto === 'undefined') return false;
        return crypto.subtle !== undefined;
    }

    supportsTLS12() {
        if (typeof navigator === 'undefined') return false;
        // Requires server-side verification
        return true;
    }

    supportsTLS13() {
        if (typeof navigator === 'undefined') return false;
        // Requires server-side verification
        return true;
    }

    getSandboxInfo() {
        return {
            isSandboxed: this.isSandboxed(),
            sandboxType: this.getSandboxType(),
            restrictions: this.getSandboxRestrictions()
        };
    }

    isSandboxed() {
        if (typeof window === 'undefined') return false;
        return window.self !== window.top;
    }

    getSandboxType() {
        if (typeof window === 'undefined') return 'unknown';
        
        if (window.self !== window.top) {
            return 'iframe';
        }
        return 'none';
    }

    getSandboxRestrictions() {
        if (typeof window === 'undefined') return [];
        
        const restrictions = [];
        
        if (window.self !== window.top) {
            restrictions.push('framed');
        }
        
        return restrictions;
    }

    checkMalwareIndicators() {
        return {
            suspiciousScripts: this.hasSuspiciousScripts(),
            malformedHTML: this.hasMalformedHTML(),
            injectedContent: this.hasInjectedContent(),
            redirects: this.hasRedirects()
        };
    }

    hasSuspiciousScripts() {
        if (typeof document === 'undefined') return false;
        
        const scripts = document.querySelectorAll('script');
        const suspicious = Array.from(scripts).some(script => {
            const src = script.src.toLowerCase();
            return src.includes('bit.ly') || 
                   src.includes('tinyurl') ||
                   src.includes('obfuscated');
        });

        return suspicious;
    }

    hasMalformedHTML() {
        if (typeof document === 'undefined') return false;
        
        // Check for common malformed patterns
        const html = document.documentElement.outerHTML;
        return html.includes('<!--[if') || html.includes('eval(');
    }

    hasInjectedContent() {
        if (typeof document === 'undefined') return false;
        
        const scripts = document.querySelectorAll('script');
        return scripts.length > 20; // Arbitrary threshold
    }

    hasRedirects() {
        if (typeof window === 'undefined') return false;
        
        // Check for meta refresh redirects
        const meta = document.querySelector('meta[http-equiv="refresh"]');
        return meta !== null;
    }
}

module.exports = SecurityDetector;
