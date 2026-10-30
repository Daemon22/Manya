/**
 * @manya-os/memory — utility for generating stable IDs.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { randomBytes } from 'crypto';

/** Generate a prefixed random ID (default 16 hex chars). */
export function randomId(prefix: string = 'mem', bytes: number = 8): string {
  return `${prefix}_${randomBytes(bytes).toString('hex')}`;
}
