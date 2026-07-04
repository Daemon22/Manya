/**
 * @manya/nervous-system — event model barrel.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

export {
  createEvent, serialize, deserialize, eventsEqual,
  generateEventId, isSeverity,
} from './event.js';
export type { CreateEventOptions } from './event.js';
