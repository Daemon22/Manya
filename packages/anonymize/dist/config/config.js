"use strict";
/**
 * @manya-os/anonymize — pipeline configuration.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.mergeConfig = mergeConfig;
exports.DEFAULT_CONFIG = {
    minConfidence: 0.5,
    defaultStrategy: 'mask',
    strategyByCategory: {
        credit_card: 'redact',
        national_id: 'redact',
        password: 'redact',
        api_key: 'redact',
        jwt_token: 'redact',
        bank_account: 'redact',
    },
    disabledDetectors: [],
    validateOutput: true,
    maxResidualRisk: 0.05,
    logLevel: 'info',
};
function mergeConfig(user) {
    return {
        ...exports.DEFAULT_CONFIG,
        ...(user ?? {}),
        strategyByCategory: {
            ...exports.DEFAULT_CONFIG.strategyByCategory,
            ...(user?.strategyByCategory ?? {}),
        },
    };
}
//# sourceMappingURL=config.js.map