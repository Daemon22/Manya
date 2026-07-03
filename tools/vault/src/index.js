/**
 * Manya Vault — Encrypted key-value store for secrets, config, and credentials.
 * Everything Connected. Everyone Unified.
 */

import {
  create, put, get, del, keys, has, size,
  seal, open, inspect, search,
} from './store.js';

/**
 * Unified Vault API object.
 */
export const vault = {
  create,
  put,
  get,
  del,
  keys,
  has,
  size,
  seal,
  open,
  inspect,
  search,
};

export {
  create,
  put,
  get,
  del,
  keys,
  has,
  size,
  seal,
  open,
  inspect,
  search,
};

export default vault;
