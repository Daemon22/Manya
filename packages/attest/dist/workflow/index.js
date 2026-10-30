"use strict";
/**
 * @manya-os/attest — workflow barrel export.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSoftwareWorkflow = exports.AuthenticationWorkflow = exports.DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS = exports.DEFAULT_POLICY_SESSION_TTL_MS = exports.validatePolicy = exports.buildPolicy = exports.strictPolicy = exports.defaultPolicy = void 0;
var policies_js_1 = require("./policies.js");
Object.defineProperty(exports, "defaultPolicy", { enumerable: true, get: function () { return policies_js_1.defaultPolicy; } });
Object.defineProperty(exports, "strictPolicy", { enumerable: true, get: function () { return policies_js_1.strictPolicy; } });
Object.defineProperty(exports, "buildPolicy", { enumerable: true, get: function () { return policies_js_1.buildPolicy; } });
Object.defineProperty(exports, "validatePolicy", { enumerable: true, get: function () { return policies_js_1.validatePolicy; } });
Object.defineProperty(exports, "DEFAULT_POLICY_SESSION_TTL_MS", { enumerable: true, get: function () { return policies_js_1.DEFAULT_POLICY_SESSION_TTL_MS; } });
Object.defineProperty(exports, "DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS", { enumerable: true, get: function () { return policies_js_1.DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS; } });
var authenticator_js_1 = require("./authenticator.js");
Object.defineProperty(exports, "AuthenticationWorkflow", { enumerable: true, get: function () { return authenticator_js_1.AuthenticationWorkflow; } });
Object.defineProperty(exports, "createSoftwareWorkflow", { enumerable: true, get: function () { return authenticator_js_1.createSoftwareWorkflow; } });
//# sourceMappingURL=index.js.map