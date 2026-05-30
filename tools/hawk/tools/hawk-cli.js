#!/usr/bin/env node

/**
 * Hawk CLI Tool
 * Command-line interface for device detection and monitoring
 */

const DeviceMonitor = require('../src/hawk');
const fs = require('fs');
const path = require('path');

class HawkCLI {
    constructor() {
        this.monitor = new DeviceMonitor();
        this.args = process.argv.slice(2);
        this.commands = {
            detect: this.detect.bind(this),
            monitor: this.monitor.bind(this),
            export: this.export.bind(this),
            compare: this.compare.bind(this),
            help: this.help.bind(this),
            version: this.version.bind(this)
        };
    }

    async run() {
        const command = this.args[0] || 'detect';

        if (this.commands[command]) {
            try {
                await this.commands[command]();
            } catch (error) {
                console.error(`Error: ${error.message}`);
                process.exit(1);
            }
        } else {
            console.error(`Unknown command: ${command}`);
            this.help();
            process.exit(1);
        }
    }

    async detect() {
        const format = this.getOption('--format', 'json');
        const profile = await this.monitor.detect();

        if (format === 'json') {
            console.log(JSON.stringify(profile, null, 2));
        } else if (format === 'table') {
            this.printTable(profile);
        } else if (format === 'yaml') {
            this.printYAML(profile);
        }
    }

    async monitor() {
        const interval = parseInt(this.getOption('--interval', '5000'));
        const duration = parseInt(this.getOption('--duration', '60000'));
        const format = this.getOption('--format', 'json');

        console.log(`Monitoring device for ${duration / 1000} seconds...`);

        const startTime = Date.now();
        let count = 0;

        while (Date.now() - startTime < duration) {
            const profile = await this.monitor.detect();
            count++;

            if (format === 'json') {
                console.log(`[${new Date().toISOString()}] Sample ${count}:`);
                console.log(JSON.stringify(profile, null, 2));
            } else if (format === 'compact') {
                console.log(`[${new Date().toISOString()}] ${profile.deviceType.type} | ${profile.os.name}`);
            }

            await new Promise(resolve => setTimeout(resolve, interval));
        }

        console.log(`Monitoring complete. Collected ${count} samples.`);
    }

    async export() {
        const filename = this.args[1] || 'hawk-profile.json';
        const profile = await this.monitor.detect();

        fs.writeFileSync(filename, JSON.stringify(profile, null, 2));
        console.log(`Profile exported to ${filename}`);
    }

    async compare() {
        const file1 = this.args[1];
        const file2 = this.args[2];

        if (!file1 || !file2) {
            console.error('Usage: hawk compare <file1> <file2>');
            process.exit(1);
        }

        const profile1 = JSON.parse(fs.readFileSync(file1, 'utf8'));
        const profile2 = JSON.parse(fs.readFileSync(file2, 'utf8'));

        const differences = this.findDifferences(profile1, profile2);

        if (Object.keys(differences).length === 0) {
            console.log('Profiles are identical');
        } else {
            console.log('Differences found:');
            console.log(JSON.stringify(differences, null, 2));
        }
    }

    findDifferences(obj1, obj2, path = '') {
        const differences = {};

        for (const key in obj1) {
            const currentPath = path ? `${path}.${key}` : key;

            if (typeof obj1[key] === 'object' && obj1[key] !== null) {
                const nested = this.findDifferences(obj1[key], obj2[key] || {}, currentPath);
                Object.assign(differences, nested);
            } else if (obj1[key] !== obj2[key]) {
                differences[currentPath] = {
                    old: obj1[key],
                    new: obj2[key]
                };
            }
        }

        return differences;
    }

    printTable(profile) {
        console.log('\n=== Device Profile ===\n');

        console.log('OS Information:');
        console.log(`  Name:     ${profile.os.name || 'Unknown'}`);
        console.log(`  Version:  ${profile.os.version || 'Unknown'}`);

        console.log('\nDevice Type:');
        console.log(`  Type:     ${profile.deviceType.type}`);
        console.log(`  Mobile:   ${profile.deviceType.isMobile}`);
        console.log(`  Desktop:  ${profile.deviceType.isDesktop}`);

        console.log('\nArchitecture:');
        console.log(`  CPU:      ${profile.architecture.cpu}`);
        console.log(`  Cores:    ${profile.architecture.cores || 'Unknown'}`);

        console.log('\nEnvironment:');
        console.log(`  Runtime:  ${profile.environment.runtime}`);
        console.log(`  Browser:  ${profile.environment.isBrowser}`);
        console.log(`  Node.js:  ${profile.environment.isNode}`);

        console.log('\nCapabilities:');
        Object.entries(profile.capabilities).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });

        console.log('\n');
    }

    printYAML(profile) {
        const yaml = this.toYAML(profile);
        console.log(yaml);
    }

    toYAML(obj, indent = 0) {
        let yaml = '';
        const spaces = ' '.repeat(indent);

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                yaml += `${spaces}${key}:\n${this.toYAML(value, indent + 2)}`;
            } else if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                value.forEach(item => {
                    yaml += `${spaces}  - ${item}\n`;
                });
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }

        return yaml;
    }

    getOption(name, defaultValue) {
        const index = this.args.indexOf(name);
        if (index !== -1 && index + 1 < this.args.length) {
            return this.args[index + 1];
        }
        return defaultValue;
    }

    help() {
        console.log(`
Hawk Device Detection CLI

Usage: hawk <command> [options]

Commands:
  detect              Detect current device (default)
  monitor             Monitor device changes over time
  export <file>       Export profile to file
  compare <f1> <f2>   Compare two profiles
  help                Show this help message
  version             Show version information

Options:
  --format <format>   Output format: json, table, yaml (default: json)
  --interval <ms>     Monitoring interval in milliseconds (default: 5000)
  --duration <ms>     Monitoring duration in milliseconds (default: 60000)

Examples:
  hawk detect
  hawk detect --format table
  hawk monitor --interval 1000 --duration 30000
  hawk export my-profile.json
  hawk compare profile1.json profile2.json
        `);
    }

    version() {
        const pkg = require('../package.json');
        console.log(`Hawk v${pkg.version}`);
    }
}

const cli = new HawkCLI();
cli.run().catch(error => {
    console.error(error);
    process.exit(1);
});
