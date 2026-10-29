"use strict";
/**
 * @manya-os/attest — trust barrel export.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTrustScore = exports.decideFromScore = exports.aggregateScore = exports.computeFactors = exports.CHALLENGE_DECISION_THRESHOLD = exports.TRUST_DECISION_THRESHOLD = exports.DEFAULT_FACTOR_WEIGHTS = exports.defaultTrustEvaluator = exports.TrustEvaluator = void 0;
var evaluator_js_1 = require("./evaluator.js");
Object.defineProperty(exports, "TrustEvaluator", { enumerable: true, get: function () { return evaluator_js_1.TrustEvaluator; } });
Object.defineProperty(exports, "defaultTrustEvaluator", { enumerable: true, get: function () { return evaluator_js_1.defaultTrustEvaluator; } });
var model_js_1 = require("./model.js");
Object.defineProperty(exports, "DEFAULT_FACTOR_WEIGHTS", { enumerable: true, get: function () { return model_js_1.DEFAULT_FACTOR_WEIGHTS; } });
Object.defineProperty(exports, "TRUST_DECISION_THRESHOLD", { enumerable: true, get: function () { return model_js_1.TRUST_DECISION_THRESHOLD; } });
Object.defineProperty(exports, "CHALLENGE_DECISION_THRESHOLD", { enumerable: true, get: function () { return model_js_1.CHALLENGE_DECISION_THRESHOLD; } });
Object.defineProperty(exports, "computeFactors", { enumerable: true, get: function () { return model_js_1.computeFactors; } });
Object.defineProperty(exports, "aggregateScore", { enumerable: true, get: function () { return model_js_1.aggregateScore; } });
Object.defineProperty(exports, "decideFromScore", { enumerable: true, get: function () { return model_js_1.decideFromScore; } });
Object.defineProperty(exports, "buildTrustScore", { enumerable: true, get: function () { return model_js_1.buildTrustScore; } });
//# sourceMappingURL=index.js.map