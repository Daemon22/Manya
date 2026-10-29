/**
 * @manya/constitution — decision hierarchy barrel.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

export {
  requireNode, escalationPath, findCommonAuthority, canOverride,
  ancestors, roots, children, validateHierarchy,
} from './hierarchy.js';
