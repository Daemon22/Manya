/**
 * @manya-os/cortex — shared utility.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { randomBytes } from 'crypto';

/** Generate a prefixed random ID. */
export function randomId(prefix: string = 'ctx', bytes: number = 8): string {
  return `${prefix}_${randomBytes(bytes).toString('hex')}`;
}
