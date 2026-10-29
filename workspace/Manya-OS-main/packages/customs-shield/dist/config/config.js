"use strict";
/**
 * @manya-os/customs-shield — pipeline configuration.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.mergeConfig = mergeConfig;
exports.DEFAULT_CONFIG = {
    sanctionsThreshold: 0.75,
    holdThreshold: 50,
    computeDuty: true,
    logLevel: 'info',
};
function mergeConfig(user) {
    return { ...exports.DEFAULT_CONFIG, ...(user ?? {}) };
}
//# sourceMappingURL=config.js.map