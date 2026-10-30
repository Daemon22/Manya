/**
 * @manya-os/cortex — request router.
 *
 * Classifies an input string into an Intent and routes it to the
 * appropriate cortex component.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Intent, RoutedRequest } from '../types.js';
export declare class Router {
    /** Per-instance component overrides (takes precedence over the default map). */
    private readonly overrides;
    /** Classify an input string into an Intent. */
    classify(input: string): Intent;
    /** Route an input to the appropriate component. */
    route(input: string): RoutedRequest;
    /** Override the intent-to-component mapping for this Router instance. */
    setComponent(intent: Intent, component: string): void;
}
//# sourceMappingURL=router.d.ts.map