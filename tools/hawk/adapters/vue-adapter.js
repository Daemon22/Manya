/**
 * Hawk Vue.js Adapter
 * Provides Vue composables and components for device detection
 */

import { ref, computed, provide, inject, onMounted } from 'vue';
import DeviceMonitor from '../src/hawk';

/**
 * useDeviceProfile Composable
 * Get device profile with loading and error states
 */
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

    return {
        profile,
        loading,
        error
    };
}

/**
 * useDeviceType Composable
 * Get device type classification
 */
export function useDeviceType() {
    const { profile, loading, error } = useDeviceProfile();

    const isMobile = computed(() => profile.value?.deviceType.isMobile || false);
    const isDesktop = computed(() => profile.value?.deviceType.isDesktop || false);
    const isTablet = computed(() => profile.value?.deviceType.type === 'tablet');
    const type = computed(() => profile.value?.deviceType.type || 'unknown');

    return {
        isMobile,
        isDesktop,
        isTablet,
        type,
        loading,
        error
    };
}

/**
 * useOS Composable
 * Get operating system information
 */
export function useOS() {
    const { profile, loading, error } = useDeviceProfile();

    const name = computed(() => profile.value?.os.name || 'unknown');
    const version = computed(() => profile.value?.os.version || null);

    return {
        name,
        version,
        loading,
        error
    };
}

/**
 * useCapabilities Composable
 * Get device capabilities
 */
export function useCapabilities() {
    const { profile, loading, error } = useDeviceProfile();

    const capabilities = computed(() => profile.value?.capabilities || {});

    const has = (capability) => {
        return capabilities.value[capability] || false;
    };

    return {
        capabilities,
        has,
        loading,
        error
    };
}

/**
 * createDevicePlugin
 * Create Vue plugin for device detection
 */
export function createDevicePlugin() {
    return {
        install(app) {
            const deviceData = useDeviceProfile();

            app.provide('device', deviceData);

            // Global properties
            app.config.globalProperties.$device = deviceData;
            app.config.globalProperties.$deviceType = useDeviceType();
            app.config.globalProperties.$os = useOS();
            app.config.globalProperties.$capabilities = useCapabilities();
        }
    };
}

/**
 * useDevice Composable
 * Access device context from provided data
 */
export function useDevice() {
    return inject('device', null);
}

/**
 * DeviceInfo Component
 * Display device information
 */
export const DeviceInfo = {
    template: `
        <div class="device-info">
            <div v-if="loading" class="loading">Detecting device...</div>
            <div v-else-if="error" class="error">Error: {{ error.message }}</div>
            <div v-else>
                <h3>Device Information</h3>
                <dl>
                    <dt>OS</dt>
                    <dd>{{ profile.os.name }} {{ profile.os.version }}</dd>

                    <dt>Device Type</dt>
                    <dd>{{ profile.deviceType.type }}</dd>

                    <dt>Architecture</dt>
                    <dd>{{ profile.architecture.cpu }}</dd>

                    <dt>Runtime</dt>
                    <dd>{{ profile.environment.runtime }}</dd>

                    <dt>Cores</dt>
                    <dd>{{ profile.metadata.hardwareConcurrency || 'Unknown' }}</dd>

                    <dt>Memory</dt>
                    <dd>{{ profile.metadata.deviceMemory ? profile.metadata.deviceMemory + 'GB' : 'Unknown' }}</dd>
                </dl>
            </div>
        </div>
    `,
    setup() {
        const { profile, loading, error } = useDeviceProfile();
        return { profile, loading, error };
    }
};

/**
 * CapabilitiesList Component
 * Display available capabilities
 */
export const CapabilitiesList = {
    template: `
        <div class="capabilities-list">
            <div v-if="loading">Loading capabilities...</div>
            <div v-else-if="error">Error: {{ error.message }}</div>
            <div v-else>
                <h3>Device Capabilities ({{ enabledCapabilities.length }})</h3>
                <ul>
                    <li v-for="capability in enabledCapabilities" :key="capability">
                        {{ capability }}
                    </li>
                </ul>
            </div>
        </div>
    `,
    setup() {
        const { capabilities, loading, error } = useCapabilities();

        const enabledCapabilities = computed(() => {
            return Object.entries(capabilities.value)
                .filter(([_, value]) => value)
                .map(([key]) => key);
        });

        return { enabledCapabilities, loading, error };
    }
};

/**
 * MobileOnly Component
 * Render only on mobile devices
 */
export const MobileOnly = {
    template: `
        <template v-if="!loading && isMobile">
            <slot />
        </template>
        <template v-else-if="!loading">
            <slot name="fallback" />
        </template>
    `,
    setup(props, { slots }) {
        const { isMobile, loading } = useDeviceType();
        return { isMobile, loading };
    }
};

/**
 * DesktopOnly Component
 * Render only on desktop devices
 */
export const DesktopOnly = {
    template: `
        <template v-if="!loading && isDesktop">
            <slot />
        </template>
        <template v-else-if="!loading">
            <slot name="fallback" />
        </template>
    `,
    setup() {
        const { isDesktop, loading } = useDeviceType();
        return { isDesktop, loading };
    }
};

/**
 * ResponsiveRender Component
 * Render different content based on device type
 */
export const ResponsiveRender = {
    template: `
        <template v-if="loading">
            <slot name="loading" />
        </template>
        <template v-else-if="type === 'mobile'">
            <slot name="mobile" />
        </template>
        <template v-else-if="type === 'tablet'">
            <slot name="tablet" />
        </template>
        <template v-else>
            <slot name="desktop" />
        </template>
    `,
    setup() {
        const { type, loading } = useDeviceType();
        return { type, loading };
    }
};

/**
 * AdaptiveImage Component
 * Load different images based on device type
 */
export const AdaptiveImage = {
    template: `
        <img :src="imageSrc" :alt="alt" />
    `,
    props: {
        src: String,
        mobileSrc: String,
        tabletSrc: String,
        alt: String
    },
    setup(props) {
        const { type } = useDeviceType();

        const imageSrc = computed(() => {
            if (type.value === 'mobile' && props.mobileSrc) {
                return props.mobileSrc;
            }
            if (type.value === 'tablet' && props.tabletSrc) {
                return props.tabletSrc;
            }
            return props.src;
        });

        return { imageSrc };
    }
};

/**
 * ConditionalFeature Component
 * Render feature only if capability is available
 */
export const ConditionalFeature = {
    template: `
        <template v-if="!loading && has(capability)">
            <slot />
        </template>
        <template v-else-if="!loading">
            <slot name="fallback" />
        </template>
    `,
    props: {
        capability: String
    },
    setup(props) {
        const { has, loading } = useCapabilities();
        return { has, loading };
    }
};

export default {
    useDeviceProfile,
    useDeviceType,
    useOS,
    useCapabilities,
    useDevice,
    createDevicePlugin,
    DeviceInfo,
    CapabilitiesList,
    MobileOnly,
    DesktopOnly,
    ResponsiveRender,
    AdaptiveImage,
    ConditionalFeature
};
