/**
 * IoT Device Detector
 * Identifies IoT devices, smart home systems, and embedded devices
 */

class IoTDetector {
    canDetect(type) {
        return type === 'iot';
    }

    async detectIoT() {
        const iotProfile = {
            isIoT: this.isIoTDevice(),
            deviceClass: this.getDeviceClass(),
            connectivity: this.getConnectivity(),
            capabilities: this.getIoTCapabilities(),
            platform: this.getIoTPlatform(),
            security: this.getSecurityProfile()
        };

        return iotProfile;
    }

    isIoTDevice() {
        // Check for IoT indicators
        const indicators = {
            hasNodeMCU: typeof global.NodeMCU !== 'undefined',
            hasArduino: typeof global.Arduino !== 'undefined',
            hasRaspberryPi: this.checkRaspberryPi(),
            hasESP: this.checkESPChip(),
            hasSTM32: this.checkSTM32(),
            hasTeensyBoard: typeof global.Teensy !== 'undefined'
        };

        return Object.values(indicators).some(v => v);
    }

    checkRaspberryPi() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('raspberry') || ua.includes('rpi');
    }

    checkESPChip() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('esp8266') || ua.includes('esp32');
    }

    checkSTM32() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('stm32');
    }

    getDeviceClass() {
        const classes = {
            smartHome: this.isSmartHome(),
            wearable: this.isWearable(),
            industrial: this.isIndustrial(),
            automotive: this.isAutomotive(),
            medical: this.isMedical(),
            agricultural: this.isAgricultural(),
            environmental: this.isEnvironmental()
        };

        return Object.entries(classes)
            .filter(([, value]) => value)
            .map(([key]) => key);
    }

    isSmartHome() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('smart') || ua.includes('alexa') || ua.includes('google home');
    }

    isWearable() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('watch') || ua.includes('band') || ua.includes('fitbit');
    }

    isIndustrial() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('industrial') || ua.includes('plc') || ua.includes('scada');
    }

    isAutomotive() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('automotive') || ua.includes('vehicle') || ua.includes('car');
    }

    isMedical() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('medical') || ua.includes('health') || ua.includes('device');
    }

    isAgricultural() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('agricultural') || ua.includes('farm') || ua.includes('drone');
    }

    isEnvironmental() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('environmental') || ua.includes('sensor') || ua.includes('weather');
    }

    getConnectivity() {
        const connectivity = {
            wifi: this.hasWiFi(),
            bluetooth: this.hasBluetooth(),
            cellular: this.hasCellular(),
            zigbee: this.hasZigbee(),
            zwave: this.hasZWave(),
            lora: this.hasLoRa(),
            nfc: this.hasNFC(),
            ethernet: this.hasEthernet()
        };

        return Object.entries(connectivity)
            .filter(([, value]) => value)
            .map(([key]) => key);
    }

    hasWiFi() {
        if (typeof navigator === 'undefined') return false;
        return navigator.onLine !== undefined;
    }

    hasBluetooth() {
        if (typeof navigator === 'undefined') return false;
        return navigator.bluetooth !== undefined;
    }

    hasCellular() {
        if (typeof navigator === 'undefined') return false;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return connection && (connection.type === 'cellular' || connection.type === '4g');
    }

    hasZigbee() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('zigbee');
    }

    hasZWave() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('zwave') || ua.includes('z-wave');
    }

    hasLoRa() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('lora');
    }

    hasNFC() {
        if (typeof navigator === 'undefined') return false;
        return navigator.nfc !== undefined;
    }

    hasEthernet() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('ethernet');
    }

    getIoTCapabilities() {
        return {
            gpio: this.hasGPIO(),
            pwm: this.hasPWM(),
            adc: this.hasADC(),
            dac: this.hasDAC(),
            i2c: this.hasI2C(),
            spi: this.hasSPI(),
            uart: this.hasUART(),
            can: this.hasCANBus(),
            rtc: this.hasRTC(),
            watchdog: this.hasWatchdog()
        };
    }

    hasGPIO() {
        if (typeof navigator === 'undefined') return false;
        return navigator.gpio !== undefined;
    }

    hasPWM() {
        if (typeof navigator === 'undefined') return false;
        return navigator.pwm !== undefined;
    }

    hasADC() {
        if (typeof navigator === 'undefined') return false;
        return navigator.adc !== undefined;
    }

    hasDAC() {
        if (typeof navigator === 'undefined') return false;
        return navigator.dac !== undefined;
    }

    hasI2C() {
        if (typeof navigator === 'undefined') return false;
        return navigator.i2c !== undefined;
    }

    hasSPI() {
        if (typeof navigator === 'undefined') return false;
        return navigator.spi !== undefined;
    }

    hasUART() {
        if (typeof navigator === 'undefined') return false;
        return navigator.uart !== undefined;
    }

    hasCANBus() {
        if (typeof navigator === 'undefined') return false;
        return navigator.can !== undefined;
    }

    hasRTC() {
        if (typeof navigator === 'undefined') return false;
        return navigator.rtc !== undefined;
    }

    hasWatchdog() {
        if (typeof navigator === 'undefined') return false;
        return navigator.watchdog !== undefined;
    }

    getIoTPlatform() {
        if (typeof navigator === 'undefined') return 'unknown';

        const ua = navigator.userAgent.toLowerCase();

        if (ua.includes('arduino')) return 'arduino';
        if (ua.includes('esp8266')) return 'esp8266';
        if (ua.includes('esp32')) return 'esp32';
        if (ua.includes('raspberry')) return 'raspberrypi';
        if (ua.includes('stm32')) return 'stm32';
        if (ua.includes('teensy')) return 'teensy';
        if (ua.includes('beaglebone')) return 'beaglebone';
        if (ua.includes('jetson')) return 'jetson';
        if (ua.includes('fpga')) return 'fpga';

        return 'custom';
    }

    getSecurityProfile() {
        return {
            hasTLS: this.hasTLS(),
            hasEncryption: this.hasEncryption(),
            hasCertificatePinning: this.hasCertificatePinning(),
            hasSecureBoot: this.hasSecureBoot(),
            hasTrustZone: this.hasTrustZone(),
            hasHSM: this.hasHSM(),
            supportsOTA: this.supportsOTA()
        };
    }

    hasTLS() {
        if (typeof navigator === 'undefined') return false;
        return navigator.tls !== undefined;
    }

    hasEncryption() {
        if (typeof navigator === 'undefined') return false;
        return navigator.crypto !== undefined;
    }

    hasCertificatePinning() {
        if (typeof navigator === 'undefined') return false;
        return navigator.certificatePinning !== undefined;
    }

    hasSecureBoot() {
        if (typeof navigator === 'undefined') return false;
        return navigator.secureBoot !== undefined;
    }

    hasTrustZone() {
        if (typeof navigator === 'undefined') return false;
        return navigator.trustZone !== undefined;
    }

    hasHSM() {
        if (typeof navigator === 'undefined') return false;
        return navigator.hsm !== undefined;
    }

    supportsOTA() {
        if (typeof navigator === 'undefined') return false;
        return navigator.ota !== undefined;
    }
}

module.exports = IoTDetector;
