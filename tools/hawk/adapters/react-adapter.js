/**
 * Hawk React Adapter
 * Provides React hooks and components for device detection
 */

import { useState, useEffect, useContext, createContext } from 'react';
import DeviceMonitor from '../src/hawk';

// Create context for device profile
const DeviceContext = createContext(null);

/**
 * useDeviceProfile Hook
 * Get device profile with loading and error states
 */
export function useDeviceProfile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const detectDevice = async () => {
            try {
                const monitor = new DeviceMonitor();
                const detectedProfile = await monitor.detect();

                if (isMounted) {
                    setProfile(detectedProfile);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err);
                    setProfile(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        detectDevice();

        return () => {
            isMounted = false;
        };
    }, []);

    return { profile, loading, error };
}

/**
 * useDeviceType Hook
 * Get device type classification
 */
export function useDeviceType() {
    const { profile, loading, error } = useDeviceProfile();

    return {
        isMobile: profile?.deviceType.isMobile || false,
        isDesktop: profile?.deviceType.isDesktop || false,
        isTablet: profile?.deviceType.type === 'tablet',
        type: profile?.deviceType.type || 'unknown',
        loading,
        error
    };
}

/**
 * useOS Hook
 * Get operating system information
 */
export function useOS() {
    const { profile, loading, error } = useDeviceProfile();

    return {
        name: profile?.os.name || 'unknown',
        version: profile?.os.version || null,
        loading,
        error
    };
}

/**
 * useCapabilities Hook
 * Get device capabilities
 */
export function useCapabilities() {
    const { profile, loading, error } = useDeviceProfile();

    return {
        capabilities: profile?.capabilities || {},
        has: (capability) => profile?.capabilities[capability] || false,
        loading,
        error
    };
}

/**
 * DeviceProvider Component
 * Wrap app to provide device context
 */
export function DeviceProvider({ children }) {
    const deviceData = useDeviceProfile();

    return (
        <DeviceContext.Provider value={deviceData}>
            {children}
        </DeviceContext.Provider>
    );
}

/**
 * useDeviceContext Hook
 * Access device context from wrapped components
 */
export function useDeviceContext() {
    const context = useContext(DeviceContext);

    if (!context) {
        throw new Error('useDeviceContext must be used within DeviceProvider');
    }

    return context;
}

/**
 * MobileOnly Component
 * Render only on mobile devices
 */
export function MobileOnly({ children, fallback = null }) {
    const { isMobile, loading } = useDeviceType();

    if (loading) return null;
    if (!isMobile) return fallback;

    return children;
}

/**
 * DesktopOnly Component
 * Render only on desktop devices
 */
export function DesktopOnly({ children, fallback = null }) {
    const { isDesktop, loading } = useDeviceType();

    if (loading) return null;
    if (!isDesktop) return fallback;

    return children;
}

/**
 * ResponsiveRender Component
 * Render different content based on device type
 */
export function ResponsiveRender({ mobile, desktop, tablet, loading = null }) {
    const { type, loading: isLoading } = useDeviceType();

    if (isLoading) return loading;

    switch (type) {
        case 'mobile':
            return mobile;
        case 'desktop':
            return desktop;
        case 'tablet':
            return tablet || desktop;
        default:
            return desktop;
    }
}

/**
 * DeviceInfo Component
 * Display device information
 */
export function DeviceInfo() {
    const { profile, loading, error } = useDeviceProfile();

    if (loading) return <div className="device-info loading">Detecting device...</div>;
    if (error) return <div className="device-info error">Error: {error.message}</div>;
    if (!profile) return null;

    return (
        <div className="device-info">
            <h3>Device Information</h3>
            <dl>
                <dt>OS</dt>
                <dd>{profile.os.name} {profile.os.version}</dd>

                <dt>Device Type</dt>
                <dd>{profile.deviceType.type}</dd>

                <dt>Architecture</dt>
                <dd>{profile.architecture.cpu}</dd>

                <dt>Runtime</dt>
                <dd>{profile.environment.runtime}</dd>

                <dt>Cores</dt>
                <dd>{profile.metadata.hardwareConcurrency || 'Unknown'}</dd>

                <dt>Memory</dt>
                <dd>{profile.metadata.deviceMemory ? `${profile.metadata.deviceMemory}GB` : 'Unknown'}</dd>
            </dl>
        </div>
    );
}

/**
 * CapabilitiesList Component
 * Display available capabilities
 */
export function CapabilitiesList() {
    const { capabilities, loading, error } = useCapabilities();

    if (loading) return <div>Loading capabilities...</div>;
    if (error) return <div>Error: {error.message}</div>;

    const enabledCapabilities = Object.entries(capabilities)
        .filter(([_, value]) => value)
        .map(([key]) => key);

    return (
        <div className="capabilities-list">
            <h3>Device Capabilities ({enabledCapabilities.length})</h3>
            <ul>
                {enabledCapabilities.map(capability => (
                    <li key={capability}>{capability}</li>
                ))}
            </ul>
        </div>
    );
}

/**
 * AdaptiveImage Component
 * Load different images based on device capabilities
 */
export function AdaptiveImage({ src, mobileSrc, tabletSrc, alt }) {
    const { type } = useDeviceType();

    let imageSrc = src;

    if (type === 'mobile' && mobileSrc) {
        imageSrc = mobileSrc;
    } else if (type === 'tablet' && tabletSrc) {
        imageSrc = tabletSrc;
    }

    return <img src={imageSrc} alt={alt} />;
}

/**
 * ConditionalFeature Component
 * Render feature only if capability is available
 */
export function ConditionalFeature({ capability, children, fallback = null }) {
    const { has, loading } = useCapabilities();

    if (loading) return null;
    if (!has(capability)) return fallback;

    return children;
}

export default {
    useDeviceProfile,
    useDeviceType,
    useOS,
    useCapabilities,
    useDeviceContext,
    DeviceProvider,
    MobileOnly,
    DesktopOnly,
    ResponsiveRender,
    DeviceInfo,
    CapabilitiesList,
    AdaptiveImage,
    ConditionalFeature
};
