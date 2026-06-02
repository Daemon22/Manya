# Hawk

Hawk is a device detection and environment monitoring tool within the Manya ecosystem, providing comprehensive insights into client capabilities and configurations.

## Features

- **Device Detection**: Identifies device types, operating systems, and browsers.
- **Capability Checks**: Assesses environmental capabilities such as screen resolution, touch support, WebGL, audio, and network status.
- **Fingerprinting**: Generates unique device fingerprints for analytics and security.
- **Snapshot Functionality**: Provides a consolidated snapshot of device, capabilities, and fingerprint data.

## Installation

This tool is part of the Manya monorepo. To install all dependencies, navigate to the root of the Manya repository and run:

```sh
npm install
```

## Usage

Hawk can be used to gather detailed client-side information. For specific API calls and integration examples, refer to the source code and the main Manya documentation.

## Testing

To run tests for Hawk, navigate to the root of the Manya repository and execute:

```sh
npm run hawk:test
```
