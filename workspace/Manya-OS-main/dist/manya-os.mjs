// packages/keyring/dist/esm/index.mjs
import * as crypto from "crypto";
import * as crypto2 from "crypto";
import * as crypto3 from "crypto";
import * as crypto4 from "crypto";
import * as crypto5 from "crypto";
import { randomUUID } from "crypto";
import { randomUUID as randomUUID2 } from "crypto";
import { randomBytes as randomBytes2 } from "crypto";
import * as crypto8 from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto6 from "crypto";
import { randomUUID as randomUUID3 } from "crypto";
import * as crypto7 from "crypto";
import { randomUUID as randomUUID4 } from "crypto";
import * as crypto9 from "crypto";
import * as crypto10 from "crypto";
import { randomUUID as randomUUID5 } from "crypto";
var KeyringError = class extends Error {
  code;
  cause;
  constructor(message, code, cause) {
    super(message), this.name = new.target.name, this.code = code ?? new.target.name, cause !== void 0 && (this.cause = cause), Object.setPrototypeOf(this, new.target.prototype);
  }
};
var KeyGenerationError = class extends KeyringError {
  constructor(message, cause) {
    super(message, "KEY_GENERATION_ERROR", cause);
  }
};
var SignatureError = class extends KeyringError {
  constructor(message, cause) {
    super(message, "SIGNATURE_ERROR", cause);
  }
};
var VerificationError = class extends KeyringError {
  constructor(message, cause) {
    super(message, "VERIFICATION_ERROR", cause);
  }
};
var EncryptionError = class extends KeyringError {
  constructor(message, cause) {
    super(message, "ENCRYPTION_ERROR", cause);
  }
};
var DecryptionError = class extends KeyringError {
  constructor(message, cause) {
    super(message, "DECRYPTION_ERROR", cause);
  }
};
var StorageError = class extends KeyringError {
  constructor(message, cause) {
    super(message, "STORAGE_ERROR", cause);
  }
};
var AccessDeniedError = class extends KeyringError {
  constructor(message, cause) {
    super(message, "ACCESS_DENIED_ERROR", cause);
  }
};
var CredentialError = class extends KeyringError {
  constructor(message, cause) {
    super(message, "CREDENTIAL_ERROR", cause);
  }
};
var SyncError = class extends KeyringError {
  constructor(message, cause) {
    super(message, "SYNC_ERROR", cause);
  }
};
var RecoveryError = class extends KeyringError {
  constructor(message, cause) {
    super(message, "RECOVERY_ERROR", cause);
  }
};
var HardwareKeyError = class extends KeyringError {
  constructor(message, cause) {
    super(message, "HARDWARE_KEY_ERROR", cause);
  }
};
var SCRUBBED_FIELD_NAMES = ["privateKey", "password", "passphrase", "token", "secret", "credential", "iv", "tag", "share"];
var SCRUB_REGEX = new RegExp("(?:" + SCRUBBED_FIELD_NAMES.map((n) => n.toLowerCase()).join("|") + ")$", "i");
var SilentLogger = class {
  debug() {
  }
  info() {
  }
  warn() {
  }
  error() {
  }
};
function sha256(data) {
  try {
    let buf = typeof data == "string" ? Buffer.from(data, "utf8") : data;
    return crypto.createHash("sha256").update(buf).digest();
  } catch (err) {
    throw new KeyringError("sha256 failed: " + err.message, "HASH_ERROR", err);
  }
}
function hkdf(ikm, salt, info, length) {
  if (length <= 0) throw new KeyringError("hkdf: length must be > 0", "HKDF_ERROR");
  if (length > 8160) throw new KeyringError("hkdf: length exceeds 255 * 32 (255 blocks of SHA-256)", "HKDF_ERROR");
  try {
    let result = crypto.hkdfSync("sha256", ikm, salt, info, length);
    return Buffer.from(result);
  } catch (err) {
    throw new KeyringError("hkdf failed: " + err.message, "HKDF_ERROR", err);
  }
}
function pbkdf2(passphrase, salt, iterations, keyLen, algo = "sha512") {
  if (iterations < 1e3) throw new KeyringError("pbkdf2: iterations below safe minimum (1000)", "PBKDF2_ERROR");
  try {
    return crypto.pbkdf2Sync(passphrase, salt, iterations, keyLen, algo);
  } catch (err) {
    throw new KeyringError("pbkdf2 failed: " + err.message, "PBKDF2_ERROR", err);
  }
}
function constantTimeEqual(a, b) {
  return a.length !== b.length ? false : crypto.timingSafeEqual(a, b);
}
var AES_256_KEY_BYTES = 32;
var AES_GCM_IV_BYTES = 12;
var AES_GCM_TAG_BYTES = 16;
function encrypt(key, plaintext, aad) {
  if (!Buffer.isBuffer(key) || key.length !== AES_256_KEY_BYTES) throw new EncryptionError(`AES-256-GCM requires a 32-byte key (got ${key?.length ?? 0})`);
  if (!Buffer.isBuffer(plaintext)) throw new EncryptionError("plaintext must be a Buffer");
  try {
    let iv = crypto2.randomBytes(AES_GCM_IV_BYTES), cipher = crypto2.createCipheriv("aes-256-gcm", key, iv, { authTagLength: AES_GCM_TAG_BYTES });
    aad && aad.length > 0 && cipher.setAAD(aad);
    let ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]), tag = cipher.getAuthTag();
    return { iv, ciphertext, tag };
  } catch (err) {
    throw err instanceof EncryptionError ? err : new EncryptionError("aes-256-gcm encrypt failed: " + err.message, err);
  }
}
function decrypt(key, iv, ciphertext, tag, aad) {
  if (!Buffer.isBuffer(key) || key.length !== AES_256_KEY_BYTES) throw new DecryptionError(`AES-256-GCM requires a 32-byte key (got ${key?.length ?? 0})`);
  if (!Buffer.isBuffer(iv) || iv.length !== AES_GCM_IV_BYTES) throw new DecryptionError(`IV must be ${AES_GCM_IV_BYTES} bytes`);
  if (!Buffer.isBuffer(tag) || tag.length !== AES_GCM_TAG_BYTES) throw new DecryptionError(`tag must be ${AES_GCM_TAG_BYTES} bytes`);
  try {
    let decipher = crypto2.createDecipheriv("aes-256-gcm", key, iv, { authTagLength: AES_GCM_TAG_BYTES });
    return decipher.setAuthTag(tag), aad && aad.length > 0 && decipher.setAAD(aad), Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (err) {
    throw err instanceof DecryptionError ? err : new DecryptionError("aes-256-gcm decrypt failed: " + err.message, err);
  }
}
var DEFAULT_RSA_MODULUS = 3072;
var DEFAULT_RSA_EXPONENT = 65537;
var DEFAULT_EC_CURVE = "prime256v1";
function algorithmFor(algo) {
  switch (algo) {
    case "rsa":
      return "rsa-pss";
    case "ecdsa":
      return "ecdsa-p256";
    default:
      throw new KeyGenerationError(`unknown key algorithm: ${algo}`);
  }
}
function generateKeyPair(algo, opts = {}) {
  try {
    let publicKey, privateKey;
    if (algo === "rsa") ({ publicKey, privateKey } = crypto3.generateKeyPairSync("rsa", { modulusLength: opts.rsaModulusBits ?? DEFAULT_RSA_MODULUS, publicExponent: opts.rsaPublicExponent ?? DEFAULT_RSA_EXPONENT }));
    else if (algo === "ecdsa") {
      let curve = opts.ecCurve ?? DEFAULT_EC_CURVE;
      if (curve !== "prime256v1") throw new KeyGenerationError(`unsupported EC curve: ${curve}. Only 'prime256v1' (NIST P-256) is supported.`);
      ({ publicKey, privateKey } = crypto3.generateKeyPairSync("ec", { namedCurve: curve }));
    } else throw new KeyGenerationError(`unknown key algorithm: ${algo}`);
    return { publicKey, privateKey, algorithm: algorithmFor(algo) };
  } catch (err) {
    throw err instanceof KeyGenerationError ? err : new KeyGenerationError("key generation failed: " + err.message, err);
  }
}
function deriveKey(master, info, length) {
  let infoBuf = typeof info == "string" ? Buffer.from(info, "utf8") : info, salt = Buffer.alloc(32, 0);
  return hkdf(master, salt, infoBuf, length);
}
function exportKeyPem(key, type) {
  try {
    return type === "public" ? key.export({ type: "spki", format: "pem" }).toString("utf8") : key.export({ type: "pkcs8", format: "pem" }).toString("utf8");
  } catch (err) {
    throw new KeyGenerationError(`failed to export ${type} key to PEM: ${err.message}`, err);
  }
}
function getKeyFingerprint(publicKey) {
  try {
    let der = (typeof publicKey == "string" ? crypto3.createPublicKey(publicKey) : publicKey).export({ type: "spki", format: "der" });
    return sha256(der).toString("hex");
  } catch (err) {
    throw new KeyGenerationError("getKeyFingerprint failed: " + err.message, err);
  }
}
function exportPublicRaw(key) {
  try {
    return key.export({ type: "spki", format: "der" });
  } catch (err) {
    throw new KeyringError("exportPublicRaw failed: " + err.message, "KEY_EXPORT_ERROR", err);
  }
}
var SIGN_HASH = "sha256";
function asPublicKey(key) {
  if (typeof key == "string") try {
    return crypto4.createPublicKey(key);
  } catch (err) {
    throw new VerificationError("invalid public key PEM: " + err.message, err);
  }
  return key;
}
function asPrivateKey(key) {
  if (typeof key == "string") try {
    return crypto4.createPrivateKey(key);
  } catch (err) {
    throw new SignatureError("invalid private key PEM: " + err.message, err);
  }
  return key;
}
function sign2(privateKey, data, algo) {
  if (!Buffer.isBuffer(data)) throw new SignatureError("data must be a Buffer");
  let key = asPrivateKey(privateKey);
  try {
    if (algo === "rsa-pss") return crypto4.sign(SIGN_HASH, data, { key, padding: crypto4.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto4.constants.RSA_PSS_SALTLEN_DIGEST }).toString("hex");
    if (algo === "ecdsa-p256") return crypto4.sign(SIGN_HASH, data, key).toString("hex");
    throw new SignatureError(`unsupported signature algorithm: ${algo}`);
  } catch (err) {
    throw err instanceof SignatureError ? err : new SignatureError("sign failed: " + err.message, err);
  }
}
function verify2(publicKey, data, signature, algo) {
  if (!Buffer.isBuffer(data)) throw new VerificationError("data must be a Buffer");
  let signatureBuf;
  if (typeof signature == "string") {
    try {
      signatureBuf = Buffer.from(signature, "hex");
    } catch {
      throw new VerificationError("signature must be hex-encoded");
    }
    if (signatureBuf.length === 0 || !/^[0-9a-fA-F]+$/.test(signature)) throw new VerificationError("signature must be non-empty hex");
  } else signatureBuf = signature;
  let key = asPublicKey(publicKey), ok;
  try {
    if (algo === "rsa-pss") ok = crypto4.verify(SIGN_HASH, data, { key, padding: crypto4.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto4.constants.RSA_PSS_SALTLEN_DIGEST }, signatureBuf);
    else if (algo === "ecdsa-p256") ok = crypto4.verify(SIGN_HASH, data, key, signatureBuf);
    else throw new VerificationError(`unsupported signature algorithm: ${algo}`);
  } catch (err) {
    if (err instanceof VerificationError) throw err;
    return false;
  }
  let okByte = Buffer.from([ok ? 1 : 0]), expected = Buffer.from([1]);
  return constantTimeEqual(okByte, expected);
}
function proofTypeFor(algo) {
  return algo === "rsa-pss" ? "manya:rsa-pss:2024" : "manya:ecdsa-p256:2024";
}
var BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Encode(input) {
  if (input.length === 0) return "";
  let zeros = 0;
  for (; zeros < input.length && input[zeros] === 0; ) zeros++;
  let digits = [];
  for (let i = zeros; i < input.length; i++) {
    let carry = input[i];
    for (let j = 0; j < digits.length; j++) carry += digits[j] << 8, digits[j] = carry % 58, carry = carry / 58 | 0;
    for (; carry > 0; ) digits.push(carry % 58), carry = carry / 58 | 0;
  }
  let out = "";
  for (let i = 0; i < zeros; i++) out += BASE58_ALPHABET[0];
  for (let i = digits.length - 1; i >= 0; i--) out += BASE58_ALPHABET[digits[i]];
  return out;
}
function deriveDidKey(publicKey, algorithm) {
  try {
    let keyObj = typeof publicKey == "string" ? crypto5.createPublicKey(publicKey) : publicKey, body;
    if (algorithm === "rsa-pss") {
      let spkiDer = exportPublicRaw(keyObj), digest = sha256(spkiDer);
      body = Buffer.concat([Buffer.from([133, 26]), digest]);
    } else {
      let raw = keyObj.export({ type: "spki", format: "der" });
      body = Buffer.concat([Buffer.from([18, 0]), raw]);
    }
    return "did:key:z" + base58Encode(body);
  } catch (err) {
    throw new KeyGenerationError("deriveDidKey failed: " + err.message, err);
  }
}
var Identity = class _Identity {
  id;
  did;
  publicKey;
  algorithm;
  createdAt;
  metadata;
  constructor(params) {
    this.id = params.id ?? randomUUID(), this.did = params.did, this.publicKey = params.publicKey, this.algorithm = params.algorithm, this.createdAt = params.createdAt ?? (/* @__PURE__ */ new Date()).toISOString(), this.metadata = params.metadata ?? {};
  }
  static fromPublicKey(publicKeyPem, algorithm, metadata = {}) {
    let did = deriveDidKey(publicKeyPem, algorithm);
    return new _Identity({ did, publicKey: publicKeyPem, algorithm, metadata });
  }
  fingerprint() {
    return getKeyFingerprint(this.publicKey);
  }
  serialize() {
    return { id: this.id, did: this.did, publicKey: this.publicKey, algorithm: this.algorithm, createdAt: this.createdAt, metadata: this.metadata };
  }
  static deserialize(data) {
    if (!data || typeof data != "object") throw new KeyringError("Identity.deserialize: expected object", "IDENTITY_DESERIALIZE_ERROR");
    let required = ["id", "did", "publicKey", "algorithm", "createdAt"];
    for (let key of required) if (!(key in data)) throw new KeyringError(`Identity.deserialize: missing field '${key}'`, "IDENTITY_DESERIALIZE_ERROR");
    if (data.algorithm !== "rsa-pss" && data.algorithm !== "ecdsa-p256") throw new KeyringError(`Identity.deserialize: unsupported algorithm '${data.algorithm}'`, "IDENTITY_DESERIALIZE_ERROR");
    return new _Identity({ id: data.id, did: data.did, publicKey: data.publicKey, algorithm: data.algorithm, createdAt: data.createdAt, metadata: data.metadata ?? {} });
  }
  equals(other) {
    return this.did === other.did;
  }
};
var Role = ((Role3) => (Role3.Admin = "admin", Role3.Agent = "agent", Role3.Operator = "operator", Role3.Auditor = "auditor", Role3.Guest = "guest", Role3))(Role || {});
var ALL_ROLES = ["admin", "agent", "operator", "auditor", "guest"];
function parseRole(value) {
  let r = ALL_ROLES.find((role) => role === value);
  if (!r) throw new KeyringError(`parseRole: '${value}' is not a valid Role`, "ROLE_PARSE_ERROR");
  return r;
}
var STORAGE_PREFIX = "manya:keyring:roles";
var RoleManager = class {
  constructor(storage) {
    this.storage = storage;
  }
  storage;
  inMemory = /* @__PURE__ */ new Map();
  loaded = /* @__PURE__ */ new Set();
  async assignRole(identityId, role) {
    this.assertIdentityId(identityId);
    let set = await this.load(identityId);
    set.add(role), await this.persist(identityId, set);
  }
  async revokeRole(identityId, role) {
    this.assertIdentityId(identityId);
    let set = await this.load(identityId);
    set.delete(role), await this.persist(identityId, set);
  }
  async revokeAll(identityId) {
    this.assertIdentityId(identityId);
    let set = /* @__PURE__ */ new Set();
    this.inMemory.set(identityId, set), this.loaded.add(identityId), this.storage && await this.storage.delete(`${STORAGE_PREFIX}:${identityId}`);
  }
  async hasRole(identityId, role) {
    return this.assertIdentityId(identityId), (await this.load(identityId)).has(role);
  }
  async hasAnyRole(identityId, roles) {
    this.assertIdentityId(identityId);
    let set = await this.load(identityId);
    return roles.some((r) => set.has(r));
  }
  async getRoles(identityId) {
    this.assertIdentityId(identityId);
    let set = await this.load(identityId);
    return Array.from(set);
  }
  async listIdentities() {
    return this.storage ? (await this.storage.list(`${STORAGE_PREFIX}:`)).map((k) => k.slice(`${STORAGE_PREFIX}:`.length)) : Array.from(this.inMemory.keys());
  }
  assertIdentityId(id) {
    if (typeof id != "string" || id.length === 0) throw new KeyringError("identityId must be a non-empty string", "ROLE_ERROR");
  }
  async load(identityId) {
    if (this.inMemory.has(identityId) && this.loaded.has(identityId)) return this.inMemory.get(identityId);
    let set = /* @__PURE__ */ new Set();
    if (this.storage) {
      let raw = await this.storage.get(`${STORAGE_PREFIX}:${identityId}`);
      if (raw && raw.length > 0) try {
        let parsed = JSON.parse(raw.toString("utf8"));
        Array.isArray(parsed) && (set = new Set(parsed.map((r) => {
          if (typeof r != "string") throw new KeyringError("role entry must be string", "ROLE_PARSE_ERROR");
          return parseRole(r);
        })));
      } catch (err) {
        throw err instanceof KeyringError ? err : new KeyringError("RoleManager.load: corrupt role data", "ROLE_PARSE_ERROR", err);
      }
    }
    return this.inMemory.set(identityId, set), this.loaded.add(identityId), set;
  }
  async persist(identityId, set) {
    if (this.storage) {
      let json = JSON.stringify(Array.from(set));
      await this.storage.put(`${STORAGE_PREFIX}:${identityId}`, Buffer.from(json, "utf8"));
    }
  }
};
function newRoleAssignmentId() {
  return "role-" + randomUUID2();
}
function matchResource(pattern, value) {
  if (pattern === value) return true;
  if (pattern.endsWith(":*")) {
    let prefix = pattern.slice(0, -1);
    return value.startsWith(prefix);
  }
  return pattern === "*";
}
var AccessPolicySet = class {
  policies = /* @__PURE__ */ new Map();
  add(policy) {
    this.assertValid(policy);
    let key = this.key(policy.resource, policy.action);
    this.policies.set(key, { ...policy });
  }
  remove(resource, action) {
    let key = this.key(resource, action);
    return this.policies.delete(key);
  }
  list() {
    return Array.from(this.policies.values());
  }
  get(resource, action) {
    return this.policies.get(this.key(resource, action));
  }
  match(resource, action) {
    let exact = this.get(resource, action);
    if (exact) return exact;
    let best, bestScore = -1;
    for (let p of this.policies.values()) {
      if (p.action !== action || !matchResource(p.resource, resource)) continue;
      let score = p.resource === resource ? 1e3 + p.resource.length : p.resource.endsWith(":*") ? p.resource.length : 1;
      score > bestScore && (bestScore = score, best = p);
    }
    return best;
  }
  replaceAll(policies) {
    this.policies.clear();
    for (let p of policies) this.add(p);
  }
  get size() {
    return this.policies.size;
  }
  key(resource, action) {
    return `${resource}::${action}`;
  }
  assertValid(policy) {
    if (!policy || typeof policy != "object") throw new KeyringError("AccessPolicy must be an object", "POLICY_ERROR");
    if (typeof policy.resource != "string" || policy.resource.length === 0) throw new KeyringError("AccessPolicy.resource must be a non-empty string", "POLICY_ERROR");
    if (typeof policy.action != "string" || policy.action.length === 0) throw new KeyringError("AccessPolicy.action must be a non-empty string", "POLICY_ERROR");
    if (!Array.isArray(policy.allow) || policy.allow.length === 0) throw new KeyringError("AccessPolicy.allow must be a non-empty Role[]", "POLICY_ERROR");
  }
};
function defaultPolicySet() {
  let set = new AccessPolicySet();
  return set.add({ resource: "wallet:identity", action: "create", allow: ["admin", "agent"], description: "Create a new identity in the wallet." }), set.add({ resource: "wallet:identity", action: "read", allow: ["admin", "agent", "operator", "auditor"], description: "List/read identities." }), set.add({ resource: "wallet:credential", action: "issue", allow: ["admin", "agent"], description: "Issue a verifiable credential." }), set.add({ resource: "wallet:credential", action: "verify", allow: ["admin", "agent", "operator", "auditor", "guest"], description: "Verify a credential signature." }), set.add({ resource: "wallet:credential", action: "read", allow: ["admin", "agent", "operator", "auditor"], description: "List credentials in the wallet." }), set.add({ resource: "wallet:credential", action: "delete", allow: ["admin"], description: "Delete a credential." }), set.add({ resource: "wallet:sign", action: "perform", allow: ["admin", "agent", "operator"], description: "Sign arbitrary data with a wallet identity." }), set.add({ resource: "wallet:export", action: "perform", allow: ["admin"], description: "Export an encrypted wallet blob." }), set.add({ resource: "wallet:sync", action: "perform", allow: ["admin", "agent"], description: "Produce or apply a sync bundle." }), set.add({ resource: "wallet:recovery", action: "perform", allow: ["admin"], description: "Create or restore a backup; split/combine Shamir shares." }), set.add({ resource: "role:*", action: "manage", allow: ["admin"], description: "Manage role assignments." }), set;
}
function matchResource2(pattern, value) {
  if (pattern === value) return true;
  if (pattern.endsWith(":*")) {
    let prefix = pattern.slice(0, -1);
    return value.startsWith(prefix);
  }
  return pattern === "*";
}
var CapabilityGrantManager = class {
  grants = /* @__PURE__ */ new Map();
  revocations = [];
  issue(params) {
    if (!params.grantor) throw new KeyringError("grantor is required", "GRANT_ERROR");
    if (!params.grantee) throw new KeyringError("grantee is required", "GRANT_ERROR");
    if (!params.resource) throw new KeyringError("resource is required", "GRANT_ERROR");
    if (!params.actions || params.actions.length === 0) throw new KeyringError("at least one action is required", "GRANT_ERROR");
    if (!params.validUntil) throw new KeyringError("validUntil is required", "GRANT_ERROR");
    let now = (/* @__PURE__ */ new Date()).toISOString(), grant = { id: `grant_${randomBytes2(8).toString("hex")}`, grantor: params.grantor, grantee: params.grantee, resource: params.resource, actions: [...params.actions], validFrom: now, validUntil: params.validUntil, maxUses: params.maxUses, useCount: 0, revoked: false, metadata: params.metadata };
    return this.grants.set(grant.id, grant), grant;
  }
  validate(grantId, resource, action) {
    let grant = this.grants.get(grantId);
    if (!grant) return { allowed: false, reason: `grant '${grantId}' not found` };
    if (grant.revoked) return { allowed: false, reason: `grant '${grantId}' has been revoked` };
    let now = /* @__PURE__ */ new Date();
    return now < new Date(grant.validFrom) ? { allowed: false, reason: `grant '${grantId}' is not yet active` } : now > new Date(grant.validUntil) ? { allowed: false, reason: `grant '${grantId}' has expired` } : grant.maxUses !== void 0 && grant.useCount >= grant.maxUses ? { allowed: false, reason: `grant '${grantId}' has reached its maximum use count` } : matchResource2(grant.resource, resource) ? !grant.actions.includes(action) && !grant.actions.includes("*") ? { allowed: false, reason: `grant '${grantId}' does not cover action '${action}'` } : { allowed: true, reason: `grant '${grantId}' permits '${action}' on '${resource}'` } : { allowed: false, reason: `grant '${grantId}' does not cover resource '${resource}'` };
  }
  recordUse(grantId) {
    let grant = this.grants.get(grantId);
    grant && (grant.useCount += 1);
  }
  revoke(grantId, revokedBy, reason) {
    let grant = this.grants.get(grantId);
    if (!grant) throw new KeyringError(`grant '${grantId}' not found`, "GRANT_ERROR");
    if (grant.revoked) throw new KeyringError(`grant '${grantId}' is already revoked`, "GRANT_ERROR");
    let now = (/* @__PURE__ */ new Date()).toISOString();
    grant.revoked = true, grant.revokedAt = now;
    let revocation = { grantId, revokedAt: now, revokedBy, reason };
    return this.revocations.push(revocation), revocation;
  }
  get(grantId) {
    return this.grants.get(grantId);
  }
  activeGrantsFor(grantee) {
    let now = /* @__PURE__ */ new Date();
    return Array.from(this.grants.values()).filter((g) => g.grantee === grantee && !g.revoked && now >= new Date(g.validFrom) && now <= new Date(g.validUntil) && (g.maxUses === void 0 || g.useCount < g.maxUses));
  }
  all() {
    return Array.from(this.grants.values());
  }
  getRevocations() {
    return [...this.revocations];
  }
  size() {
    return this.grants.size;
  }
};
var AccessEnforcer = class {
  constructor(roles, policies, grants) {
    this.roles = roles;
    this.policies = policies;
    this.grants = grants ?? new CapabilityGrantManager();
  }
  roles;
  policies;
  grants;
  async enforce(identityId, resource, action) {
    let activeGrants = this.grants.activeGrantsFor(identityId);
    for (let grant of activeGrants) {
      let { allowed: allowed2 } = this.grants.validate(grant.id, resource, action);
      if (allowed2) return this.grants.recordUse(grant.id), { allowed: true, reason: `permitted by capability grant '${grant.id}'`, resource, action, grantUsed: grant.id };
    }
    let roles = await this.roles.getRoles(identityId), policy = this.policies.match(resource, action);
    if (!policy) return { allowed: false, reason: `no policy matches resource='${resource}' action='${action}'`, resource, action };
    let denied = this.intersect(roles, policy.deny ?? []);
    if (denied.length > 0) return { allowed: false, reason: `role(s) ${denied.join(", ")} denied by policy`, resource: policy.resource, action: policy.action };
    let allowed = this.intersect(roles, policy.allow);
    return allowed.length === 0 ? { allowed: false, reason: `none of the caller's roles [${roles.join(", ")}] are permitted by policy`, resource: policy.resource, action: policy.action } : { allowed: true, reason: `permitted by role(s) ${allowed.join(", ")}`, resource: policy.resource, action: policy.action };
  }
  async enforceOrThrow(identityId, resource, action) {
    let result = await this.enforce(identityId, resource, action);
    if (!result.allowed) throw new AccessDeniedError(result.reason);
    return result;
  }
  inspect(resource, action) {
    return this.policies.match(resource, action);
  }
  get grantManager() {
    return this.grants;
  }
  intersect(a, b) {
    let set = new Set(b);
    return a.filter((r) => set.has(r));
  }
};
var InMemoryStorage = class {
  map = /* @__PURE__ */ new Map();
  async get(key) {
    let v = this.map.get(key);
    return v ? Buffer.from(v) : null;
  }
  async put(key, value) {
    if (!Buffer.isBuffer(value)) throw new StorageError("InMemoryStorage.put: value must be a Buffer");
    this.map.set(key, Buffer.from(value));
  }
  async delete(key) {
    this.map.delete(key);
  }
  async list(prefix) {
    let keys = Array.from(this.map.keys());
    return prefix ? keys.filter((k) => k.startsWith(prefix)).sort() : keys.sort();
  }
  get size() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
};
function assertValidKey(key) {
  if (typeof key != "string" || key.length === 0) throw new StorageError("storage key must be a non-empty string");
  if (key.length > 1024) throw new StorageError("storage key too long (>1024 chars)");
  if (!/^[A-Za-z0-9:_\-.]+$/.test(key)) throw new StorageError(`storage key contains forbidden characters: '${key}'`);
  if (key.includes("..")) throw new StorageError("storage key must not contain path-traversal sequences");
}
var FileStorage = class {
  constructor(dirPath) {
    this.dirPath = dirPath;
    if (typeof dirPath != "string" || dirPath.length === 0) throw new StorageError("FileStorage: dirPath must be a non-empty string");
  }
  dirPath;
  async ensureInitialized() {
    try {
      await fs.mkdir(this.dirPath, { recursive: true });
    } catch (err) {
      throw new StorageError(`FileStorage.init: mkdir failed: ${err.message}`, err);
    }
  }
  async get(key) {
    assertValidKey(key);
    let filePath = this.pathFor(key);
    try {
      return await fs.readFile(filePath);
    } catch (err) {
      let e = err;
      if (e && e.code === "ENOENT") return null;
      throw new StorageError(`FileStorage.get('${key}') failed: ${err.message}`, err);
    }
  }
  async put(key, value) {
    if (assertValidKey(key), !Buffer.isBuffer(value)) throw new StorageError("FileStorage.put: value must be a Buffer");
    let filePath = this.pathFor(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    let tmpPath = filePath + ".tmp." + crypto6.randomBytes(6).toString("hex"), fd = await fs.open(tmpPath, "w");
    try {
      await fd.writeFile(value);
      try {
        await fd.sync();
      } catch {
      }
    } finally {
      await fd.close();
    }
    try {
      await fs.rename(tmpPath, filePath);
    } catch (err) {
      try {
        await fs.unlink(tmpPath);
      } catch {
      }
      throw new StorageError(`FileStorage.put('${key}'): rename failed: ${err.message}`, err);
    }
  }
  async delete(key) {
    assertValidKey(key);
    let filePath = this.pathFor(key);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      let e = err;
      if (e && e.code === "ENOENT") return;
      throw new StorageError(`FileStorage.delete('${key}') failed: ${err.message}`, err);
    }
  }
  async list(prefix) {
    let results = [], stack = [this.dirPath];
    for (; stack.length > 0; ) {
      let dir = stack.pop(), entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (err) {
        let e = err;
        if (e && e.code === "ENOENT") continue;
        throw new StorageError(`FileStorage.list: readdir failed: ${err.message}`, err);
      }
      for (let entry of entries) {
        let full = path.join(dir, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.isFile() && !entry.name.endsWith(".tmp")) {
          let key = path.relative(this.dirPath, full).split(path.sep).join(":");
          (!prefix || key.startsWith(prefix)) && results.push(key);
        }
      }
    }
    return results.sort();
  }
  pathFor(key) {
    let parts = key.split(":").join("/").split("/");
    return path.join(this.dirPath, ...parts);
  }
};
function canonicalCredentialBytes(credential) {
  let clone = { id: credential.id, issuer: credential.issuer, subject: credential.subject, claims: credential.claims, issuedAt: credential.issuedAt, ...credential.expiresAt !== void 0 ? { expiresAt: credential.expiresAt } : {} };
  return Buffer.from(JSON.stringify(stableSort(clone)), "utf8");
}
function stableSort(value) {
  if (Array.isArray(value)) return value.map((v) => stableSort(v));
  if (value && typeof value == "object" && !Buffer.isBuffer(value)) {
    let out = {};
    for (let key of Object.keys(value).sort()) out[key] = stableSort(value[key]);
    return out;
  }
  return value;
}
function issueCredential(params) {
  if (!params || typeof params != "object") throw new CredentialError("issueCredential: params required");
  if (typeof params.issuer != "string" || params.issuer.length === 0) throw new CredentialError("issueCredential: issuer DID required");
  if (typeof params.subject != "string" || params.subject.length === 0) throw new CredentialError("issueCredential: subject DID required");
  if (!params.claims || typeof params.claims != "object") throw new CredentialError("issueCredential: claims object required");
  if (params.algorithm !== "rsa-pss" && params.algorithm !== "ecdsa-p256") throw new CredentialError(`issueCredential: unsupported algorithm '${params.algorithm}'`);
  let id = params.id ?? "cred-" + randomUUID3(), issuedAt = params.issuedAt ?? (/* @__PURE__ */ new Date()).toISOString(), credential = { id, issuer: params.issuer, subject: params.subject, claims: params.claims, issuedAt, ...params.expiresAt !== void 0 ? { expiresAt: params.expiresAt } : {}, proof: { type: proofTypeFor(params.algorithm), created: issuedAt, verificationMethod: params.issuer, proofValue: "", algorithm: params.algorithm } }, bytes = canonicalCredentialBytes(credential), proofValue;
  try {
    proofValue = sign2(params.issuerPrivateKey, bytes, params.algorithm);
  } catch (err) {
    throw err instanceof CredentialError ? err : new CredentialError("issueCredential: signing failed: " + err.message, err);
  }
  return credential.proof.proofValue = proofValue, credential;
}
function verifyCredential(credential, issuerPublicKey) {
  if (!credential || !credential.proof) return false;
  let algo = credential.proof.algorithm;
  if (algo !== "rsa-pss" && algo !== "ecdsa-p256" || !credential.proof.proofValue || credential.proof.proofValue.length === 0) return false;
  let bytes = canonicalCredentialBytes(credential);
  try {
    return verify2(issuerPublicKey, bytes, credential.proof.proofValue, algo);
  } catch {
    return false;
  }
}
function validateCredential(credential, now = /* @__PURE__ */ new Date()) {
  if (!credential || typeof credential != "object") return false;
  let required = ["id", "issuer", "subject", "claims", "issuedAt", "proof"];
  for (let field of required) if (!(field in credential)) return false;
  if (typeof credential.id != "string" || credential.id.length === 0 || typeof credential.issuer != "string" || credential.issuer.length === 0 || typeof credential.subject != "string" || credential.subject.length === 0 || !credential.claims || typeof credential.claims != "object" || typeof credential.issuedAt != "string") return false;
  let issued = Date.parse(credential.issuedAt);
  if (Number.isNaN(issued)) return false;
  if (credential.expiresAt !== void 0) {
    let expires = Date.parse(credential.expiresAt);
    if (Number.isNaN(expires)) return false;
    let nowMs = typeof now == "string" ? Date.parse(now) : now.getTime();
    if (expires < nowMs) return false;
  }
  return true;
}
var SoftwareKeyProvider = class {
  keys = /* @__PURE__ */ new Map();
  isAvailable() {
    return true;
  }
  async generateKeyPair(algo, keyIdHint) {
    let { publicKey, privateKey, algorithm } = generateKeyPair(algo), keyId = keyIdHint ?? "sw-" + randomUUID4();
    if (this.keys.has(keyId)) throw new KeyGenerationError(`SoftwareKeyProvider.generateKeyPair: keyId '${keyId}' already exists`);
    return this.keys.set(keyId, { publicKey, privateKey, algorithm }), { keyId, publicKeyPem: exportKeyPem(publicKey, "public"), algorithm };
  }
  async sign(keyId, data) {
    let entry = this.keys.get(keyId);
    if (!entry) throw new HardwareKeyError(`SoftwareKeyProvider.sign: unknown keyId '${keyId}'`);
    let hex = sign2(entry.privateKey, data, entry.algorithm);
    return Buffer.from(hex, "hex");
  }
  async verify(keyId, data, signature) {
    let entry = this.keys.get(keyId);
    if (!entry) throw new HardwareKeyError(`SoftwareKeyProvider.verify: unknown keyId '${keyId}'`);
    return verify2(entry.publicKey, data, signature, entry.algorithm);
  }
  async deleteKey(keyId) {
    this.keys.delete(keyId);
  }
  async hasKey(keyId) {
    return this.keys.has(keyId);
  }
  replaceKey(keyId, privateKey) {
    let entry = this.keys.get(keyId);
    if (!entry) throw new HardwareKeyError(`SoftwareKeyProvider.replaceKey: unknown keyId '${keyId}'`);
    let publicKey = crypto7.createPublicKey(privateKey);
    this.keys.set(keyId, { ...entry, privateKey, publicKey });
  }
  getPrivateKey(keyId) {
    return this.keys.get(keyId)?.privateKey;
  }
  getPublicKey(keyId) {
    return this.keys.get(keyId)?.publicKey;
  }
  getAlgorithm(keyId) {
    return this.keys.get(keyId)?.algorithm;
  }
  get size() {
    return this.keys.size;
  }
  clear() {
    this.keys.clear();
  }
  importExistingKey(publicKey, privateKey, algorithm, keyIdHint) {
    let keyId = keyIdHint ?? "sw-" + randomUUID4();
    if (this.keys.has(keyId)) throw new KeyGenerationError(`SoftwareKeyProvider.importExistingKey: keyId '${keyId}' already exists`);
    return this.keys.set(keyId, { publicKey, privateKey, algorithm }), keyId;
  }
};
var WALLET_PBKDF2_ITERATIONS = 21e4;
var WALLET_SALT_BYTES = 16;
var WALLET_MASTER_KEY_BYTES = 32;
var WALLET_SCHEMA_VERSION = 1;
var WALLET_AAD = Buffer.from("manya-keyring-wallet-v1", "utf8");
var KeyringWallet = class {
  storage;
  hardwareProvider;
  logger;
  identities = /* @__PURE__ */ new Map();
  credentials = /* @__PURE__ */ new Map();
  primaryIdentityId = null;
  sequence = 0;
  roles;
  policies;
  access;
  constructor(opts = {}) {
    this.storage = opts.storage ?? new InMemoryStorage(), this.hardwareProvider = opts.hardwareProvider ?? new SoftwareKeyProvider(), this.logger = opts.logger ?? new SilentLogger(), this.roles = new RoleManager(this.storage), this.policies = defaultPolicySet(), this.access = new AccessEnforcer(this.roles, this.policies);
  }
  async createIdentity(algo = "ecdsa", metadata = {}) {
    let { publicKey, privateKey, algorithm } = generateKeyPair(algo), publicKeyPem = exportKeyPem(publicKey, "public"), identity = Identity.fromPublicKey(publicKeyPem, algorithm, metadata), keyId;
    try {
      keyId = (await this.hardwareProvider.generateKeyPair(algo)).keyId, this.hardwareProvider instanceof SoftwareKeyProvider && this.hardwareProvider.replaceKey(keyId, privateKey);
    } catch (err) {
      throw new KeyGenerationError("createIdentity: hardware provider rejected key: " + err.message, err);
    }
    let record = { identity, keyId, algorithm };
    return this.identities.set(identity.id, record), this.primaryIdentityId === null && (this.primaryIdentityId = identity.id), this.logger.info("keyring:identity:created", { identityId: identity.id, did: identity.did, algorithm }), identity;
  }
  async importIdentity(publicKeyPem, privateKey, algorithm, metadata = {}) {
    let identity = Identity.fromPublicKey(publicKeyPem, algorithm, metadata), registered = await this.hardwareProvider.generateKeyPair(algorithm === "rsa-pss" ? "rsa" : "ecdsa");
    return this.hardwareProvider instanceof SoftwareKeyProvider && this.hardwareProvider.replaceKey(registered.keyId, privateKey), this.identities.set(identity.id, { identity, keyId: registered.keyId, algorithm }), this.primaryIdentityId === null && (this.primaryIdentityId = identity.id), identity;
  }
  listIdentities() {
    return Array.from(this.identities.values()).map((r) => r.identity);
  }
  getIdentity(identityId) {
    return this.identities.get(identityId)?.identity;
  }
  getPrimaryIdentity() {
    if (this.primaryIdentityId !== null) return this.identities.get(this.primaryIdentityId)?.identity;
  }
  setPrimaryIdentity(identityId) {
    if (!this.identities.has(identityId)) throw new KeyringError(`setPrimaryIdentity: unknown identity '${identityId}'`, "IDENTITY_NOT_FOUND_ERROR");
    this.primaryIdentityId = identityId;
  }
  async issueCredential(subjectDid, claims, opts = {}) {
    let record = this.resolveIdentity(opts.issuerIdentityId), privateKey = this.extractPrivateKeyForSigning(record), credential = issueCredential({ issuer: record.identity.did, issuerPrivateKey: privateKey, algorithm: record.algorithm, subject: subjectDid, claims, ...opts.id !== void 0 ? { id: opts.id } : {}, ...opts.expiresAt !== void 0 ? { expiresAt: opts.expiresAt } : {} });
    return this.credentials.set(credential.id, credential), this.logger.info("keyring:credential:issued", { credentialId: credential.id, issuer: record.identity.did, subject: subjectDid }), credential;
  }
  async addCredential(credential) {
    if (!credential || !credential.id) throw new CredentialError("addCredential: credential.id required");
    this.credentials.set(credential.id, credential), this.logger.debug("keyring:credential:added", { credentialId: credential.id });
  }
  listCredentials() {
    return Array.from(this.credentials.values());
  }
  getCredential(id) {
    return this.credentials.get(id);
  }
  deleteCredential(id) {
    return this.credentials.delete(id);
  }
  async sign(data, identityId) {
    let record = this.resolveIdentity(identityId), privateKey = this.extractPrivateKeyForSigning(record), signature = sign2(privateKey, data, record.algorithm);
    return { algorithm: record.algorithm, signature };
  }
  async signViaProvider(data, identityId) {
    let record = this.resolveIdentity(identityId), sigBuf = await this.hardwareProvider.sign(record.keyId, data);
    return { algorithm: record.algorithm, signature: sigBuf.toString("hex") };
  }
  async verify(data, signature, opts = {}) {
    let publicKey, algorithm;
    if (opts.publicKey && opts.algorithm) publicKey = opts.publicKey, algorithm = opts.algorithm;
    else if (opts.identityId) {
      let record = this.identities.get(opts.identityId);
      if (!record) throw new VerificationError(`unknown identity: ${opts.identityId}`);
      publicKey = record.identity.publicKey, algorithm = record.algorithm;
    } else {
      let primary = this.getPrimaryIdentity();
      if (!primary) throw new VerificationError("no identity to verify against");
      publicKey = primary.publicKey, algorithm = primary.algorithm;
    }
    return verify2(publicKey, data, signature, algorithm);
  }
  async verifyCredential(credential, issuerIdentityId) {
    let publicKey;
    if (issuerIdentityId) {
      let record = this.identities.get(issuerIdentityId);
      if (!record) throw new VerificationError(`unknown identity: ${issuerIdentityId}`);
      publicKey = record.identity.publicKey;
    } else {
      let issuer = this.listIdentities().find((i) => i.did === credential.issuer);
      if (!issuer) return false;
      publicKey = issuer.publicKey;
    }
    return verifyCredential(credential, publicKey);
  }
  async exportEncrypted(passphrase) {
    if (typeof passphrase != "string" || passphrase.length === 0) throw new EncryptionError("exportEncrypted: passphrase required");
    let salt = crypto8.randomBytes(WALLET_SALT_BYTES), masterKey = pbkdf2(passphrase, salt, WALLET_PBKDF2_ITERATIONS, WALLET_MASTER_KEY_BYTES), identityRecords = [];
    for (let record of this.identities.values()) {
      let privateKeyPem = this.extractPrivateKeyForSigning(record).export({ type: "pkcs8", format: "pem" }), plain = Buffer.from(privateKeyPem, "utf8"), { iv, ciphertext, tag } = encrypt(masterKey, plain, WALLET_AAD);
      identityRecords.push({ identity: record.identity.serialize(), keyId: record.keyId, algorithm: record.algorithm, encryptedPrivateKey: { iv: iv.toString("base64"), ciphertext: ciphertext.toString("base64"), tag: tag.toString("base64") } });
    }
    let state = { schemaVersion: WALLET_SCHEMA_VERSION, primaryIdentityId: this.primaryIdentityId, identities: identityRecords, credentials: this.listCredentials(), sequence: this.sequence }, stateBytes = Buffer.from(JSON.stringify(state), "utf8"), outer = encrypt(masterKey, stateBytes, WALLET_AAD), blob = { kind: "manya-keyring-wallet", version: WALLET_SCHEMA_VERSION, salt: salt.toString("base64"), iv: outer.iv.toString("base64"), ciphertext: outer.ciphertext.toString("base64"), tag: outer.tag.toString("base64"), createdAt: (/* @__PURE__ */ new Date()).toISOString(), iterations: WALLET_PBKDF2_ITERATIONS };
    return this.logger.info("keyring:wallet:exported", { identities: identityRecords.length, credentials: state.credentials.length }), blob;
  }
  async importEncrypted(blob, passphrase) {
    if (!blob || blob.kind !== "manya-keyring-wallet") throw new DecryptionError("importEncrypted: not a manya-keyring-wallet blob");
    if (typeof passphrase != "string" || passphrase.length === 0) throw new DecryptionError("importEncrypted: passphrase required");
    let salt = Buffer.from(blob.salt, "base64"), masterKey = pbkdf2(passphrase, salt, blob.iterations ?? WALLET_PBKDF2_ITERATIONS, WALLET_MASTER_KEY_BYTES), stateBytes;
    try {
      stateBytes = decrypt(masterKey, Buffer.from(blob.iv, "base64"), Buffer.from(blob.ciphertext, "base64"), Buffer.from(blob.tag, "base64"), WALLET_AAD);
    } catch (err) {
      throw new DecryptionError("importEncrypted: decryption failed (wrong passphrase?): " + err.message, err);
    }
    let state;
    try {
      state = JSON.parse(stateBytes.toString("utf8"));
    } catch (err) {
      throw new DecryptionError("importEncrypted: corrupt state JSON", err);
    }
    this.identities.clear(), this.credentials.clear();
    for (let record of state.identities ?? []) {
      let identity = Identity.deserialize(record.identity);
      if (!record.encryptedPrivateKey) throw new DecryptionError(`importEncrypted: identity ${identity.id} missing encryptedPrivateKey`);
      let plain = decrypt(masterKey, Buffer.from(record.encryptedPrivateKey.iv, "base64"), Buffer.from(record.encryptedPrivateKey.ciphertext, "base64"), Buffer.from(record.encryptedPrivateKey.tag, "base64"), WALLET_AAD), privateKey = crypto8.createPrivateKey(plain.toString("utf8")), registered = await this.hardwareProvider.generateKeyPair(record.algorithm === "rsa-pss" ? "rsa" : "ecdsa");
      this.hardwareProvider instanceof SoftwareKeyProvider && this.hardwareProvider.replaceKey(registered.keyId, privateKey), this.identities.set(identity.id, { identity, keyId: registered.keyId, algorithm: record.algorithm });
    }
    for (let cred of state.credentials ?? []) this.credentials.set(cred.id, cred);
    this.primaryIdentityId = state.primaryIdentityId, this.sequence = state.sequence ?? 0, this.logger.info("keyring:wallet:imported", { identities: this.identities.size, credentials: this.credentials.size });
  }
  async assignRole(identityId, role) {
    await this.roles.assignRole(identityId, role);
  }
  async revokeRole(identityId, role) {
    await this.roles.revokeRole(identityId, role);
  }
  getSequence() {
    return this.sequence;
  }
  bumpSequence() {
    return this.sequence += 1, this.sequence;
  }
  resolveIdentity(identityId) {
    let id = identityId ?? this.primaryIdentityId ?? void 0;
    if (!id) throw new KeyringError("no identity available \u2014 call createIdentity first", "IDENTITY_NOT_FOUND_ERROR");
    let record = this.identities.get(id);
    if (!record) throw new KeyringError(`unknown identity: ${id}`, "IDENTITY_NOT_FOUND_ERROR");
    return record;
  }
  extractPrivateKeyForSigning(record) {
    if (this.hardwareProvider instanceof SoftwareKeyProvider) {
      let key = this.hardwareProvider.getPrivateKey(record.keyId);
      if (!key) throw new SignatureError(`extractPrivateKeyForSigning: no private key for keyId ${record.keyId}`);
      return key;
    }
    throw new SignatureError("hardware-backed provider does not expose private keys \u2014 use signViaProvider");
  }
};
var GF_EXP = new Uint8Array(512);
var GF_LOG = new Uint8Array(256);
(function() {
  let x = 1;
  for (let i = 0; i < 255; i++) GF_EXP[i] = x, GF_LOG[x] = i, x = (x << 1 ^ (x & 128 ? 283 : 0) ^ x) & 255;
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  GF_LOG[0] = 0;
})();
function gfMul(a, b) {
  return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
}
function gfDiv(a, b) {
  if (b === 0) throw new RecoveryError("GF(256) division by zero");
  return a === 0 ? 0 : GF_EXP[(GF_LOG[a] - GF_LOG[b] + 255) % 255];
}
function gfEval(coeffs, x) {
  let result = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) result = gfMul(result, x) ^ coeffs[i];
  return result;
}
function assertSplitParams(k, n) {
  if (!Number.isInteger(k) || !Number.isInteger(n)) throw new RecoveryError("k and n must be integers");
  if (k < 2) throw new RecoveryError(`k must be >= 2 (got ${k})`);
  if (n < k) throw new RecoveryError(`n must be >= k (got n=${n}, k=${k})`);
  if (n > 255) throw new RecoveryError(`n must be <= 255 (got ${n})`);
}
function shamirSplit(secret, k, n) {
  if (!Buffer.isBuffer(secret)) throw new RecoveryError("secret must be a Buffer");
  if (secret.length === 0) throw new RecoveryError("secret must be non-empty");
  assertSplitParams(k, n);
  let polys = [];
  for (let pos = 0; pos < secret.length; pos++) {
    let coeffs = new Uint8Array(k);
    coeffs[0] = secret[pos];
    let rand = crypto9.randomBytes(k - 1);
    for (let j = 1; j < k; j++) coeffs[j] = rand[j - 1];
    polys.push(coeffs);
  }
  let shares = [];
  for (let i = 0; i < n; i++) {
    let x = i + 1, out = Buffer.alloc(1 + secret.length);
    out[0] = x;
    for (let pos = 0; pos < secret.length; pos++) out[1 + pos] = gfEval(polys[pos], x);
    shares.push(out);
  }
  return shares;
}
function shamirCombine(shares) {
  if (!Array.isArray(shares) || shares.length < 2) throw new RecoveryError("need at least 2 shares to combine");
  let len = shares[0].length;
  if (len < 2) throw new RecoveryError("share too short (must be >= 2 bytes)");
  let xs = [];
  for (let i = 0; i < shares.length; i++) {
    if (!Buffer.isBuffer(shares[i])) throw new RecoveryError(`share ${i} is not a Buffer`);
    if (shares[i].length !== len) throw new RecoveryError("all shares must have the same length");
    if (shares[i][0] === 0) throw new RecoveryError("share x-coordinate must be non-zero");
    xs.push(shares[i][0]);
  }
  let seen = /* @__PURE__ */ new Set();
  for (let x of xs) {
    if (seen.has(x)) throw new RecoveryError(`duplicate share x-coordinate: ${x}`);
    seen.add(x);
  }
  let secretLen = len - 1, out = Buffer.alloc(secretLen);
  for (let pos = 0; pos < secretLen; pos++) {
    let secret = 0;
    for (let i = 0; i < shares.length; i++) {
      let xi = xs[i], yi = shares[i][1 + pos], num = 1, den = 1;
      for (let j = 0; j < shares.length; j++) {
        if (i === j) continue;
        let xj = xs[j];
        num = gfMul(num, xj), den = gfMul(den, xi ^ xj);
      }
      let term = gfMul(yi, gfDiv(num, den));
      secret ^= term;
    }
    out[pos] = secret;
  }
  return out;
}
function verifySharesConsistent(shares, k) {
  if (shares.length < k) return false;
  let reference = null, indices = [];
  for (let i = 0; i < k; i++) indices.push(i);
  let nextSubset = () => {
    let i = k - 1;
    for (; i >= 0 && indices[i] === shares.length - k + i; ) i--;
    if (i < 0) return false;
    indices[i]++;
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
    return true;
  };
  do {
    let subset = indices.map((idx) => shares[idx]), recovered = shamirCombine(subset);
    if (reference === null) reference = recovered;
    else if (!recovered.equals(reference)) return false;
  } while (nextSubset());
  return true;
}
var BACKUP_VERSION = 1;
var BACKUP_AAD = Buffer.from("manya-keyring-backup-v1", "utf8");
var SYNC_BUNDLE_VERSION = 1;
function canonicalBundleBytes(bundle) {
  let stable = stableSort2(bundle);
  return Buffer.from(JSON.stringify(stable), "utf8");
}
function stableSort2(value) {
  if (Array.isArray(value)) return value.map((v) => stableSort2(v));
  if (value && typeof value == "object" && !Buffer.isBuffer(value)) {
    let out = {};
    for (let key of Object.keys(value).sort()) out[key] = stableSort2(value[key]);
    return out;
  }
  return value;
}
var MultiDeviceSync = class {
  createSyncBundle(wallet, signerIdentityId) {
    let primary = signerIdentityId ? wallet.getIdentity(signerIdentityId) : wallet.getPrimaryIdentity();
    if (!primary) throw new SyncError("createSyncBundle: wallet has no primary identity");
    let credentials = wallet.listCredentials(), sequence = wallet.getSequence() + 1, timestamp = (/* @__PURE__ */ new Date()).toISOString(), unsigned = { version: SYNC_BUNDLE_VERSION, sourceDid: primary.did, timestamp, sequence, identity: primary.serialize(), credentials }, bytes = canonicalBundleBytes(unsigned), signatureHex, algorithm, provider = wallet.hardwareProvider, isSoftware = provider && typeof provider.getPrivateKey == "function", record = wallet, resolved;
    try {
      resolved = record.resolveIdentity(signerIdentityId);
    } catch (err) {
      throw new SyncError("createSyncBundle: could not resolve signer identity: " + err.message, err);
    }
    if (algorithm = resolved.algorithm, isSoftware) {
      let sk = provider.getPrivateKey(resolved.keyId);
      if (!sk) throw new SyncError("createSyncBundle: signer private key not available");
      signatureHex = sign2(sk, bytes, algorithm);
    } else throw new SyncError("createSyncBundle: hardware-backed wallets must override createSyncBundle (sync signing requires a private key)");
    return { ...unsigned, proof: { type: "manya:sync-bundle:2024", algorithm, value: signatureHex } };
  }
  async applySyncBundle(wallet, bundle, sourcePublicKey) {
    if (!bundle || bundle.version !== SYNC_BUNDLE_VERSION) throw new SyncError(`applySyncBundle: unsupported bundle version ${bundle?.version}`);
    if (!bundle.proof || !bundle.proof.value) throw new SyncError("applySyncBundle: bundle missing proof");
    if (!bundle.identity) throw new SyncError("applySyncBundle: bundle missing identity");
    let { proof, ...unsigned } = bundle, bytes = canonicalBundleBytes(unsigned), ok;
    try {
      ok = verify2(sourcePublicKey, bytes, bundle.proof.value, bundle.proof.algorithm);
    } catch (err) {
      throw new SyncError("applySyncBundle: signature verification threw: " + err.message, err);
    }
    if (!ok) throw new VerificationError("applySyncBundle: invalid bundle signature");
    let applied = [], conflicts = [], skipped = [];
    for (let cred of bundle.credentials ?? []) {
      if (!cred || !cred.id) {
        conflicts.push("<missing-id>");
        continue;
      }
      let local = wallet.getCredential(cred.id);
      if (local) constantTimeEqual(Buffer.from(local.proof.proofValue, "hex"), Buffer.from(cred.proof.proofValue, "hex")) ? skipped.push(cred.id) : conflicts.push(cred.id);
      else try {
        await wallet.addCredential(cred), applied.push(cred.id);
      } catch (err) {
        throw new CredentialError(`applySyncBundle: failed to add credential ${cred.id}: ` + err.message, err);
      }
    }
    if (bundle.sequence > wallet.getSequence()) for (let i = wallet.getSequence(); i < bundle.sequence; i++) wallet.bumpSequence();
    return { applied, conflicts, skipped };
  }
  validateBundle(bundle, sourcePublicKey) {
    if (!bundle || !bundle.proof) return false;
    let { proof, ...unsigned } = bundle, bytes = canonicalBundleBytes(unsigned);
    try {
      return verify2(sourcePublicKey, bytes, bundle.proof.value, bundle.proof.algorithm);
    } catch {
      return false;
    }
  }
};
function buildBundleFromParts(parts, privateKey, algorithm) {
  let unsigned = { version: SYNC_BUNDLE_VERSION, sourceDid: parts.sourceDid, timestamp: parts.timestamp, sequence: parts.sequence, identity: parts.identity, credentials: parts.credentials }, bytes = canonicalBundleBytes(unsigned), signatureHex = sign2(privateKey, bytes, algorithm);
  return { ...unsigned, proof: { type: "manya:sync-bundle:2024", algorithm, value: signatureHex } };
}

// packages/attest/dist/esm/index.mjs
import * as crypto11 from "crypto";
import * as crypto22 from "crypto";
import * as crypto32 from "crypto";
import * as os from "os";
import * as fs2 from "fs";
import * as child_process from "child_process";
import * as crypto42 from "crypto";
import * as crypto52 from "crypto";
import * as fs22 from "fs";
import * as path2 from "path";
import * as child_process2 from "child_process";
import * as crypto62 from "crypto";
var AttestError = class extends Error {
  code;
  cause;
  constructor(message, code, cause) {
    super(message), this.name = new.target.name, this.code = code ?? new.target.name, cause !== void 0 && (this.cause = cause), Object.setPrototypeOf(this, new.target.prototype);
  }
};
var FingerprintError = class extends AttestError {
  constructor(message, cause) {
    super(message, "FINGERPRINT_ERROR", cause);
  }
};
var ChallengeError = class extends AttestError {
  constructor(message, cause) {
    super(message, "CHALLENGE_ERROR", cause);
  }
};
var SessionError = class extends AttestError {
  constructor(message, cause) {
    super(message, "SESSION_ERROR", cause);
  }
};
var HardwareValidationError = class extends AttestError {
  constructor(message, cause) {
    super(message, "HARDWARE_VALIDATION_ERROR", cause);
  }
};
var AttestationError = class extends AttestError {
  constructor(message, cause) {
    super(message, "ATTESTATION_ERROR", cause);
  }
};
var WorkflowError = class extends AttestError {
  constructor(message, cause) {
    super(message, "WORKFLOW_ERROR", cause);
  }
};
var TrustEvaluationError = class extends AttestError {
  constructor(message, cause) {
    super(message, "TRUST_EVALUATION_ERROR", cause);
  }
};
var NonceError = class extends AttestError {
  constructor(message, cause) {
    super(message, "NONCE_ERROR", cause);
  }
};
var SCRUBBED_FIELD_NAMES2 = ["privateKey", "password", "passphrase", "token", "secret", "credential", "iv", "tag", "share", "nonce", "signature", "macs", "machineId"];
var SCRUB_REGEX2 = new RegExp("(?:" + SCRUBBED_FIELD_NAMES2.map((n) => n.toLowerCase()).join("|") + ")$", "i");
var SilentLogger2 = class {
  debug() {
  }
  info() {
  }
  warn() {
  }
  error() {
  }
};
function sha2562(data) {
  try {
    let buf = typeof data == "string" ? Buffer.from(data, "utf8") : data;
    return crypto11.createHash("sha256").update(buf).digest();
  } catch (err) {
    throw new AttestError("sha256 failed: " + err.message, "HASH_ERROR", err);
  }
}
function secureRandom(n) {
  if (!Number.isInteger(n) || n <= 0) throw new AttestError("secureRandom: length must be a positive integer", "RANDOM_ERROR");
  if (n > 1024 * 1024) throw new AttestError("secureRandom: refusing to allocate > 1 MiB in a single call", "RANDOM_ERROR");
  try {
    return crypto11.randomBytes(n);
  } catch (err) {
    throw new AttestError("secureRandom failed: " + err.message, "RANDOM_ERROR", err);
  }
}
function constantTimeEqual2(a, b) {
  return a.length !== b.length ? false : crypto11.timingSafeEqual(a, b);
}
function uuid() {
  try {
    return crypto11.randomUUID();
  } catch (err) {
    throw new AttestError("uuid failed: " + err.message, "UUID_ERROR", err);
  }
}
var DEFAULT_RSA_MODULUS2 = 3072;
var DEFAULT_RSA_EXPONENT2 = 65537;
var DEFAULT_EC_CURVE2 = "prime256v1";
function algorithmFor2(algo) {
  switch (algo) {
    case "rsa":
      return "rsa-pss";
    case "ecdsa":
      return "ecdsa-p256";
    default:
      throw new AttestError(`unknown key algorithm: ${algo}`);
  }
}
function algorithmForKey(key) {
  let type;
  try {
    type = key.asymmetricKeyType;
  } catch (err) {
    throw new AttestError("algorithmForKey: cannot read key type: " + err.message, "KEY_TYPE_ERROR", err);
  }
  if (type === "rsa") return "rsa-pss";
  if (type === "ec") {
    let details;
    try {
      details = key.asymmetricKeyDetails;
    } catch {
    }
    if (details && details.namedCurve) {
      let curve = details.namedCurve;
      if (curve !== "P-256" && curve !== "prime256v1" && curve !== "secp256r1") throw new AttestError(`algorithmForKey: only NIST P-256 is supported, got ${curve}`);
    }
    return "ecdsa-p256";
  }
  throw new AttestError(`algorithmForKey: unsupported key type: ${type ?? "unknown"} (only rsa and ec are supported)`);
}
function generateKeyPair2(algo, opts = {}) {
  try {
    let publicKey, privateKey;
    if (algo === "rsa") ({ publicKey, privateKey } = crypto22.generateKeyPairSync("rsa", { modulusLength: opts.rsaModulusBits ?? DEFAULT_RSA_MODULUS2, publicExponent: opts.rsaPublicExponent ?? DEFAULT_RSA_EXPONENT2 }));
    else if (algo === "ecdsa") {
      let curve = opts.ecCurve ?? DEFAULT_EC_CURVE2;
      if (curve !== "prime256v1") throw new AttestError(`unsupported EC curve: ${curve}. Only 'prime256v1' (NIST P-256) is supported.`);
      ({ publicKey, privateKey } = crypto22.generateKeyPairSync("ec", { namedCurve: curve }));
    } else throw new AttestError(`unknown key algorithm: ${algo}`);
    return { publicKey, privateKey, algorithm: algorithmFor2(algo) };
  } catch (err) {
    throw err instanceof AttestError ? err : new AttestError("key generation failed: " + err.message, "KEY_GENERATION_ERROR", err);
  }
}
function importKeyPem(pem, type) {
  try {
    return type === "public" ? crypto22.createPublicKey(pem) : crypto22.createPrivateKey(pem);
  } catch (err) {
    throw new AttestError(`failed to import ${type} key from PEM: ${err.message}`, "KEY_IMPORT_ERROR", err);
  }
}
function getKeyFingerprint2(publicKey) {
  try {
    let der = (typeof publicKey == "string" ? crypto22.createPublicKey(publicKey) : publicKey).export({ type: "spki", format: "der" });
    return sha2562(der).toString("hex");
  } catch (err) {
    throw new FingerprintError("getKeyFingerprint failed: " + err.message, err);
  }
}
var SIGN_HASH2 = "sha256";
function asPublicKey2(key) {
  if (typeof key == "string") try {
    return crypto32.createPublicKey(key);
  } catch (err) {
    throw new AttestError("invalid public key PEM: " + err.message, "VERIFY_ERROR", err);
  }
  return key;
}
function asPrivateKey2(key) {
  if (typeof key == "string") try {
    return crypto32.createPrivateKey(key);
  } catch (err) {
    throw new AttestError("invalid private key PEM: " + err.message, "SIGN_ERROR", err);
  }
  return key;
}
function resolveAlgorithm(key, algo) {
  return algo || algorithmForKey(key);
}
function sign22(privateKey, data, algo) {
  if (!Buffer.isBuffer(data)) throw new AttestError("sign: data must be a Buffer", "SIGN_ERROR");
  let key = asPrivateKey2(privateKey), resolvedAlgo = resolveAlgorithm(key, algo);
  try {
    if (resolvedAlgo === "rsa-pss") return crypto32.sign(SIGN_HASH2, data, { key, padding: crypto32.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto32.constants.RSA_PSS_SALTLEN_DIGEST }).toString("hex");
    if (resolvedAlgo === "ecdsa-p256") return crypto32.sign(SIGN_HASH2, data, key).toString("hex");
    throw new AttestError(`unsupported signature algorithm: ${resolvedAlgo}`);
  } catch (err) {
    throw err instanceof AttestError ? err : new AttestError("sign failed: " + err.message, "SIGN_ERROR", err);
  }
}
function verify22(publicKey, data, signature, algo) {
  if (!Buffer.isBuffer(data)) throw new AttestError("verify: data must be a Buffer", "VERIFY_ERROR");
  let signatureBuf;
  if (typeof signature == "string") {
    if (signature.length === 0 || !/^[0-9a-fA-F]+$/.test(signature)) throw new AttestError("verify: signature must be non-empty hex", "VERIFY_ERROR");
    try {
      signatureBuf = Buffer.from(signature, "hex");
    } catch {
      throw new AttestError("verify: signature must be hex-encoded", "VERIFY_ERROR");
    }
  } else signatureBuf = signature;
  let key = asPublicKey2(publicKey), resolvedAlgo = resolveAlgorithm(key, algo), ok;
  try {
    if (resolvedAlgo === "rsa-pss") ok = crypto32.verify(SIGN_HASH2, data, { key, padding: crypto32.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto32.constants.RSA_PSS_SALTLEN_DIGEST }, signatureBuf);
    else if (resolvedAlgo === "ecdsa-p256") ok = crypto32.verify(SIGN_HASH2, data, key, signatureBuf);
    else throw new AttestError(`unsupported signature algorithm: ${resolvedAlgo}`);
  } catch (err) {
    if (err instanceof AttestError) throw err;
    return false;
  }
  let okByte = Buffer.from([ok ? 1 : 0]), expected = Buffer.from([1]);
  return constantTimeEqual2(okByte, expected);
}
function signForChallenge(privateKey, data, algo) {
  try {
    return sign22(privateKey, data, algo);
  } catch (err) {
    throw err instanceof ChallengeError ? err : new ChallengeError("signForChallenge failed: " + err.message, err);
  }
}
function signForAttestation(privateKey, data, algo) {
  try {
    return sign22(privateKey, data, algo);
  } catch (err) {
    throw err instanceof AttestationError ? err : new AttestationError("signForAttestation failed: " + err.message, err);
  }
}
var REDACTED = "[redacted]";
function execQuiet(cmd, timeoutMs = 500) {
  try {
    return child_process.execSync(cmd, { timeout: timeoutMs, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8", maxBuffer: 1048576 }).trim();
  } catch {
    return "";
  }
}
function collectMacs() {
  let interfaces = os.networkInterfaces(), out = [];
  for (let name of Object.keys(interfaces)) {
    let list = interfaces[name];
    if (list) for (let iface of list) {
      if (!iface || iface.internal || !iface.mac || iface.mac === "00:00:00:00:00:00") continue;
      let mac = iface.mac.toLowerCase().replace(/[:.-]/g, "");
      mac.length === 12 && /^[0-9a-f]{12}$/.test(mac) && out.push(mac);
    }
  }
  return Array.from(new Set(out));
}
var cachedMachineId = null;
function detectMachineId() {
  let platform2 = process.platform;
  try {
    if (platform2 === "linux") {
      for (let candidate of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) try {
        let content = fs2.readFileSync(candidate, "utf8").trim();
        if (content && /^[0-9a-f]{32}$/i.test(content)) return content.toLowerCase();
      } catch {
      }
      return;
    }
    if (platform2 === "darwin") {
      let match = execQuiet("ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID", 800).match(/IOPlatformUUID"\s*=\s*"([0-9A-Fa-f-]{36})"/);
      return match && match[1] ? match[1].toLowerCase() : void 0;
    }
    if (platform2 === "win32") {
      let match = execQuiet('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', 800).match(/MachineGuid\s+REG_SZ\s+([0-9A-Fa-f-]{36})/);
      return match && match[1] ? match[1].toLowerCase() : void 0;
    }
  } catch {
  }
}
function collectMachineId() {
  return cachedMachineId !== null || (cachedMachineId = detectMachineId()), cachedMachineId;
}
function collectDeviceSignals() {
  try {
    let cpus22 = safeCpus(), arch = safeArch(), platform2 = safePlatform(), hostname2 = safeHostname(), macs = collectMacs(), totalmem22 = safeTotalmem(), nodeVersion = process.version, release2 = safeRelease(), machineId = collectMachineId();
    return { cpus: cpus22, arch, platform: platform2, hostname: hostname2, macs, totalmem: totalmem22, nodeVersion, release: release2, ...machineId !== void 0 ? { machineId } : {} };
  } catch (err) {
    throw new FingerprintError("collectDeviceSignals failed: " + err.message, err);
  }
}
function safeCpus() {
  try {
    let n = os.cpus().length;
    return typeof n == "number" && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}
function safeArch() {
  try {
    return process.arch || "unknown";
  } catch {
    return "unknown";
  }
}
function safePlatform() {
  try {
    return process.platform || "unknown";
  } catch {
    return "unknown";
  }
}
function safeHostname() {
  try {
    return os.hostname() || "unknown";
  } catch {
    return "unknown";
  }
}
function safeTotalmem() {
  try {
    let n = os.totalmem();
    return typeof n == "number" && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}
function safeRelease() {
  try {
    return os.release() || "";
  } catch {
    return "";
  }
}
function redactSignals(signals) {
  return { cpus: signals.cpus, arch: signals.arch, platform: signals.platform, hostname: signals.hostname, macs: `[${signals.macs.length} mac(s) redacted]`, totalmem: signals.totalmem, nodeVersion: signals.nodeVersion, release: signals.release, machineId: signals.machineId ? REDACTED : "" };
}
function deriveDeviceId(signals) {
  let stable = stableStringify(signals);
  return sha2562(stable).toString("hex").slice(0, 16);
}
function stableStringify(value) {
  return value === null || typeof value != "object" ? JSON.stringify(value) : Array.isArray(value) ? "[" + value.map(stableStringify).join(",") + "]" : "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
}
function newCorrelationId() {
  return uuid();
}
var LINUX_MACHINE_ID_PATHS = ["/etc/machine-id", "/var/lib/dbus/machine-id"];
var FINGERPRINT_FIELDS = ["cpus", "arch", "platform", "hostname", "macs", "totalmem", "nodeVersion", "release", "machineId"];
var DeviceFingerprint = class _DeviceFingerprint {
  hash;
  perField;
  constructor(hash, perField) {
    this.hash = hash, this.perField = perField;
  }
  static fromSignals(signals) {
    if (!signals || typeof signals != "object") throw new FingerprintError("fromSignals: signals must be a DeviceSignals object");
    let perField = {}, signalsRecord = signals;
    for (let field of FINGERPRINT_FIELDS) {
      let value = signalsRecord[field];
      value !== void 0 && (perField[field] = sha2562(stableStringify(value)).toString("hex"));
    }
    let canonical = stableStringify(signals), hash = sha2562(canonical).toString("hex");
    return new _DeviceFingerprint(hash, perField);
  }
  static fromString(hash) {
    if (typeof hash != "string" || !/^[0-9a-f]{64}$/.test(hash)) throw new FingerprintError("fromString: expected 64-character hex string, got: " + typeof hash);
    return new _DeviceFingerprint(hash, {});
  }
  toString() {
    return this.hash;
  }
  compare(other) {
    let a = Buffer.from(this.hash, "hex"), b = Buffer.from(other.hash, "hex"), match = a.length === b.length && safeEqual(a, b), myFields = Object.keys(this.perField), otherFields = Object.keys(other.perField);
    if (myFields.length === 0 || otherFields.length === 0) return { match, drift: match ? 0 : 1 };
    let allFields = Array.from(/* @__PURE__ */ new Set([...myFields, ...otherFields]));
    if (allFields.length === 0) return { match, drift: match ? 0 : 1 };
    let differing = 0;
    for (let field of allFields) {
      let mine = this.perField[field], theirs = other.perField[field];
      if (!mine || !theirs) {
        differing++;
        continue;
      }
      let ma = Buffer.from(mine, "hex"), mb = Buffer.from(theirs, "hex");
      safeEqual(ma, mb) || differing++;
    }
    let drift = differing / allFields.length;
    return { match, drift };
  }
  equals(other) {
    return this.compare(other).match;
  }
  valueOf() {
    return this.hash;
  }
};
function safeEqual(a, b) {
  return a.length !== b.length ? false : crypto42.timingSafeEqual(a, b);
}
var DEFAULT_NONCE_TTL_MS = 300 * 1e3;
var DEFAULT_NONCE_BYTES = 32;
var NonceStore = class {
  records = /* @__PURE__ */ new Map();
  defaultTtlMs;
  defaultBytes;
  constructor(defaultTtlMs = DEFAULT_NONCE_TTL_MS, defaultBytes = DEFAULT_NONCE_BYTES) {
    if (!Number.isInteger(defaultTtlMs) || defaultTtlMs <= 0) throw new NonceError("defaultTtlMs must be a positive integer");
    if (!Number.isInteger(defaultBytes) || defaultBytes <= 0 || defaultBytes > 256) throw new NonceError("defaultBytes must be an integer in [1, 256]");
    this.defaultTtlMs = defaultTtlMs, this.defaultBytes = defaultBytes;
  }
  issue(opts = {}) {
    let ttlMs = opts.ttlMs ?? this.defaultTtlMs, bytes = opts.bytes ?? this.defaultBytes;
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) throw new NonceError("ttlMs must be a positive integer");
    if (!Number.isInteger(bytes) || bytes <= 0 || bytes > 256) throw new NonceError("bytes must be an integer in [1, 256]");
    let now = Date.now(), nonce, attempts = 0;
    do {
      let rand = secureRandom(bytes).toString("hex");
      if (nonce = `${uuid().replace(/-/g, "")}${rand}`, attempts++, attempts > 16) throw new NonceError("issue: failed to generate a unique nonce after 16 attempts");
    } while (this.records.has(nonce));
    return this.records.set(nonce, { nonce, issuedAt: now, expiresAt: now + ttlMs, consumed: false }), nonce;
  }
  consume(nonce, opts = {}) {
    if (typeof nonce != "string" || nonce.length === 0) throw new NonceError("consume: nonce must be a non-empty string");
    let record = this.records.get(nonce);
    if (!record) return false;
    let now = Date.now();
    return record.consumed ? false : now >= record.expiresAt ? (opts.skipConsumeOnExpiry || (record.consumed = true), false) : (record.consumed = true, true);
  }
  isValid(nonce) {
    let record = this.records.get(nonce);
    return !record || record.consumed ? false : Date.now() < record.expiresAt;
  }
  cleanup() {
    let now = Date.now(), removed = 0;
    for (let [key, record] of this.records) (now >= record.expiresAt || record.consumed) && (this.records.delete(key), removed++);
    return removed;
  }
  size() {
    let now = Date.now(), count = 0;
    for (let record of this.records.values()) !record.consumed && now < record.expiresAt && count++;
    return count;
  }
  clear() {
    this.records.clear();
  }
};
var DEFAULT_CHALLENGE_TTL_MS = 60 * 1e3;
var DEFAULT_CHALLENGE_BYTES = 32;
function generateChallenge(opts = {}) {
  let ttlMs = opts.ttlMs ?? DEFAULT_CHALLENGE_TTL_MS, bytes = opts.bytes ?? DEFAULT_CHALLENGE_BYTES;
  if (!Number.isInteger(ttlMs) || ttlMs <= 0) throw new ChallengeError("generateChallenge: ttlMs must be a positive integer");
  if (!Number.isInteger(bytes) || bytes <= 0 || bytes > 256) throw new ChallengeError("generateChallenge: bytes must be an integer in [1, 256]");
  let now = Date.now(), issuedAt = new Date(now).toISOString(), expiresAt = new Date(now + ttlMs).toISOString(), challenge = secureRandom(bytes).toString("base64");
  return { nonce: uuid().replace(/-/g, "") + secureRandom(16).toString("hex"), challenge, issuedAt, expiresAt };
}
function decodeChallenge(challenge) {
  if (typeof challenge != "string" || challenge.length === 0) throw new ChallengeError("decodeChallenge: challenge must be a non-empty string");
  try {
    return Buffer.from(challenge, "base64");
  } catch (err) {
    throw new ChallengeError("decodeChallenge: invalid base64: " + err.message, err);
  }
}
function signChallenge(privateKey, challenge, algo) {
  if (!challenge || typeof challenge != "object") throw new ChallengeError("signChallenge: challenge must be a Challenge object");
  let challengeBytes = decodeChallenge(challenge.challenge), signature = sign22(privateKey, challengeBytes, algo), publicKeyFingerprint;
  try {
    let privKey = typeof privateKey == "string" ? crypto52.createPrivateKey(privateKey) : privateKey, pubKey = privKey.asymmetricKeyType ? crypto52.createPublicKey(privKey) : crypto52.createPublicKey(privKey.export({ type: "pkcs8", format: "pem" }));
    publicKeyFingerprint = getKeyFingerprint2(pubKey);
  } catch (err) {
    throw new ChallengeError("signChallenge: cannot derive public key fingerprint: " + err.message, err);
  }
  let resolvedAlgo;
  if (algo) resolvedAlgo = algo;
  else {
    let keyType = (typeof privateKey == "string" ? crypto52.createPrivateKey(privateKey) : privateKey).asymmetricKeyType;
    if (keyType === "rsa") resolvedAlgo = "rsa-pss";
    else if (keyType === "ec") resolvedAlgo = "ecdsa-p256";
    else throw new ChallengeError(`signChallenge: unsupported key type: ${keyType ?? "unknown"}`);
  }
  return { nonce: challenge.nonce, signature, algorithm: resolvedAlgo, signedAt: (/* @__PURE__ */ new Date()).toISOString(), publicKeyFingerprint };
}
function verifyResponse(publicKey, challenge, response, expectedNonce) {
  if (!response || typeof response != "object") return false;
  if (typeof expectedNonce != "string" || expectedNonce.length === 0) throw new ChallengeError("verifyResponse: expectedNonce must be a non-empty string");
  let a = Buffer.from(response.nonce, "utf8"), b = Buffer.from(expectedNonce, "utf8");
  if (a.length !== b.length || !crypto52.timingSafeEqual(a, b)) return false;
  let challengeBytes;
  try {
    challengeBytes = decodeChallenge(challenge.challenge);
  } catch {
    return false;
  }
  try {
    return verify22(publicKey, challengeBytes, response.signature, response.algorithm);
  } catch (err) {
    throw new ChallengeError("verifyResponse: signature verification error: " + err.message, err);
  }
}
function isChallengeExpired(challenge, now = Date.now()) {
  try {
    let expiresAt = Date.parse(challenge.expiresAt);
    return Number.isFinite(expiresAt) ? now >= expiresAt : true;
  } catch {
    return true;
  }
}
var InMemorySessionStore = class {
  records = /* @__PURE__ */ new Map();
  async get(token) {
    if (typeof token != "string" || token.length === 0) throw new SessionError("get: token must be a non-empty string");
    let record = this.records.get(token);
    return record ? cloneRecord(record) : null;
  }
  async put(record) {
    if (!record || typeof record != "object") throw new SessionError("put: record must be a SessionRecord");
    if (typeof record.token != "string" || record.token.length === 0) throw new SessionError("put: record.token must be a non-empty string");
    this.records.set(record.token, cloneRecord(record));
  }
  async delete(token) {
    return typeof token != "string" || token.length === 0 ? false : this.records.delete(token);
  }
  async list() {
    return Array.from(this.records.values()).map(cloneRecord);
  }
  clear() {
    this.records.clear();
  }
};
function cloneRecord(record) {
  try {
    return JSON.parse(JSON.stringify(record));
  } catch (err) {
    throw new SessionError("cloneRecord: failed to clone session record: " + err.message, err);
  }
}
var DEFAULT_SESSION_TTL_MS = 3600 * 1e3;
var SESSION_TOKEN_BYTES = 32;
var SessionManager = class {
  store;
  defaultTtlMs;
  constructor(store, defaultTtlMs = DEFAULT_SESSION_TTL_MS) {
    if (this.store = store ?? new InMemorySessionStore(), !Number.isInteger(defaultTtlMs) || defaultTtlMs <= 0) throw new SessionError("defaultTtlMs must be a positive integer");
    this.defaultTtlMs = defaultTtlMs;
  }
  async establish(fingerprint, identity, opts = {}) {
    if (typeof fingerprint != "string" || fingerprint.length === 0) throw new SessionError("establish: fingerprint must be a non-empty string");
    if (typeof identity != "string" || identity.length === 0) throw new SessionError("establish: identity must be a non-empty string");
    let ttlMs = opts.ttlMs ?? this.defaultTtlMs;
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) throw new SessionError("establish: ttlMs must be a positive integer");
    let trustScore = opts.trustScore ?? 1;
    if (typeof trustScore != "number" || !Number.isFinite(trustScore) || trustScore < 0 || trustScore > 1) throw new SessionError("establish: trustScore must be a finite number in [0, 1]");
    let now = Date.now(), token = secureRandom(SESSION_TOKEN_BYTES).toString("hex"), sessionId = uuid(), record = { token, sessionId, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + ttlMs).toISOString(), fingerprint, identity, trustScore, ...opts.boundNonce ? { boundNonce: opts.boundNonce } : {} };
    return await this.store.put(record), toSession(record);
  }
  async verify(token) {
    if (typeof token != "string" || token.length === 0) return null;
    let record = await this.store.get(token);
    if (!record) return null;
    let now = Date.now(), expiresAt = Date.parse(record.expiresAt);
    return !Number.isFinite(expiresAt) || now >= expiresAt ? (await this.store.delete(token).catch(() => {
    }), null) : toSession(record);
  }
  async revoke(token) {
    return typeof token != "string" || token.length === 0 ? false : this.store.delete(token);
  }
  async refresh(token, ttlMs) {
    if (typeof token != "string" || token.length === 0) throw new SessionError("refresh: token must be a non-empty string");
    let record = await this.store.get(token);
    if (!record) throw new SessionError("refresh: unknown session token");
    let now = Date.now(), expiresAt = Date.parse(record.expiresAt);
    if (!Number.isFinite(expiresAt) || now >= expiresAt) throw await this.store.delete(token).catch(() => {
    }), new SessionError("refresh: session has expired");
    let newTtl = ttlMs ?? this.defaultTtlMs;
    if (!Number.isInteger(newTtl) || newTtl <= 0) throw new SessionError("refresh: ttlMs must be a positive integer");
    let newSession = await this.establish(record.fingerprint, record.identity, { ttlMs: newTtl, trustScore: record.trustScore, boundNonce: record.boundNonce });
    return await this.store.delete(token).catch(() => {
    }), newSession;
  }
  async list() {
    return (await this.store.list()).map(toSession);
  }
  async reap() {
    let records = await this.store.list(), now = Date.now(), removed = 0;
    for (let record of records) {
      let expiresAt = Date.parse(record.expiresAt);
      (!Number.isFinite(expiresAt) || now >= expiresAt) && await this.store.delete(record.token).catch(() => false) && removed++;
    }
    return removed;
  }
};
function toSession(record) {
  return { token: record.token, sessionId: record.sessionId, createdAt: record.createdAt, expiresAt: record.expiresAt, fingerprint: record.fingerprint, identity: record.identity, trustScore: record.trustScore };
}
function execQuiet2(cmd, timeoutMs = 800) {
  try {
    return child_process2.execSync(cmd, { timeout: timeoutMs, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8", maxBuffer: 1048576 }).trim();
  } catch {
    return "";
  }
}
function execFileQuiet(file, args, timeoutMs = 800) {
  try {
    return child_process2.execFileSync(file, args, { timeout: timeoutMs, windowsHide: true, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8", maxBuffer: 1048576 }).trim();
  } catch {
    return "";
  }
}
function pathExists(p) {
  try {
    return fs22.existsSync(p);
  } catch {
    return false;
  }
}
function globDir(dir, pattern) {
  try {
    return fs22.existsSync(dir) ? fs22.statSync(dir).isDirectory() ? fs22.readdirSync(dir).filter((e) => pattern.test(e)).map((e) => path2.join(dir, e)) : [] : [];
  } catch {
    return [];
  }
}
function probeLinuxTpm() {
  let devPaths = ["/dev/tpm0", "/dev/tpm1", "/dev/tpmrm0"];
  for (let p of devPaths) if (pathExists(p)) return { present: true, details: `found ${p}` };
  let sysPaths = ["/sys/class/tpm/tpm0", "/sys/class/misc/tpm0/device"];
  for (let p of sysPaths) if (pathExists(p)) return { present: true, details: `found ${p}` };
  let pcrPath = "/sys/class/tpm/tpm0/tpm_version_major";
  if (pathExists(pcrPath)) try {
    return { present: true, details: `TPM ${fs22.readFileSync(pcrPath, "utf8").trim()} via ${pcrPath}` };
  } catch {
  }
  return { present: false, details: "no Linux TPM device node or sysfs entry found" };
}
function probeLinuxTee() {
  let sgxPaths = ["/dev/sgx_enclave", "/dev/sgx", "/dev/isgx"];
  for (let p of sgxPaths) if (pathExists(p)) return { present: true, details: `found Intel SGX at ${p}` };
  let teePaths = ["/dev/tee0", "/dev/tee1", "/sys/class/tee"];
  for (let p of teePaths) if (pathExists(p)) return { present: true, details: `found TEE at ${p}` };
  let sevParam = "/sys/module/kvm_amd/parameters/sev_es";
  if (pathExists(sevParam)) try {
    let val = fs22.readFileSync(sevParam, "utf8").trim();
    if (val === "1" || val === "Y" || val === "y") return { present: true, details: `AMD SEV-ES enabled (${sevParam}=${val})` };
  } catch {
  }
  let cpuInfo = readLinuxCpuInfo();
  return cpuInfo.includes("sgx") || cpuInfo.includes("sev") ? { present: true, details: "CPU advertises sgx/sev flag" } : { present: false, details: "no Linux TEE (SGX/SEV/TrustZone) found" };
}
function readLinuxCpuInfo() {
  try {
    return fs22.readFileSync("/proc/cpuinfo", "utf8").toLowerCase();
  } catch {
    return "";
  }
}
function probeMacSecureEnclave() {
  if (execQuiet2('ioreg -l -w 0 | grep -i "AppleSecureEnclave\\|secure_enclave\\|SEP"', 2e3).length > 0) return { present: true, details: "Apple Secure Enclave detected via ioreg" };
  let sp = execQuiet2("system_profiler SPiBridgeDataType 2>/dev/null", 2e3);
  return sp.length > 0 && /T2|Apple Silicon/i.test(sp) ? { present: true, details: "Apple T2 / Apple Silicon bridge detected" } : { present: false, details: "no Apple Secure Enclave detected" };
}
function probeWindowsTpm() {
  let regOut = execFileQuiet("reg.exe", ["query", "HKLM\\SYSTEM\\CurrentControlSet\\Services\\TPM\\WMI\\Admin", "/v", "SpecVersion"], 1e3);
  return regOut.length > 0 && /SpecVersion/i.test(regOut) ? { present: true, details: `TPM detected via registry: ${regOut.split(`
`)[0]}` } : { present: false, details: "no Windows TPM detected" };
}
function probeWindowsTee() {
  let vbsOut = execFileQuiet("reg.exe", ["query", "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity", "/v", "Enabled"], 1e3);
  if (/Enabled\s+REG_DWORD\s+0x1/i.test(vbsOut)) return { present: true, details: "Windows VBS detected via registry" };
  let credentialGuardOut = execFileQuiet("reg.exe", ["query", "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Lsa", "/v", "LsaCfgFlags"], 1e3);
  return /LsaCfgFlags\s+REG_DWORD\s+0x[1-3]/i.test(credentialGuardOut) ? { present: true, details: "Windows Credential Guard configured via registry" } : { present: false, details: "no Windows VBS / Device Guard detected" };
}
var cachedHardwareProbe = null;
var HardwareValidator = class {
  probe() {
    if (cachedHardwareProbe) return { ...cachedHardwareProbe };
    try {
      let platform2 = process.platform;
      if (platform2 === "linux") {
        let tpm = probeLinuxTpm(), tee = probeLinuxTee();
        return cachedHardwareProbe = { tpm: tpm.present, secureEnclave: false, tee: tee.present, details: `linux: ${tpm.details}; ${tee.details}` }, { ...cachedHardwareProbe };
      }
      if (platform2 === "darwin") {
        let se = probeMacSecureEnclave();
        return cachedHardwareProbe = { tpm: false, secureEnclave: se.present, tee: se.present, details: `darwin: ${se.details}` }, { ...cachedHardwareProbe };
      }
      if (platform2 === "win32") {
        let tpm = probeWindowsTpm(), tee = probeWindowsTee();
        return cachedHardwareProbe = { tpm: tpm.present, secureEnclave: false, tee: tee.present, details: `win32: ${tpm.details}; ${tee.details}` }, { ...cachedHardwareProbe };
      }
      return cachedHardwareProbe = { tpm: false, secureEnclave: false, tee: false, details: `unsupported platform: ${platform2}` }, { ...cachedHardwareProbe };
    } catch (err) {
      return cachedHardwareProbe = { tpm: false, secureEnclave: false, tee: false, details: `probe failed: ${err.message}` }, { ...cachedHardwareProbe };
    }
  }
  isAnyHardwarePresent() {
    let p = this.probe();
    return p.tpm || p.secureEnclave || p.tee;
  }
};
function requireHardwareOrThrow(validator) {
  let probe = validator.probe();
  if (!probe.tpm && !probe.secureEnclave && !probe.tee) throw new HardwareValidationError(`no hardware attestation root present: ${probe.details}`);
  return probe;
}
var SoftwareAttestationProvider = class {
  name = "software";
  publicKey;
  privateKey;
  algorithm;
  hardware;
  cachedProbe = null;
  constructor(opts = {}) {
    if (this.hardware = opts.hardware ?? new HardwareValidator(), opts.privateKey && opts.publicKey) {
      let pubKeyObj = typeof opts.publicKey == "string" ? importKeyPem(opts.publicKey, "public") : opts.publicKey, privKeyObj = typeof opts.privateKey == "string" ? importKeyPem(opts.privateKey, "private") : opts.privateKey;
      this.publicKey = pubKeyObj, this.privateKey = privKeyObj, this.algorithm = algorithmForKey(privKeyObj);
    } else {
      let algo = opts.algorithm ?? "ecdsa", kp = generateKeyPair2(algo);
      this.publicKey = kp.publicKey, this.privateKey = kp.privateKey, this.algorithm = kp.algorithm;
    }
  }
  isAvailable() {
    return true;
  }
  getPublicKeyPem() {
    return this.publicKey.export({ type: "spki", format: "pem" }).toString("utf8");
  }
  getPublicKeyFingerprint() {
    return getKeyFingerprint2(this.publicKey);
  }
  getAlgorithm() {
    return this.algorithm;
  }
  async attest(data, nonce) {
    if (!Buffer.isBuffer(data)) throw new HardwareValidationError("attest: data must be a Buffer");
    if (typeof nonce != "string" || nonce.length === 0) throw new HardwareValidationError("attest: nonce must be a non-empty string");
    this.cachedProbe || (this.cachedProbe = this.hardware.probe());
    let measurements = { dataHash: sha2562(data).toString("hex"), provider: "software", publicKeyFingerprint: this.getPublicKeyFingerprint() }, timestamp = (/* @__PURE__ */ new Date()).toISOString(), quoteWithoutSig = { version: 1, deviceFingerprint: data.toString("utf8"), measurements, timestamp, nonce, algorithm: this.algorithm, hardware: this.cachedProbe }, canonical = canonicalQuoteBytes(quoteWithoutSig), signature = sign22(this.privateKey, canonical, this.algorithm);
    return { ...quoteWithoutSig, signature };
  }
  async verifyQuote(quote, publicKey) {
    if (!quote || typeof quote != "object") return false;
    let pubKey = publicKey ?? this.publicKey;
    if (!quote.signature || !quote.algorithm) return false;
    let { signature, ...rest } = quote, canonical = canonicalQuoteBytes(rest);
    try {
      return verify22(pubKey, canonical, signature, quote.algorithm);
    } catch {
      return false;
    }
  }
};
function canonicalQuoteBytes(quote) {
  let stable = stableStringify2(quote);
  return Buffer.from(stable, "utf8");
}
function stableStringify2(value) {
  return value === null || typeof value != "object" ? JSON.stringify(value) : Array.isArray(value) ? "[" + value.map(stableStringify2).join(",") + "]" : Buffer.isBuffer(value) ? JSON.stringify(value.toString("hex")) : "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + stableStringify2(value[k])).join(",") + "}";
}
var _internal = { canonicalQuoteBytes, stableStringify: stableStringify2, sha256: sha2562 };
var ATTESTATION_QUOTE_VERSION = 1;
function validateQuote(quote) {
  if (!quote || typeof quote != "object") throw new AttestationError("validateQuote: quote must be an object");
  let q = quote;
  if (typeof q.version != "number" || q.version !== ATTESTATION_QUOTE_VERSION) throw new AttestationError(`validateQuote: unsupported version ${String(q.version)} (expected ${ATTESTATION_QUOTE_VERSION})`);
  if (typeof q.deviceFingerprint != "string" || q.deviceFingerprint.length === 0) throw new AttestationError("validateQuote: deviceFingerprint must be a non-empty string");
  if (!q.measurements || typeof q.measurements != "object") throw new AttestationError("validateQuote: measurements must be an object");
  if (typeof q.timestamp != "string" || q.timestamp.length === 0) throw new AttestationError("validateQuote: timestamp must be a non-empty string");
  if (typeof q.nonce != "string" || q.nonce.length === 0) throw new AttestationError("validateQuote: nonce must be a non-empty string");
  if (typeof q.signature != "string" || q.signature.length === 0) throw new AttestationError("validateQuote: signature must be a non-empty string");
  if (q.algorithm !== "rsa-pss" && q.algorithm !== "ecdsa-p256") throw new AttestationError(`validateQuote: algorithm must be 'rsa-pss' or 'ecdsa-p256', got: ${String(q.algorithm)}`);
  if (q.hardware !== void 0 && (typeof q.hardware != "object" || q.hardware === null)) throw new AttestationError("validateQuote: hardware must be an object if present");
}
function serializeQuote(quote) {
  validateQuote(quote);
  try {
    return Buffer.from(stableStringify3(quote), "utf8");
  } catch (err) {
    throw new AttestationError("serializeQuote failed: " + err.message, err);
  }
}
function deserializeQuote(buf) {
  let text;
  if (typeof buf == "string") text = buf;
  else if (Buffer.isBuffer(buf)) text = buf.toString("utf8");
  else throw new AttestationError("deserializeQuote: expected Buffer or string");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new AttestationError("deserializeQuote: invalid JSON: " + err.message, err);
  }
  return validateQuote(parsed), parsed;
}
function stableStringify3(value) {
  return value === null || typeof value != "object" ? JSON.stringify(value) : Array.isArray(value) ? "[" + value.map(stableStringify3).join(",") + "]" : Buffer.isBuffer(value) ? JSON.stringify(value.toString("hex")) : "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + stableStringify3(value[k])).join(",") + "}";
}
var DEFAULT_ATTESTATION_FRESHNESS_MS = 300 * 1e3;
function produceAttestation(privateKey, deviceFingerprint, measurements, nonce, opts = {}) {
  if (typeof deviceFingerprint != "string" || deviceFingerprint.length === 0) throw new AttestationError("produceAttestation: deviceFingerprint must be a non-empty string");
  if (!measurements || typeof measurements != "object") throw new AttestationError("produceAttestation: measurements must be an object");
  if (typeof nonce != "string" || nonce.length === 0) throw new AttestationError("produceAttestation: nonce must be a non-empty string");
  let algorithm;
  if (opts.algorithm) algorithm = opts.algorithm;
  else {
    let keyObj = typeof privateKey == "string" ? crypto62.createPrivateKey(privateKey) : privateKey;
    algorithm = algorithmForKey(keyObj);
  }
  let timestamp = opts.timestamp ?? (/* @__PURE__ */ new Date()).toISOString(), quoteWithoutSig = { version: ATTESTATION_QUOTE_VERSION, deviceFingerprint, measurements, timestamp, nonce, algorithm, ...opts.hardware ? { hardware: opts.hardware } : {} }, canonical = Buffer.from(stableStringify3(quoteWithoutSig), "utf8"), signature = sign22(privateKey, canonical, algorithm);
  return { ...quoteWithoutSig, signature };
}
function verifyAttestation(publicKey, quote, expectedNonce, opts = {}) {
  if (!quote || typeof quote != "object") return false;
  if (typeof expectedNonce != "string" || expectedNonce.length === 0) throw new AttestationError("verifyAttestation: expectedNonce must be a non-empty string");
  let freshnessMs = opts.freshnessMs ?? DEFAULT_ATTESTATION_FRESHNESS_MS;
  if (!Number.isInteger(freshnessMs) || freshnessMs <= 0) throw new AttestationError("verifyAttestation: freshnessMs must be a positive integer");
  let now = opts.now ?? Date.now(), ts = Date.parse(quote.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > freshnessMs) return false;
  let nonceBuf = Buffer.from(quote.nonce, "utf8"), expectedBuf = Buffer.from(expectedNonce, "utf8");
  if (nonceBuf.length !== expectedBuf.length || !crypto62.timingSafeEqual(nonceBuf, expectedBuf)) return false;
  if (opts.expectedFingerprint !== void 0) {
    let fpBuf = Buffer.from(quote.deviceFingerprint, "utf8"), expFpBuf = Buffer.from(opts.expectedFingerprint, "utf8");
    if (fpBuf.length !== expFpBuf.length || !crypto62.timingSafeEqual(fpBuf, expFpBuf)) return false;
  }
  let { signature, ...rest } = quote, canonical = Buffer.from(stableStringify3(rest), "utf8");
  try {
    return verify22(publicKey, canonical, signature, quote.algorithm);
  } catch (err) {
    throw new AttestationError("verifyAttestation: signature verification error: " + err.message, err);
  }
}
function produceAndSerializeAttestation(privateKey, deviceFingerprint, measurements, nonce, opts = {}) {
  let quote = produceAttestation(privateKey, deviceFingerprint, measurements, nonce, opts);
  return serializeQuote(quote);
}
function deserializeAndVerifyAttestation(publicKey, buf, expectedNonce, opts = {}) {
  let quote = deserializeQuote(buf);
  return verifyAttestation(publicKey, quote, expectedNonce, opts);
}
var TRUST_DECISION_THRESHOLD = 0.7;
var CHALLENGE_DECISION_THRESHOLD = 0.3;
var DEFAULT_FACTOR_WEIGHTS = { fingerprintStability: 0.3, hardware: 0.2, attestation: 0.3, sessionAge: 0.1, priorInteractions: 0.1 };
function computeFactors(inputs) {
  if (typeof inputs.fingerprintDrift != "number" || !Number.isFinite(inputs.fingerprintDrift)) throw new TrustEvaluationError("fingerprintDrift must be a finite number");
  if (inputs.fingerprintDrift < 0 || inputs.fingerprintDrift > 1) throw new TrustEvaluationError(`fingerprintDrift must be in [0, 1], got ${inputs.fingerprintDrift}`);
  if (!Number.isInteger(inputs.sessionAgeMs) || inputs.sessionAgeMs < 0) throw new TrustEvaluationError("sessionAgeMs must be a non-negative integer");
  if (!Number.isInteger(inputs.priorInteractions) || inputs.priorInteractions < 0) throw new TrustEvaluationError("priorInteractions must be a non-negative integer");
  let fingerprintStability = Math.max(0, Math.min(1, 1 - inputs.fingerprintDrift)), hardware = inputs.hardwarePresent ? 1 : 0, attestation = inputs.attestationValid ? 1 : 0, oneHourMs = 3600 * 1e3, decay = Math.pow(0.5, inputs.sessionAgeMs / oneHourMs), sessionAge = Math.max(0, Math.min(1, decay)), priorInteractions = Math.max(0, Math.min(1, Math.log10(1 + inputs.priorInteractions) / 2));
  return { fingerprintStability, hardware, attestation, sessionAge, priorInteractions };
}
function aggregateScore(factors, weights) {
  let score = factors.fingerprintStability * weights.fingerprintStability + factors.hardware * weights.hardware + factors.attestation * weights.attestation + factors.sessionAge * weights.sessionAge + factors.priorInteractions * weights.priorInteractions;
  return Math.max(0, Math.min(1, score));
}
function decideFromScore(score) {
  if (typeof score != "number" || !Number.isFinite(score)) throw new TrustEvaluationError("decideFromScore: score must be a finite number");
  return score >= TRUST_DECISION_THRESHOLD ? "trust" : score >= CHALLENGE_DECISION_THRESHOLD ? "challenge" : "reject";
}
function buildTrustScore(inputs, weights = DEFAULT_FACTOR_WEIGHTS) {
  let factors = computeFactors(inputs), score = aggregateScore(factors, weights), decision = decideFromScore(score);
  return { score, factors, decision };
}
var TrustEvaluator = class {
  weights;
  grantCheck;
  constructor(weights = DEFAULT_FACTOR_WEIGHTS, grantCheck) {
    this.weights = normalizeWeights(weights), this.grantCheck = grantCheck;
  }
  getWeights() {
    return { ...this.weights };
  }
  evaluate(inputs, grantId, capability) {
    let score = buildTrustScore(inputs, this.weights);
    return grantId && capability && this.grantCheck && this.grantCheck(grantId, capability) && (score = { ...score, decision: "trust", grantInfluence: grantId }), score;
  }
  evaluateFromFactors(factors, grantId, capability) {
    let score = aggregateScore(factors, this.weights), decision = decideFromScore(score), grantInfluence;
    return grantId && capability && this.grantCheck && this.grantCheck(grantId, capability) && (decision = "trust", grantInfluence = grantId), { score, factors, decision, grantInfluence };
  }
  factorize(inputs) {
    return computeFactors(inputs);
  }
};
function normalizeWeights(weights) {
  let w = { ...weights };
  for (let key of Object.keys(w)) if (typeof w[key] != "number" || !Number.isFinite(w[key]) || w[key] < 0) throw new TrustEvaluationError(`normalizeWeights: weight ${key} must be a finite non-negative number`);
  let sum = w.fingerprintStability + w.hardware + w.attestation + w.sessionAge + w.priorInteractions;
  if (sum <= 0) throw new TrustEvaluationError("normalizeWeights: weights must sum to > 0");
  return Math.abs(sum - 1) < 1e-9 ? w : { fingerprintStability: w.fingerprintStability / sum, hardware: w.hardware / sum, attestation: w.attestation / sum, sessionAge: w.sessionAge / sum, priorInteractions: w.priorInteractions / sum };
}
var defaultTrustEvaluator = new TrustEvaluator();
var DEFAULT_POLICY_SESSION_TTL_MS = 3600 * 1e3;
var DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS = 300 * 1e3;
function defaultPolicy() {
  return { requireHardwareAttestation: false, minTrustScore: 0.5, sessionTtlMs: DEFAULT_POLICY_SESSION_TTL_MS, allowedFingerprintDrift: 0.2, attestationFreshnessMs: DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS };
}
function strictPolicy() {
  return { requireHardwareAttestation: true, minTrustScore: 0.8, sessionTtlMs: 900 * 1e3, allowedFingerprintDrift: 0, attestationFreshnessMs: 60 * 1e3 };
}
function validatePolicy(policy) {
  if (!policy || typeof policy != "object") throw new WorkflowError("validatePolicy: policy must be an object");
  if (typeof policy.requireHardwareAttestation != "boolean") throw new WorkflowError("validatePolicy: requireHardwareAttestation must be boolean");
  if (typeof policy.minTrustScore != "number" || !Number.isFinite(policy.minTrustScore) || policy.minTrustScore < 0 || policy.minTrustScore > 1) throw new WorkflowError("validatePolicy: minTrustScore must be a finite number in [0, 1]");
  if (!Number.isInteger(policy.sessionTtlMs) || policy.sessionTtlMs <= 0) throw new WorkflowError("validatePolicy: sessionTtlMs must be a positive integer");
  if (typeof policy.allowedFingerprintDrift != "number" || !Number.isFinite(policy.allowedFingerprintDrift) || policy.allowedFingerprintDrift < 0 || policy.allowedFingerprintDrift > 1) throw new WorkflowError("validatePolicy: allowedFingerprintDrift must be a finite number in [0, 1]");
  if (!Number.isInteger(policy.attestationFreshnessMs) || policy.attestationFreshnessMs <= 0) throw new WorkflowError("validatePolicy: attestationFreshnessMs must be a positive integer");
}
function buildPolicy(overrides = {}) {
  let merged = { ...defaultPolicy(), ...overrides };
  return validatePolicy(merged), merged;
}
var AuthenticationWorkflow = class {
  policy;
  sessions;
  nonces;
  hardware;
  trust;
  logger;
  constructor(opts = {}) {
    this.policy = opts.policy ?? buildPolicy(), validatePolicy(this.policy), this.sessions = opts.sessionManager ?? new SessionManager(new InMemorySessionStore(), this.policy.sessionTtlMs), this.nonces = opts.nonceStore ?? new NonceStore(), this.hardware = opts.hardware ?? new HardwareValidator(), this.trust = opts.trustEvaluator ?? defaultTrustEvaluator, this.logger = opts.logger ?? new SilentLogger2();
  }
  verifierIssueChallenge(ttlMs) {
    let challenge = generateChallenge({ ttlMs }), trackedNonce = this.nonces.issue({ ttlMs: ttlMs ?? 6e4 });
    return { ...challenge, nonce: trackedNonce };
  }
  async proverRespond(challenge, inputs) {
    if (!challenge || typeof challenge != "object") throw new WorkflowError("proverRespond: challenge must be a Challenge object");
    if (!inputs || typeof inputs != "object") throw new WorkflowError("proverRespond: inputs must be a ProverRespondInputs object");
    let response = signChallenge(inputs.privateKey, challenge), measurements = inputs.measurements ?? {}, hardware;
    try {
      hardware = this.hardware.probe();
    } catch {
      hardware = { tpm: false, secureEnclave: false, tee: false, details: "probe failed" };
    }
    let quote = produceAttestation(inputs.privateKey, inputs.deviceFingerprint, measurements, challenge.nonce, { hardware });
    if (inputs.hardwareProvider) try {
      let providerQuote = await inputs.hardwareProvider.attest(Buffer.from(inputs.deviceFingerprint, "utf8"), challenge.nonce), mergedMeasurements = { ...measurements, ...providerQuote.measurements }, mergedHardware = providerQuote.hardware ?? hardware, reSigned = produceAttestation(inputs.privateKey, inputs.deviceFingerprint, mergedMeasurements, challenge.nonce, { hardware: mergedHardware });
      return { response, quote: reSigned };
    } catch (err) {
      this.logger.warn("proverRespond: hardware provider failed", { error: err.message });
    }
    return { response, quote };
  }
  async verifierVerify(inputs) {
    if (!inputs || typeof inputs != "object") throw new WorkflowError("verifierVerify: inputs must be a VerifierVerifyInputs object");
    if (!this.nonces.consume(inputs.challenge.nonce)) return fail("nonce already consumed, unknown, or expired", this.trust, { fingerprintDrift: 1, hardwarePresent: false, attestationValid: false, sessionAgeMs: 0, priorInteractions: inputs.priorInteractions ?? 0 });
    if (!verifyResponse(inputs.publicKey, inputs.challenge, inputs.response, inputs.challenge.nonce)) return fail("challenge response verification failed", this.trust, { fingerprintDrift: 1, hardwarePresent: false, attestationValid: false, sessionAgeMs: 0, priorInteractions: inputs.priorInteractions ?? 0 });
    if (!verifyAttestation(inputs.publicKey, inputs.quote, inputs.challenge.nonce, { expectedFingerprint: inputs.expectedFingerprint, freshnessMs: this.policy.attestationFreshnessMs })) return fail("attestation quote verification failed", this.trust, { fingerprintDrift: 1, hardwarePresent: false, attestationValid: false, sessionAgeMs: 0, priorInteractions: inputs.priorInteractions ?? 0 });
    let hardwarePresent = !!(inputs.quote.hardware && (inputs.quote.hardware.tpm || inputs.quote.hardware.secureEnclave || inputs.quote.hardware.tee));
    if (this.policy.requireHardwareAttestation && !hardwarePresent) return fail("policy requires hardware attestation but none is present", this.trust, { fingerprintDrift: 0, hardwarePresent: false, attestationValid: true, sessionAgeMs: 0, priorInteractions: inputs.priorInteractions ?? 0 });
    let trust = this.trust.evaluate({ fingerprintDrift: 0, hardwarePresent, attestationValid: true, sessionAgeMs: 0, priorInteractions: inputs.priorInteractions ?? 0 });
    if (trust.score < this.policy.minTrustScore) return { success: false, trust, reason: `trust score ${trust.score.toFixed(3)} below policy minimum ${this.policy.minTrustScore.toFixed(3)}` };
    let session = await this.sessions.establish(inputs.expectedFingerprint, inputs.identity, { ttlMs: this.policy.sessionTtlMs, boundNonce: inputs.challenge.nonce, trustScore: trust.score });
    return this.logger.info("attest: session established", { sessionId: session.sessionId, identity: inputs.identity, trustScore: trust.score }), { success: true, trust, session };
  }
  async verifySession(token) {
    return this.sessions.verify(token);
  }
  async revokeSession(token) {
    return this.sessions.revoke(token);
  }
  async refreshSession(token, ttlMs) {
    return this.sessions.refresh(token, ttlMs);
  }
  getSessionManager() {
    return this.sessions;
  }
  getNonceStore() {
    return this.nonces;
  }
};
function fail(reason, evaluator, inputs) {
  return { success: false, trust: evaluator.evaluate(inputs), reason };
}
function createSoftwareWorkflow(opts = {}) {
  let provider = new SoftwareAttestationProvider();
  return { workflow: new AuthenticationWorkflow(opts), provider };
}

// packages/ledger/dist/esm/index.mjs
import * as crypto12 from "crypto";
import * as crypto23 from "crypto";
import * as crypto33 from "crypto";
import * as fs3 from "fs";
import * as path3 from "path";
var LedgerError = class extends Error {
  code;
  cause;
  constructor(message, code, cause) {
    super(message), this.name = new.target.name, this.code = code ?? new.target.name, cause !== void 0 && (this.cause = cause), Object.setPrototypeOf(this, new.target.prototype);
  }
};
var EventError = class extends LedgerError {
  constructor(message, cause) {
    super(message, "EVENT_ERROR", cause);
  }
};
var ChainError = class extends LedgerError {
  constructor(message, cause) {
    super(message, "CHAIN_ERROR", cause);
  }
};
var MerkleError = class extends LedgerError {
  constructor(message, cause) {
    super(message, "MERKLE_ERROR", cause);
  }
};
var TimestampError = class extends LedgerError {
  constructor(message, cause) {
    super(message, "TIMESTAMP_ERROR", cause);
  }
};
var StoreError = class extends LedgerError {
  constructor(message, cause) {
    super(message, "STORE_ERROR", cause);
  }
};
var ReplayError = class extends LedgerError {
  constructor(message, cause) {
    super(message, "REPLAY_ERROR", cause);
  }
};
var ExportError = class extends LedgerError {
  constructor(message, cause) {
    super(message, "EXPORT_ERROR", cause);
  }
};
var TamperError = class extends LedgerError {
  constructor(message, cause) {
    super(message, "TAMPER_ERROR", cause);
  }
};
var SCRUBBED_FIELD_NAMES3 = ["privateKey", "privateKeyPem", "publicKeyPem", "password", "passphrase", "token", "secret", "credential", "iv", "tag", "share", "nonce", "signature", "commitment", "macs", "machineId"];
var SCRUB_REGEX3 = new RegExp("(?:" + SCRUBBED_FIELD_NAMES3.map((n) => n.toLowerCase()).join("|") + ")$", "i");
function sha2563(data) {
  try {
    let buf = typeof data == "string" ? Buffer.from(data, "utf8") : data;
    return crypto12.createHash("sha256").update(buf).digest();
  } catch (err) {
    throw new LedgerError("sha256 failed: " + err.message, "HASH_ERROR", err);
  }
}
function secureRandom2(n) {
  if (!Number.isInteger(n) || n <= 0) throw new LedgerError("secureRandom: length must be a positive integer", "RANDOM_ERROR");
  if (n > 1024 * 1024) throw new LedgerError("secureRandom: refusing to allocate > 1 MiB in a single call", "RANDOM_ERROR");
  try {
    return crypto12.randomBytes(n);
  } catch (err) {
    throw new LedgerError("secureRandom failed: " + err.message, "RANDOM_ERROR", err);
  }
}
function constantTimeEqual3(a, b) {
  return a.length !== b.length ? false : crypto12.timingSafeEqual(a, b);
}
function uuid2() {
  try {
    return crypto12.randomUUID();
  } catch (err) {
    throw new LedgerError("uuid failed: " + err.message, "UUID_ERROR", err);
  }
}
function sha256Hex(data) {
  return sha2563(data).toString("hex");
}
var DEFAULT_RSA_MODULUS3 = 3072;
var DEFAULT_RSA_EXPONENT3 = 65537;
var DEFAULT_EC_CURVE3 = "prime256v1";
function algorithmFor3(algo) {
  switch (algo) {
    case "rsa":
      return "rsa-pss";
    case "ecdsa":
      return "ecdsa-p256";
    default:
      throw new LedgerError(`unknown key algorithm: ${algo}`);
  }
}
function algorithmForKey2(key) {
  let type;
  try {
    type = key.asymmetricKeyType;
  } catch (err) {
    throw new LedgerError("algorithmForKey: cannot read key type: " + err.message, "KEY_TYPE_ERROR", err);
  }
  if (type === "rsa") return "rsa-pss";
  if (type === "ec") {
    let details;
    try {
      details = key.asymmetricKeyDetails;
    } catch {
    }
    if (details && details.namedCurve) {
      let curve = details.namedCurve;
      if (curve !== "P-256" && curve !== "prime256v1" && curve !== "secp256r1") throw new LedgerError(`algorithmForKey: only NIST P-256 is supported, got ${curve}`);
    }
    return "ecdsa-p256";
  }
  throw new LedgerError(`algorithmForKey: unsupported key type: ${type ?? "unknown"} (only rsa and ec are supported)`);
}
function generateKeyPair3(algo = "ecdsa", opts = {}) {
  try {
    let publicKey, privateKey;
    if (algo === "rsa") ({ publicKey, privateKey } = crypto23.generateKeyPairSync("rsa", { modulusLength: opts.rsaModulusBits ?? DEFAULT_RSA_MODULUS3, publicExponent: opts.rsaPublicExponent ?? DEFAULT_RSA_EXPONENT3 }));
    else if (algo === "ecdsa") {
      let curve = opts.ecCurve ?? DEFAULT_EC_CURVE3;
      if (curve !== "prime256v1") throw new LedgerError(`unsupported EC curve: ${curve}. Only 'prime256v1' (NIST P-256) is supported.`);
      ({ publicKey, privateKey } = crypto23.generateKeyPairSync("ec", { namedCurve: curve }));
    } else throw new LedgerError(`unknown key algorithm: ${algo}`);
    return { publicKey, privateKey, algorithm: algorithmFor3(algo) };
  } catch (err) {
    throw err instanceof LedgerError ? err : new LedgerError("key generation failed: " + err.message, "KEY_GENERATION_ERROR", err);
  }
}
function getKeyId(publicKey) {
  try {
    let der = (typeof publicKey == "string" ? crypto23.createPublicKey(publicKey) : publicKey).export({ type: "spki", format: "der" });
    return sha2563(der).toString("hex");
  } catch (err) {
    throw new LedgerError("getKeyId failed: " + err.message, "KEY_ID_ERROR", err);
  }
}
function sign23(privateKey, data, algo) {
  if (!Buffer.isBuffer(data)) throw new LedgerError("sign: data must be a Buffer", "SIGN_ERROR");
  let key = asPrivateKey3(privateKey), resolvedAlgo = algo ?? algorithmForKey2(key);
  try {
    if (resolvedAlgo === "rsa-pss") return crypto23.sign(SIGN_HASH3, data, { key, padding: crypto23.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto23.constants.RSA_PSS_SALTLEN_DIGEST }).toString("hex");
    if (resolvedAlgo === "ecdsa-p256") return crypto23.sign(SIGN_HASH3, data, key).toString("hex");
    throw new LedgerError(`unsupported signature algorithm: ${resolvedAlgo}`);
  } catch (err) {
    throw err instanceof LedgerError ? err : new LedgerError("sign failed: " + err.message, "SIGN_ERROR", err);
  }
}
function verify23(publicKey, data, signature, algo) {
  if (!Buffer.isBuffer(data)) throw new LedgerError("verify: data must be a Buffer", "VERIFY_ERROR");
  let signatureBuf;
  if (typeof signature == "string") {
    if (signature.length === 0 || !/^[0-9a-fA-F]+$/.test(signature)) throw new LedgerError("verify: signature must be non-empty hex", "VERIFY_ERROR");
    try {
      signatureBuf = Buffer.from(signature, "hex");
    } catch {
      throw new LedgerError("verify: signature must be hex-encoded", "VERIFY_ERROR");
    }
  } else signatureBuf = signature;
  let key = asPublicKey3(publicKey), resolvedAlgo = algo ?? algorithmForKey2(key), ok;
  try {
    if (resolvedAlgo === "rsa-pss") ok = crypto23.verify(SIGN_HASH3, data, { key, padding: crypto23.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto23.constants.RSA_PSS_SALTLEN_DIGEST }, signatureBuf);
    else if (resolvedAlgo === "ecdsa-p256") ok = crypto23.verify(SIGN_HASH3, data, key, signatureBuf);
    else throw new LedgerError(`unsupported signature algorithm: ${resolvedAlgo}`);
  } catch (err) {
    if (err instanceof LedgerError) throw err;
    return false;
  }
  let okByte = Buffer.from([ok ? 1 : 0]), expected = Buffer.from([1]);
  return crypto23.timingSafeEqual(okByte, expected);
}
var SIGN_HASH3 = "sha256";
function asPublicKey3(key) {
  if (typeof key == "string") try {
    return crypto23.createPublicKey(key);
  } catch (err) {
    throw new LedgerError("invalid public key PEM: " + err.message, "VERIFY_ERROR", err);
  }
  return key;
}
function asPrivateKey3(key) {
  if (typeof key == "string") try {
    return crypto23.createPrivateKey(key);
  } catch (err) {
    throw new LedgerError("invalid private key PEM: " + err.message, "SIGN_ERROR", err);
  }
  return key;
}
function canonicalSerialize(value) {
  let str = encode(value, /* @__PURE__ */ new WeakSet());
  return Buffer.from(str, "utf8");
}
function canonicalSerializeToString(value) {
  return encode(value, /* @__PURE__ */ new WeakSet());
}
function encode(value, seen) {
  if (value === null || value === void 0) return "null";
  let t = typeof value;
  if (t === "string") return jsonString(value);
  if (t === "boolean") return value ? "true" : "false";
  if (t === "number") {
    if (!Number.isFinite(value)) throw new LedgerError("canonicalSerialize: NaN / Infinity are not JSON-representable", "CANONICAL_ENCODE_ERROR");
    return value.toString();
  }
  if (t === "bigint") throw new LedgerError("canonicalSerialize: bigint is not JSON-representable (wrap in a string)", "CANONICAL_ENCODE_ERROR");
  if (Buffer.isBuffer(value)) return jsonString("@buffer:" + value.toString("hex"));
  if (value instanceof Uint8Array) return jsonString("@buffer:" + Buffer.from(value).toString("hex"));
  if (value instanceof Date) return jsonString(value.toISOString());
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new LedgerError("canonicalSerialize: cycle detected", "CANONICAL_ENCODE_ERROR");
    seen.add(value);
    let items = value.map((v) => v === void 0 ? "null" : encode(v, seen));
    return seen.delete(value), "[" + items.join(",") + "]";
  }
  if (t === "object") {
    let obj = value;
    if (seen.has(obj)) throw new LedgerError("canonicalSerialize: cycle detected", "CANONICAL_ENCODE_ERROR");
    seen.add(obj);
    try {
      let keys = Object.keys(obj).sort(), pairs = [];
      for (let key of keys) {
        let v = obj[key];
        v !== void 0 && pairs.push(jsonString(key) + ":" + encode(v, seen));
      }
      return "{" + pairs.join(",") + "}";
    } finally {
      seen.delete(obj);
    }
  }
  throw new LedgerError(`canonicalSerialize: unsupported value of type ${t}`, "CANONICAL_ENCODE_ERROR");
}
function jsonString(s) {
  return JSON.stringify(s);
}
var GENESIS_PREV_HASH = "0".repeat(64);
function computeEventHash(fields) {
  return sha2563(canonicalSerialize({ id: fields.id, seq: fields.seq, type: fields.type, actor: fields.actor, payload: fields.payload, timestamp: fields.timestamp, prevHash: fields.prevHash })).toString("hex");
}
function createEvent(opts) {
  if (!opts || typeof opts != "object") throw new EventError("createEvent: options are required");
  if (typeof opts.type != "string" || opts.type.length === 0) throw new EventError("createEvent: type must be a non-empty string");
  if (typeof opts.actor != "string" || opts.actor.length === 0) throw new EventError("createEvent: actor must be a non-empty string");
  if (opts.payload === null || typeof opts.payload != "object") throw new EventError("createEvent: payload must be a JSON object");
  if (Array.isArray(opts.payload)) throw new EventError("createEvent: payload must be an object, not an array");
  let id = opts.id ?? uuid2();
  if (typeof id != "string" || id.length === 0) throw new EventError("createEvent: id must be a non-empty string");
  let seq = opts.seq ?? 1;
  if (!Number.isInteger(seq) || seq < 1) throw new EventError("createEvent: seq must be a positive integer");
  let timestamp = opts.timestamp ?? (/* @__PURE__ */ new Date()).toISOString();
  if (typeof timestamp != "string" || timestamp.length === 0) throw new EventError("createEvent: timestamp must be a non-empty string");
  let prevHash = opts.prevHash ?? GENESIS_PREV_HASH;
  if (typeof prevHash != "string" || !/^[0-9a-fA-F]*$/.test(prevHash)) throw new EventError("createEvent: prevHash must be a hex string");
  let metadata = opts.metadata === void 0 ? void 0 : { ...opts.metadata };
  try {
    canonicalSerialize({ id, seq, type: opts.type, actor: opts.actor, payload: opts.payload, timestamp, prevHash }), metadata !== void 0 && canonicalSerialize(metadata);
  } catch (err) {
    throw new EventError("createEvent: payload / metadata are not canonical-serializable: " + err.message, err);
  }
  let hash = computeEventHash({ id, seq, type: opts.type, actor: opts.actor, payload: opts.payload, timestamp, prevHash });
  return { id, seq, type: opts.type, actor: opts.actor, payload: opts.payload, timestamp, prevHash, hash, ...metadata !== void 0 ? { metadata } : {} };
}
function signEvent(event, privateKey, algo) {
  if (!event || typeof event.hash != "string" || event.hash.length !== 64) throw new EventError("signEvent: event must have a valid 64-char hex hash");
  let hashBytes;
  try {
    hashBytes = Buffer.from(event.hash, "hex");
  } catch (err) {
    throw new EventError("signEvent: cannot decode hash: " + err.message, err);
  }
  if (hashBytes.length !== 32) throw new EventError("signEvent: hash must decode to 32 bytes");
  let signature, resolvedAlgo;
  try {
    resolvedAlgo = algo ?? inferAlgorithmFromKey(privateKey), signature = sign23(privateKey, hashBytes, resolvedAlgo);
  } catch (err) {
    throw err instanceof EventError ? err : new EventError("signEvent failed: " + err.message, err);
  }
  return { ...event, signature, signatureAlgorithm: resolvedAlgo };
}
function verifyEventSignature(event, publicKey, allowUnsigned = false) {
  if (!event || typeof event.hash != "string" || event.hash.length !== 64) throw new EventError("verifyEventSignature: event must have a valid 64-char hex hash");
  if (!event.signature) return allowUnsigned;
  let hashBytes;
  try {
    hashBytes = Buffer.from(event.hash, "hex");
  } catch (err) {
    throw new EventError("verifyEventSignature: cannot decode hash: " + err.message, err);
  }
  if (hashBytes.length !== 32) throw new EventError("verifyEventSignature: hash must decode to 32 bytes");
  let sigBytes;
  try {
    sigBytes = Buffer.from(event.signature, "hex");
  } catch (err) {
    throw new EventError("verifyEventSignature: cannot decode signature: " + err.message, err);
  }
  try {
    return verify23(publicKey, hashBytes, sigBytes, event.signatureAlgorithm);
  } catch (err) {
    throw err instanceof EventError ? err : new EventError("verifyEventSignature failed: " + err.message, err);
  }
}
function eventKeyId(publicKey) {
  return getKeyId(publicKey);
}
function inferAlgorithmFromKey(privateKey) {
  if (typeof privateKey != "string") {
    try {
      let type = privateKey.asymmetricKeyType;
      if (type === "rsa") return "rsa-pss";
      if (type === "ec") return "ecdsa-p256";
    } catch {
    }
    return "ecdsa-p256";
  }
  return /BEGIN RSA PRIVATE KEY/.test(privateKey) ? "rsa-pss" : "ecdsa-p256";
}
var LedgerChain = class {
  events = [];
  append(type, actor, payload, opts = {}) {
    if (typeof type != "string" || type.length === 0) throw new ChainError("append: type must be a non-empty string");
    if (typeof actor != "string" || actor.length === 0) throw new ChainError("append: actor must be a non-empty string");
    if (payload === null || typeof payload != "object" || Array.isArray(payload)) throw new ChainError("append: payload must be a JSON object");
    let seq = this.events.length + 1, prevHash = this.events.length === 0 ? GENESIS_PREV_HASH : this.events[this.events.length - 1].hash, event = createEvent({ type, actor, payload, seq, prevHash, ...opts.id !== void 0 ? { id: opts.id } : {}, ...opts.timestamp !== void 0 ? { timestamp: opts.timestamp } : {}, ...opts.metadata !== void 0 ? { metadata: opts.metadata } : {} });
    return opts.privateKey !== void 0 && (event = signEvent(event, opts.privateKey, opts.signatureAlgorithm)), this.events.push(event), event;
  }
  appendEvent(event) {
    if (!event || typeof event.seq != "number" || typeof event.hash != "string") throw new ChainError("appendEvent: event is malformed");
    let expectedSeq = this.events.length + 1;
    if (event.seq !== expectedSeq) throw new ChainError(`appendEvent: expected seq=${expectedSeq}, got seq=${event.seq}`);
    let expectedPrev = this.events.length === 0 ? GENESIS_PREV_HASH : this.events[this.events.length - 1].hash;
    if (event.prevHash !== expectedPrev) throw new ChainError("appendEvent: prevHash does not chain to current tail");
    return this.events.push(event), event;
  }
  get(seq) {
    if (!(!Number.isInteger(seq) || seq < 1 || seq > this.events.length)) return this.events[seq - 1];
  }
  getById(id) {
    return this.events.find((e) => e.id === id);
  }
  all() {
    return this.events.slice();
  }
  length() {
    return this.events.length;
  }
  head() {
    return this.events.length === 0 ? void 0 : this.events[0];
  }
  tail() {
    return this.events.length === 0 ? void 0 : this.events[this.events.length - 1];
  }
  replaceAll(events) {
    if (!Array.isArray(events)) throw new ChainError("replaceAll: events must be an array");
    this.events.length = 0;
    for (let e of events) this.events.push(e);
  }
};
function verifyChain(events, opts = {}) {
  if (!Array.isArray(events)) return { valid: false, firstBrokenIndex: void 0, reason: "verifyChain: events must be an array" };
  if (events.length === 0) return { valid: true };
  let { publicKeys, requireSignatures = false, checkTimestamps = true, checkSeqContiguity = true } = opts, prevHash = GENESIS_PREV_HASH, prevTs;
  for (let i = 0; i < events.length; i++) {
    let ev = events[i];
    if (!ev || typeof ev != "object") return { valid: false, firstBrokenIndex: i, reason: `event ${i}: not a LedgerEvent object` };
    if (checkSeqContiguity && ev.seq !== i + 1) return { valid: false, firstBrokenIndex: i, reason: `event ${i}: expected seq=${i + 1}, got seq=${ev.seq}` };
    if (ev.prevHash !== prevHash) return { valid: false, firstBrokenIndex: i, reason: `event ${i}: prevHash does not chain to previous event's hash` };
    let recomputed;
    try {
      recomputed = computeEventHash({ id: ev.id, seq: ev.seq, type: ev.type, actor: ev.actor, payload: ev.payload, timestamp: ev.timestamp, prevHash: ev.prevHash });
    } catch (err) {
      return { valid: false, firstBrokenIndex: i, reason: `event ${i}: cannot recompute hash: ${err.message}` };
    }
    if (recomputed !== ev.hash) return { valid: false, firstBrokenIndex: i, reason: `event ${i}: hash mismatch (stored=${ev.hash}, recomputed=${recomputed})` };
    if (checkTimestamps) {
      let ts;
      try {
        ts = Date.parse(ev.timestamp);
      } catch {
        ts = NaN;
      }
      if (Number.isNaN(ts)) return { valid: false, firstBrokenIndex: i, reason: `event ${i}: timestamp is not a valid ISO-8601 string` };
      if (prevTs !== void 0 && ts < prevTs) return { valid: false, firstBrokenIndex: i, reason: `event ${i}: timestamp ${ev.timestamp} is before previous event's timestamp` };
      prevTs = ts;
    }
    if (requireSignatures && !ev.signature) return { valid: false, firstBrokenIndex: i, reason: `event ${i}: signature required but missing` };
    if (publicKeys && ev.actor in publicKeys) {
      let pub = publicKeys[ev.actor];
      if (ev.signature) {
        let ok;
        try {
          ok = verifyEventSignature(ev, pub, false);
        } catch (err) {
          return { valid: false, firstBrokenIndex: i, reason: `event ${i}: signature verification threw: ${err.message}` };
        }
        if (!ok) return { valid: false, firstBrokenIndex: i, reason: `event ${i}: signature does not verify against actor's public key` };
      } else if (requireSignatures) return { valid: false, firstBrokenIndex: i, reason: `event ${i}: signature required but missing` };
    }
    prevHash = ev.hash;
  }
  return { valid: true };
}
function verifyProof(leaf, proof, root) {
  if (!Buffer.isBuffer(leaf) || !Buffer.isBuffer(root)) throw new MerkleError("verifyProof: leaf and root must be Buffers");
  if (!proof || !Array.isArray(proof.siblings)) throw new MerkleError("verifyProof: proof.siblings must be an array");
  let acc = Buffer.from(leaf);
  for (let step of proof.siblings) {
    if (!step || !Buffer.isBuffer(step.hash)) throw new MerkleError("verifyProof: each sibling must have a Buffer hash");
    if (step.side !== "left" && step.side !== "right") throw new MerkleError('verifyProof: sibling.side must be "left" or "right"');
    step.side === "left" ? acc = sha2563(Buffer.concat([INNER_PREFIX, step.hash, acc])) : acc = sha2563(Buffer.concat([INNER_PREFIX, acc, step.hash]));
  }
  return acc.length !== root.length ? false : crypto33.timingSafeEqual(acc, root);
}
var INNER_PREFIX = Buffer.from([1]);
var LEAF_PREFIX = Buffer.from([0]);
var INNER_PREFIX2 = Buffer.from([1]);
var MerkleTree = class _MerkleTree {
  constructor(levels, leafCount) {
    this.levels = levels;
    this.leafCount = leafCount;
  }
  levels;
  leafCount;
  static build(leaves) {
    if (!Array.isArray(leaves) || leaves.length === 0) throw new MerkleError("MerkleTree.build: leaves must be a non-empty array");
    for (let i = 0; i < leaves.length; i++) if (!Buffer.isBuffer(leaves[i])) throw new MerkleError(`MerkleTree.build: leaf ${i} is not a Buffer`);
    let level = leaves.map((l) => sha2563(Buffer.concat([LEAF_PREFIX, l]))), levels = [level];
    for (; level.length > 1; ) {
      let next = [], padded = level.length % 2 === 1 ? [...level, level[level.length - 1]] : level;
      for (let i = 0; i < padded.length; i += 2) next.push(sha2563(Buffer.concat([INNER_PREFIX2, padded[i], padded[i + 1]])));
      levels.push(next), level = next;
    }
    return new _MerkleTree(levels, leaves.length);
  }
  root() {
    let top = this.levels[this.levels.length - 1];
    return Buffer.from(top[0]);
  }
  getProof(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.leafCount) throw new MerkleError(`getProof: index ${index} out of range [0, ${this.leafCount})`);
    let siblings = [], idx = index;
    for (let level = 0; level < this.levels.length - 1; level++) {
      let nodes = this.levels[level], siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1, siblingHash;
      siblingIdx < nodes.length ? siblingHash = nodes[siblingIdx] : siblingHash = nodes[idx];
      let side = idx % 2 === 0 ? "right" : "left";
      siblings.push({ hash: Buffer.from(siblingHash), side }), idx = Math.floor(idx / 2);
    }
    return { index, siblings };
  }
  verifyProof(leaf, proof) {
    return verifyProof(leaf, proof, this.root());
  }
};
var LocalTimestampAuthority = class {
  privateKey;
  publicKey;
  algorithm;
  keyId;
  constructor(opts = {}) {
    if (opts.keypair) this.privateKey = opts.keypair.privateKey, this.publicKey = opts.keypair.publicKey, this.algorithm = opts.keypair.algorithm;
    else {
      let kp = generateKeyPair3("ecdsa");
      this.privateKey = kp.privateKey, this.publicKey = kp.publicKey, this.algorithm = kp.algorithm;
    }
    try {
      this.keyId = getKeyId(this.publicKey);
    } catch (err) {
      throw new TimestampError("LocalTimestampAuthority: cannot compute key id: " + err.message, err);
    }
  }
  issue(commitment) {
    if (Buffer.isBuffer(commitment)) {
      if (commitment.length === 0) throw new TimestampError("issue: commitment must be non-empty");
    } else if (typeof commitment == "string") {
      if (commitment.length === 0) throw new TimestampError("issue: commitment must be non-empty");
    } else throw new TimestampError("issue: commitment must be a Buffer or hex string");
    let commitmentHex = Buffer.isBuffer(commitment) ? commitment.toString("hex") : commitment, issuedAt = (/* @__PURE__ */ new Date()).toISOString(), canonical = Buffer.from(`${TIMESTAMP_TOKEN_VERSION}|${commitmentHex}|${issuedAt}|${this.keyId}`, "utf8"), signature;
    try {
      signature = sign23(this.privateKey, canonical, this.algorithm);
    } catch (err) {
      throw new TimestampError("issue: signing failed: " + err.message, err);
    }
    return { version: TIMESTAMP_TOKEN_VERSION, commitment: commitmentHex, issuedAt, signature, algorithm: this.algorithm, authorityKeyId: this.keyId };
  }
  getPublicKey() {
    return this.publicKey;
  }
  getKeyId() {
    return this.keyId;
  }
  getAlgorithm() {
    return this.algorithm;
  }
};
var TIMESTAMP_TOKEN_VERSION = 1;
function canonicalTimestampBytes(token) {
  return Buffer.from(`${token.version}|${token.commitment}|${token.issuedAt}|${token.authorityKeyId}`, "utf8");
}
var COMMITMENT_NONCE_BYTES = 32;
var COMMITMENT_BYTES = 32;
function commit(value) {
  if (!Buffer.isBuffer(value) || value.length === 0) throw new TimestampError("commit: value must be a non-empty Buffer");
  let nonce = secureRandom2(COMMITMENT_NONCE_BYTES);
  return { commitment: sha2563(Buffer.concat([value, nonce])), nonce };
}
function reveal(value, nonce, commitment) {
  if (!Buffer.isBuffer(value) || !Buffer.isBuffer(nonce) || !Buffer.isBuffer(commitment) || nonce.length !== COMMITMENT_NONCE_BYTES || commitment.length !== COMMITMENT_BYTES) return false;
  let recomputed = sha2563(Buffer.concat([value, nonce]));
  return constantTimeEqual3(recomputed, commitment);
}
function issueTimestamp(commitment, authority) {
  if (!authority || typeof authority.issue != "function") throw new TimestampError("issueTimestamp: authority must have an issue() method");
  return authority.issue(commitment);
}
function verifyTimestamp(token, authorityPublicKey) {
  if (!token || typeof token != "object" || token.version !== TIMESTAMP_TOKEN_VERSION || typeof token.commitment != "string" || token.commitment.length === 0 || typeof token.issuedAt != "string" || token.issuedAt.length === 0 || typeof token.signature != "string" || token.signature.length === 0 || typeof token.authorityKeyId != "string" || token.authorityKeyId.length === 0) return false;
  let sigBytes;
  try {
    sigBytes = Buffer.from(token.signature, "hex");
  } catch {
    return false;
  }
  let canonical = canonicalTimestampBytes(token);
  try {
    return verify23(authorityPublicKey, canonical, sigBytes, token.algorithm);
  } catch {
    return false;
  }
}
var EventReplayer = class {
  constructor(events) {
    this.events = events;
    if (events == null) throw new ReplayError("EventReplayer: events are required");
  }
  events;
  *replay(filter = {}) {
    let fromSeq = filter.fromSeq ?? 1, toSeq = filter.toSeq ?? Number.MAX_SAFE_INTEGER;
    if (!Number.isInteger(fromSeq) || fromSeq < 1) throw new ReplayError(`replay: fromSeq must be a positive integer, got ${fromSeq}`);
    if (!Number.isInteger(toSeq) || toSeq < fromSeq) throw new ReplayError(`replay: toSeq must be >= fromSeq (${fromSeq}), got ${toSeq}`);
    let fromTimeMs = filter.fromTime !== void 0 ? parseTime(filter.fromTime) : -1 / 0, toTimeMs = filter.toTime !== void 0 ? parseTime(filter.toTime) : 1 / 0;
    if (Number.isNaN(fromTimeMs)) throw new ReplayError("replay: fromTime is not a valid timestamp");
    if (Number.isNaN(toTimeMs)) throw new ReplayError("replay: toTime is not a valid timestamp");
    for (let ev of this.events) {
      if (ev.seq < fromSeq || ev.seq > toSeq || filter.type !== void 0 && ev.type !== filter.type || filter.actor !== void 0 && ev.actor !== filter.actor) continue;
      let tsMs = Date.parse(ev.timestamp);
      Number.isNaN(tsMs) || tsMs < fromTimeMs || tsMs > toTimeMs || (yield ev);
    }
  }
  project(reducer, initialState, filter = {}) {
    if (typeof reducer != "function") throw new ReplayError("project: reducer must be a function");
    let state = initialState;
    for (let ev of this.replay(filter)) try {
      state = reducer(state, ev);
    } catch (err) {
      throw new ReplayError("project: reducer threw at seq=" + ev.seq + ": " + err.message, err);
    }
    return state;
  }
};
function parseTime(t) {
  return typeof t == "number" ? t : Date.parse(t);
}
var InMemoryLedgerStore = class {
  events = [];
  byId = /* @__PURE__ */ new Map();
  append(event) {
    if (!event || typeof event != "object") throw new StoreError("append: event must be a LedgerEvent object");
    if (typeof event.seq != "number" || typeof event.id != "string") throw new StoreError("append: event is malformed");
    if (event.seq !== this.events.length + 1) throw new StoreError(`append: expected seq=${this.events.length + 1}, got seq=${event.seq}`);
    if (this.byId.has(event.id)) throw new StoreError(`append: duplicate event id ${event.id}`);
    let clone = cloneEvent(event);
    this.events.push(clone), this.byId.set(clone.id, clone);
  }
  get(seq) {
    if (!(!Number.isInteger(seq) || seq < 1 || seq > this.events.length)) return cloneEvent(this.events[seq - 1]);
  }
  getById(id) {
    let ev = this.byId.get(id);
    return ev ? cloneEvent(ev) : void 0;
  }
  length() {
    return this.events.length;
  }
  all() {
    return this.events.map(cloneEvent);
  }
  snapshot() {
    return this.events.map(cloneEvent);
  }
  restore(events) {
    if (!Array.isArray(events)) throw new StoreError("restore: events must be an array");
    this.events.length = 0, this.byId.clear();
    for (let i = 0; i < events.length; i++) {
      let ev = events[i];
      if (!ev || typeof ev != "object") throw new StoreError(`restore: event ${i} is malformed`);
      if (ev.seq !== i + 1) throw new StoreError(`restore: event ${i} has seq=${ev.seq}, expected ${i + 1}`);
      if (this.byId.has(ev.id)) throw new StoreError(`restore: duplicate event id ${ev.id}`);
      let clone = cloneEvent(ev);
      this.events.push(clone), this.byId.set(clone.id, clone);
    }
  }
};
function cloneEvent(event) {
  try {
    return JSON.parse(JSON.stringify(event));
  } catch (err) {
    throw new StoreError("cloneEvent: event is not JSON-serializable: " + err.message, err);
  }
}
var DEFAULT_COMPACT_THRESHOLD_BYTES = 1024 * 1024;
var FileLedgerStore = class {
  events = [];
  byId = /* @__PURE__ */ new Map();
  dataPath;
  indexPath;
  compactThreshold;
  constructor(dir, name = "ledger", opts = {}) {
    if (typeof dir != "string" || dir.length === 0) throw new StoreError("FileLedgerStore: dir must be a non-empty string");
    if (typeof name != "string" || name.length === 0) throw new StoreError("FileLedgerStore: name must be a non-empty string");
    this.dataPath = path3.join(dir, `${name}.jsonl`), this.indexPath = path3.join(dir, `${name}.idx.json`), this.compactThreshold = opts.compactThresholdBytes ?? DEFAULT_COMPACT_THRESHOLD_BYTES;
    try {
      fs3.existsSync(dir) || fs3.mkdirSync(dir, { recursive: true });
    } catch (err) {
      throw new StoreError("FileLedgerStore: cannot create directory: " + err.message, err);
    }
    opts.load !== false && this.load();
  }
  append(event) {
    if (!event || typeof event != "object") throw new StoreError("append: event must be a LedgerEvent object");
    if (typeof event.seq != "number" || typeof event.id != "string") throw new StoreError("append: event is malformed");
    if (event.seq !== this.events.length + 1) throw new StoreError(`append: expected seq=${this.events.length + 1}, got seq=${event.seq}`);
    if (this.byId.has(event.id)) throw new StoreError(`append: duplicate event id ${event.id}`);
    let clone = cloneEvent(event), line = JSON.stringify(clone) + `
`;
    try {
      fs3.appendFileSync(this.dataPath, line, { encoding: "utf8" });
    } catch (err) {
      throw new StoreError("append: write failed: " + err.message, err);
    }
    this.events.push(clone), this.byId.set(clone.id, clone);
    try {
      fs3.statSync(this.dataPath).size > this.compactThreshold && this.compact();
    } catch {
    }
  }
  get(seq) {
    if (!(!Number.isInteger(seq) || seq < 1 || seq > this.events.length)) return cloneEvent(this.events[seq - 1]);
  }
  getById(id) {
    let ev = this.byId.get(id);
    return ev ? cloneEvent(ev) : void 0;
  }
  length() {
    return this.events.length;
  }
  all() {
    return this.events.map(cloneEvent);
  }
  snapshot() {
    return this.events.map(cloneEvent);
  }
  restore(events) {
    if (!Array.isArray(events)) throw new StoreError("restore: events must be an array");
    this.events.length = 0, this.byId.clear();
    for (let i = 0; i < events.length; i++) {
      let ev = events[i];
      if (!ev || typeof ev != "object") throw new StoreError(`restore: event ${i} is malformed`);
      if (ev.seq !== i + 1) throw new StoreError(`restore: event ${i} has seq=${ev.seq}, expected ${i + 1}`);
      if (this.byId.has(ev.id)) throw new StoreError(`restore: duplicate event id ${ev.id}`);
      let clone = cloneEvent(ev);
      this.events.push(clone), this.byId.set(clone.id, clone);
    }
    this.compact();
  }
  getDataPath() {
    return this.dataPath;
  }
  getIndexPath() {
    return this.indexPath;
  }
  compact() {
    try {
      let lines = this.events.map((e) => JSON.stringify(e)).join(`
`) + `
`, tmp = this.dataPath + ".tmp";
      fs3.writeFileSync(tmp, lines, { encoding: "utf8" }), fs3.renameSync(tmp, this.dataPath);
      let idx = {};
      this.events.forEach((e, i) => {
        idx[e.id] = i + 1;
      });
      let idxTmp = this.indexPath + ".tmp";
      fs3.writeFileSync(idxTmp, JSON.stringify(idx), { encoding: "utf8" }), fs3.renameSync(idxTmp, this.indexPath);
    } catch (err) {
      throw new StoreError("compact failed: " + err.message, err);
    }
  }
  load() {
    if (!fs3.existsSync(this.dataPath)) return;
    let content;
    try {
      content = fs3.readFileSync(this.dataPath, "utf8");
    } catch (err) {
      throw new StoreError("load: cannot read data file: " + err.message, err);
    }
    let lines = content.split(`
`);
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.length === 0) continue;
      let ev;
      try {
        ev = JSON.parse(line);
      } catch (err) {
        throw new StoreError(`load: cannot parse line ${i + 1}: ${err.message}`, err);
      }
      if (!ev || typeof ev != "object") throw new StoreError(`load: line ${i + 1} is not an object`);
      if (ev.seq !== this.events.length + 1) throw new StoreError(`load: line ${i + 1} has seq=${ev.seq}, expected ${this.events.length + 1}`);
      if (this.byId.has(ev.id)) throw new StoreError(`load: duplicate event id ${ev.id}`);
      let clone = cloneEvent(ev);
      this.events.push(clone), this.byId.set(clone.id, clone);
    }
  }
};
function exportAuditLog(events, format, opts = {}) {
  if (!Array.isArray(events)) throw new ExportError("exportAuditLog: events must be an array");
  let filtered = opts.filter ? events.filter(opts.filter) : events, includeSigs = opts.includeSignatureFields !== false;
  switch (format) {
    case "json":
      return exportJson(filtered, includeSigs);
    case "jsonl":
      return exportJsonl(filtered, includeSigs);
    case "csv":
      return exportCsv(filtered, includeSigs, opts.maxCsvPayloadColumns ?? 64);
    default:
      throw new ExportError(`exportAuditLog: unknown format "${format}"`);
  }
}
function importJsonl(jsonl) {
  if (typeof jsonl != "string") throw new ExportError("importJsonl: input must be a string");
  let lines = jsonl.split(`
`), out = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line.length === 0) continue;
    let ev;
    try {
      ev = JSON.parse(line);
    } catch (err) {
      throw new ExportError(`importJsonl: cannot parse line ${i + 1}: ${err.message}`, err);
    }
    out.push(ev);
  }
  return out;
}
function exportJson(events, includeSigs) {
  return JSON.stringify(events.map((e) => projectEvent(e, includeSigs)), null, 2);
}
function exportJsonl(events, includeSigs) {
  return events.map((e) => JSON.stringify(projectEvent(e, includeSigs))).join(`
`) + (events.length ? `
` : "");
}
function exportCsv(events, includeSigs, maxPayloadCols) {
  let baseCols = ["seq", "type", "actor", "timestamp", "hash", "prevHash"], sigCols = includeSigs ? ["signature", "signatureAlgorithm"] : [], payloadKeys = [], seen = /* @__PURE__ */ new Set();
  for (let ev of events) if (ev.payload && typeof ev.payload == "object") for (let k of Object.keys(ev.payload)) seen.has(k) || (seen.add(k), payloadKeys.push(k));
  let payloadCols = payloadKeys.slice(0, maxPayloadCols), hasPayloadExtra = payloadKeys.length > payloadCols.length, rows = [[...baseCols, ...payloadCols, ...hasPayloadExtra ? ["payload_extra"] : [], ...sigCols, "id"].map(csvEscape).join(",")];
  for (let ev of events) {
    let row = [];
    row.push(String(ev.seq)), row.push(csvEscape(ev.type)), row.push(csvEscape(ev.actor)), row.push(csvEscape(ev.timestamp)), row.push(csvEscape(ev.hash)), row.push(csvEscape(ev.prevHash));
    for (let k of payloadCols) {
      let v = ev.payload?.[k];
      row.push(csvEscape(v === void 0 ? "" : typeof v == "string" ? v : JSON.stringify(v)));
    }
    if (hasPayloadExtra) {
      let extra = {};
      for (let k of payloadKeys.slice(maxPayloadCols)) extra[k] = ev.payload[k];
      row.push(csvEscape(JSON.stringify(extra)));
    }
    includeSigs && (row.push(csvEscape(ev.signature ?? "")), row.push(csvEscape(ev.signatureAlgorithm ?? ""))), row.push(csvEscape(ev.id)), rows.push(row.join(","));
  }
  return rows.join(`
`) + (rows.length ? `
` : "");
}
function projectEvent(ev, includeSigs) {
  let out = { id: ev.id, seq: ev.seq, type: ev.type, actor: ev.actor, payload: ev.payload, timestamp: ev.timestamp, prevHash: ev.prevHash, hash: ev.hash };
  return includeSigs && ev.signature !== void 0 && (out.signature = ev.signature), includeSigs && ev.signatureAlgorithm !== void 0 && (out.signatureAlgorithm = ev.signatureAlgorithm), ev.metadata !== void 0 && (out.metadata = ev.metadata), out;
}
function csvEscape(value) {
  if (value == null) return "";
  let s = typeof value == "string" ? value : String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
var CollaborationLedger = class {
  instanceId;
  chain;
  keyId;
  constructor(opts) {
    if (!opts.instanceId) throw new LedgerError("instanceId is required");
    if (!opts.chain?.append || typeof opts.chain.append != "function") throw new LedgerError("chain must provide an append method");
    this.instanceId = opts.instanceId, this.chain = opts.chain, this.keyId = opts.keyId ?? "unknown";
  }
  record(payload) {
    if (!payload.collaborationType) throw new LedgerError("collaborationType is required");
    if (!payload.sourceInstanceId || !payload.targetInstanceId) throw new LedgerError("sourceInstanceId and targetInstanceId are required");
    if (payload.startedAt <= 0 || payload.completedAt <= 0) throw new LedgerError("startedAt and completedAt must be positive");
    if (payload.completedAt < payload.startedAt) throw new LedgerError("completedAt must not be before startedAt");
    let event = { id: `collab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, seq: 0, type: "collaboration.attribution", actor: this.instanceId, timestamp: (/* @__PURE__ */ new Date()).toISOString(), prevHash: "0".repeat(64), hash: "", payload };
    return this.chain.append(event);
  }
  byInstance(instanceId, events) {
    return events.filter((e) => {
      if (e.type !== "collaboration.attribution") return false;
      let p = e.payload;
      return p.sourceInstanceId === instanceId || p.targetInstanceId === instanceId;
    });
  }
  byGrant(grantId, events) {
    return events.filter((e) => e.type !== "collaboration.attribution" ? false : e.payload.grantId === grantId);
  }
  failures(events) {
    return events.filter((e) => e.type !== "collaboration.attribution" ? false : !e.payload.success);
  }
  summary(events) {
    let collabEvents = events.filter((e) => e.type === "collaboration.attribution"), successful = 0, failed = 0, totalRecordsExchanged = 0, byType = {};
    for (let e of collabEvents) {
      let p = e.payload;
      p.success ? successful++ : failed++, totalRecordsExchanged += p.recordCount ?? 0, byType[p.collaborationType] = (byType[p.collaborationType] ?? 0) + 1;
    }
    return { total: collabEvents.length, successful, failed, byType, totalRecordsExchanged };
  }
};

// packages/anonymize/dist/esm/index.mjs
import { createHash as createHash4 } from "crypto";
import { createHash as createHash22 } from "crypto";
import { createHash as createHash32 } from "crypto";
import { createHash as createHash42 } from "crypto";
var AnonymizeError = class extends Error {
  code;
  cause;
  constructor(message, code, cause) {
    super(message), this.name = new.target.name, this.code = code ?? new.target.name, cause !== void 0 && (this.cause = cause), Object.setPrototypeOf(this, new.target.prototype);
  }
};
var DetectorError = class extends AnonymizeError {
  constructor(message, cause) {
    super(message, "DETECTOR_ERROR", cause);
  }
};
var RedactionError = class extends AnonymizeError {
  constructor(message, cause) {
    super(message, "REDACTION_ERROR", cause);
  }
};
var ValidationError = class extends AnonymizeError {
  constructor(message, cause) {
    super(message, "VALIDATION_ERROR", cause);
  }
};
var PublishingError = class extends AnonymizeError {
  constructor(message, cause) {
    super(message, "PUBLISHING_ERROR", cause);
  }
};
var LEVEL_RANK = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
var SCRUBBED_FIELD_NAMES4 = ["text", "value", "record", "content", "payload", "plaintext", "secret"];
function shouldScrubField(name) {
  if (typeof name != "string") return false;
  let lower = name.toLowerCase();
  for (let needle of SCRUBBED_FIELD_NAMES4) {
    let nl = needle.toLowerCase();
    if (lower === nl || lower.endsWith("_" + nl)) return true;
    if (lower.endsWith(nl) && lower.length > nl.length) {
      let prev = name[name.length - nl.length - 1];
      if (prev && /[A-Z]/.test(prev)) return true;
    }
  }
  return false;
}
function scrubMetadata(meta) {
  if (meta == null || typeof meta != "object") return meta;
  if (Buffer.isBuffer(meta)) return `[buffer:${meta.length}]`;
  if (meta instanceof Uint8Array) return `[uint8array:${meta.length}]`;
  if (meta instanceof Date) return meta.toISOString();
  if (Array.isArray(meta)) return meta.map(scrubMetadata);
  let out = {};
  for (let [k, v] of Object.entries(meta)) out[k] = shouldScrubField(k) ? "[redacted]" : scrubMetadata(v);
  return out;
}
var ConsoleLogger = class {
  constructor(level = "info") {
    this.level = level;
    this.levelRank = LEVEL_RANK[level] ?? LEVEL_RANK.info;
  }
  level;
  levelRank;
  debug(msg, meta) {
    this.emit("debug", msg, meta);
  }
  info(msg, meta) {
    this.emit("info", msg, meta);
  }
  warn(msg, meta) {
    this.emit("warn", msg, meta);
  }
  error(msg, meta) {
    this.emit("error", msg, meta);
  }
  emit(level, msg, meta) {
    try {
      if (LEVEL_RANK[level] < this.levelRank) return;
      let entry = { level, msg, ts: (/* @__PURE__ */ new Date()).toISOString(), ...meta ? { meta: scrubMetadata(meta) } : {} }, line = JSON.stringify(entry);
      level === "error" || level === "warn" ? process.stderr.write(line + `
`) : process.stdout.write(line + `
`);
    } catch {
    }
  }
};
var SilentLogger3 = class {
  debug() {
  }
  info() {
  }
  warn() {
  }
  error() {
  }
};
var DEFAULT_CONFIG = { minConfidence: 0.5, defaultStrategy: "mask", strategyByCategory: { credit_card: "redact", national_id: "redact", password: "redact", api_key: "redact", jwt_token: "redact", bank_account: "redact" }, disabledDetectors: [], validateOutput: true, maxResidualRisk: 0.05, logLevel: "info" };
function mergeConfig(user) {
  return { ...DEFAULT_CONFIG, ...user ?? {}, strategyByCategory: { ...DEFAULT_CONFIG.strategyByCategory, ...user?.strategyByCategory ?? {} } };
}
function severityFor(category) {
  switch (category) {
    case "national_id":
    case "passport_number":
    case "drivers_license":
    case "credit_card":
    case "bank_account":
    case "password":
    case "api_key":
    case "jwt_token":
    case "medical_record_number":
    case "phi_diagnosis":
    case "phi_medication":
    case "phi_procedure":
      return "critical";
    case "person_name":
    case "email_address":
    case "phone_number":
    case "physical_address":
    case "date_of_birth":
    case "health_condition":
    case "medication":
    case "religion":
    case "ethnicity":
    case "sexual_orientation":
    case "political_affiliation":
    case "phi_provider":
    case "phi_facility":
      return "high";
    case "ip_address":
    case "mac_address":
    case "url":
    case "username":
    case "user_id":
    case "device_id":
    case "phi_dates":
    case "phi_age":
    case "phi_device":
      return "medium";
    default:
      return "low";
  }
}
function makeFinding(input, start, end, category, confidence, detectorName) {
  return start < 0 || end <= start || end > input.length || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 ? null : { start, end, text: input.slice(start, end), category, confidence, severity: severityFor(category), detector: detectorName };
}
var DetectorRegistry = class {
  detectors = /* @__PURE__ */ new Map();
  register(detector) {
    if (this.detectors.has(detector.name)) throw new DetectorError(`Detector '${detector.name}' already registered`);
    this.detectors.set(detector.name, detector);
  }
  get(name) {
    return this.detectors.get(name);
  }
  list() {
    return Array.from(this.detectors.values());
  }
  runAll(input, perDetectorConfig, minConfidence = 0.5) {
    let all = [];
    for (let det of this.detectors.values()) {
      let merged = { ...det.defaultConfig, ...perDetectorConfig?.[det.name] ?? {} };
      if (merged.enabled === false) continue;
      let findings = det.detect(input, merged);
      for (let f of findings) f.confidence >= (merged.minConfidence ?? minConfidence) && all.push(f);
    }
    return all;
  }
};
function resolveOverlaps(findings) {
  if (findings.length === 0) return [];
  let sorted = [...findings].sort((a, b) => a.start - b.start || b.confidence - a.confidence), out = [];
  for (let f of sorted) {
    let last = out[out.length - 1];
    last && f.start < last.end ? (f.confidence > last.confidence || f.confidence === last.confidence && f.end - f.start > last.end - last.start) && (out[out.length - 1] = f) : out.push(f);
  }
  return out;
}
function regexDetector(name, category, pattern, confidence) {
  return { name, categories: [category], defaultConfig: { minConfidence: 0.5, enabled: true }, detect(input, config) {
    let out = [], re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"), m;
    for (; (m = re.exec(input)) !== null; ) {
      if (m.index === m.index + m[0].length) {
        re.lastIndex++;
        continue;
      }
      let f = makeFinding(input, m.index, m.index + m[0].length, category, confidence, name);
      f && out.push(f);
    }
    return out;
  } };
}
var emailDetector = regexDetector("email", "email_address", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, 0.95);
var phoneDetector = regexDetector("phone", "phone_number", /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}(?:[\s.-]?\d{1,4})?\b/g, 0.7);
var ipv4Detector = regexDetector("ipv4", "ip_address", /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g, 0.95);
var ipv6Detector = regexDetector("ipv6", "ip_address", /\b(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}\b/gi, 0.6);
var macDetector = regexDetector("mac", "mac_address", /\b(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/gi, 0.95);
var urlDetector = regexDetector("url", "url", /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.;,!?)]/gi, 0.9);
var creditCardDetector = { name: "credit_card", categories: ["credit_card"], defaultConfig: { minConfidence: 0.8, enabled: true }, detect(input) {
  let out = [], re = /\b(?:\d[ -]*?){13,19}\b/g, m;
  for (; (m = re.exec(input)) !== null; ) {
    let digits = m[0].replace(/[^\d]/g, "");
    if (digits.length < 13 || digits.length > 19 || !luhnValid(digits)) continue;
    let f = makeFinding(input, m.index, m.index + m[0].length, "credit_card", 0.92, "credit_card");
    f && out.push(f);
  }
  return out;
} };
function luhnValid(digits) {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    alt && (n *= 2, n > 9 && (n -= 9)), sum += n, alt = !alt;
  }
  return sum > 0 && sum % 10 === 0;
}
var ibanDetector = regexDetector("iban", "bank_account", /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{1,4}){4,8}\b/g, 0.85);
var jwtDetector = regexDetector("jwt", "jwt_token", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, 0.95);
var apiKeyDetector = regexDetector("api_key", "api_key", /\b(?:sk|pk|api[_-]?key|key)[_:-][A-Za-z0-9]{24,}\b/gi, 0.75);
var isoDateDetector = regexDetector("iso_date", "date", /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g, 0.7);
var postalCodeDetector = regexDetector("postal_code", "postal_code", /\b(?:\d{5}(?:-\d{4})?|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})\b/g, 0.6);
var usSsnDetector = regexDetector("us_ssn", "national_id", /\b\d{3}-\d{2}-\d{4}\b/g, 0.9);
var zaIdDetector = { name: "za_id", categories: ["national_id"], defaultConfig: { minConfidence: 0.9, enabled: true }, detect(input) {
  let out = [], re = /\b(\d{2})(\d{2})(\d{2})(\d{4})(\d)(\d{2})\b/g, m;
  for (; (m = re.exec(input)) !== null; ) {
    let yy = parseInt(m[1], 10), mm = parseInt(m[2], 10), dd = parseInt(m[3], 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || !zaIdChecksumValid(m[0])) continue;
    let f = makeFinding(input, m.index, m.index + m[0].length, "national_id", 0.95, "za_id");
    f && out.push(f);
  }
  return out;
} };
function zaIdChecksumValid(id) {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    let n = parseInt(id[i], 10);
    sum += i % 2 === 0 ? n : n * 2 > 9 ? n * 2 - 9 : n * 2;
  }
  return (10 - sum % 10) % 10 === parseInt(id[12], 10);
}
var ALL_PATTERN_DETECTORS = [emailDetector, phoneDetector, ipv4Detector, ipv6Detector, macDetector, urlDetector, creditCardDetector, ibanDetector, jwtDetector, apiKeyDetector, isoDateDetector, postalCodeDetector, usSsnDetector, zaIdDetector];
var HONORIFICS = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Rev", "Hon", "Sir", "Madam", "Mx", "Lady", "Lord"];
var NAME_PART = /[A-Z][a-z]{1,}(?:[-'][A-Z][a-z]{1,})?/;
var personNameDetector = { name: "person_name", categories: ["person_name"], defaultConfig: { minConfidence: 0.65, enabled: true }, detect(input, config) {
  let out = [], allow = new Set((config?.nameAllowlist ?? []).map((s) => s.toLowerCase())), re = new RegExp(`\\b(${HONORIFICS.join("|")})\\.?\\s+((?:${NAME_PART.source}\\s+){0,2}${NAME_PART.source})`, "g"), m;
  for (; (m = re.exec(input)) !== null; ) {
    let nameText = m[2];
    if (allow.has(nameText.toLowerCase())) continue;
    let start = m.index + m[0].length - nameText.length, f = makeFinding(input, start, start + nameText.length, "person_name", 0.75, "person_name");
    f && out.push(f);
  }
  return out;
} };
var STREET_SUFFIXES = ["Street", "St", "Avenue", "Ave", "Road", "Rd", "Drive", "Dr", "Lane", "Ln", "Boulevard", "Blvd", "Court", "Ct", "Way", "Place", "Pl", "Square", "Sq"];
var addressDetector = { name: "physical_address", categories: ["physical_address"], defaultConfig: { minConfidence: 0.6, enabled: true }, detect(input) {
  let out = [], re = new RegExp(`\\b\\d{1,6}[A-Z]?\\s+[A-Z][A-Za-z0-9.']+\\s+(?:${STREET_SUFFIXES.join("|")})\\b\\.?`, "g"), m;
  for (; (m = re.exec(input)) !== null; ) {
    let f = makeFinding(input, m.index, m.index + m[0].length, "physical_address", 0.65, "physical_address");
    f && out.push(f);
  }
  return out;
} };
var DEFAULT_HEALTH_TERMS = ["HIV", "AIDS", "diabetes", "hypertension", "asthma", "cancer", "tumor", "tumour", "depression", "anxiety", "bipolar", "schizophrenia", "epilepsy", "stroke", "myocardial infarction", "heart attack", "arthritis", "dementia", "Alzheimer", "pregnancy", "miscarriage", "abortion", "infertility", "STD", "STI", "hepatitis", "tuberculosis", "malaria", "COVID", "COVID-19"];
var healthConditionDetector = { name: "health_condition", categories: ["health_condition", "phi_diagnosis"], defaultConfig: { minConfidence: 0.7, enabled: true }, detect(input, config) {
  let out = [], terms = config?.healthTerms ?? DEFAULT_HEALTH_TERMS;
  for (let term of terms) {
    let re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), m;
    for (; (m = re.exec(input)) !== null; ) {
      let f = makeFinding(input, m.index, m.index + m[0].length, "health_condition", 0.78, "health_condition");
      f && out.push(f);
    }
  }
  return out;
} };
var DEFAULT_MEDICATION_TERMS = ["paracetamol", "ibuprofen", "aspirin", "amoxicillin", "azithromycin", "metformin", "insulin", "atorvastatin", "lisinopril", "amlodipine", "omeprazole", "citalopram", "sertraline", "fluoxetine", "diazepam", "morphine", "fentanyl", "oxycodone", "tramadol", "warfarin"];
var medicationDetector = { name: "medication", categories: ["medication", "phi_medication"], defaultConfig: { minConfidence: 0.7, enabled: true }, detect(input, config) {
  let out = [], terms = config?.medicationTerms ?? DEFAULT_MEDICATION_TERMS;
  for (let term of terms) {
    let re = new RegExp(`\\b${term}\\b`, "gi"), m;
    for (; (m = re.exec(input)) !== null; ) {
      let f = makeFinding(input, m.index, m.index + m[0].length, "medication", 0.78, "medication");
      f && out.push(f);
    }
  }
  return out;
} };
var DEFAULT_PROVIDER_TERMS = ["Dr.", "Physician", "Surgeon", "Nurse", "Clinic", "Hospital", "Ward", "Emergency Room", "ICU", "Pharmacy"];
var providerDetector = { name: "phi_provider", categories: ["phi_provider", "phi_facility"], defaultConfig: { minConfidence: 0.6, enabled: true }, detect(input) {
  let out = [];
  for (let term of DEFAULT_PROVIDER_TERMS) {
    let re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), m;
    for (; (m = re.exec(input)) !== null; ) {
      let cat = term === "Dr." || term === "Physician" || term === "Surgeon" || term === "Nurse" ? "phi_provider" : "phi_facility", f = makeFinding(input, m.index, m.index + m[0].length, cat, 0.6, "phi_provider");
      f && out.push(f);
    }
  }
  return out;
} };
var ALL_CONTEXT_DETECTORS = [personNameDetector, addressDetector, healthConditionDetector, medicationDetector, providerDetector];
var MaskRedactor = class {
  strategy = "mask";
  redact(finding) {
    let t = finding.text;
    return t.length <= 2 ? "*".repeat(t.length) : t.length <= 6 ? t[0] + "*".repeat(t.length - 2) + t[t.length - 1] : t.slice(0, 2) + "*".repeat(Math.min(t.length - 4, 8)) + t.slice(-2);
  }
};
var HashRedactor = class {
  constructor(prefix = "sha256", length = 12) {
    this.prefix = prefix;
    this.length = length;
    if (length < 4 || length > 64) throw new RedactionError("HashRedactor.length must be in [4,64]");
  }
  prefix;
  length;
  strategy = "hash";
  redact(finding) {
    let h = createHash4("sha256").update(finding.text).digest("hex");
    return `[${this.prefix}:${h.slice(0, this.length)}]`;
  }
};
var TokenRedactor = class {
  constructor(prefixTemplate = (c) => c.toUpperCase()) {
    this.prefixTemplate = prefixTemplate;
  }
  prefixTemplate;
  strategy = "token";
  counters = /* @__PURE__ */ new Map();
  mapping = /* @__PURE__ */ new Map();
  redact(finding) {
    let cached = this.mapping.get(finding.text);
    if (cached) return cached;
    let n = (this.counters.get(finding.category) ?? 0) + 1;
    this.counters.set(finding.category, n);
    let token = `[${this.prefixTemplate(finding.category)}_${String(n).padStart(3, "0")}]`;
    return this.mapping.set(finding.text, token), token;
  }
  getMapping() {
    return this.mapping;
  }
};
var FullRedactor = class {
  constructor(replacement = "[REDACTED]") {
    this.replacement = replacement;
  }
  replacement;
  strategy = "redact";
  redact() {
    return this.replacement;
  }
};
var GeneralizeRedactor = class {
  strategy = "generalize";
  redact(finding) {
    let num = parseInt(finding.text, 10);
    if (!Number.isNaN(num)) {
      if (finding.category === "date_of_birth" || finding.category === "phi_age") {
        let band = Math.floor(num / 10) * 10;
        return `[age:${band}-${band + 9}]`;
      }
      return `[num:${Math.floor(num / 10) * 10}+]`;
    }
    return "[generalized]";
  }
};
var SynthesizeRedactor = class {
  strategy = "synthesize";
  redact(finding) {
    switch (finding.category) {
      case "email_address":
        return `user${Math.floor(Math.random() * 9999)}@example.com`;
      case "phone_number":
        return `+1-555-01${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
      case "credit_card":
        return "4111-1111-1111-1111";
      case "ip_address":
        return `10.0.0.${Math.floor(Math.random() * 254) + 1}`;
      case "person_name":
        return ["Alex Sample", "Sam Test", "Pat Example", "Jordan Demo"][Math.floor(Math.random() * 4)];
      default:
        return "[synthesized]";
    }
  }
};
function applyRedactions(input, findings, redactorFor) {
  let ordered = [...findings].sort((a, b) => b.start - a.start), out = input, redactions = [];
  for (let f of ordered) {
    let r = redactorFor(f), replacement = r.redact(f);
    out = out.slice(0, f.start) + replacement + out.slice(f.end), redactions.push({ finding: f, replacement, strategy: r.strategy });
  }
  return redactions.reverse(), { output: out, redactions };
}
var SENSITIVE_METADATA_KEYS = ["author", "creator", "createdBy", "lastModifiedBy", "owner", "gps", "gpslatitude", "gpslongitude", "gpsaltitude", "gpsposition", "location", "latlong", "coordinates", "geolocation", "deviceid", "deviceid", "serialnumber", "imei", "imsi", "meid", "macaddress", "ssid", "bssid", "userid", "username", "useragent", "ip", "ipaddress", "remoteaddr", "phonenumber", "email", "address", "birthdate", "dob", "exif", "xmp", "iptc", "signature", "signedby", "token", "apikey", "secret", "password", "sessionid"];
function isSensitiveKey(key, opts = {}) {
  let lower = key.toLowerCase();
  if (new Set((opts.allowlist ?? []).map((k) => k.toLowerCase())).has(lower)) return false;
  let deny = new Set(SENSITIVE_METADATA_KEYS.map((k) => k.toLowerCase()));
  for (let k of opts.additionalKeys ?? []) deny.add(k.toLowerCase());
  if (deny.has(lower)) return true;
  for (let d of deny) if (lower.length > d.length && lower.includes(d)) return true;
  return false;
}
function scrubMetadata2(meta, opts = {}) {
  if (meta == null || typeof meta != "object") return meta;
  if (Buffer.isBuffer(meta)) return `[buffer:${meta.length}]`;
  if (meta instanceof Date) return meta.toISOString();
  if (Array.isArray(meta)) return meta.map((v) => scrubMetadata2(v, opts));
  let out = {};
  for (let [k, v] of Object.entries(meta)) isSensitiveKey(k, opts) ? opts.redactInsteadOfDelete && (out[k] = "[redacted]") : out[k] = scrubMetadata2(v, opts);
  return out;
}
function diffMetadata(a, b) {
  let onlyInA = [], onlyInB = [], changed = [], ak = new Set(Object.keys(a)), bk = new Set(Object.keys(b));
  for (let k of ak) bk.has(k) ? JSON.stringify(a[k]) !== JSON.stringify(b[k]) && changed.push(k) : onlyInA.push(k);
  for (let k of bk) ak.has(k) || onlyInB.push(k);
  return { onlyInA, onlyInB, changed };
}
function assertClean(meta, opts = {}) {
  if (!(meta == null || typeof meta != "object")) {
    if (Array.isArray(meta)) {
      meta.forEach((v) => assertClean(v, opts));
      return;
    }
    for (let [k, v] of Object.entries(meta)) {
      if (isSensitiveKey(k, opts)) throw new AnonymizeError(`Residual sensitive key: '${k}'`);
      assertClean(v, opts);
    }
  }
}
var OCR_SUBSTITUTIONS = [[/\b0(?=\d{2,}\b)/g, "O"], [/5(?=[A-Za-z])/g, "S"], [/1(?=[A-Za-z])/g, "l"], [/\b[lI]\b/g, "1"], [/\bO\b/g, "0"], [/@/g, "@"], [/\s+/g, " "]];
function normalizeOcrText(input) {
  if (typeof input != "string") throw new AnonymizeError("normalizeOcrText: input must be string");
  let out = input;
  for (let [re, rep] of OCR_SUBSTITUTIONS) out = out.replace(re, rep);
  return out.trim();
}
function ocrPageToText(page) {
  let lines = /* @__PURE__ */ new Map();
  for (let w of page.words) {
    let row = Math.floor(w.y / Math.max(10, w.h || 10));
    lines.has(row) || lines.set(row, []), lines.get(row).push(w);
  }
  return [...lines.keys()].sort((a, b) => a - b).map((r) => lines.get(r).sort((a, b) => a.x - b.x).map((w) => w.text).join(" ")).join(`
`);
}
function stripOcrGeometry(page) {
  return { text: ocrPageToText(page) };
}
function findOcrPiiCandidates(text) {
  let out = [], hints = [[/\bemai[lI1]+\b/gi, "email"], [/\bph(?:one|0ne)\b/gi, "phone"], [/\b(?:soc(?:ial)?[\s-]*)?(?:sec(?:urity)?)?\s*\d{3}-?\s*\d{2}-?\s*\d{4}\b/gi, "ssn"], [/\bpassw(?:ord|0rd|0rd)\b/gi, "password"]];
  for (let [re, hint] of hints) {
    let m;
    for (; (m = re.exec(text)) !== null; ) out.push({ start: m.index, end: m.index + m[0].length, text: m[0], hint });
  }
  return out;
}
var JPEG_SOI = 65496;
var JPEG_APP1 = 65505;
var EXIF_MAGIC = Buffer.from("Exif\0\0", "ascii");
function stripJpegExif(input) {
  if (input.length < 4) throw new AnonymizeError("stripJpegExif: buffer too small");
  if (input.readUInt16BE(0) !== JPEG_SOI) return input;
  let out = [input.slice(0, 2)], i = 2;
  for (; i < input.length - 1 && input[i] === 255; ) {
    let marker = input.readUInt16BE(i), segLen = i + 4 <= input.length ? input.readUInt16BE(i + 2) : 0;
    if (marker === JPEG_APP1 && input.slice(i + 4, i + 10).equals(EXIF_MAGIC)) {
      i += 2 + segLen;
      continue;
    }
    if (segLen > 0 && i + 2 + segLen <= input.length) out.push(input.slice(i, i + 2 + segLen)), i += 2 + segLen;
    else {
      out.push(input.slice(i));
      break;
    }
  }
  return Buffer.concat(out);
}
function dhash(input, width = 8, height = 8) {
  let block = Math.floor(input.length / (width * height));
  if (block === 0) return createHash22("sha256").update(input).digest("hex").slice(0, 16);
  let pixels = [];
  for (let i = 0; i < width * height; i++) {
    let sum = 0;
    for (let b = 0; b < block; b++) sum += input[i * block + b];
    pixels.push(sum / block);
  }
  let bits = "";
  for (let y = 0; y < height; y++) for (let x = 0; x < width - 1; x++) {
    let a = pixels[y * width + x], b = pixels[y * width + x + 1];
    bits += a > b ? "1" : "0";
  }
  for (; bits.length % 4 !== 0; ) bits = "0" + bits;
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  for (; hex.length < 16; ) hex = "0" + hex;
  return hex.slice(0, 16);
}
function redactImage(input) {
  if (!Buffer.isBuffer(input)) throw new AnonymizeError("redactImage: input must be Buffer");
  let originalLength = input.length, isJpeg = input.length >= 2 && input.readUInt16BE(0) === JPEG_SOI, bytes = isJpeg ? stripJpegExif(input) : input;
  return { bytes, exifStripped: isJpeg, thumbnailsStripped: isJpeg, perceptualHash: dhash(bytes), originalLength, finalLength: bytes.length };
}
function imageIdentifier(input) {
  return dhash(input);
}
function parsePdfInfo(raw) {
  let out = {}, re = /\/(Title|Author|Subject|Keywords|Creator|Producer|CreationDate|ModDate|ID)\s*\(([^)]*)\)/g, m;
  for (; (m = re.exec(raw)) !== null; ) out[m[1]] = m[2];
  return out;
}
function parseDocxCoreXml(raw) {
  let out = {}, fields = [["title", /<dc:title>([^<]*)<\/dc:title>/], ["author", /<dc:creator>([^<]*)<\/dc:creator>/], ["subject", /<dc:subject>([^<]*)<\/dc:subject>/], ["keywords", /<cp:keywords>([^<]*)<\/cp:keywords>/], ["createdAt", /<dcterms:created[^>]*>([^<]*)<\/dcterms:created>/], ["modifiedAt", /<dcterms:modified[^>]*>([^<]*)<\/dcterms:modified>/], ["revision", /<cp:revision>([^<]*)<\/cp:revision>/], ["identifier", /<dc:identifier>([^<]*)<\/dc:identifier>/]];
  for (let [k, re] of fields) {
    let m = re.exec(raw);
    m && (out[k] = m[1]);
  }
  return out;
}
function normalizeMetadata(kind, raw) {
  let get = (key) => {
    let lk = key.toLowerCase();
    for (let k of Object.keys(raw)) if (k.toLowerCase() === lk) return raw[k];
  }, keywords = get("keywords"), revision = get("revision");
  return { kind, raw, normalized: { title: get("title"), author: get("author"), subject: get("subject"), keywords: typeof keywords == "string" ? keywords.split(",").map((s) => s.trim()) : void 0, creator: get("creator"), producer: get("producer"), createdAt: get("createdAt"), modifiedAt: get("modifiedAt"), revision: typeof revision == "string" ? parseInt(revision, 10) : typeof revision == "number" ? revision : void 0, identifier: get("identifier") } };
}
function scrubDocumentMetadata(meta, opts = {}) {
  let clean = scrubMetadata2(meta.raw, opts);
  return normalizeMetadata(meta.kind, clean);
}
function assertDocumentClean(meta, opts = {}) {
  if (meta.normalized.author) throw new AnonymizeError(`Document author not stripped: '${meta.normalized.author}'`);
  if (meta.normalized.identifier) throw new AnonymizeError(`Document identifier not stripped: '${meta.normalized.identifier}'`);
  for (let k of Object.keys(meta.raw)) if (k.toLowerCase() === "author" || k.toLowerCase() === "creator") throw new AnonymizeError(`Residual sensitive field: '${k}'`);
}
var Validator = class {
  constructor(registry) {
    this.registry = registry;
  }
  registry;
  validate(output, originalFindings, pipelineConfigHash, opts = {}) {
    let entries = [], residual = this.registry.runAll(output, {}, 0.5), residualCounts = {};
    for (let f of residual) residualCounts[f.category] = (residualCounts[f.category] ?? 0) + 1, entries.push({ level: f.severity === "critical" || f.severity === "high" ? "error" : "warning", code: `RESIDUAL_${f.category.toUpperCase()}`, message: `Residual ${f.category} found in output: '${f.text.slice(0, 40)}'` });
    originalFindings.length === 0 && entries.push({ level: "info", code: "NO_FINDINGS", message: "No PII/PHI detected in input." });
    let risk = 0;
    for (let f of residual) {
      let w = f.severity === "critical" ? 1 : f.severity === "high" ? 0.5 : f.severity === "medium" ? 0.2 : 0.05;
      risk += w * f.confidence;
    }
    risk = Math.min(1, risk);
    let passed = residual.length === 0;
    return opts.failOnHighOrCritical && (passed = passed && !residual.some((f) => f.severity === "critical" || f.severity === "high")), opts.maxResidualRisk !== void 0 && risk > opts.maxResidualRisk && (passed = false, entries.push({ level: "error", code: "RESIDUAL_RISK_TOO_HIGH", message: `Residual risk ${risk.toFixed(3)} exceeds threshold ${opts.maxResidualRisk}` })), { passed, entries, residualRisk: risk, residualCounts, configHash: pipelineConfigHash };
  }
  assertValid(report) {
    if (!report.passed) throw new ValidationError(`Anonymization validation failed (residualRisk=${report.residualRisk.toFixed(3)}, ${report.entries.length} entries)`);
  }
};
function hashConfig(config) {
  let canon = JSON.stringify(config, Object.keys(config ?? {}).sort());
  return createHash32("sha256").update(canon).digest("hex");
}
function hashRecord(record) {
  return createHash42("sha256").update(record).digest("hex");
}
function hashDataset(recordHashes) {
  return createHash42("sha256").update(recordHashes.join(`
`)).digest("hex");
}
function buildManifest(name, records, configHash, validation) {
  if (!name || typeof name != "string") throw new PublishingError("Dataset name is required");
  if (!Array.isArray(records)) throw new PublishingError("records must be an array");
  let recordHashes = records.map(hashRecord), datasetHash = hashDataset(recordHashes);
  return { schemaVersion: 1, name, createdAt: (/* @__PURE__ */ new Date()).toISOString(), recordCount: records.length, recordHashes, datasetHash, configHash, validation: { passed: validation.passed, residualRisk: validation.residualRisk } };
}
function verifyManifest(manifest, records) {
  if (manifest.recordCount !== records.length) return false;
  for (let i = 0; i < records.length; i++) if (hashRecord(records[i]) !== manifest.recordHashes[i]) return false;
  return hashDataset(manifest.recordHashes) === manifest.datasetHash;
}
function serializeManifest(manifest) {
  return JSON.stringify(manifest, null, 2);
}
function defaultRegistry() {
  let reg = new DetectorRegistry();
  for (let d of [...ALL_PATTERN_DETECTORS, ...ALL_CONTEXT_DETECTORS]) reg.register(d);
  return reg;
}
function redactorForStrategy(strategy) {
  switch (strategy) {
    case "mask":
      return new MaskRedactor();
    case "hash":
      return new HashRedactor();
    case "token":
      return new TokenRedactor();
    case "redact":
      return new FullRedactor();
    case "generalize":
      return new GeneralizeRedactor();
    case "synthesize":
      return new SynthesizeRedactor();
    default:
      throw new AnonymizeError(`Unknown strategy: ${strategy}`);
  }
}
var Anonymizer = class {
  registry;
  validator;
  config;
  logger;
  constructor(config, registry) {
    this.config = mergeConfig(config), this.logger = this.config.logger ?? (this.config.logLevel === "silent" ? new SilentLogger3() : new ConsoleLogger(this.config.logLevel)), this.registry = registry ?? defaultRegistry();
    for (let name of this.config.disabledDetectors) {
      let d = this.registry.get(name);
      d && (d.defaultConfig.enabled = false);
    }
    this.validator = new Validator(this.registry);
  }
  anonymize(input) {
    if (typeof input != "string") throw new AnonymizeError("anonymize: input must be string");
    let start = Date.now();
    this.logger.debug("anonymize: starting", { inputLength: input.length });
    let rawFindings = this.registry.runAll(input, {}, this.config.minConfidence), findings = resolveOverlaps(rawFindings);
    this.logger.debug("anonymize: detected", { findingCount: findings.length });
    let redactorFor = (f) => {
      let strat = this.config.strategyByCategory[f.category] ?? this.config.defaultStrategy;
      return redactorForStrategy(strat);
    }, { output, redactions } = applyRedactions(input, findings, redactorFor), counts = {};
    for (let f of findings) counts[f.category] = (counts[f.category] ?? 0) + 1;
    let elapsedMs = Date.now() - start, result = { output, findings, redactions, safe: false, counts, elapsedMs }, report;
    if (this.config.validateOutput) {
      let configHash = hashConfig({ minConfidence: this.config.minConfidence, defaultStrategy: this.config.defaultStrategy, strategyByCategory: this.config.strategyByCategory, disabledDetectors: this.config.disabledDetectors });
      report = this.validator.validate(output, findings, configHash, { maxResidualRisk: this.config.maxResidualRisk, failOnHighOrCritical: true });
    } else report = { passed: true, entries: [], residualRisk: 0, residualCounts: {}, configHash: "validation-disabled" };
    return result.safe = report.passed, this.logger.info("anonymize: complete", { findings: findings.length, residualRisk: report.residualRisk, safe: result.safe, elapsedMs }), { result, report };
  }
  anonymizeBatch(records, name) {
    let results = records.map((r) => this.anonymize(r).result), residualCounts = {}, maxRisk = 0;
    for (let r of results) {
      let rep = this.validator.validate(r.output, r.findings, "batch", { failOnHighOrCritical: true });
      for (let [k, v] of Object.entries(rep.residualCounts)) residualCounts[k] = (residualCounts[k] ?? 0) + v;
      maxRisk = Math.max(maxRisk, rep.residualRisk);
    }
    let report = { passed: Object.keys(residualCounts).length === 0, entries: [], residualRisk: maxRisk, residualCounts, configHash: hashConfig({ name, count: records.length }) }, manifest = buildManifest(name, results.map((r) => r.output), report.configHash, report);
    return { results, report, manifest };
  }
};
function anonymize(input, config) {
  return new Anonymizer(config).anonymize(input);
}

// packages/customs-shield/dist/esm/index.mjs
var CustomsShieldError = class extends Error {
  code;
  cause;
  constructor(message, code, cause) {
    super(message), this.name = new.target.name, this.code = code ?? new.target.name, cause !== void 0 && (this.cause = cause), Object.setPrototypeOf(this, new.target.prototype);
  }
};
var HSCodeError = class extends CustomsShieldError {
  constructor(message, cause) {
    super(message, "HS_CODE_ERROR", cause);
  }
};
var SanctionsError = class extends CustomsShieldError {
  constructor(message, cause) {
    super(message, "SANCTIONS_ERROR", cause);
  }
};
var ComplianceError = class extends CustomsShieldError {
  constructor(message, cause) {
    super(message, "COMPLIANCE_ERROR", cause);
  }
};
var RestrictionError = class extends CustomsShieldError {
  constructor(message, cause) {
    super(message, "RESTRICTION_ERROR", cause);
  }
};
var RiskError = class extends CustomsShieldError {
  constructor(message, cause) {
    super(message, "RISK_ERROR", cause);
  }
};
var ReportingError = class extends CustomsShieldError {
  constructor(message, cause) {
    super(message, "REPORTING_ERROR", cause);
  }
};
var LEVEL_RANK2 = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
var SCRUBBED_FIELD_NAMES5 = ["taxId", "secret", "token", "apiKey", "password"];
function shouldScrubField2(name) {
  let lower = name.toLowerCase();
  for (let needle of SCRUBBED_FIELD_NAMES5) {
    let nl = needle.toLowerCase();
    if (lower === nl || lower.endsWith("_" + nl)) return true;
  }
  return false;
}
function scrubMetadata3(meta) {
  if (meta == null || typeof meta != "object") return meta;
  if (Buffer.isBuffer(meta)) return `[buffer:${meta.length}]`;
  if (meta instanceof Date) return meta.toISOString();
  if (Array.isArray(meta)) return meta.map(scrubMetadata3);
  let out = {};
  for (let [k, v] of Object.entries(meta)) out[k] = shouldScrubField2(k) ? "[redacted]" : scrubMetadata3(v);
  return out;
}
var ConsoleLogger2 = class {
  constructor(level = "info") {
    this.level = level;
    this.levelRank = LEVEL_RANK2[level] ?? LEVEL_RANK2.info;
  }
  level;
  levelRank;
  debug(msg, meta) {
    this.emit("debug", msg, meta);
  }
  info(msg, meta) {
    this.emit("info", msg, meta);
  }
  warn(msg, meta) {
    this.emit("warn", msg, meta);
  }
  error(msg, meta) {
    this.emit("error", msg, meta);
  }
  emit(level, msg, meta) {
    try {
      if (LEVEL_RANK2[level] < this.levelRank) return;
      let entry = { level, msg, ts: (/* @__PURE__ */ new Date()).toISOString(), ...meta ? { meta: scrubMetadata3(meta) } : {} }, line = JSON.stringify(entry);
      level === "error" || level === "warn" ? process.stderr.write(line + `
`) : process.stdout.write(line + `
`);
    } catch {
    }
  }
};
var SilentLogger4 = class {
  debug() {
  }
  info() {
  }
  warn() {
  }
  error() {
  }
};
var DEFAULT_CONFIG2 = { sanctionsThreshold: 0.75, holdThreshold: 50, computeDuty: true, logLevel: "info" };
function mergeConfig2(user) {
  return { ...DEFAULT_CONFIG2, ...user ?? {} };
}
var CHAPTER_DESCRIPTIONS = { "01": "Live animals", "02": "Meat and edible meat offal", "03": "Fish and aquatic invertebrates", "04": "Dairy produce, birds eggs, natural honey", "05": "Products of animal origin, n.e.s.", "06": "Live trees and other plants", "07": "Edible vegetables and certain roots/tubers", "08": "Edible fruit and nuts", "09": "Coffee, tea, mate and spices", 10: "Cereals", 11: "Products of the milling industry", 12: "Oil seeds and oleaginous fruits", 13: "Lac, gums, resins, vegetable saps", 14: "Vegetable plaiting materials, vegetable products n.e.s.", 15: "Animal or vegetable fats and oils", 16: "Preparations of meat, fish, etc.", 17: "Sugars and sugar confectionery", 18: "Cocoa and cocoa preparations", 19: "Preparations of cereals, flour, starch, milk", 20: "Preparations of vegetables, fruit, etc.", 21: "Miscellaneous edible preparations", 22: "Beverages, spirits and vinegar", 23: "Residues and waste of food industry, animal fodder", 24: "Tobacco and manufactured tobacco substitutes", 25: "Salt, sulfur, earths, stones, plasters, limes, cement", 26: "Ores, slag and ash", 27: "Mineral fuels, mineral oils and products", 28: "Inorganic chemicals", 29: "Organic chemicals", 30: "Pharmaceutical products", 31: "Fertilizers", 32: "Tanning/dye extracts, tannins, pigments, paints", 33: "Essential oils, cosmetics, toiletries", 34: "Soap, organic surface-active agents, waxes", 35: "Albuminoidal substances, modified starches, glues, enzymes", 36: "Explosives, pyrotechnic products, matches", 37: "Photographic or cinematographic goods", 38: "Miscellaneous chemical products", 39: "Plastics and articles thereof", 40: "Rubber and articles thereof", 41: "Raw hides and skins, leather", 42: "Articles of leather, saddlery, handbags", 43: "Furskins and artificial fur", 44: "Wood and articles of wood", 45: "Cork and articles of cork", 46: "Manufactures of straw, esparto, plaiting materials", 47: "Pulp of wood or other cellulosic material", 48: "Paper and paperboard, articles thereof", 49: "Printed books, newspapers, pictures", 50: "Silk", 51: "Wool, fine or coarse animal hair", 52: "Cotton", 53: "Other vegetable textile fibers, paper yarn", 54: "Man-made filaments", 55: "Man-made staple fibres", 56: "Wadding, felt, nonwovens, special yarns, twine, cordage", 57: "Carpets and other textile floor coverings", 58: "Special woven fabrics, tufted textile fabrics, lace", 59: "Impregnated, coated, covered or laminated textile fabrics", 60: "Knitted or crocheted fabrics", 61: "Articles of apparel, knitted or crocheted", 62: "Articles of apparel, not knitted or crocheted", 63: "Other made-up textile articles, sets, worn clothing", 64: "Footwear, gaiters, parts thereof", 65: "Headgear and parts thereof", 66: "Umbrellas, sun umbrellas, walking-sticks, seat-sticks", 67: "Prepared feathers, artificial flowers, articles of human hair", 68: "Articles of stone, plaster, cement, asbestos, mica", 69: "Ceramic products", 70: "Glass and glassware", 71: "Natural or cultured pearls, precious stones, metals", 72: "Iron and steel", 73: "Articles of iron or steel", 74: "Copper and articles thereof", 75: "Nickel and articles thereof", 76: "Aluminium and articles thereof", 78: "Lead and articles thereof", 79: "Zinc and articles thereof", 80: "Tin and articles thereof", 81: "Other base metals, cermets, articles thereof", 82: "Tools, implements, cutlery, spoons, forks, of base metal", 83: "Miscellaneous articles of base metal", 84: "Nuclear reactors, boilers, machinery and mechanical appliances", 85: "Electrical machinery and equipment, sound recorders, TV", 86: "Railway or tramway locomotives, rolling stock, track", 87: "Vehicles other than railway or tramway rolling stock", 88: "Aircraft, spacecraft, and parts thereof", 89: "Ships, boats and floating structures", 90: "Optical, photographic, cinematographic, measuring, medical instruments", 91: "Clocks and watches and parts thereof", 92: "Musical instruments, parts and accessories", 93: "Arms and ammunition, parts and accessories", 94: "Furniture, bedding, mattresses, lamps, signs, prefabricated buildings", 95: "Toys, games, sports requisites", 96: "Miscellaneous manufactured articles", 97: "Works of art, collectors pieces and antiques", 98: "Special classification provisions", 99: "Special transaction certificates" };
function isValidFormat(code) {
  if (typeof code != "string") return false;
  let clean = code.replace(/[ .-]/g, "");
  return /^\d{6,10}$/.test(clean);
}
function normalize(code) {
  if (typeof code != "string") throw new HSCodeError("HS code must be string");
  let clean = code.replace(/[ .-]/g, "");
  if (!/^\d{6,10}$/.test(clean)) throw new HSCodeError(`Invalid HS code format: '${code}'`);
  return clean;
}
function chapter(code) {
  return isValidFormat(code) ? normalize(code).slice(0, 2) : "";
}
function heading(code) {
  return isValidFormat(code) ? normalize(code).slice(0, 4) : "";
}
function international(code) {
  return isValidFormat(code) ? normalize(code).slice(0, 6) : "";
}
function buildDefaultCatalog() {
  let cat = /* @__PURE__ */ new Map();
  for (let [ch, desc] of Object.entries(CHAPTER_DESCRIPTIONS)) cat.set(ch + "0000", { issuingCountry: "WCO", international: ch + "0000", description: `${desc} (chapter-level placeholder)` });
  return cat;
}
var globalCatalog = buildDefaultCatalog();
function setCatalog(cat) {
  globalCatalog = cat;
}
function getCatalog() {
  return globalCatalog;
}
function lookup(code) {
  let n = normalize(code), exact = globalCatalog.get(n.slice(0, 6));
  return exact || globalCatalog.get(chapter(n) + "0000");
}
function validate(code) {
  if (!isValidFormat(code)) return { valid: false, reason: `Invalid format: '${code}' (expected 6-10 digits)` };
  let n = normalize(code);
  if (n.length < 6) return { valid: false, reason: "HS code must be at least 6 digits" };
  let ch = chapter(n);
  if (!CHAPTER_DESCRIPTIONS[ch]) return { valid: false, reason: `Unknown chapter: '${ch}'` };
  let entry = lookup(n);
  return entry ? { valid: true, partial: entry.international.endsWith("0000"), entry } : { valid: false, reason: `No catalog entry for '${n}'` };
}
function suggest(description, limit = 5) {
  if (typeof description != "string" || !description.trim()) return [];
  let tokens = description.toLowerCase().split(/\W+/).filter((t) => t.length > 2), scored = [];
  for (let [ch, desc] of Object.entries(CHAPTER_DESCRIPTIONS)) {
    let dLower = desc.toLowerCase(), score = 0;
    for (let t of tokens) dLower.includes(t) && (score += 1);
    score > 0 && scored.push({ code: ch + "0000", description: desc, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
function verifyMatch(code, description) {
  let entry = lookup(code);
  if (!entry) return { match: false, confidence: 0, reason: "HS code not in catalog" };
  let entryTokens = new Set(entry.description.toLowerCase().split(/\W+/).filter((t) => t.length > 2)), descTokens = description.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  if (descTokens.length === 0) return { match: false, confidence: 0, reason: "Description has no usable tokens" };
  let hits = 0;
  for (let t of descTokens) entryTokens.has(t) && hits++;
  let confidence = hits / descTokens.length;
  return { match: confidence >= 0.3, confidence, reason: `${hits}/${descTokens.length} tokens matched` };
}
var DEFAULT_COUNTRY_SANCTIONS = [{ list: "OFAC", name: "Cuba", sanctionedCountry: "CU", program: "Cuban Assets Control Regulations" }, { list: "OFAC", name: "Iran", sanctionedCountry: "IR", program: "Iranian Transactions and Sanctions Regulations" }, { list: "OFAC", name: "North Korea", sanctionedCountry: "KP", program: "North Korea Sanctions Policy" }, { list: "OFAC", name: "Syria", sanctionedCountry: "SY", program: "Syrian Civilian Protection" }, { list: "EU", name: "Russia", sanctionedCountry: "RU", program: "EU Sanctions Regulation 833/2014" }, { list: "EU", name: "Belarus", sanctionedCountry: "BY", program: "EU Belarus Sanctions" }, { list: "UN", name: "Sudan", sanctionedCountry: "SD", program: "UN Security Council Resolution 1591" }, { list: "UK", name: "Myanmar", sanctionedCountry: "MM", program: "UK Myanmar Sanctions" }];
var globalSanctionsList = [...DEFAULT_COUNTRY_SANCTIONS];
function setSanctionsList(list) {
  if (!Array.isArray(list)) throw new SanctionsError("Sanctions list must be an array");
  globalSanctionsList = list;
}
function getSanctionsList() {
  return globalSanctionsList;
}
function normalizeName(name) {
  return typeof name != "string" ? "" : name.toUpperCase().replace(/[''`-]/g, "").replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array(b.length + 1), curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      let cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}
function similarity(a, b) {
  let na = normalizeName(a), nb = normalizeName(b);
  return na.length === 0 && nb.length === 0 ? 1 : 1 - levenshtein(na, nb) / Math.max(na.length, nb.length);
}
function screenParty(party, threshold = 0.75) {
  if (!party) throw new SanctionsError("screenParty: party is required");
  let hits = [], namesToCheck = [party.name, ...party.aliases ?? []];
  for (let entry of globalSanctionsList) {
    if (entry.sanctionedCountry && entry.sanctionedCountry === party.country) {
      hits.push({ entry, confidence: 1, matchType: "exact", matchBasis: "country" });
      continue;
    }
    let entryNames = [entry.name, ...entry.aliases ?? []], bestSim = 0, bestType = "fuzzy";
    for (let candidate of namesToCheck) {
      for (let entryName of entryNames) {
        let sim = similarity(candidate, entryName);
        if (sim === 1) {
          bestSim = 1, bestType = "exact";
          break;
        }
        sim > bestSim && (bestSim = sim, bestType = sim >= 0.95 ? "exact" : sim >= 0.85 ? "partial" : "fuzzy");
      }
      if (bestSim === 1) break;
    }
    bestSim >= threshold && hits.push({ entry, confidence: bestSim, matchType: bestType, matchBasis: "name" });
  }
  return { party, hits };
}
function screenParties(parties, threshold = 0.75) {
  let findings = [];
  for (let p of parties) {
    let result = screenParty(p, threshold);
    for (let h of result.hits) {
      let category, severity;
      h.matchBasis === "country" ? (category = "sanctions_country_hit", severity = "critical") : (category = "sanctions_hit", severity = h.matchType === "exact" ? "critical" : h.matchType === "partial" ? "high" : "medium"), findings.push({ category, severity, message: `Potential sanctions match: party '${p.name}' (${p.country}) matches '${h.entry.name}' on ${h.entry.list} list (${h.entry.program ?? "n/a"}) \u2014 basis: ${h.matchBasis}`, ref: p.name, remediation: "Verify identity; if confirmed, halt transaction and file blocking report.", confidence: h.confidence });
    }
  }
  return findings;
}
var DEFAULT_RULE_SET = { embargoes: [{ fromCountry: "US", toCountry: "CU", reason: "US embargo on Cuba" }, { fromCountry: "US", toCountry: "IR", reason: "US embargo on Iran" }, { fromCountry: "US", toCountry: "KP", reason: "US embargo on North Korea" }, { fromCountry: "US", toCountry: "SY", reason: "US embargo on Syria" }, { fromCountry: "EU", toCountry: "RU", reason: "EU sanctions on Russia (partial)" }], licenses: [{ destinationCountry: "US", hsChapter: "93", licenseType: "both", reason: "Firearms and ammunition require ATF/ECC license" }, { destinationCountry: "US", hsChapter: "90", licenseType: "both", reason: "Some medical devices require FDA clearance" }, { destinationCountry: "ZA", hsChapter: "27", licenseType: "import", reason: "Fuel imports require DOE license (South Africa)" }, { destinationCountry: "EU", hsChapter: "85", licenseType: "both", reason: "Dual-use electronics may require export license" }], restrictedOrigins: [{ destinationCountry: "US", originCountry: "CN", reason: "Section 1260H restrictions on certain goods" }, { destinationCountry: "EU", originCountry: "RU", reason: "14th sanctions package restrictions" }], duties: [{ destinationCountry: "US", hsChapter: "61", rate: 16.5 }, { destinationCountry: "US", hsChapter: "62", rate: 16.5 }, { destinationCountry: "US", hsChapter: "64", rate: 8.5 }, { destinationCountry: "US", hsChapter: "85", rate: 2.5 }, { destinationCountry: "US", hsChapter: "87", rate: 2.5 }, { destinationCountry: "ZA", hsChapter: "61", rate: 30 }, { destinationCountry: "ZA", hsChapter: "62", rate: 30 }, { destinationCountry: "ZA", hsChapter: "85", rate: 5 }, { destinationCountry: "EU", hsChapter: "61", rate: 12 }, { destinationCountry: "EU", hsChapter: "62", rate: 12 }, { destinationCountry: "EU", hsChapter: "85", rate: 0 }] };
var globalRuleSet = DEFAULT_RULE_SET;
function setRuleSet(rules) {
  if (!rules || !Array.isArray(rules.embargoes)) throw new ComplianceError("Invalid rule set");
  globalRuleSet = rules;
}
function getRuleSet() {
  return globalRuleSet;
}
function checkEmbargoes(shipment) {
  let out = [];
  for (let r of globalRuleSet.embargoes) shipment.originCountry === r.fromCountry && shipment.destinationCountry === r.toCountry && out.push({ category: "restriction_violation", severity: "critical", message: `Embargo violation: ${r.reason}`, ref: shipment.id, remediation: "Halt shipment immediately.", confidence: 1 });
  return out;
}
function checkLicenses(shipment) {
  let out = [];
  for (let item of shipment.items) {
    let ch = chapter(item.hsCode);
    for (let r of globalRuleSet.licenses) r.destinationCountry === shipment.destinationCountry && r.hsChapter === ch && out.push({ category: "license_required", severity: "high", message: `Item '${item.description.slice(0, 50)}' (HS chapter ${ch}) requires ${r.licenseType} license into ${r.destinationCountry}: ${r.reason}`, ref: item.hsCode, remediation: `Obtain ${r.licenseType} license before shipping.`, confidence: 0.95 });
  }
  return out;
}
function checkRestrictedOrigins(shipment) {
  let out = [];
  for (let item of shipment.items) for (let r of globalRuleSet.restrictedOrigins) r.destinationCountry === shipment.destinationCountry && r.originCountry === item.countryOfOrigin && out.push({ category: "restriction_violation", severity: "high", message: `Restricted origin: '${item.description.slice(0, 50)}' from ${item.countryOfOrigin} into ${r.destinationCountry}: ${r.reason}`, ref: item.hsCode, remediation: "Source from a different origin or apply for an exception.", confidence: 0.9 });
  return out;
}
function calculateDuty(shipment) {
  let perItem = [], expected = 0;
  for (let item of shipment.items) {
    let ch = chapter(item.hsCode), rate = globalRuleSet.duties.find((d) => d.destinationCountry === shipment.destinationCountry && d.hsChapter === ch)?.rate ?? 0, value = item.quantity * item.unitValue, duty = value * (rate / 100);
    expected += duty, perItem.push({ hsCode: item.hsCode, rate, value, duty });
  }
  let declared = shipment.declaredDuty ?? 0;
  return { declared, expected, delta: expected - declared, perItem };
}
var DEFAULT_PRODUCT_RESTRICTIONS = [{ destinationCountry: "*", hsChapters: ["90", "93"], type: "license_required", reason: "Wassenaar dual-use controls" }, { destinationCountry: "*", hsChapters: ["29"], type: "license_required", reason: "UN drug precursor controls" }, { destinationCountry: "*", hsChapters: ["97"], type: "documentation_required", reason: "UNESCO 1970 cultural property convention" }, { destinationCountry: "*", hsChapters: ["38"], type: "license_required", reason: "Montreal Protocol on ozone-depleting substances" }, { destinationCountry: "*", hsChapters: ["01", "05", "41", "43"], type: "documentation_required", reason: "CITES endangered species convention" }];
var globalRestrictions = [...DEFAULT_PRODUCT_RESTRICTIONS];
function setRestrictions(list) {
  if (!Array.isArray(list)) throw new RestrictionError("Restrictions must be an array");
  globalRestrictions = list;
}
function getRestrictions() {
  return globalRestrictions;
}
function checkShipment(shipment) {
  let out = [];
  for (let item of shipment.items) {
    let ch = chapter(item.hsCode);
    for (let r of globalRestrictions) {
      if (r.destinationCountry !== "*" && r.destinationCountry !== shipment.destinationCountry || !r.hsChapters.includes(ch)) continue;
      let severity = r.type === "prohibited" ? "critical" : r.type === "license_required" ? "high" : "medium";
      out.push({ category: r.type === "prohibited" ? "restriction_violation" : "license_required", severity, message: `Item '${item.description.slice(0, 50)}' (HS ${item.hsCode}, chapter ${ch}) \u2014 ${r.type.replace(/_/g, " ")}: ${r.reason}`, ref: item.hsCode, remediation: r.type === "prohibited" ? "Cannot ship." : r.type === "license_required" ? "Obtain required license." : "Provide additional documentation.", confidence: 0.95 });
    }
  }
  return out;
}
var HIGH_RISK_TRANSSHIPMENT = ["AE", "PA", "HK", "SG", "MT", "CY", "BS", "KY"];
var INDICATOR_WEIGHTS = { sanctions_country_hit: 45, sanctions_hit: 35, restriction_violation: 30, license_required: 12, hs_code_invalid: 10, hs_code_mismatch: 6, hs_code_suggestion: 2, duty_miscalculation: 6, documentation_gap: 4, vulnerability: 5, risk_indicator: 3 };
var SEVERITY_MULTIPLIER = { info: 0.3, low: 0.5, medium: 0.75, high: 1, critical: 1.2 };
var MAX_PER_FINDING = { info: 5, low: 10, medium: 20, high: 40, critical: 80 };
function detectIndicators(shipment) {
  let out = [];
  if (shipment.transshipmentCountries) for (let c of shipment.transshipmentCountries) HIGH_RISK_TRANSSHIPMENT.includes(c) && out.push({ category: "risk_indicator", severity: "medium", message: `Transshipment through high-risk country: ${c}`, ref: c, remediation: "Verify cargo integrity at transshipment point.", confidence: 0.7 });
  for (let item of shipment.items) if (item.weightKg && item.weightKg > 0) {
    let valuePerKg = item.quantity * item.unitValue / item.weightKg;
    valuePerKg > 1e4 ? out.push({ category: "risk_indicator", severity: "medium", message: `Item '${item.description.slice(0, 40)}' has unusually high value/weight ratio (${valuePerKg.toFixed(0)}/kg) \u2014 possible misclassification or undervaluation`, ref: item.hsCode, remediation: "Verify HS code and declared value.", confidence: 0.6 }) : valuePerKg < 0.5 && out.push({ category: "risk_indicator", severity: "low", message: `Item '${item.description.slice(0, 40)}' has unusually low value/weight ratio (${valuePerKg.toFixed(2)}/kg) \u2014 possible overvaluation or waste shipment`, ref: item.hsCode, remediation: "Verify HS code and declared value.", confidence: 0.5 });
  }
  shipment.incoterm || out.push({ category: "documentation_gap", severity: "low", message: "Incoterm not declared", ref: shipment.id, remediation: "Specify Incoterm 2020 code.", confidence: 0.95 }), shipment.mode || out.push({ category: "documentation_gap", severity: "low", message: "Mode of transport not declared", ref: shipment.id, remediation: "Specify transport mode.", confidence: 0.95 });
  for (let item of shipment.items) item.weightKg || out.push({ category: "documentation_gap", severity: "low", message: `Item '${item.description.slice(0, 40)}' missing weight`, ref: item.hsCode, remediation: "Declare weight in kilograms.", confidence: 0.9 });
  return out;
}
function bandFor(score) {
  return score < 10 ? "low" : score < 25 ? "moderate" : score < 50 ? "elevated" : score < 75 ? "high" : "critical";
}
function scoreFrom(findings) {
  if (!Array.isArray(findings)) throw new RiskError("Findings must be an array");
  let score = 0, hasCritical = false;
  for (let f of findings) {
    let w = INDICATOR_WEIGHTS[f.category] ?? 1, mult = SEVERITY_MULTIPLIER[f.severity] ?? 1, cap = MAX_PER_FINDING[f.severity] ?? 20, contribution = Math.min(cap, w * mult * f.confidence);
    score += contribution, f.severity === "critical" && (hasCritical = true);
  }
  score = Math.min(100, score);
  let band = bandFor(score), holdForReview = hasCritical || score >= 50;
  return { score, band, holdForReview };
}
function analyzeVulnerabilities(shipment) {
  let out = [], totalValue = shipment.items.reduce((s, i) => s + i.quantity * i.unitValue, 0);
  for (let item of shipment.items) {
    let itemValue = item.quantity * item.unitValue;
    totalValue > 0 && itemValue / totalValue > 0.8 && out.push({ category: "vulnerability", severity: "medium", message: `Single-item value concentration: '${item.description.slice(0, 40)}' is ${(itemValue / totalValue * 100).toFixed(0)}% of shipment value`, ref: item.hsCode, remediation: "Consider splitting high-value shipments or adding insurance.", confidence: 0.85 });
  }
  return shipment.shipper.name === shipment.consignee.name && out.push({ category: "vulnerability", severity: "low", message: "Shipper and consignee are the same party \u2014 potential circular trade", ref: shipment.id, remediation: "Verify legitimate related-party transaction.", confidence: 0.6 }), out;
}
function buildImportDeclaration(shipment, regulator) {
  if (!shipment) throw new ReportingError("Shipment is required");
  if (!regulator) throw new ReportingError("Regulator is required");
  let duty = calculateDuty(shipment), fields = { shipmentId: shipment.id, shipperName: shipment.shipper.name, shipperCountry: shipment.shipper.country, consigneeName: shipment.consignee.name, consigneeCountry: shipment.consignee.country, originCountry: shipment.originCountry, destinationCountry: shipment.destinationCountry, declaredValue: shipment.declaredValue, currency: shipment.currency, incoterm: shipment.incoterm ?? "NOT_DECLARED", modeOfTransport: shipment.mode ?? "NOT_DECLARED", itemCount: shipment.items.length, totalWeightKg: shipment.items.reduce((s, i) => s + (i.weightKg ?? 0), 0), expectedDuty: duty.expected.toFixed(2), itemDetails: shipment.items.map((i) => ({ hsCode: i.hsCode, description: i.description, quantity: i.quantity, unitValue: i.unitValue, countryOfOrigin: i.countryOfOrigin })) };
  return { regulator, shipmentId: shipment.id, type: "import_declaration", fields, generatedAt: (/* @__PURE__ */ new Date()).toISOString() };
}
function buildSanctionsRecord(shipment, regulator, report) {
  if (!shipment) throw new ReportingError("Shipment is required");
  if (!report) throw new ReportingError("Shield report is required");
  return { regulator, shipmentId: shipment.id, type: "sanctions_screening_record", fields: { screenedAt: report.generatedAt, riskScore: report.riskScore, riskBand: report.riskBand, holdForReview: report.holdForReview, findingCount: report.findings.length, criticalFindings: report.findings.filter((f) => f.severity === "critical").length, highFindings: report.findings.filter((f) => f.severity === "high").length, sanctionsHits: report.counts.sanctions_hit ?? 0, countryHits: report.counts.sanctions_country_hit ?? 0 }, generatedAt: (/* @__PURE__ */ new Date()).toISOString() };
}
function validate2(report) {
  let missing = [];
  return report.regulator || missing.push("regulator"), report.shipmentId || missing.push("shipmentId"), report.type || missing.push("type"), report.generatedAt || missing.push("generatedAt"), (!report.fields || Object.keys(report.fields).length === 0) && missing.push("fields"), { valid: missing.length === 0, missing };
}
var CustomsShield = class {
  config;
  logger;
  constructor(config) {
    this.config = mergeConfig2(config), this.logger = this.config.logger ?? (this.config.logLevel === "silent" ? new SilentLogger4() : new ConsoleLogger2(this.config.logLevel));
  }
  screen(shipment) {
    if (!shipment) throw new CustomsShieldError("Shipment is required");
    if (!shipment.id) throw new CustomsShieldError("Shipment ID is required");
    if (!Array.isArray(shipment.items)) throw new CustomsShieldError("Shipment items must be array");
    let start = Date.now();
    this.logger.debug("screen: starting", { shipmentId: shipment.id, itemCount: shipment.items.length });
    let findings = [];
    for (let item of shipment.items) {
      let v = validate(item.hsCode);
      v.valid ? v.partial && findings.push({ category: "hs_code_suggestion", severity: "low", message: `HS code '${item.hsCode}' resolved only to chapter level \u2014 refine to 6+ digits`, ref: item.hsCode, remediation: "Use a more specific HS code.", confidence: 0.7 }) : findings.push({ category: "hs_code_invalid", severity: "high", message: `Invalid HS code '${item.hsCode}' on item '${item.description.slice(0, 40)}': ${v.reason}`, ref: item.hsCode, remediation: "Provide a valid 6-to-10-digit HS code.", confidence: 0.95 });
    }
    let parties = [shipment.shipper, shipment.consignee];
    if (findings.push(...screenParties(parties, this.config.sanctionsThreshold)), shipment.transshipmentCountries) for (let tc of shipment.transshipmentCountries) findings.push(...screenParties([{ name: tc, country: tc }], this.config.sanctionsThreshold));
    findings.push(...checkEmbargoes(shipment)), findings.push(...checkLicenses(shipment)), findings.push(...checkRestrictedOrigins(shipment)), findings.push(...checkShipment(shipment)), findings.push(...detectIndicators(shipment)), findings.push(...analyzeVulnerabilities(shipment));
    let { score, band, holdForReview } = scoreFrom(findings), hold = holdForReview || score >= this.config.holdThreshold, duty;
    if (this.config.computeDuty) {
      let d = calculateDuty(shipment);
      if (duty = { declared: d.declared, expected: d.expected, delta: d.delta }, Math.abs(d.delta) > 1 && d.expected > 0) {
        findings.push({ category: "duty_miscalculation", severity: Math.abs(d.delta) / d.expected > 0.1 ? "high" : "medium", message: `Duty mismatch: declared ${d.declared.toFixed(2)}, expected ${d.expected.toFixed(2)} (delta ${d.delta.toFixed(2)})`, ref: shipment.id, remediation: "Reconcile declared duty with calculated duty.", confidence: 0.9 });
        let reScore = scoreFrom(findings);
        return this.buildReport(shipment.id, findings, reScore.score, reScore.band, hold || reScore.holdForReview, duty, start);
      }
    }
    return this.buildReport(shipment.id, findings, score, band, hold, duty, start);
  }
  buildReport(shipmentId, findings, score, band, holdForReview, duty, start) {
    let counts = {};
    for (let f of findings) counts[f.category] = (counts[f.category] ?? 0) + 1;
    let elapsedMs = Date.now() - start, report = { shipmentId, riskScore: Math.round(score * 10) / 10, riskBand: band, holdForReview, findings, counts, duty, generatedAt: (/* @__PURE__ */ new Date()).toISOString(), elapsedMs };
    return this.logger.info("screen: complete", { shipmentId, riskScore: report.riskScore, band: report.riskBand, holdForReview, findingCount: findings.length, elapsedMs }), report;
  }
};
function screen(shipment, config) {
  return new CustomsShield(config).screen(shipment);
}

// packages/weave/dist/esm/index.mjs
var WeaveError = class extends Error {
  code;
  cause;
  constructor(message, code, cause) {
    super(message), this.name = new.target.name, this.code = code ?? "WEAVE_ERROR", cause !== void 0 && (this.cause = cause), Object.setPrototypeOf(this, new.target.prototype);
  }
};
var GraphError = class extends WeaveError {
  constructor(message, cause) {
    super(message, "GRAPH_ERROR", cause);
  }
};
var LayoutError = class extends WeaveError {
  constructor(message, cause) {
    super(message, "LAYOUT_ERROR", cause);
  }
};
var ExportError2 = class extends WeaveError {
  constructor(message, cause) {
    super(message, "EXPORT_ERROR", cause);
  }
};
var Graph = class _Graph {
  directed;
  nodesById = /* @__PURE__ */ new Map();
  edgesById = /* @__PURE__ */ new Map();
  outAdj = /* @__PURE__ */ new Map();
  inAdj = /* @__PURE__ */ new Map();
  constructor(directed = false) {
    this.directed = directed;
  }
  addNode(node) {
    if (!node || typeof node.id != "string") throw new GraphError("Node.id must be a string");
    if (this.nodesById.has(node.id)) throw new GraphError(`Node already exists: ${node.id}`);
    return this.nodesById.set(node.id, { ...node }), this.outAdj.set(node.id, /* @__PURE__ */ new Set()), this.inAdj.set(node.id, /* @__PURE__ */ new Set()), this;
  }
  addNodes(nodes) {
    for (let n of nodes) this.addNode(n);
    return this;
  }
  removeNode(id) {
    if (!this.nodesById.has(id)) return this;
    let incident = [];
    for (let e of this.edgesById.values()) (e.source === id || e.target === id) && incident.push(e.id);
    for (let eid of incident) this.removeEdge(eid);
    return this.nodesById.delete(id), this.outAdj.delete(id), this.inAdj.delete(id), this;
  }
  getNode(id) {
    return this.nodesById.get(id);
  }
  hasNode(id) {
    return this.nodesById.has(id);
  }
  updateNode(id, patch) {
    let existing = this.nodesById.get(id);
    if (!existing) throw new GraphError(`Node not found: ${id}`);
    return this.nodesById.set(id, { ...existing, ...patch, id }), this;
  }
  addEdge(edge) {
    if (!edge || typeof edge.id != "string") throw new GraphError("Edge.id must be a string");
    if (this.edgesById.has(edge.id)) throw new GraphError(`Edge already exists: ${edge.id}`);
    if (!this.nodesById.has(edge.source)) throw new GraphError(`Edge source node not found: ${edge.source}`);
    if (!this.nodesById.has(edge.target)) throw new GraphError(`Edge target node not found: ${edge.target}`);
    if (edge.source === edge.target) throw new GraphError(`Self-loops are not supported: ${edge.id}`);
    return this.edgesById.set(edge.id, { ...edge }), this.outAdj.get(edge.source).add(edge.target), this.inAdj.get(edge.target).add(edge.source), this.directed || (this.outAdj.get(edge.target).add(edge.source), this.inAdj.get(edge.source).add(edge.target)), this;
  }
  addEdges(edges) {
    for (let e of edges) this.addEdge(e);
    return this;
  }
  removeEdge(id) {
    let edge = this.edgesById.get(id);
    return edge ? (this.edgesById.delete(id), this.outAdj.get(edge.source)?.delete(edge.target), this.inAdj.get(edge.target)?.delete(edge.source), this.directed || (this.outAdj.get(edge.target)?.delete(edge.source), this.inAdj.get(edge.source)?.delete(edge.target)), this) : this;
  }
  getEdge(id) {
    return this.edgesById.get(id);
  }
  hasEdge(id) {
    return this.edgesById.has(id);
  }
  get nodes() {
    return Array.from(this.nodesById.values());
  }
  get edges() {
    return Array.from(this.edgesById.values());
  }
  size() {
    return this.nodesById.size;
  }
  edgeCount() {
    return this.edgesById.size;
  }
  successors(id) {
    let s = this.outAdj.get(id);
    return s ? Array.from(s) : [];
  }
  predecessors(id) {
    let s = this.inAdj.get(id);
    return s ? Array.from(s) : [];
  }
  neighbors(id) {
    let seen = new Set(this.successors(id));
    for (let p of this.predecessors(id)) seen.add(p);
    return Array.from(seen);
  }
  outDegree(id) {
    return this.outAdj.get(id)?.size ?? 0;
  }
  inDegree(id) {
    return this.inAdj.get(id)?.size ?? 0;
  }
  degree(id) {
    return this.directed ? this.outDegree(id) + this.inDegree(id) : this.outAdj.get(id)?.size ?? 0;
  }
  hasCycle() {
    return this.directed ? this.hasCycleDirected() : this.hasCycleUndirected();
  }
  hasCycleDirected() {
    let color = /* @__PURE__ */ new Map();
    for (let id of this.nodesById.keys()) color.set(id, 0);
    let stack = [];
    for (let start of this.nodesById.keys()) if (color.get(start) === 0) for (color.set(start, 1), stack.push([start, this.successors(start)[Symbol.iterator]()]); stack.length > 0; ) {
      let top = stack[stack.length - 1], next = top[1].next();
      if (next.done) {
        color.set(top[0], 2), stack.pop();
        continue;
      }
      let w = next.value, cw = color.get(w);
      if (cw === 1) return true;
      cw === 0 && (color.set(w, 1), stack.push([w, this.successors(w)[Symbol.iterator]()]));
    }
    return false;
  }
  hasCycleUndirected() {
    let parent = /* @__PURE__ */ new Map(), find = (x) => {
      let root = x;
      for (; parent.get(root) !== root; ) root = parent.get(root);
      let cur = x;
      for (; parent.get(cur) !== root; ) {
        let next = parent.get(cur);
        parent.set(cur, root), cur = next;
      }
      return root;
    };
    for (let id of this.nodesById.keys()) parent.set(id, id);
    for (let e of this.edgesById.values()) {
      let ra = find(e.source), rb = find(e.target);
      if (ra === rb) return true;
      parent.set(ra, rb);
    }
    return false;
  }
  topologicalSort() {
    if (!this.directed) throw new GraphError("topologicalSort requires a directed graph");
    if (this.hasCycle()) throw new GraphError("Cannot topologically sort a graph with cycles");
    let inDeg = /* @__PURE__ */ new Map();
    for (let id of this.nodesById.keys()) inDeg.set(id, this.inDegree(id));
    let queue = [];
    for (let [id, d] of inDeg) d === 0 && queue.push(id);
    queue.sort();
    let result = [];
    for (; queue.length > 0; ) {
      let n = queue.shift();
      result.push(n);
      let succs = this.successors(n).sort();
      for (let s of succs) {
        let d = (inDeg.get(s) ?? 0) - 1;
        if (inDeg.set(s, d), d === 0) {
          let lo = 0, hi = queue.length;
          for (; lo < hi; ) {
            let mid = lo + hi >> 1;
            queue[mid] < s ? lo = mid + 1 : hi = mid;
          }
          queue.splice(lo, 0, s);
        }
      }
    }
    return result;
  }
  findConnectedComponents() {
    let visited = /* @__PURE__ */ new Set(), components = [];
    for (let start of this.nodesById.keys()) {
      if (visited.has(start)) continue;
      let comp = [], stack = [start];
      for (visited.add(start); stack.length > 0; ) {
        let n = stack.pop();
        comp.push(n);
        for (let nb of this.neighbors(n)) visited.has(nb) || (visited.add(nb), stack.push(nb));
      }
      comp.sort(), components.push(comp);
    }
    return components.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0), components;
  }
  componentOf(id) {
    if (!this.nodesById.has(id)) return [];
    let visited = /* @__PURE__ */ new Set([id]), stack = [id];
    for (; stack.length > 0; ) {
      let n = stack.pop();
      for (let nb of this.neighbors(n)) visited.has(nb) || (visited.add(nb), stack.push(nb));
    }
    return Array.from(visited).sort();
  }
  bfsDepths(start, maxDepth = 1 / 0) {
    let result = /* @__PURE__ */ new Map();
    if (!this.nodesById.has(start)) return result;
    result.set(start, 0);
    let queue = [start];
    for (; queue.length > 0; ) {
      let n = queue.shift(), d = result.get(n);
      if (!(d >= maxDepth)) for (let nb of this.neighbors(n)) result.has(nb) || (result.set(nb, d + 1), queue.push(nb));
    }
    return result;
  }
  clone() {
    let g = new _Graph(this.directed);
    return g.addNodes(this.nodes), g.addEdges(this.edges), g;
  }
};
function createGraph(nodes, edges = [], directed = false) {
  let g = new Graph(directed);
  return g.addNodes(nodes), g.addEdges(edges), g;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0, a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    return t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function assertNonEmpty(graph) {
  if (graph.size() === 0) throw new LayoutError("Cannot lay out an empty graph");
}
function initialPositions(graph, width, height, rng) {
  let pos = /* @__PURE__ */ new Map(), ids = graph.nodes.map((n) => n.id).sort(), cols = Math.max(1, Math.ceil(Math.sqrt(ids.length))), cellW = width / (cols + 1), cellH = height / (Math.ceil(ids.length / cols) + 1);
  return ids.forEach((id, i) => {
    let r = Math.floor(i / cols), c = i % cols, jx = (rng() - 0.5) * 10, jy = (rng() - 0.5) * 10;
    pos.set(id, { x: cellW * (c + 1) + jx, y: cellH * (r + 1) + jy });
  }), pos;
}
function forceDirected(graph, opts = {}) {
  assertNonEmpty(graph);
  let width = opts.width ?? 800, height = opts.height ?? 600, iterations = opts.iterations ?? 300, seed = opts.seed ?? 1, repulsion = opts.repulsion ?? 1, idealLength = opts.idealLength ?? Math.min(width, height) / Math.max(2, Math.sqrt(graph.size())), rng = mulberry32(seed), pos = initialPositions(graph, width, height, rng), ids = graph.nodes.map((n) => n.id).sort(), edges = graph.edges, cool = width / 10;
  for (let iter = 0; iter < iterations; iter++) {
    let disp = /* @__PURE__ */ new Map();
    for (let id of ids) disp.set(id, { x: 0, y: 0 });
    for (let i = 0; i < ids.length; i++) {
      let v = ids[i], pv = pos.get(v);
      for (let j = i + 1; j < ids.length; j++) {
        let u = ids[j], pu = pos.get(u), dx = pv.x - pu.x, dy = pv.y - pu.y, dist = Math.sqrt(dx * dx + dy * dy);
        dist < 0.01 && (dist = 0.01, dx = (i - j) * 0.01 + 0.01, dy = (j - i) * 0.01 + 0.01);
        let force = repulsion * idealLength * idealLength / (dist * dist), fx = dx / dist * force, fy = dy / dist * force;
        disp.get(v).x += fx, disp.get(v).y += fy, disp.get(u).x -= fx, disp.get(u).y -= fy;
      }
    }
    for (let e of edges) {
      let a = pos.get(e.source), b = pos.get(e.target);
      if (!a || !b) continue;
      let dx = a.x - b.x, dy = a.y - b.y, dist = Math.sqrt(dx * dx + dy * dy);
      dist < 0.01 && (dist = 0.01, dx = 0.01, dy = 0);
      let force = dist * dist / idealLength, fx = dx / dist * force, fy = dy / dist * force;
      disp.has(e.source) && (disp.get(e.source).x -= fx, disp.get(e.source).y -= fy), disp.has(e.target) && (disp.get(e.target).x += fx, disp.get(e.target).y += fy);
    }
    for (let id of ids) {
      let d = disp.get(id), dlen = Math.sqrt(d.x * d.x + d.y * d.y);
      if (dlen < 1e-6) continue;
      let limited = Math.min(dlen, cool), p = pos.get(id), nx = p.x + d.x / dlen * limited, ny = p.y + d.y / dlen * limited;
      pos.set(id, { x: Math.max(20, Math.min(width - 20, nx)), y: Math.max(20, Math.min(height - 20, ny)) });
    }
    cool = Math.max(cool * 0.95, 1);
  }
  return pos;
}
function hierarchical(graph, opts = {}) {
  assertNonEmpty(graph);
  let width = opts.width ?? 800, height = opts.height ?? 600, layerGap = opts.layerGap ?? 80, nodeGap = opts.nodeGap ?? 80, padding = opts.padding ?? 40, layer = /* @__PURE__ */ new Map(), ids = graph.nodes.map((n) => n.id).sort(), roots2;
  opts.root ? roots2 = [opts.root] : (roots2 = ids.filter((id) => graph.inDegree(id) === 0), roots2.length === 0 && (roots2 = [ids[0]]));
  for (let id of ids) layer.set(id, 0);
  for (let pass = 0; pass < ids.length + 1; pass++) {
    let changed = false;
    for (let e of graph.edges) {
      let a = layer.get(e.source) ?? 0, b = layer.get(e.target) ?? 0;
      a + 1 > b && (layer.set(e.target, a + 1), changed = true);
    }
    if (!changed) break;
  }
  if (!graph.directed) {
    for (let id of ids) layer.set(id, 0);
    let queue = [...roots2], visited = new Set(roots2);
    for (; queue.length > 0; ) {
      let n = queue.shift(), d = layer.get(n);
      for (let nb of graph.neighbors(n)) visited.has(nb) || (visited.add(nb), layer.set(nb, d + 1), queue.push(nb));
    }
    for (let id of ids) layer.has(id) || layer.set(id, 0);
  }
  let maxLayer = Math.max(...layer.values(), 0), layerNodes = Array.from({ length: maxLayer + 1 }, () => []);
  for (let id of ids) layerNodes[layer.get(id)].push(id);
  for (let ln of layerNodes) ln.sort();
  let pos = /* @__PURE__ */ new Map();
  for (let l = 0; l < layerNodes.length; l++) {
    let nodes = layerNodes[l], totalW = (nodes.length - 1) * nodeGap, startX = (width - totalW) / 2;
    for (let i = 0; i < nodes.length; i++) pos.set(nodes[i], { x: startX + i * nodeGap, y: padding + l * layerGap });
  }
  return pos;
}
function radial(graph, opts = {}) {
  assertNonEmpty(graph);
  let width = opts.width ?? 800, height = opts.height ?? 600, ringGap = opts.ringGap ?? 100, padding = opts.padding ?? 40, ids = graph.nodes.map((n) => n.id).sort(), root = opts.root ?? ids[0];
  if (!graph.hasNode(root)) throw new LayoutError(`Radial root not found: ${root}`);
  let depth = /* @__PURE__ */ new Map();
  depth.set(root, 0);
  let queue = [root];
  for (; queue.length > 0; ) {
    let n = queue.shift(), d = depth.get(n);
    for (let nb of graph.neighbors(n)) depth.has(nb) || (depth.set(nb, d + 1), queue.push(nb));
  }
  let maxDepth = depth.size > 0 ? Math.max(...depth.values()) : 0;
  for (let id of ids) depth.has(id) || depth.set(id, maxDepth + 1);
  let cx = width / 2, cy = height / 2, pos = /* @__PURE__ */ new Map();
  pos.set(root, { x: cx, y: cy });
  let byDepth = /* @__PURE__ */ new Map();
  for (let [id, d] of depth) id !== root && (byDepth.has(d) || byDepth.set(d, []), byDepth.get(d).push(id));
  for (let arr of byDepth.values()) arr.sort();
  for (let [d, nodes] of byDepth) {
    let r = d * ringGap, angleStep = 2 * Math.PI / nodes.length;
    for (let i = 0; i < nodes.length; i++) {
      let angle = i * angleStep;
      pos.set(nodes[i], { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  }
  for (let [id, p] of pos) p.x = Math.max(padding, Math.min(width - padding, p.x)), p.y = Math.max(padding, Math.min(height - padding, p.y)), pos.set(id, p);
  return pos;
}
function grid(graph, opts = {}) {
  assertNonEmpty(graph);
  let width = opts.width ?? 800, height = opts.height ?? 600, cellWidth = opts.cellWidth ?? 80, cellHeight = opts.cellHeight ?? 80, padding = opts.padding ?? 40, ids = graph.nodes.map((n2) => n2.id).sort(), n = ids.length, columns = opts.columns ?? Math.max(1, Math.ceil(Math.sqrt(n))), pos = /* @__PURE__ */ new Map();
  for (let i = 0; i < n; i++) {
    let r = Math.floor(i / columns), c = i % columns;
    pos.set(ids[i], { x: padding + c * cellWidth, y: padding + r * cellHeight });
  }
  return pos;
}
function subgraph(graph, keepIds) {
  let out = new Graph(graph.directed), nodes = graph.nodes.filter((n) => keepIds.has(n.id));
  out.addNodes(nodes);
  let edges = graph.edges.filter((e) => keepIds.has(e.source) && keepIds.has(e.target));
  return out.addEdges(edges), out;
}
function filterByLabel(graph, predicate) {
  let keep = /* @__PURE__ */ new Set();
  for (let n of graph.nodes) predicate(n.label) && keep.add(n.id);
  return subgraph(graph, keep);
}
function filterByType(graph, type) {
  let keep = /* @__PURE__ */ new Set();
  for (let n of graph.nodes) (type === void 0 && n.type === void 0 || n.type === type) && keep.add(n.id);
  return subgraph(graph, keep);
}
function filterByEdgeType(graph, type) {
  let out = new Graph(graph.directed);
  out.addNodes(graph.nodes);
  for (let e of graph.edges) (type === void 0 && e.type === void 0 || e.type === type) && out.addEdge(e);
  return out;
}
function filterByComponent(graph, nodeId) {
  let comp = graph.componentOf(nodeId);
  return subgraph(graph, new Set(comp));
}
function filterByDepth(graph, rootId, maxDepth) {
  if (!graph.hasNode(rootId)) return new Graph(graph.directed);
  let depths = graph.bfsDepths(rootId, maxDepth);
  return subgraph(graph, new Set(depths.keys()));
}
function filterByProperty(graph, predicate) {
  let keep = /* @__PURE__ */ new Set();
  for (let n of graph.nodes) predicate(n.properties) && keep.add(n.id);
  return subgraph(graph, keep);
}
function filterNodes(graph, predicate) {
  let keep = /* @__PURE__ */ new Set();
  for (let n of graph.nodes) predicate(n) && keep.add(n.id);
  return subgraph(graph, keep);
}
function filterEdges(graph, predicate) {
  let out = new Graph(graph.directed);
  out.addNodes(graph.nodes);
  for (let e of graph.edges) predicate(e) && out.addEdge(e);
  return out;
}
function normalize2(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function levenshtein2(a, b) {
  let m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1), curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      let cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}
function similarity2(a, b) {
  return a.length === 0 && b.length === 0 ? 1 : 1 - levenshtein2(a, b) / Math.max(a.length, b.length);
}
function fieldsOf(node) {
  let out = [["label", node.label]];
  if (node.type && out.push(["type", node.type]), node.properties) for (let [k, v] of Object.entries(node.properties)) (typeof v == "string" || typeof v == "number" || typeof v == "boolean") && out.push([k, String(v)]);
  return out;
}
function search(graph, query) {
  let q = normalize2(query);
  if (q.length === 0) return [];
  let results = [];
  for (let node of graph.nodes) for (let [field, value] of fieldsOf(node)) {
    let nv = normalize2(value);
    if (nv === q) {
      results.push({ nodeId: node.id, score: 1, matchedField: field });
      break;
    }
    if (nv.includes(q)) {
      let score = q.length / nv.length;
      results.push({ nodeId: node.id, score, matchedField: field });
      break;
    }
  }
  return results.sort((a, b) => b.score - a.score || (a.nodeId < b.nodeId ? -1 : 1)), results;
}
function fuzzySearch(graph, query, threshold = 0.3) {
  let q = normalize2(query);
  if (q.length === 0) return [];
  let results = [];
  for (let node of graph.nodes) {
    let bestScore = 0, bestField = "";
    for (let [field, value] of fieldsOf(node)) {
      let nv = normalize2(value);
      if (nv.length === 0) continue;
      let qTokens = q.split(" ").filter(Boolean), vTokens = nv.split(" ").filter(Boolean), acc = 0, count = 0;
      for (let qt of qTokens) {
        let best = 0;
        for (let vt of vTokens) {
          let s = similarity2(qt, vt);
          s > best && (best = s);
        }
        acc += best, count++;
      }
      let tokenScore = count > 0 ? acc / count : 0, wholeScore = similarity2(q, nv), fieldScore = Math.max(tokenScore, wholeScore);
      fieldScore > bestScore && (bestScore = fieldScore, bestField = field);
    }
    bestScore >= threshold && results.push({ nodeId: node.id, score: bestScore, matchedField: bestField });
  }
  return results.sort((a, b) => b.score - a.score || (a.nodeId < b.nodeId ? -1 : 1)), results;
}
function bfsPath(graph, start, target) {
  if (!graph.hasNode(start) || !graph.hasNode(target)) return null;
  if (start === target) return [start];
  let prev = /* @__PURE__ */ new Map();
  prev.set(start, null);
  let queue = [start];
  for (; queue.length > 0; ) {
    let n = queue.shift();
    for (let nb of graph.neighbors(n)) if (!prev.has(nb)) {
      if (prev.set(nb, n), nb === target) {
        let path4 = [], cur = nb;
        for (; cur !== null; ) path4.unshift(cur), cur = prev.get(cur) ?? null;
        return path4;
      }
      queue.push(nb);
    }
  }
  return null;
}
function dijkstra(graph, start, target) {
  if (!graph.hasNode(start) || !graph.hasNode(target)) return { path: null, distance: 1 / 0 };
  if (start === target) return { path: [start], distance: 0 };
  let adj = /* @__PURE__ */ new Map();
  for (let id of graph.nodes.map((n) => n.id)) adj.set(id, []);
  for (let e of graph.edges) {
    let w = typeof e.weight == "number" && e.weight >= 0 ? e.weight : 1;
    adj.get(e.source).push({ to: e.target, w }), graph.directed || adj.get(e.target).push({ to: e.source, w });
  }
  let dist = /* @__PURE__ */ new Map(), prev = /* @__PURE__ */ new Map();
  for (let id of adj.keys()) dist.set(id, 1 / 0), prev.set(id, null);
  dist.set(start, 0);
  let visited = /* @__PURE__ */ new Set();
  for (; visited.size < dist.size; ) {
    let u = null, best = 1 / 0;
    for (let [id, d] of dist) !visited.has(id) && d < best && (best = d, u = id);
    if (u === null || best === 1 / 0 || u === target) break;
    visited.add(u);
    for (let { to, w } of adj.get(u) ?? []) {
      if (visited.has(to)) continue;
      let alt = (dist.get(u) ?? 1 / 0) + w;
      alt < (dist.get(to) ?? 1 / 0) && (dist.set(to, alt), prev.set(to, u));
    }
  }
  if (!isFinite(dist.get(target) ?? 1 / 0)) return { path: null, distance: 1 / 0 };
  let path4 = [], cur = target;
  for (; cur !== null; ) path4.unshift(cur), cur = prev.get(cur) ?? null;
  return { path: path4, distance: dist.get(target) };
}
function jsonString2(s) {
  return JSON.stringify(s);
}
function isBareDotId(s) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);
}
function escapeMermaid(s) {
  return s.replace(/"/g, "#quot;");
}
function toJSON(graph) {
  return JSON.stringify({ directed: graph.directed, nodes: graph.nodes, edges: graph.edges }, null, 2);
}
function toDot(graph, name = "G") {
  let lines = [];
  lines.push(`${graph.directed ? "digraph" : "graph"} ${name} {`);
  for (let n of graph.nodes) {
    let attrs = [`label=${jsonString2(n.label)}`];
    n.type && attrs.push(`type=${jsonString2(n.type)}`), lines.push(`  ${isBareDotId(n.id) ? n.id : jsonString2(n.id)} [${attrs.join(", ")}];`);
  }
  let op = graph.directed ? "->" : "--";
  for (let e of graph.edges) {
    let s = isBareDotId(e.source) ? e.source : jsonString2(e.source), t = isBareDotId(e.target) ? e.target : jsonString2(e.target), attrs = [];
    e.label && attrs.push(`label=${jsonString2(e.label)}`), e.type && attrs.push(`type=${jsonString2(e.type)}`), typeof e.weight == "number" && attrs.push(`weight=${e.weight}`);
    let attrStr = attrs.length > 0 ? ` [${attrs.join(", ")}]` : "";
    lines.push(`  ${s} ${op} ${t}${attrStr};`);
  }
  return lines.push("}"), lines.join(`
`);
}
function toMermaid(graph) {
  let lines = [`flowchart ${graph.directed ? "TD" : "LR"}`], safeId = (id) => id.replace(/[^A-Za-z0-9_]/g, "_"), idMap = /* @__PURE__ */ new Map();
  for (let n of graph.nodes) {
    let sid = safeId(n.id);
    idMap.set(n.id, sid), lines.push(`  ${sid}["${escapeMermaid(n.label)}"]`);
  }
  for (let e of graph.edges) {
    let s = idMap.get(e.source), t = idMap.get(e.target);
    e.label ? lines.push(`  ${s} -- "${escapeMermaid(e.label)}" --> ${t}`) : lines.push(`  ${s} --> ${t}`);
  }
  return lines.join(`
`);
}
function toSVG(graph, layout, width = 800, height = 600) {
  if (!layout) throw new ExportError2("toSVG requires a layout");
  let positions = [];
  for (let n of graph.nodes) {
    let p = layout.get(n.id);
    if (!p) throw new ExportError2(`Layout missing position for node: ${n.id}`);
    positions.push({ id: n.id, x: p.x, y: p.y });
  }
  let minX = Math.min(0, ...positions.map((p) => p.x)) - 30, minY = Math.min(0, ...positions.map((p) => p.y)) - 30, maxX = Math.max(width, ...positions.map((p) => p.x)) + 30, maxY = Math.max(height, ...positions.map((p) => p.y)) + 30, w = maxX - minX, h = maxY - minY, lines = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX} ${minY} ${w} ${h}">`), lines.push(`<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="white"/>`);
  for (let e of graph.edges) {
    let a = layout.get(e.source), b = layout.get(e.target);
    !a || !b || lines.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="black" stroke-width="1"/>`);
  }
  for (let p of positions) {
    let label = graph.getNode(p.id)?.label ?? p.id;
    lines.push(`<circle cx="${p.x}" cy="${p.y}" r="15" fill="#eee" stroke="black" stroke-width="1"/>`), lines.push(`<text x="${p.x}" y="${p.y - 22}" font-size="11" font-family="sans-serif" text-anchor="middle" fill="black">${escapeXml(label)}</text>`);
  }
  return lines.push("</svg>"), lines.join(`
`);
}
function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
var DEFAULT_RENDER_CONFIG = { width: 800, height: 600, nodeRadius: 18, fontSize: 12, nodeColor: "#6ba8d6", edgeColor: "#888888", backgroundColor: "#ffffff", showLabels: true };
function mergeRenderConfig(partial) {
  return partial ? { ...DEFAULT_RENDER_CONFIG, ...partial } : { ...DEFAULT_RENDER_CONFIG };
}
function escapeXml2(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function renderToSVG(graph, layout, config) {
  let cfg = mergeRenderConfig(config);
  if (!layout) throw new ExportError2("renderToSVG requires a layout");
  for (let n of graph.nodes) if (!layout.has(n.id)) throw new ExportError2(`Layout missing position for node: ${n.id}`);
  let lines = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${cfg.width}" height="${cfg.height}" viewBox="0 0 ${cfg.width} ${cfg.height}">`), lines.push(`<rect x="0" y="0" width="${cfg.width}" height="${cfg.height}" fill="${escapeXml2(cfg.backgroundColor)}"/>`), graph.directed && (lines.push("<defs>"), lines.push(`<marker id="weave-arrow" markerWidth="10" markerHeight="10" refX="${cfg.nodeRadius + 2}" refY="3" orient="auto" markerUnits="userSpaceOnUse">`), lines.push(`<path d="M0,0 L0,6 L6,3 z" fill="${escapeXml2(cfg.edgeColor)}"/>`), lines.push("</marker>"), lines.push("</defs>"));
  for (let e of graph.edges) {
    let a = layout.get(e.source), b = layout.get(e.target), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), x2 = b.x, y2 = b.y;
    if (len > 0) {
      let ux = dx / len, uy = dy / len;
      x2 = b.x - ux * cfg.nodeRadius, y2 = b.y - uy * cfg.nodeRadius;
    }
    let markerAttr = graph.directed ? ' marker-end="url(#weave-arrow)"' : "";
    if (lines.push(`<line x1="${a.x}" y1="${a.y}" x2="${x2}" y2="${y2}" stroke="${escapeXml2(cfg.edgeColor)}" stroke-width="1.5"${markerAttr}/>`), cfg.showLabels && e.label) {
      let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 4;
      lines.push(`<text x="${mx}" y="${my}" font-size="${Math.max(8, cfg.fontSize - 2)}" font-family="sans-serif" text-anchor="middle" fill="${escapeXml2(cfg.edgeColor)}">${escapeXml2(e.label)}</text>`);
    }
  }
  for (let n of graph.nodes) {
    let p = layout.get(n.id);
    if (lines.push(`<circle cx="${p.x}" cy="${p.y}" r="${cfg.nodeRadius}" fill="${escapeXml2(cfg.nodeColor)}" stroke="black" stroke-width="1"/>`), cfg.showLabels) {
      let labelY = p.y - cfg.nodeRadius - 4;
      lines.push(`<text x="${p.x}" y="${labelY}" font-size="${cfg.fontSize}" font-family="sans-serif" text-anchor="middle" fill="black">${escapeXml2(n.label)}</text>`);
    }
  }
  return lines.push("</svg>"), lines.join(`
`);
}
function takeSnapshot(graph, takenAt = (/* @__PURE__ */ new Date()).toISOString()) {
  let nodes = graph.nodes.map((n) => ({ ...n, properties: n.properties ? { ...n.properties } : void 0 })), edges = graph.edges.map((e) => ({ ...e, properties: e.properties ? { ...e.properties } : void 0 }));
  return { takenAt, graph: createGraph(nodes, edges, graph.directed) };
}
function nodeIds(s) {
  return new Set(s.graph.nodes.map((n) => n.id));
}
function edgeIds(s) {
  return new Set(s.graph.edges.map((e) => e.id));
}
function diffSnapshots(a, b) {
  let aNodes = nodeIds(a), bNodes = nodeIds(b), aEdges = edgeIds(a), bEdges = edgeIds(b), addedNodes = b.graph.nodes.filter((n) => !aNodes.has(n.id)), removedNodes = a.graph.nodes.map((n) => n.id).filter((id) => !bNodes.has(id)), addedEdges = b.graph.edges.filter((e) => !aEdges.has(e.id)), removedEdges = a.graph.edges.map((e) => e.id).filter((id) => !bEdges.has(id));
  return { addedNodes, removedNodes, addedEdges, removedEdges };
}
var TopologyTracker = class {
  maxHistory;
  history = [];
  constructor(maxHistory = 10) {
    if (maxHistory < 1) throw new RangeError("maxHistory must be >= 1");
    this.maxHistory = maxHistory;
  }
  snapshot(graph, takenAt = (/* @__PURE__ */ new Date()).toISOString()) {
    let snap = takeSnapshot(graph, takenAt);
    for (this.history.push(snap); this.history.length > this.maxHistory; ) this.history.shift();
    return snap;
  }
  snapshots() {
    return this.history.slice();
  }
  current() {
    return this.history.length > 0 ? this.history[this.history.length - 1] : void 0;
  }
  previous() {
    return this.history.length >= 2 ? this.history[this.history.length - 2] : void 0;
  }
  diff() {
    let prev = this.previous(), curr = this.current();
    return !prev || !curr ? null : diffSnapshots(prev, curr);
  }
  diffAt(i, j) {
    return i < 0 || j < 0 || i >= this.history.length || j >= this.history.length ? null : diffSnapshots(this.history[i], this.history[j]);
  }
  reset() {
    this.history = [];
  }
};
var DEFAULT_VIEWPORT = { centerX: 0, centerY: 0, zoom: 1 };
var SelectionModel = class {
  selectedNodes = /* @__PURE__ */ new Set();
  selectedEdges = /* @__PURE__ */ new Set();
  selectNode(id) {
    return this.selectedNodes.add(id), this;
  }
  selectEdge(id) {
    return this.selectedEdges.add(id), this;
  }
  deselectNode(id) {
    return this.selectedNodes.delete(id), this;
  }
  deselectEdge(id) {
    return this.selectedEdges.delete(id), this;
  }
  toggleNode(id) {
    return this.selectedNodes.has(id) ? (this.selectedNodes.delete(id), false) : (this.selectedNodes.add(id), true);
  }
  toggleEdge(id) {
    return this.selectedEdges.has(id) ? (this.selectedEdges.delete(id), false) : (this.selectedEdges.add(id), true);
  }
  isNodeSelected(id) {
    return this.selectedNodes.has(id);
  }
  isEdgeSelected(id) {
    return this.selectedEdges.has(id);
  }
  selectedNodeIds() {
    return Array.from(this.selectedNodes).sort();
  }
  selectedEdgeIds() {
    return Array.from(this.selectedEdges).sort();
  }
  nodeCount() {
    return this.selectedNodes.size;
  }
  edgeCount() {
    return this.selectedEdges.size;
  }
  clear() {
    return this.selectedNodes.clear(), this.selectedEdges.clear(), this;
  }
  isEmpty() {
    return this.selectedNodes.size === 0 && this.selectedEdges.size === 0;
  }
  setSelection(nodes, edges = []) {
    this.clear();
    for (let n of nodes) this.selectedNodes.add(n);
    for (let e of edges) this.selectedEdges.add(e);
    return this;
  }
  toJSON() {
    return { nodes: this.selectedNodeIds(), edges: this.selectedEdgeIds() };
  }
};
var IDENTITY_VIEWPORT = DEFAULT_VIEWPORT;
function validateViewport(v) {
  if (!Number.isFinite(v.centerX) || !Number.isFinite(v.centerY)) throw new RangeError("Viewport.centerX/centerY must be finite");
  if (!Number.isFinite(v.zoom) || v.zoom <= 0) throw new RangeError("Viewport.zoom must be a positive finite number");
}
function applyViewport(point, viewport) {
  return validateViewport(viewport), { x: (point.x - viewport.centerX) * viewport.zoom, y: (point.y - viewport.centerY) * viewport.zoom };
}
function inverseViewport(point, viewport) {
  return validateViewport(viewport), { x: point.x / viewport.zoom + viewport.centerX, y: point.y / viewport.zoom + viewport.centerY };
}
function panTo(graphPoint, screenPoint, zoom) {
  if (!Number.isFinite(zoom) || zoom <= 0) throw new RangeError("zoom must be positive");
  return { centerX: graphPoint.x - screenPoint.x / zoom, centerY: graphPoint.y - screenPoint.y / zoom, zoom };
}
function zoomAt(viewport, anchor, factor) {
  if (validateViewport(viewport), !Number.isFinite(factor) || factor <= 0) throw new RangeError("factor must be positive");
  let newZoom = viewport.zoom * factor, graphAnchor = inverseViewport(anchor, viewport);
  return panTo(graphAnchor, anchor, newZoom);
}

// packages/contracts/dist/esm/index.mjs
var ContractsError = class extends Error {
  code;
  cause;
  constructor(message, code, cause) {
    super(message), this.name = new.target.name, this.code = code ?? "CONTRACTS_ERROR", cause !== void 0 && (this.cause = cause), Object.setPrototypeOf(this, new.target.prototype);
  }
};
var SchemaError = class extends ContractsError {
  constructor(message, cause) {
    super(message, "SCHEMA_ERROR", cause);
  }
};
var ManifestError = class extends ContractsError {
  constructor(message, code, cause) {
    super(message, code ?? "MANIFEST_ERROR", cause);
  }
};
var MANIFEST_ERROR_CODES = { INVALID_NAME: "MANIFEST_INVALID_NAME", INVALID_VERSION: "MANIFEST_INVALID_VERSION", INVALID_DEPENDENCY: "MANIFEST_INVALID_DEPENDENCY", MISSING_FIELD: "MANIFEST_MISSING_FIELD", INVALID_EXPORTS: "MANIFEST_INVALID_EXPORTS", INVALID_IMPORTS: "MANIFEST_INVALID_IMPORTS", INVALID_CAPABILITIES: "MANIFEST_INVALID_CAPABILITIES", INVALID_DEPENDENCIES: "MANIFEST_INVALID_DEPENDENCIES" };
var CompatibilityError = class extends ContractsError {
  constructor(message, cause) {
    super(message, "COMPATIBILITY_ERROR", cause);
  }
};
var ApiValidationError = class extends ContractsError {
  constructor(message, cause) {
    super(message, "API_VALIDATION_ERROR", cause);
  }
};
var SyncError2 = class extends ContractsError {
  constructor(message, cause) {
    super(message, "SYNC_ERROR", cause);
  }
};
var BoundaryError = class extends ContractsError {
  constructor(message, cause) {
    super(message, "BOUNDARY_ERROR", cause);
  }
};
var ReportingError2 = class extends ContractsError {
  constructor(message, cause) {
    super(message, "REPORTING_ERROR", cause);
  }
};
var SCHEMA_TYPES = /* @__PURE__ */ new Set(["string", "number", "boolean", "null", "object", "array", "enum", "ref", "union", "intersection"]);
function compileSchema(definition) {
  if (!definition || typeof definition != "object") throw new SchemaError("schema definition must be an object");
  let def = definition;
  if (typeof def.name != "string" || def.name.length === 0) throw new SchemaError("schema definition must have a non-empty name");
  if (typeof def.version != "string" || def.version.length === 0) throw new SchemaError(`schema "${def.name}" must have a non-empty version`);
  let fields = compileFields(def.name, def.fields);
  return { name: def.name, version: def.version, fields, ...def.description ? { description: def.description } : {} };
}
function compileFields(schemaName, raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((f, i) => compileField(`${schemaName}.fields[${i}]`, f));
  if (typeof raw == "object") {
    let out = [];
    for (let [name, def] of Object.entries(raw)) {
      let compiled = compileField(`${schemaName}.fields.${name}`, def);
      compiled.name = name, out.push(compiled);
    }
    return out;
  }
  throw new SchemaError(`schema "${schemaName}" has invalid fields (expected array or record)`);
}
function compileField(path4, def) {
  if (!def || typeof def != "object") throw new SchemaError(`field at ${path4} must be an object`);
  let d = def, type = d.type ?? "string";
  if (!SCHEMA_TYPES.has(type)) throw new SchemaError(`field at ${path4} has invalid type "${type}"; expected one of ${[...SCHEMA_TYPES].join(", ")}`);
  if (type === "enum" && (!Array.isArray(d.enum) || d.enum.length === 0)) throw new SchemaError(`enum field at ${path4} must declare a non-empty "enum" array`);
  if (type === "ref" && (typeof d.ref != "string" || d.ref.length === 0)) throw new SchemaError(`ref field at ${path4} must declare a non-empty "ref" string`);
  if (type === "array" && (!d.of || typeof d.of != "object")) throw new SchemaError(`array field at ${path4} must declare an "of" element type`);
  if (type === "union" && (!Array.isArray(d.oneOf) || d.oneOf.length === 0)) throw new SchemaError(`union field at ${path4} must declare a non-empty "oneOf" array`);
  if (type === "intersection" && (!Array.isArray(d.allOf) || d.allOf.length === 0)) throw new SchemaError(`intersection field at ${path4} must declare a non-empty "allOf" array`);
  let field = { name: d.name ?? path4.split(".").pop() ?? "", type, required: d.required ?? true };
  return d.description !== void 0 && (field.description = d.description), d.default !== void 0 && (field.default = d.default), Array.isArray(d.enum) && (field.enum = d.enum), d.ref !== void 0 && (field.ref = d.ref), d.of !== void 0 && (field.of = compileField(`${path4}.of`, d.of)), Array.isArray(d.oneOf) && (field.oneOf = d.oneOf.map((m, i) => compileField(`${path4}.oneOf[${i}]`, m))), Array.isArray(d.allOf) && (field.allOf = d.allOf.map((m, i) => compileField(`${path4}.allOf[${i}]`, m))), d.fields !== void 0 && (field.fields = compileFields(path4, d.fields)), field;
}
function validateValue(schema, value, refs) {
  let errors = [];
  return validateObject(schema.fields, value, schema.name, errors, refs ?? {}), { valid: errors.length === 0, errors };
}
function validateObject(fields, value, path4, errors, refs) {
  if (value === null || typeof value != "object" || Array.isArray(value)) {
    errors.push({ path: path4, message: `expected object, got ${describeType(value)}`, code: "SCHEMA_ERROR", expected: "object", actual: describeType(value) });
    return;
  }
  let record = value;
  for (let field of fields) {
    let fieldPath = path4 ? `${path4}.${field.name}` : field.name;
    if (!Object.prototype.hasOwnProperty.call(record, field.name)) {
      field.required && errors.push({ path: fieldPath, message: `required field "${field.name}" is missing`, code: "SCHEMA_ERROR", expected: "present", actual: "missing" });
      continue;
    }
    let v = record[field.name];
    validateField(field, v, fieldPath, errors, refs);
  }
}
function validateField(field, value, path4, errors, refs) {
  switch (field.type) {
    case "string":
      typeof value != "string" && errors.push(typeError(path4, "string", value));
      break;
    case "number":
      (typeof value != "number" || Number.isNaN(value)) && errors.push(typeError(path4, "number", value));
      break;
    case "boolean":
      typeof value != "boolean" && errors.push(typeError(path4, "boolean", value));
      break;
    case "null":
      value !== null && errors.push(typeError(path4, "null", value));
      break;
    case "enum":
      (!Array.isArray(field.enum) || !field.enum.includes(value)) && errors.push({ path: path4, message: `value ${JSON.stringify(value)} is not in enum [${(field.enum ?? []).map((v) => JSON.stringify(v)).join(", ")}]`, code: "SCHEMA_ERROR", expected: `enum[${(field.enum ?? []).length}]`, actual: describeType(value) });
      break;
    case "object":
      value === null || typeof value != "object" || Array.isArray(value) ? errors.push(typeError(path4, "object", value)) : field.fields && field.fields.length > 0 && validateObject(field.fields, value, path4, errors, refs);
      break;
    case "array":
      if (!Array.isArray(value)) errors.push(typeError(path4, "array", value));
      else if (field.of) for (let i = 0; i < value.length; i++) validateField(field.of, value[i], `${path4}[${i}]`, errors, refs);
      break;
    case "ref": {
      let refName = field.ref ?? "", refSchema = refs[refName];
      if (!refSchema) {
        value == null && errors.push(typeError(path4, `ref(${refName})`, value));
        break;
      }
      validateObject(refSchema.fields, value, path4, errors, refs);
      break;
    }
    case "union": {
      let members = field.oneOf ?? [], memberErrors = [], matched = false;
      for (let member of members) {
        let sub = [];
        if (validateField(member, value, path4, sub, refs), sub.length === 0) {
          matched = true;
          break;
        }
        memberErrors.push(sub);
      }
      matched || errors.push({ path: path4, message: `value did not match any union member at ${path4}`, code: "SCHEMA_ERROR", expected: `union[${members.length}]`, actual: describeType(value) });
      break;
    }
    case "intersection": {
      let members = field.allOf ?? [];
      for (let member of members) validateField(member, value, path4, errors, refs);
      break;
    }
    default:
      errors.push({ path: path4, message: `unknown schema type "${field.type}" at ${path4}`, code: "SCHEMA_ERROR", expected: "known type", actual: field.type });
  }
}
function typeError(path4, expected, value) {
  return { path: path4, message: `expected ${expected} at ${path4}, got ${describeType(value)}`, code: "SCHEMA_ERROR", expected, actual: describeType(value) };
}
function describeType(value) {
  return value === null ? "null" : Array.isArray(value) ? "array" : value instanceof Date ? "date" : typeof value;
}
var NAME_PATTERN = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/;
var SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][\w-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][\w-]*))*))?(?:\+([\w.-]+))?$/;
function validateManifest(manifest) {
  let errors = [];
  if (!manifest || typeof manifest != "object" || Array.isArray(manifest)) return errors.push({ path: "", message: "manifest must be a non-array object", code: MANIFEST_ERROR_CODES.MISSING_FIELD, expected: "object", actual: manifest === null ? "null" : typeof manifest }), { valid: false, errors };
  let m = manifest;
  if (typeof m.name != "string" || m.name.length === 0 ? errors.push({ path: "name", message: "manifest.name must be a non-empty string", code: MANIFEST_ERROR_CODES.MISSING_FIELD, expected: "string", actual: typeof m.name }) : NAME_PATTERN.test(m.name) || errors.push({ path: "name", message: `manifest.name "${m.name}" is not a valid package name`, code: MANIFEST_ERROR_CODES.INVALID_NAME, expected: "lowercase scoped or unscoped package name", actual: m.name }), typeof m.version != "string" || m.version.length === 0 ? errors.push({ path: "version", message: "manifest.version must be a non-empty semver string", code: MANIFEST_ERROR_CODES.MISSING_FIELD, expected: "semver string", actual: typeof m.version }) : SEMVER_PATTERN.test(m.version) || errors.push({ path: "version", message: `manifest.version "${m.version}" is not a valid semver`, code: MANIFEST_ERROR_CODES.INVALID_VERSION, expected: "MAJOR.MINOR.PATCH[-prerelease][+build]", actual: m.version }), m.dependencies !== void 0) if (!m.dependencies || typeof m.dependencies != "object" || Array.isArray(m.dependencies)) errors.push({ path: "dependencies", message: "manifest.dependencies must be a record of name \u2192 range", code: MANIFEST_ERROR_CODES.INVALID_DEPENDENCIES, expected: "Record<string, string>", actual: describeType2(m.dependencies) });
  else for (let [dep, range] of Object.entries(m.dependencies)) (typeof range != "string" || range.length === 0) && errors.push({ path: `dependencies.${dep}`, message: `dependency "${dep}" must map to a non-empty version range string`, code: MANIFEST_ERROR_CODES.INVALID_DEPENDENCY, expected: "string", actual: typeof range });
  return m.exports !== void 0 && validateStringArray(m.exports, "exports", errors), m.imports !== void 0 && validateStringArray(m.imports, "imports", errors), m.capabilities !== void 0 && validateStringArray(m.capabilities, "capabilities", errors), { valid: errors.length === 0, errors };
}
function validateStringArray(value, field, errors) {
  let code = field === "exports" ? MANIFEST_ERROR_CODES.INVALID_EXPORTS : field === "imports" ? MANIFEST_ERROR_CODES.INVALID_IMPORTS : MANIFEST_ERROR_CODES.INVALID_CAPABILITIES;
  if (!Array.isArray(value)) {
    errors.push({ path: field, message: `manifest.${field} must be an array of strings`, code, expected: "string[]", actual: describeType2(value) });
    return;
  }
  for (let i = 0; i < value.length; i++) (typeof value[i] != "string" || value[i].length === 0) && errors.push({ path: `${field}[${i}]`, message: `manifest.${field}[${i}] must be a non-empty string`, code, expected: "string", actual: describeType2(value[i]) });
}
function assertManifest(manifest) {
  let result = validateManifest(manifest);
  if (!result.valid) {
    let first = result.errors[0];
    throw new ManifestError(first ? `${first.path ? first.path + ": " : ""}${first.message}` : "invalid manifest", first?.code);
  }
}
function isValidManifest(manifest) {
  return validateManifest(manifest).valid;
}
function describeType2(value) {
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}
var SEMVER_PATTERN2 = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][\w-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][\w-]*))*))?(?:\+([\w.-]+))?$/;
function isSemver(v) {
  return typeof v == "string" && SEMVER_PATTERN2.test(v);
}
function parseSemver(v) {
  if (typeof v != "string") throw new CompatibilityError(`expected semver string, got ${typeof v}`);
  let m = v.match(SEMVER_PATTERN2);
  if (!m) throw new CompatibilityError(`"${v}" is not a valid semver`);
  let [, major, minor, patch, prerelease] = m, out = { major: Number(major), minor: Number(minor), patch: Number(patch) };
  return prerelease !== void 0 && prerelease.length > 0 && (out.prerelease = prerelease), out;
}
function compareSemver(a, b) {
  let pa = parseSemver(a), pb = parseSemver(b);
  return compareParsedSemver(pa, pb);
}
function compareParsedSemver(a, b) {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  let ap = a.prerelease, bp = b.prerelease;
  return ap === void 0 && bp === void 0 ? 0 : ap === void 0 ? 1 : bp === void 0 ? -1 : comparePrerelease(ap, bp);
}
function comparePrerelease(a, b) {
  let aa = a.split("."), bb = b.split("."), n = Math.min(aa.length, bb.length);
  for (let i = 0; i < n; i++) {
    let x = aa[i], y = bb[i], xn = /^[0-9]+$/.test(x), yn = /^[0-9]+$/.test(y);
    if (xn && yn) {
      let xi = Number(x), yi = Number(y);
      if (xi !== yi) return xi < yi ? -1 : 1;
    } else {
      if (xn !== yn) return xn ? -1 : 1;
      if (x !== y) return x < y ? -1 : 1;
    }
  }
  return aa.length === bb.length ? 0 : aa.length < bb.length ? -1 : 1;
}
function satisfies(version, range) {
  let v = parseSemver(version), r = range.trim();
  if (r === "" || r === "*") return true;
  if (r.startsWith(">=")) return compareSemver(version, r.slice(2).trim()) >= 0;
  if (r.startsWith("<=")) return compareSemver(version, r.slice(2).trim()) <= 0;
  if (r.startsWith(">")) return compareSemver(version, r.slice(1).trim()) > 0;
  if (r.startsWith("<")) return compareSemver(version, r.slice(1).trim()) < 0;
  if (r.startsWith("^")) {
    let target = parseSemver(r.slice(1).trim());
    return compareParsedSemver(v, target) < 0 ? false : target.major > 0 ? v.major === target.major : target.minor > 0 ? v.major === 0 && v.minor === target.minor : v.major === 0 && v.minor === 0 && v.patch === target.patch;
  }
  if (r.startsWith("~")) {
    let target = parseSemver(r.slice(1).trim());
    return compareParsedSemver(v, target) < 0 || target.major !== v.major ? false : v.minor === target.minor;
  }
  return compareSemver(version, r) === 0;
}
function checkBackwardCompat(oldSchema, newSchema) {
  let breakingChanges = [], oldByName = /* @__PURE__ */ new Map();
  for (let f of oldSchema.fields) oldByName.set(f.name, f);
  let newByName = /* @__PURE__ */ new Map();
  for (let f of newSchema.fields) newByName.set(f.name, f);
  for (let [name, oldField] of oldByName) {
    let newField = newByName.get(name);
    if (!newField) {
      breakingChanges.push({ type: "field_removed", field: name, from: oldField.type });
      continue;
    }
    if (oldField.type !== newField.type && breakingChanges.push({ type: "type_changed", field: name, from: oldField.type, to: newField.type }), oldField.type === "enum" && newField.type === "enum") {
      let oldSet = new Set(oldField.enum?.map((v) => JSON.stringify(v)) ?? []), newSet = new Set(newField.enum?.map((v) => JSON.stringify(v)) ?? []);
      for (let v of oldSet) newSet.has(v) || breakingChanges.push({ type: "enum_value_removed", field: name, from: v, to: void 0 });
    }
  }
  for (let [name, newField] of newByName) !oldByName.has(name) && newField.required && breakingChanges.push({ type: "required_added", field: name, to: newField.type });
  return { compatible: breakingChanges.length === 0, breakingChanges };
}
function findEndpoint(contract, method, path4) {
  let m = method.toUpperCase();
  return contract.endpoints.find((e) => e.method === m && e.path === path4);
}
function validateRequest(contract, method, path4, request) {
  let errors = [], endpoint = findEndpoint(contract, method, path4);
  return endpoint ? endpoint.requestSchema ? validateValue(endpoint.requestSchema, request) : { valid: true, errors: [] } : (errors.push({ path: path4, message: `no endpoint matches ${method.toUpperCase()} ${path4} in contract "${contract.name}"`, code: "API_VALIDATION_ERROR", expected: "known endpoint", actual: `${method.toUpperCase()} ${path4}` }), { valid: false, errors });
}
function validateResponse(contract, method, path4, response) {
  let errors = [], endpoint = findEndpoint(contract, method, path4);
  return endpoint ? validateValue(endpoint.responseSchema, response) : (errors.push({ path: path4, message: `no endpoint matches ${method.toUpperCase()} ${path4} in contract "${contract.name}"`, code: "API_VALIDATION_ERROR", expected: "known endpoint", actual: `${method.toUpperCase()} ${path4}` }), { valid: false, errors });
}
function assertValidContract(contract) {
  if (!contract || typeof contract != "object" || Array.isArray(contract)) throw new ApiValidationError("API contract must be a non-array object");
  let c = contract;
  if (typeof c.name != "string" || c.name.length === 0) throw new ApiValidationError("API contract.name must be a non-empty string");
  if (typeof c.version != "string" || c.version.length === 0) throw new ApiValidationError(`contract "${c.name}".version must be a non-empty string`);
  if (!Array.isArray(c.endpoints) || c.endpoints.length === 0) throw new ApiValidationError(`contract "${c.name}" must declare a non-empty endpoints array`);
  for (let i = 0; i < c.endpoints.length; i++) {
    let e = c.endpoints[i];
    if (!e || typeof e != "object") throw new ApiValidationError(`endpoint[${i}] in contract "${c.name}" must be an object`);
    if (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(e.method ?? "")) throw new ApiValidationError(`endpoint[${i}].method must be one of GET|POST|PUT|DELETE|PATCH`);
    if (typeof e.path != "string" || e.path.length === 0) throw new ApiValidationError(`endpoint[${i}].path must be a non-empty string`);
    if (!e.responseSchema || typeof e.responseSchema != "object") throw new ApiValidationError(`endpoint[${i}] (${e.method} ${e.path}) must declare a responseSchema`);
  }
}
function diffSchemas(oldSchema, newSchema) {
  let oldByName = /* @__PURE__ */ new Map();
  for (let f of oldSchema.fields) oldByName.set(f.name, f);
  let newByName = /* @__PURE__ */ new Map();
  for (let f of newSchema.fields) newByName.set(f.name, f);
  let added = [], removed = [], changed = [];
  for (let [name, newField] of newByName) {
    let oldField = oldByName.get(name);
    oldField ? fieldsEqual(oldField, newField) || changed.push({ field: name, from: oldField, to: newField }) : added.push(newField);
  }
  for (let [name] of oldByName) newByName.has(name) || removed.push(name);
  return { added, removed, changed };
}
function mergeSchemas(local, remote) {
  if (local.name !== remote.name) throw new SyncError2(`cannot merge schemas with different names: "${local.name}" vs "${remote.name}"`);
  let mergedVersion = compareSemver(local.version, remote.version) >= 0 ? local.version : remote.version, localByName = /* @__PURE__ */ new Map();
  for (let f of local.fields) localByName.set(f.name, f);
  let remoteByName = /* @__PURE__ */ new Map();
  for (let f of remote.fields) remoteByName.set(f.name, f);
  let conflicts = [], mergedFields = [];
  for (let [name, localField] of localByName) {
    let remoteField = remoteByName.get(name);
    if (!remoteField) {
      mergedFields.push(localField);
      continue;
    }
    localField.type === remoteField.type || conflicts.push({ field: name, localType: localField.type, remoteType: remoteField.type, resolution: "local" }), mergedFields.push(localField);
  }
  for (let [name, remoteField] of remoteByName) localByName.has(name) || mergedFields.push(remoteField);
  return { schema: { name: local.name, version: mergedVersion, fields: mergedFields, ...local.description ?? remote.description ? { description: local.description ?? remote.description } : {} }, conflicts };
}
function fieldsEqual(a, b) {
  return a === b ? true : !(a.type !== b.type || a.required !== b.required || (a.description ?? "") !== (b.description ?? "") || !enumEquals(a.enum, b.enum) || (a.ref ?? "") !== (b.ref ?? "") || ((a.of ?? void 0) !== void 0 || (b.of ?? void 0) !== void 0) && (!a.of || !b.of || !fieldsEqual(a.of, b.of)) || !arrayEqual(a.oneOf, b.oneOf, fieldsEqual) || !arrayEqual(a.allOf, b.allOf, fieldsEqual) || !arrayEqual(a.fields, b.fields, fieldsEqual) || JSON.stringify(a.default) !== JSON.stringify(b.default));
}
function enumEquals(a, b) {
  if (a === void 0 && b === void 0) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  let aa = a.map((v) => JSON.stringify(v)).sort(), bb = b.map((v) => JSON.stringify(v)).sort();
  return aa.every((v, i) => v === bb[i]);
}
function arrayEqual(a, b, eq) {
  return a === void 0 && b === void 0 ? true : !Array.isArray(a) || !Array.isArray(b) || a.length !== b.length ? false : a.every((v, i) => eq(v, b[i]));
}
function matchRule(policy, caller, callee) {
  let exact, fromWild, toWild, anyWild;
  for (let r of policy.rules) {
    if (r.from === caller && r.to === callee) {
      exact = r;
      break;
    }
    r.from === "*" && r.to === callee ? fromWild = fromWild ?? r : r.from === caller && r.to === "*" ? toWild = toWild ?? r : r.from === "*" && r.to === "*" && (anyWild = anyWild ?? r);
  }
  return exact ?? fromWild ?? toWild ?? anyWild;
}
function enforceBoundary(policy, caller, callee) {
  if (typeof caller != "string" || caller.length === 0) throw new BoundaryError("caller must be a non-empty string");
  if (typeof callee != "string" || callee.length === 0) throw new BoundaryError("callee must be a non-empty string");
  let rule = matchRule(policy, caller, callee);
  return rule ? { allowed: rule.allowed, reason: rule.reason ?? (rule.allowed ? "allowed by rule" : "denied by rule"), matchedRule: rule } : { allowed: policy.defaultAllow, reason: policy.defaultAllow ? "allowed by default" : "denied by default" };
}
function detectViolations(policy, callGraph) {
  if (!Array.isArray(callGraph)) throw new BoundaryError("callGraph must be an array of { from, to } edges");
  let violations = [];
  for (let edge of callGraph) {
    if (!edge || typeof edge != "object") throw new BoundaryError("each call-graph edge must be an object");
    let result = enforceBoundary(policy, edge.from, edge.to);
    result.allowed || violations.push({ from: edge.from, to: edge.to, reason: result.reason ?? "denied" });
  }
  return violations;
}
function isPolicySatisfied(policy, callGraph) {
  return detectViolations(policy, callGraph).length === 0;
}
function aggregateReports(reports, name = "aggregate") {
  if (!Array.isArray(reports)) throw new ReportingError2("reports must be an array");
  let sections = [];
  for (let r of reports) for (let s of r.sections) sections.push({ name: reports.length > 1 ? `${r.name}:${s.name}` : s.name, passed: s.passed, errors: [...s.errors] });
  let passed = reports.length === 0 || reports.every((r) => r.passed);
  return { name, passed, sections, generatedAt: (/* @__PURE__ */ new Date()).toISOString() };
}

// packages/cortex/dist/esm/index.mjs
import { randomBytes as randomBytes9 } from "crypto";
var CortexError = class extends Error {
  code;
  cause;
  constructor(message, code, cause) {
    super(message), this.name = new.target.name, this.code = code ?? new.target.name, cause !== void 0 && (this.cause = cause), Object.setPrototypeOf(this, new.target.prototype);
  }
};
var DecompositionError = class extends CortexError {
  constructor(message, cause) {
    super(message, "DECOMPOSITION_ERROR", cause);
  }
};
var PlanningError = class extends CortexError {
  constructor(message, cause) {
    super(message, "PLANNING_ERROR", cause);
  }
};
var ToolError = class extends CortexError {
  constructor(message, cause) {
    super(message, "TOOL_ERROR", cause);
  }
};
var RoutingError = class extends CortexError {
  constructor(message, cause) {
    super(message, "ROUTING_ERROR", cause);
  }
};
var SchedulerError = class extends CortexError {
  constructor(message, cause) {
    super(message, "SCHEDULER_ERROR", cause);
  }
};
var ConfidenceError = class extends CortexError {
  constructor(message, cause) {
    super(message, "CONFIDENCE_ERROR", cause);
  }
};
var GoalError = class extends CortexError {
  constructor(message, cause) {
    super(message, "GOAL_ERROR", cause);
  }
};
var ResourceError = class extends CortexError {
  constructor(message, cause) {
    super(message, "RESOURCE_ERROR", cause);
  }
};
var WorkflowError2 = class extends CortexError {
  constructor(message, cause) {
    super(message, "WORKFLOW_ERROR", cause);
  }
};
var RetryError = class extends CortexError {
  constructor(message, cause) {
    super(message, "RETRY_ERROR", cause);
  }
};
var CoordinationError = class extends CortexError {
  constructor(message, cause) {
    super(message, "COORDINATION_ERROR", cause);
  }
};
var KnowledgeError = class extends CortexError {
  constructor(message, cause) {
    super(message, "KNOWLEDGE_ERROR", cause);
  }
};
var LEVEL_RANK3 = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
var SCRUBBED_FIELD_NAMES6 = ["secret", "token", "apiKey", "password", "privateKey"];
function shouldScrubField3(name) {
  let lower = name.toLowerCase();
  for (let needle of SCRUBBED_FIELD_NAMES6) {
    let nl = needle.toLowerCase();
    if (lower === nl || lower.endsWith("_" + nl)) return true;
  }
  return false;
}
function scrubMetadata4(meta) {
  if (meta == null || typeof meta != "object") return meta;
  if (Buffer.isBuffer(meta)) return `[buffer:${meta.length}]`;
  if (meta instanceof Date) return meta.toISOString();
  if (Array.isArray(meta)) return meta.map(scrubMetadata4);
  let out = {};
  for (let [k, v] of Object.entries(meta)) out[k] = shouldScrubField3(k) ? "[redacted]" : scrubMetadata4(v);
  return out;
}
var ConsoleLogger3 = class {
  constructor(level = "info") {
    this.level = level;
    this.levelRank = LEVEL_RANK3[level] ?? LEVEL_RANK3.info;
  }
  level;
  levelRank;
  debug(msg, meta) {
    this.emit("debug", msg, meta);
  }
  info(msg, meta) {
    this.emit("info", msg, meta);
  }
  warn(msg, meta) {
    this.emit("warn", msg, meta);
  }
  error(msg, meta) {
    this.emit("error", msg, meta);
  }
  emit(level, msg, meta) {
    try {
      if (LEVEL_RANK3[level] < this.levelRank) return;
      let entry = { level, msg, ts: (/* @__PURE__ */ new Date()).toISOString(), ...meta ? { meta: scrubMetadata4(meta) } : {} }, line = JSON.stringify(entry);
      level === "error" || level === "warn" ? process.stderr.write(line + `
`) : process.stdout.write(line + `
`);
    } catch {
    }
  }
};
var SilentLogger5 = class {
  debug() {
  }
  info() {
  }
  warn() {
  }
  error() {
  }
};
var DEFAULT_CONFIG3 = { defaultStrategy: "adaptive", retryPolicy: { maxAttempts: 3, backoff: "exponential", baseDelayMs: 100, maxDelayMs: 5e3, retryableErrors: ["timeout", "transient", "busy", "unavailable"] }, resourceBudget: { maxCost: 1e3, maxParallel: 4, maxDurationMs: 6e4, spentCost: 0, activeWorkers: 0, elapsedMs: 0 }, logLevel: "info" };
function mergeConfig3(user) {
  return { ...DEFAULT_CONFIG3, ...user ?? {}, retryPolicy: { ...DEFAULT_CONFIG3.retryPolicy, ...user?.retryPolicy ?? {} }, resourceBudget: { ...DEFAULT_CONFIG3.resourceBudget, ...user?.resourceBudget ?? {} } };
}
function randomId(prefix = "ctx", bytes = 8) {
  return `${prefix}_${randomBytes9(bytes).toString("hex")}`;
}
var ACTION_VERBS = ["fetch", "load", "read", "write", "send", "receive", "parse", "validate", "compute", "calculate", "transform", "filter", "sort", "merge", "split", "create", "delete", "update", "find", "search", "query", "authenticate", "authorize", "encrypt", "decrypt", "sign", "verify", "publish", "subscribe", "start", "stop", "restart", "deploy", "rollback", "monitor", "alert"];
var CONJUNCTIONS = [" and ", ", then ", "; ", " after that ", " followed by "];
function decompose(goalDescription, opts) {
  if (!goalDescription || typeof goalDescription != "string") throw new DecompositionError("goalDescription must be a non-empty string");
  let tasks = [], parts = splitOnConjunctions(goalDescription);
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i].trim();
    if (!part) continue;
    let verb = findActionVerb(part), tools = inferTools(part, verb), task = { id: randomId("task"), goalId: opts?.goalId, description: part, requiredTools: tools, status: "pending", createdAt: Date.now(), dependsOn: i > 0 ? [tasks[i - 1].id] : [] };
    tasks.push(task);
  }
  return tasks.length === 0 && tasks.push({ id: randomId("task"), goalId: opts?.goalId, description: goalDescription, status: "pending", createdAt: Date.now() }), tasks;
}
function splitOnConjunctions(text) {
  let parts = [text];
  for (let conj of CONJUNCTIONS) {
    let next = [];
    for (let p of parts) next.push(...p.split(conj));
    parts = next;
  }
  return parts.map((p) => p.trim()).filter(Boolean);
}
function findActionVerb(text) {
  let lower = text.toLowerCase();
  for (let v of ACTION_VERBS) if (new RegExp(`\\b${v}\\b`).test(lower)) return v;
}
function inferTools(text, verb) {
  let tools = /* @__PURE__ */ new Set();
  verb && tools.add(verb);
  let lower = text.toLowerCase();
  return /\bfile|filesystem|path\b/.test(lower) && tools.add("fs"), /\bhttp|api|endpoint|url\b/.test(lower) && tools.add("http"), /\bdb|database|sql|query\b/.test(lower) && tools.add("db"), /\bmemory|recall|remember\b/.test(lower) && tools.add("memory"), /\bsign|verify|encrypt|decrypt\b/.test(lower) && tools.add("crypto"), /\bsend|receive|publish|broadcast\b/.test(lower) && tools.add("messaging"), Array.from(tools);
}
function estimateComplexity(goalDescription) {
  let lower = goalDescription.toLowerCase(), depth = 1;
  for (let conj of CONJUNCTIONS) lower.includes(conj) && depth++;
  return (lower.includes(" if ") || lower.includes(" when ")) && depth++, (lower.includes(" for each ") || lower.includes(" all ")) && depth++, Math.min(5, depth);
}
var Planner = class {
  plan(goal, strategy = "adaptive") {
    if (!goal) throw new PlanningError("goal is required");
    let complexity = estimateComplexity(goal.description), tasks;
    strategy === "decompose-first" || strategy === "adaptive" && complexity >= 2 ? tasks = decompose(goal.description, { goalId: goal.id }) : tasks = [{ id: randomId("task"), goalId: goal.id, description: goal.description, status: "pending", createdAt: Date.now() }];
    let ordered = topoSort(tasks), estimatedCost = 0, estimatedDurationMs = 0;
    for (let t of ordered) t.estimatedCost = t.estimatedCost ?? 1, t.estimatedDurationMs = t.estimatedDurationMs ?? 1e3, estimatedCost += t.estimatedCost, estimatedDurationMs += t.estimatedDurationMs;
    let confidence = estimatePlanConfidence(ordered, complexity);
    return { id: randomId("plan"), goalId: goal.id, tasks: ordered, confidence, estimatedCost, estimatedDurationMs, strategy, createdAt: Date.now() };
  }
  replan(plan, failedTaskId, opts) {
    let failed = plan.tasks.find((t) => t.id === failedTaskId);
    if (!failed) throw new PlanningError(`task ${failedTaskId} not in plan`);
    if (failed.status = opts.retry ? "pending" : "skipped", !opts.retry) {
      let dependents = /* @__PURE__ */ new Set(), queue = [failedTaskId];
      for (; queue.length; ) {
        let id = queue.shift();
        for (let t of plan.tasks) t.dependsOn?.includes(id) && !dependents.has(t.id) && (dependents.add(t.id), queue.push(t.id));
      }
      for (let t of plan.tasks) dependents.has(t.id) && (t.status = "skipped");
    }
    return plan.tasks = topoSort(plan.tasks), plan.estimatedCost = plan.tasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0), plan.estimatedDurationMs = plan.tasks.reduce((s, t) => s + (t.estimatedDurationMs ?? 0), 0), plan.confidence = estimatePlanConfidence(plan.tasks, 1), plan;
  }
};
function topoSort(tasks) {
  let byId = new Map(tasks.map((t) => [t.id, t])), visited = /* @__PURE__ */ new Set(), visiting = /* @__PURE__ */ new Set(), out = [], visit = (id) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new PlanningError(`cycle detected at task ${id}`);
    visiting.add(id);
    let t = byId.get(id);
    if (!t) throw new PlanningError(`unknown task id ${id}`);
    for (let dep of t.dependsOn ?? []) visit(dep);
    visiting.delete(id), visited.add(id), out.push(t);
  };
  for (let t of tasks) visit(t.id);
  return out;
}
function estimatePlanConfidence(tasks, complexity) {
  if (tasks.length === 0) return 0;
  let score = 0.5;
  score -= Math.min(0.3, tasks.length * 0.05), score -= Math.min(0.2, complexity * 0.05);
  let withTools = tasks.filter((t) => t.requiredTools && t.requiredTools.length > 0).length;
  return score += withTools / tasks.length * 0.2, Math.max(0, Math.min(1, score));
}
var ToolRegistry = class {
  tools = /* @__PURE__ */ new Map();
  register(tool) {
    if (!tool?.name) throw new ToolError("tool.name is required");
    if (this.tools.has(tool.name)) throw new ToolError(`tool '${tool.name}' already registered`);
    if (typeof tool.handler != "function") throw new ToolError("tool.handler must be a function");
    this.tools.set(tool.name, tool);
  }
  unregister(name) {
    return this.tools.delete(name);
  }
  get(name) {
    return this.tools.get(name);
  }
  list() {
    return Array.from(this.tools.keys());
  }
  findByTag(tag) {
    return Array.from(this.tools.values()).filter((t) => t.tags?.includes(tag));
  }
  select(requiredTools, preferredTags) {
    if (requiredTools && requiredTools.length > 0) for (let name of requiredTools) {
      let t = this.tools.get(name);
      if (t) return t;
    }
    if (preferredTags && preferredTags.length > 0) for (let tag of preferredTags) {
      let tools = this.findByTag(tag);
      if (tools.length > 0) return tools[0];
    }
  }
  async invoke(name, input, ctx) {
    let tool = this.tools.get(name);
    if (!tool) throw new ToolError(`tool '${name}' not found`);
    let start = Date.now();
    try {
      let result = await Promise.resolve(tool.handler(input, ctx)), durationMs = Date.now() - start;
      return { success: result.success, output: result.output, error: result.error, confidence: result.confidence, durationMs };
    } catch (err) {
      let durationMs = Date.now() - start;
      return { success: false, error: err instanceof Error ? err.message : String(err), durationMs };
    }
  }
  newId(prefix = "tool_call") {
    return randomId(prefix);
  }
};
var KnowledgeRegistry = class {
  entries = /* @__PURE__ */ new Map();
  register(key, ownerComponentId, opts) {
    if (!key) throw new KnowledgeError("key is required");
    if (!ownerComponentId) throw new KnowledgeError("ownerComponentId is required");
    let now = Date.now(), existing = this.entries.get(key);
    if (existing) {
      if (existing.ownerComponentId !== ownerComponentId) throw new KnowledgeError(`key '${key}' is already owned by '${existing.ownerComponentId}'`);
      return existing.lastUpdated = now, opts?.description !== void 0 && (existing.description = opts.description), existing;
    }
    let entry = { key, ownerComponentId, registeredAt: now, lastUpdated: now, description: opts?.description };
    return this.entries.set(key, entry), entry;
  }
  transfer(key, newOwnerComponentId, opts) {
    if (!key) throw new KnowledgeError("key is required");
    if (!newOwnerComponentId) throw new KnowledgeError("newOwnerComponentId is required");
    let now = Date.now(), existing = this.entries.get(key);
    if (existing && existing.ownerComponentId === newOwnerComponentId) return existing.lastUpdated = now, opts?.description !== void 0 && (existing.description = opts.description), existing;
    let entry = { key, ownerComponentId: newOwnerComponentId, registeredAt: existing?.registeredAt ?? now, lastUpdated: now, description: opts?.description ?? existing?.description };
    return this.entries.set(key, entry), entry;
  }
  lookup(key) {
    return this.entries.get(key);
  }
  has(key) {
    return this.entries.has(key);
  }
  unregister(key) {
    return this.entries.delete(key);
  }
  all() {
    return Array.from(this.entries.values());
  }
  byOwner(ownerComponentId) {
    return this.all().filter((e) => e.ownerComponentId === ownerComponentId);
  }
  size() {
    return this.entries.size;
  }
  diff(since) {
    if (since < 0) throw new KnowledgeError("since must be non-negative");
    let added = [], changed = [];
    for (let entry of this.entries.values()) entry.lastUpdated <= since || (entry.registeredAt > since ? added.push(entry) : changed.push(entry));
    let delta = { added, changed, derived: [] };
    return { hasChanges: added.length > 0 || changed.length > 0, delta, queriedAt: Date.now() };
  }
  diffExcluding(since, excludeComponentId) {
    if (since < 0) throw new KnowledgeError("since must be non-negative");
    let added = [], changed = [];
    for (let entry of this.entries.values()) entry.ownerComponentId !== excludeComponentId && (entry.lastUpdated <= since || (entry.registeredAt > since ? added.push(entry) : changed.push(entry)));
    let delta = { added, changed, derived: [] };
    return { hasChanges: added.length > 0 || changed.length > 0, delta, queriedAt: Date.now() };
  }
};
var INTENT_TO_COMPONENT = { planning: "planner", recall: "memory", execution: "actuators", communication: "telepathy", analysis: "council", monitoring: "nervous-system", unknown: "planner" };
var INTENT_CUES = [{ intent: "recall", cues: ["remember", "what is", "recall", "who is", "when did", "where is", "how many"] }, { intent: "execution", cues: ["execute", "do", "run", "perform", "apply", "deploy", "start", "stop"] }, { intent: "communication", cues: ["tell", "ask", "send", "broadcast", "notify", "inform", "message", "reply"] }, { intent: "analysis", cues: ["analyze", "evaluate", "assess", "compare", "review", "critique", "rank"] }, { intent: "monitoring", cues: ["watch", "monitor", "observe", "track", "listen", "subscribe", "detect"] }, { intent: "planning", cues: ["plan", "decompose", "schedule", "prepare", "design", "orchestrate"] }];
var Router = class {
  overrides = /* @__PURE__ */ new Map();
  classify(input) {
    if (!input || typeof input != "string") return "unknown";
    let lower = input.toLowerCase(), bestIntent = "unknown", bestScore = 0;
    for (let { intent, cues } of INTENT_CUES) {
      let score = 0;
      for (let cue of cues) lower.includes(cue) && (score += 1);
      score > bestScore && (bestScore = score, bestIntent = intent);
    }
    return bestIntent;
  }
  route(input) {
    if (!input) throw new RoutingError("input is required");
    let intent = this.classify(input), component = this.overrides.get(intent) ?? INTENT_TO_COMPONENT[intent], confidence = intent === "unknown" ? 0.3 : 0.7 + Math.min(0.25, intent.length * 0.01);
    return { id: randomId("route"), input, component, confidence, reason: intent === "unknown" ? "No intent cues matched; defaulting to planner." : `Matched intent '${intent}' via keyword cues.`, routedAt: Date.now() };
  }
  setComponent(intent, component) {
    this.overrides.set(intent, component);
  }
};
var Scheduler = class {
  queue = [];
  schedule(task, worker, opts) {
    if (!task) throw new SchedulerError("task is required");
    if (!worker) throw new SchedulerError("worker is required");
    let priority = opts?.priority ?? 0.5, scheduledAt = opts?.at ?? Date.now();
    if (task.dependsOn && task.dependsOn.length > 0) for (let dep of task.dependsOn) {
      let depScheduled = this.queue.find((s) => s.taskId === dep);
      if (!depScheduled) throw new SchedulerError(`dependency ${dep} not scheduled`);
      if (scheduledAt < depScheduled.scheduledAt) throw new SchedulerError(`task ${task.id} scheduled before dependency ${dep}`);
    }
    if (opts?.budget) {
      if (opts.budget.spentCost + (task.estimatedCost ?? 0) > opts.budget.maxCost) throw new SchedulerError(`task ${task.id} would exceed cost budget`);
      if (opts.budget.activeWorkers >= opts.budget.maxParallel) throw new SchedulerError(`task ${task.id} would exceed parallel worker budget`);
    }
    let st = { taskId: task.id, scheduledAt, worker, priority };
    return this.queue.push(st), this.queue.sort((a, b) => a.scheduledAt - b.scheduledAt || b.priority - a.priority), st;
  }
  next(completedTaskIds) {
    for (let st of this.queue) return st;
  }
  popNext() {
    return this.queue.shift();
  }
  cancel(taskId) {
    let idx = this.queue.findIndex((s) => s.taskId === taskId);
    return idx < 0 ? false : (this.queue.splice(idx, 1), true);
  }
  all() {
    return [...this.queue];
  }
  size() {
    return this.queue.length;
  }
  clear() {
    this.queue.length = 0;
  }
};
var DEFAULT_WEIGHTS = { planConfidence: 0.25, toolReliability: 0.25, evidenceCount: 0.15, agreementRate: 0.25, domainFamiliarity: 0.1 };
var ConfidenceEstimator = class {
  history = [];
  estimate(factors) {
    let w = DEFAULT_WEIGHTS, contributions = [], confidence = 0, totalWeight = 0;
    if (factors.planConfidence !== void 0) {
      let c = factors.planConfidence * w.planConfidence;
      confidence += c, totalWeight += w.planConfidence, contributions.push({ name: "planConfidence", weight: w.planConfidence, contribution: c });
    }
    if (factors.toolReliability !== void 0) {
      let c = factors.toolReliability * w.toolReliability;
      confidence += c, totalWeight += w.toolReliability, contributions.push({ name: "toolReliability", weight: w.toolReliability, contribution: c });
    }
    if (factors.evidenceCount !== void 0) {
      let c = Math.min(1, Math.log2((factors.evidenceCount || 0) + 1) / 4) * w.evidenceCount;
      confidence += c, totalWeight += w.evidenceCount, contributions.push({ name: "evidenceCount", weight: w.evidenceCount, contribution: c });
    }
    if (factors.agreementRate !== void 0) {
      let c = factors.agreementRate * w.agreementRate;
      confidence += c, totalWeight += w.agreementRate, contributions.push({ name: "agreementRate", weight: w.agreementRate, contribution: c });
    }
    if (factors.domainFamiliarity !== void 0) {
      let c = factors.domainFamiliarity * w.domainFamiliarity;
      confidence += c, totalWeight += w.domainFamiliarity, contributions.push({ name: "domainFamiliarity", weight: w.domainFamiliarity, contribution: c });
    }
    if (totalWeight === 0) throw new ConfidenceError("at least one factor is required");
    let final = confidence / totalWeight, reasoning = contributions.map((c) => `${c.name}=${c.contribution.toFixed(3)}`).join(", ");
    return { confidence: Math.max(0, Math.min(1, final)), reasoning: `Weighted sum: ${reasoning} (total weight ${totalWeight.toFixed(2)})`, factors: contributions };
  }
  recordOutcome(task, success) {
    this.history.push({ task, success });
  }
  pastSuccessRate(taskSubstring) {
    let matching = this.history.filter((h) => h.task.includes(taskSubstring));
    return matching.length === 0 ? 0.5 : matching.filter((m) => m.success).length / matching.length;
  }
};
var VALID_TRANSITIONS = { pending: ["active", "abandoned"], active: ["blocked", "achieved", "abandoned"], blocked: ["active", "abandoned"], achieved: [], abandoned: [] };
var GoalManager = class {
  goals = /* @__PURE__ */ new Map();
  create(description, opts) {
    if (!description) throw new GoalError("description is required");
    if (opts?.parentId && !this.goals.has(opts.parentId)) throw new GoalError(`parent goal ${opts.parentId} not found`);
    let goal = { id: randomId("goal"), description, parentId: opts?.parentId, priority: opts?.priority ?? 0.5, status: "pending", deadline: opts?.deadline, successCriteria: opts?.successCriteria, createdAt: Date.now() };
    return this.goals.set(goal.id, goal), goal;
  }
  get(id) {
    return this.goals.get(id);
  }
  transition(id, newStatus) {
    let goal = this.goals.get(id);
    if (!goal) throw new GoalError(`goal ${id} not found`);
    if (!VALID_TRANSITIONS[goal.status].includes(newStatus)) throw new GoalError(`invalid transition ${goal.status} \u2192 ${newStatus}`);
    return goal.status = newStatus, goal;
  }
  setPriority(id, priority) {
    let g = this.goals.get(id);
    if (!g) throw new GoalError(`goal ${id} not found`);
    if (priority < 0 || priority > 1) throw new GoalError("priority must be in [0,1]");
    g.priority = priority;
  }
  all() {
    return Array.from(this.goals.values());
  }
  active() {
    return this.all().filter((g) => g.status === "active").sort((a, b) => b.priority - a.priority);
  }
  children(parentId) {
    return this.all().filter((g) => g.parentId === parentId);
  }
  overdue(now = Date.now()) {
    return this.all().filter((g) => g.deadline && g.deadline < now && (g.status === "pending" || g.status === "active" || g.status === "blocked"));
  }
  delete(id) {
    return this.goals.delete(id);
  }
};
var ResourceManager = class {
  budget;
  constructor(initial) {
    this.budget = { maxCost: initial?.maxCost ?? 1e3, maxParallel: initial?.maxParallel ?? 4, maxDurationMs: initial?.maxDurationMs ?? 6e4, spentCost: initial?.spentCost ?? 0, activeWorkers: initial?.activeWorkers ?? 0, elapsedMs: initial?.elapsedMs ?? 0 };
  }
  snapshot() {
    return { ...this.budget };
  }
  canAdmit(task, now = Date.now()) {
    let cost = task.estimatedCost ?? 0, duration = task.estimatedDurationMs ?? 0;
    return this.budget.spentCost + cost > this.budget.maxCost ? { admit: false, reason: `cost budget exceeded (${this.budget.spentCost + cost} > ${this.budget.maxCost})` } : this.budget.activeWorkers >= this.budget.maxParallel ? { admit: false, reason: `parallel worker budget exceeded (${this.budget.activeWorkers} >= ${this.budget.maxParallel})` } : this.budget.elapsedMs + duration > this.budget.maxDurationMs ? { admit: false, reason: `duration budget exceeded (${this.budget.elapsedMs + duration} > ${this.budget.maxDurationMs})` } : { admit: true, reason: "within budget" };
  }
  reserve(task) {
    let check = this.canAdmit(task);
    if (!check.admit) throw new ResourceError(check.reason);
    this.budget.spentCost += task.estimatedCost ?? 0, this.budget.activeWorkers += 1;
  }
  release(task, actualDurationMs) {
    this.budget.activeWorkers = Math.max(0, this.budget.activeWorkers - 1), this.budget.elapsedMs += actualDurationMs ?? task.estimatedDurationMs ?? 0;
  }
  reset() {
    this.budget.spentCost = 0, this.budget.activeWorkers = 0, this.budget.elapsedMs = 0;
  }
  setCaps(caps) {
    caps.maxCost !== void 0 && (this.budget.maxCost = caps.maxCost), caps.maxParallel !== void 0 && (this.budget.maxParallel = caps.maxParallel), caps.maxDurationMs !== void 0 && (this.budget.maxDurationMs = caps.maxDurationMs);
  }
  utilization() {
    return { cost: this.budget.spentCost / this.budget.maxCost, parallel: this.budget.activeWorkers / this.budget.maxParallel, duration: this.budget.elapsedMs / this.budget.maxDurationMs };
  }
};
var WorkflowEngine = class {
  constructor(tools) {
    this.tools = tools;
  }
  tools;
  async execute(workflow, initialInput) {
    if (!workflow) throw new WorkflowError2("workflow is required");
    let step = this.findStep(workflow, workflow.initialStep);
    if (!step) throw new WorkflowError2(`initial step ${workflow.initialStep} not found`);
    let exec2 = { id: randomId("wfexec"), workflowId: workflow.id, currentStepId: workflow.initialStep, visitedSteps: [workflow.initialStep], outputs: {}, status: "running", startedAt: Date.now() }, currentStep = step, currentInput = initialInput;
    for (; currentStep && !currentStep.terminal && exec2.status === "running"; ) {
      let result = await this.executeStep(currentStep, currentInput);
      if (exec2.outputs[currentStep.id] = result.output, !result.success) {
        exec2.status = "failed", exec2.error = result.error, exec2.endedAt = Date.now();
        break;
      }
      let nextId = currentStep.nextOnSuccess;
      if (!nextId) {
        exec2.status = "completed", exec2.endedAt = Date.now();
        break;
      }
      let nextStep = this.findStep(workflow, nextId);
      if (!nextStep) {
        exec2.status = "failed", exec2.error = `next step ${nextId} not found`, exec2.endedAt = Date.now();
        break;
      }
      exec2.currentStepId = nextId, exec2.visitedSteps.push(nextId), currentInput = result.output, currentStep = nextStep;
    }
    return exec2.status === "running" && currentStep?.terminal && (exec2.status = "completed", exec2.endedAt = Date.now()), exec2;
  }
  findStep(workflow, stepId) {
    return workflow.steps.find((s) => s.id === stepId);
  }
  async executeStep(step, input) {
    return step.tool ? this.tools.invoke(step.tool, step.input ?? input) : { success: true, output: input };
  }
  abort(exec2) {
    return exec2.status !== "running" || (exec2.status = "aborted", exec2.endedAt = Date.now()), exec2;
  }
};
var DEFAULT_RETRY_POLICY = { maxAttempts: 3, backoff: "exponential", baseDelayMs: 100, maxDelayMs: 5e3, retryableErrors: ["timeout", "transient", "busy", "unavailable"] };
function backoffDelay(policy, attempt) {
  let n = Math.max(1, attempt), delay;
  return policy.backoff === "fixed" ? delay = policy.baseDelayMs : policy.backoff === "linear" ? delay = policy.baseDelayMs * n : delay = policy.baseDelayMs * Math.pow(2, n - 1), Math.min(delay, policy.maxDelayMs);
}
function isRetryable(policy, errorMessage) {
  if (!policy.retryableErrors || policy.retryableErrors.length === 0) return true;
  let lower = errorMessage.toLowerCase();
  return policy.retryableErrors.some((s) => lower.includes(s.toLowerCase()));
}
async function withRetry(fn, policy = DEFAULT_RETRY_POLICY) {
  if (!fn || typeof fn != "function") throw new RetryError("fn must be a function");
  let lastError;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) try {
    return await fn();
  } catch (err) {
    if (lastError = err instanceof Error ? err : new Error(String(err)), attempt >= policy.maxAttempts || !isRetryable(policy, lastError.message)) break;
    let delay = backoffDelay(policy, attempt);
    await sleep(delay);
  }
  throw new RetryError(`all ${policy.maxAttempts} attempts failed: ${lastError?.message ?? "unknown error"}`, lastError);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var Coordinator = class {
  constructor(tools, scheduler, resources, confidence, opts) {
    this.tools = tools;
    this.scheduler = scheduler;
    this.resources = resources;
    this.confidence = confidence;
    this.logger = opts?.logger ?? new SilentLogger5(), this.retryPolicy = opts?.retryPolicy ?? DEFAULT_RETRY_POLICY;
  }
  tools;
  scheduler;
  resources;
  confidence;
  events = [];
  logger;
  retryPolicy;
  async execute(plan) {
    if (!plan) throw new CoordinationError("plan is required");
    this.logger.info("coordinator: starting plan execution", { planId: plan.id, taskCount: plan.tasks.length }), this.emit("plan_created", { planId: plan.id });
    for (let task of plan.tasks) {
      if (task.status === "skipped") continue;
      this.scheduler.schedule(task, "default", { priority: (task.goalId, 0.5) }), this.emit("task_scheduled", { taskId: task.id });
      let admit = this.resources.canAdmit(task);
      if (!admit.admit) {
        task.status = "skipped", task.error = admit.reason, this.logger.warn("coordinator: task skipped (resources)", { taskId: task.id, reason: admit.reason });
        continue;
      }
      this.resources.reserve(task), this.emit("task_started", { taskId: task.id });
      let tool = task.requiredTools && task.requiredTools.length > 0 ? this.tools.select(task.requiredTools) : void 0;
      try {
        let start = Date.now(), result;
        tool ? result = await withRetry(() => this.tools.invoke(tool.name, task.description, { taskId: task.id, goalId: task.goalId }), this.retryPolicy) : result = { success: true, output: void 0, durationMs: Date.now() - start };
        let duration = Date.now() - start;
        this.resources.release(task, duration), result.success ? (task.status = "completed", task.result = result.output, this.confidence.recordOutcome(task.description, true), this.emit("task_completed", { taskId: task.id, durationMs: duration })) : (task.status = "failed", task.error = result.error, this.confidence.recordOutcome(task.description, false), this.emit("task_failed", { taskId: task.id, error: result.error }), this.logger.error("coordinator: task failed", { taskId: task.id, error: result.error }));
      } catch (err) {
        this.resources.release(task, 0), task.status = "failed", task.error = err instanceof Error ? err.message : String(err), this.emit("task_failed", { taskId: task.id, error: task.error });
      }
    }
    return this.logger.info("coordinator: plan execution complete", { planId: plan.id, completed: plan.tasks.filter((t) => t.status === "completed").length, failed: plan.tasks.filter((t) => t.status === "failed").length, skipped: plan.tasks.filter((t) => t.status === "skipped").length }), plan;
  }
  getEvents() {
    return [...this.events];
  }
  emit(type, meta) {
    this.events.push({ id: randomId("evt"), type, timestamp: Date.now(), meta });
  }
};
var Cortex = class {
  goals;
  planner;
  tools;
  router;
  scheduler;
  confidence;
  resources;
  workflows;
  coordinator;
  knowledge;
  config;
  logger;
  constructor(config) {
    this.config = mergeConfig3(config), this.logger = this.config.logger ?? (this.config.logLevel === "silent" ? new SilentLogger5() : new ConsoleLogger3(this.config.logLevel)), this.goals = new GoalManager(), this.planner = new Planner(), this.tools = new ToolRegistry(), this.router = new Router(), this.scheduler = new Scheduler(), this.confidence = new ConfidenceEstimator(), this.resources = new ResourceManager(this.config.resourceBudget), this.workflows = new WorkflowEngine(this.tools), this.knowledge = new KnowledgeRegistry(), this.coordinator = new Coordinator(this.tools, this.scheduler, this.resources, this.confidence, { logger: this.logger, retryPolicy: this.config.retryPolicy });
  }
  setGoal(description, opts) {
    let goal = this.goals.create(description, opts);
    return this.goals.transition(goal.id, "active"), this.logger.info("cortex: goal set", { goalId: goal.id, description: description.slice(0, 60) }), goal;
  }
  planGoal(goal) {
    return this.planner.plan(goal, this.config.defaultStrategy);
  }
  async executePlan(plan) {
    return this.coordinator.execute(plan);
  }
  async reason(description, opts) {
    let goal = this.setGoal(description, opts), plan = this.planGoal(goal), executed = await this.executePlan(plan);
    return this.goals.transition(goal.id, executed.tasks.every((t) => t.status === "completed") ? "achieved" : "active"), { goal, plan: executed, events: this.coordinator.getEvents() };
  }
  route(input) {
    return this.router.route(input);
  }
  registerTool(tool) {
    this.tools.register(tool);
  }
  async runWorkflow(workflow, initialInput) {
    return this.workflows.execute(workflow, initialInput);
  }
  getEvents() {
    return this.coordinator.getEvents();
  }
  registerKnowledge(key, ownerComponentId, opts) {
    this.knowledge.register(key, ownerComponentId, opts);
  }
  queryKnowledge(key) {
    return this.knowledge.lookup(key)?.ownerComponentId;
  }
  reset() {
    this.scheduler.clear(), this.resources.reset();
  }
};

// packages/memory/dist/esm/index.mjs
import { randomBytes as randomBytes10 } from "crypto";
import { gzipSync, gunzipSync } from "zlib";
import { createHash as createHash5 } from "crypto";
var MemoryError = class extends Error {
  code;
  cause;
  constructor(message, code, cause) {
    super(message), this.name = new.target.name, this.code = code ?? new.target.name, cause !== void 0 && (this.cause = cause), Object.setPrototypeOf(this, new.target.prototype);
  }
};
var WorkingMemoryError = class extends MemoryError {
  constructor(message, cause) {
    super(message, "WORKING_MEMORY_ERROR", cause);
  }
};
var EpisodicMemoryError = class extends MemoryError {
  constructor(message, cause) {
    super(message, "EPISODIC_MEMORY_ERROR", cause);
  }
};
var SemanticMemoryError = class extends MemoryError {
  constructor(message, cause) {
    super(message, "SEMANTIC_MEMORY_ERROR", cause);
  }
};
var ProceduralMemoryError = class extends MemoryError {
  constructor(message, cause) {
    super(message, "PROCEDURAL_MEMORY_ERROR", cause);
  }
};
var LongTermMemoryError = class extends MemoryError {
  constructor(message, cause) {
    super(message, "LONGTERM_MEMORY_ERROR", cause);
  }
};
var IndexError = class extends MemoryError {
  constructor(message, cause) {
    super(message, "INDEX_ERROR", cause);
  }
};
var PermissionError = class extends MemoryError {
  constructor(message, cause) {
    super(message, "PERMISSION_ERROR", cause);
  }
};
var SyncError3 = class extends MemoryError {
  constructor(message, cause) {
    super(message, "SYNC_ERROR", cause);
  }
};
var BackupError = class extends MemoryError {
  constructor(message, cause) {
    super(message, "BACKUP_ERROR", cause);
  }
};
var LEVEL_RANK4 = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
var SCRUBBED_FIELD_NAMES7 = ["secret", "token", "apiKey", "password", "privateKey"];
function shouldScrubField4(name) {
  let lower = name.toLowerCase();
  for (let needle of SCRUBBED_FIELD_NAMES7) {
    let nl = needle.toLowerCase();
    if (lower === nl || lower.endsWith("_" + nl)) return true;
  }
  return false;
}
function scrubMetadata5(meta) {
  if (meta == null || typeof meta != "object") return meta;
  if (Buffer.isBuffer(meta)) return `[buffer:${meta.length}]`;
  if (meta instanceof Date) return meta.toISOString();
  if (Array.isArray(meta)) return meta.map(scrubMetadata5);
  let out = {};
  for (let [k, v] of Object.entries(meta)) out[k] = shouldScrubField4(k) ? "[redacted]" : scrubMetadata5(v);
  return out;
}
var ConsoleLogger4 = class {
  constructor(level = "info") {
    this.level = level;
    this.levelRank = LEVEL_RANK4[level] ?? LEVEL_RANK4.info;
  }
  level;
  levelRank;
  debug(msg, meta) {
    this.emit("debug", msg, meta);
  }
  info(msg, meta) {
    this.emit("info", msg, meta);
  }
  warn(msg, meta) {
    this.emit("warn", msg, meta);
  }
  error(msg, meta) {
    this.emit("error", msg, meta);
  }
  emit(level, msg, meta) {
    try {
      if (LEVEL_RANK4[level] < this.levelRank) return;
      let entry = { level, msg, ts: (/* @__PURE__ */ new Date()).toISOString(), ...meta ? { meta: scrubMetadata5(meta) } : {} }, line = JSON.stringify(entry);
      level === "error" || level === "warn" ? process.stderr.write(line + `
`) : process.stdout.write(line + `
`);
    } catch {
    }
  }
};
var SilentLogger6 = class {
  debug() {
  }
  info() {
  }
  warn() {
  }
  error() {
  }
};
var DEFAULT_CONFIG4 = { aging: { workingTtlMs: 3e5, episodicMaxCount: 1e4, episodicPruneThreshold: 0.3, longtermCompressAfterDays: 90 }, rankingWeights: { tfidf: 0.4, importance: 0.3, recency: 0.2, access: 0.1 }, logLevel: "info" };
function mergeConfig4(user) {
  return { ...DEFAULT_CONFIG4, ...user ?? {}, aging: { ...DEFAULT_CONFIG4.aging, ...user?.aging ?? {} }, rankingWeights: { ...DEFAULT_CONFIG4.rankingWeights, ...user?.rankingWeights ?? {} } };
}
function randomId2(prefix = "mem", bytes = 8) {
  return `${prefix}_${randomBytes10(bytes).toString("hex")}`;
}
var WorkingMemory = class {
  constructor(defaultTtlMs = 300 * 1e3) {
    this.defaultTtlMs = defaultTtlMs;
    typeof setInterval == "function" && typeof process < "u" && process.versions?.node && (this.sweeper = setInterval(() => this.sweep(), 3e4), this.sweeper && typeof this.sweeper.unref == "function" && this.sweeper.unref());
  }
  defaultTtlMs;
  store = /* @__PURE__ */ new Map();
  sweeper = null;
  set(key, value, ttlMs, tags) {
    if (!key || typeof key != "string") throw new WorkingMemoryError("key must be non-empty string");
    let id = randomId2("wk"), entry = { id, key, value, createdAt: Date.now(), ttlMs: ttlMs ?? this.defaultTtlMs, tags };
    return this.store.set(key, entry), id;
  }
  get(key) {
    let e = this.store.get(key);
    return e ? this.isExpired(e) ? (this.store.delete(key), null) : e.value : null;
  }
  getEntry(key) {
    let e = this.store.get(key);
    return e ? this.isExpired(e) ? (this.store.delete(key), null) : e : null;
  }
  has(key) {
    let e = this.store.get(key);
    return e ? this.isExpired(e) ? (this.store.delete(key), false) : true : false;
  }
  delete(key) {
    return this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  size() {
    return this.sweep(), this.store.size;
  }
  entries() {
    return this.sweep(), Array.from(this.store.values());
  }
  findByTag(tag) {
    return this.entries().filter((e) => e.tags?.includes(tag));
  }
  dispose() {
    this.sweeper && (clearInterval(this.sweeper), this.sweeper = null);
  }
  isExpired(e) {
    return e.ttlMs ? Date.now() - e.createdAt > e.ttlMs : false;
  }
  sweep() {
    let removed = 0;
    for (let [k, e] of this.store) this.isExpired(e) && (this.store.delete(k), removed++);
    return removed;
  }
};
var EpisodicMemory = class {
  events = [];
  maxCount;
  constructor(maxCount = 1e4) {
    if (maxCount < 1) throw new EpisodicMemoryError("maxCount must be positive");
    this.maxCount = maxCount;
  }
  record(agent, event, context, opts) {
    if (!agent) throw new EpisodicMemoryError("agent is required");
    if (!event) throw new EpisodicMemoryError("event is required");
    let id = opts?.id ?? randomId2("ep"), e = { id, timestamp: opts?.timestamp ?? Date.now(), agent, event, context, importance: opts?.importance ?? 0.5, tags: opts?.tags, source: opts?.source }, existingIdx = this.events.findIndex((ev) => ev.id === id);
    return existingIdx >= 0 ? this.events[existingIdx] = e : (this.events.push(e), this.events.length > this.maxCount && this.events.shift()), id;
  }
  recall(limit = 10, agentFilter) {
    return (agentFilter ? this.events.filter((e) => e.agent === agentFilter) : this.events).slice(-limit);
  }
  recallRange(startMs, endMs, limit = 100) {
    return this.events.filter((e) => e.timestamp >= startMs && e.timestamp <= endMs).slice(-limit);
  }
  search(query, limit = 20) {
    let q = query.toLowerCase();
    return this.events.filter((e) => e.event.toLowerCase().includes(q) || e.context && JSON.stringify(e.context).toLowerCase().includes(q)).slice(-limit);
  }
  findByTag(tag) {
    return this.events.filter((e) => e.tags?.includes(tag));
  }
  findById(id) {
    return this.events.find((e) => e.id === id);
  }
  all() {
    return [...this.events];
  }
  count() {
    return this.events.length;
  }
  pruneOlderThan(cutoffMs) {
    let before = this.events.length, kept = this.events.filter((e) => e.timestamp >= cutoffMs), removed = before - kept.length;
    return this.events.length = 0, this.events.push(...kept), removed;
  }
  pruneLowImportance(threshold = 0.3, maxCount) {
    let cap = maxCount ?? this.maxCount;
    if (this.events.length <= cap) return 0;
    let before = this.events.length, kept = this.events.filter((e) => (e.importance ?? 0) >= threshold), recent = this.events.slice(-100), seen = new Set(recent.map((e) => e.id));
    for (let e of kept) seen.has(e.id) || seen.add(e.id);
    let final = this.events.filter((e) => seen.has(e.id));
    return this.events.length = 0, this.events.push(...final), before - this.events.length;
  }
};
var SemanticMemory = class {
  facts = /* @__PURE__ */ new Map();
  byAttribute = /* @__PURE__ */ new Map();
  learn(entity, attribute, value, confidence = 1, source) {
    if (!entity) throw new SemanticMemoryError("entity is required");
    if (!attribute) throw new SemanticMemoryError("attribute is required");
    if (confidence < 0 || confidence > 1) throw new SemanticMemoryError("confidence must be in [0,1]");
    let id = randomId2("sem"), fact = { id, entity, attribute, value, confidence, learnedAt: Date.now(), source };
    return this.facts.has(entity) || this.facts.set(entity, /* @__PURE__ */ new Map()), this.facts.get(entity).set(attribute, fact), this.byAttribute.has(attribute) || this.byAttribute.set(attribute, /* @__PURE__ */ new Set()), this.byAttribute.get(attribute).add(entity), id;
  }
  recall(entity, attribute) {
    return this.facts.get(entity)?.get(attribute) ?? null;
  }
  recallEntity(entity) {
    let map = this.facts.get(entity);
    return map ? Array.from(map.values()) : [];
  }
  findByAttribute(attribute, valueMatch) {
    let entities = this.byAttribute.get(attribute);
    if (!entities) return [];
    let out = [];
    for (let e of entities) {
      let f = this.facts.get(e)?.get(attribute);
      f && (valueMatch === void 0 || JSON.stringify(f.value) === JSON.stringify(valueMatch)) && out.push(f);
    }
    return out;
  }
  forget(entity, attribute) {
    let removed = this.facts.get(entity)?.delete(attribute) ?? false;
    if (removed) {
      let set = this.byAttribute.get(attribute);
      set && (set.delete(entity), set.size === 0 && this.byAttribute.delete(attribute));
      let entMap = this.facts.get(entity);
      entMap && entMap.size === 0 && this.facts.delete(entity);
    }
    return removed;
  }
  updateConfidence(entity, attribute, confidence) {
    let f = this.recall(entity, attribute);
    if (!f) throw new SemanticMemoryError(`No fact for ${entity}.${attribute}`);
    if (confidence < 0 || confidence > 1) throw new SemanticMemoryError("confidence must be in [0,1]");
    f.confidence = confidence;
  }
  all() {
    let out = [];
    for (let entMap of this.facts.values()) out.push(...entMap.values());
    return out;
  }
  count() {
    let n = 0;
    for (let m of this.facts.values()) n += m.size;
    return n;
  }
};
var ProceduralMemory = class {
  skills = /* @__PURE__ */ new Map();
  learn(name, handler, opts) {
    if (!name) throw new ProceduralMemoryError("skill name is required");
    if (typeof handler != "function") throw new ProceduralMemoryError("handler must be a function");
    if (this.skills.has(name)) throw new ProceduralMemoryError(`skill '${name}' already learned`);
    let id = randomId2("proc"), skill = { id, name, handler, description: opts?.description, arguments: opts?.arguments, learnedAt: Date.now(), tags: opts?.tags };
    return this.skills.set(name, skill), id;
  }
  execute(name, ...args) {
    let s = this.skills.get(name);
    if (!s) throw new ProceduralMemoryError(`procedural skill '${name}' not found`);
    if (!s.handler) throw new ProceduralMemoryError(`skill '${name}' has no handler (likely restored from snapshot)`);
    return s.handler(...args);
  }
  get(name) {
    return this.skills.get(name);
  }
  forget(name) {
    return this.skills.delete(name);
  }
  list() {
    return Array.from(this.skills.keys());
  }
  count() {
    return this.skills.size;
  }
  findByTag(tag) {
    return Array.from(this.skills.values()).filter((s) => s.tags?.includes(tag));
  }
};
var LongTermMemory = class {
  records = /* @__PURE__ */ new Map();
  byTag = /* @__PURE__ */ new Map();
  byType = /* @__PURE__ */ new Map();
  store(payload, opts) {
    let id = opts?.id ?? randomId2("lt");
    if (this.records.has(id)) throw new LongTermMemoryError(`record '${id}' already exists`);
    let now = Date.now(), rec = { id, type: opts?.type ?? "longterm", payload, createdAt: now, lastAccessedAt: now, accessCount: 0, importance: opts?.importance ?? 0.5, tags: opts?.tags, source: opts?.source };
    this.records.set(id, rec);
    for (let t of rec.tags ?? []) this.byTag.has(t) || this.byTag.set(t, /* @__PURE__ */ new Set()), this.byTag.get(t).add(id);
    return this.byType.has(rec.type) || this.byType.set(rec.type, /* @__PURE__ */ new Set()), this.byType.get(rec.type).add(id), id;
  }
  retrieve(id) {
    let r = this.records.get(id);
    return r ? (r.lastAccessedAt = Date.now(), r.accessCount++, r) : null;
  }
  peek(id) {
    return this.records.get(id) ?? null;
  }
  update(id, payload) {
    let r = this.records.get(id);
    if (!r) throw new LongTermMemoryError(`record '${id}' not found`);
    r.payload = payload;
  }
  delete(id) {
    let r = this.records.get(id);
    if (!r) return false;
    for (let t of r.tags ?? []) this.byTag.get(t)?.delete(id);
    return this.byType.get(r.type)?.delete(id), this.records.delete(id);
  }
  findByTag(tag) {
    let ids = this.byTag.get(tag);
    return ids ? Array.from(ids).map((id) => this.records.get(id)).filter(Boolean) : [];
  }
  findByType(type) {
    let ids = this.byType.get(type);
    return ids ? Array.from(ids).map((id) => this.records.get(id)).filter(Boolean) : [];
  }
  all() {
    return Array.from(this.records.values());
  }
  count() {
    return this.records.size;
  }
  staleSince(cutoffMs) {
    return this.all().filter((r) => r.lastAccessedAt < cutoffMs);
  }
  applyAging(now = Date.now()) {
    let aged = 0;
    for (let r of this.records.values()) (now - r.createdAt) / 864e5 > 30 && r.accessCount < 3 && (r.importance = Math.max(0, r.importance - 0.1), aged++);
    return aged;
  }
};
var InvertedIndex = class _InvertedIndex {
  index = /* @__PURE__ */ new Map();
  docLengths = /* @__PURE__ */ new Map();
  static tokenize(text) {
    return typeof text != "string" ? [] : text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  }
  add(recordId, text) {
    if (!recordId) throw new IndexError("recordId is required");
    let tokens = _InvertedIndex.tokenize(text);
    this.docLengths.set(recordId, tokens.length);
    let freqs = /* @__PURE__ */ new Map();
    for (let t of tokens) freqs.set(t, (freqs.get(t) ?? 0) + 1);
    for (let [token, freq] of freqs) {
      this.index.has(token) || this.index.set(token, { token, recordIds: [], frequencies: {} });
      let entry = this.index.get(token);
      entry.frequencies[recordId] || entry.recordIds.push(recordId), entry.frequencies[recordId] = freq;
    }
  }
  remove(recordId) {
    this.docLengths.delete(recordId);
    for (let [token, entry] of this.index) entry.frequencies[recordId] && (delete entry.frequencies[recordId], entry.recordIds = entry.recordIds.filter((id) => id !== recordId), entry.recordIds.length === 0 && this.index.delete(token));
  }
  lookup(token) {
    return this.index.get(token.toLowerCase());
  }
  search(query) {
    let tokens = _InvertedIndex.tokenize(query);
    if (tokens.length === 0) return [];
    let scores = /* @__PURE__ */ new Map();
    for (let t of tokens) {
      let entry = this.lookup(t);
      if (!entry) continue;
      let idf = Math.log(this.docLengths.size / (entry.recordIds.length + 1));
      for (let id of entry.recordIds) {
        let tf = entry.frequencies[id] ?? 0, docLen = this.docLengths.get(id) ?? 1, normalized = tf / docLen;
        scores.set(id, (scores.get(id) ?? 0) + normalized * idf);
      }
    }
    return Array.from(scores.entries()).map(([recordId, score]) => ({ recordId, score })).sort((a, b) => b.score - a.score);
  }
  size() {
    return this.index.size;
  }
  entries() {
    return Array.from(this.index.values());
  }
};
var LinkGraph = class _LinkGraph {
  links = /* @__PURE__ */ new Map();
  outgoing = /* @__PURE__ */ new Map();
  incoming = /* @__PURE__ */ new Map();
  static key(from, to, relation) {
    return `${from}|${to}|${relation}`;
  }
  add(from, to, relation, weight) {
    let k = _LinkGraph.key(from, to, relation);
    return this.links.has(k) ? false : (this.links.set(k, { fromId: from, toId: to, relation, weight }), this.outgoing.has(from) || this.outgoing.set(from, /* @__PURE__ */ new Set()), this.outgoing.get(from).add(k), this.incoming.has(to) || this.incoming.set(to, /* @__PURE__ */ new Set()), this.incoming.get(to).add(k), true);
  }
  remove(from, to, relation) {
    let k = _LinkGraph.key(from, to, relation), removed = this.links.delete(k);
    return removed && (this.outgoing.get(from)?.delete(k), this.incoming.get(to)?.delete(k)), removed;
  }
  outgoingFrom(id) {
    let keys = this.outgoing.get(id);
    return keys ? Array.from(keys).map((k) => this.links.get(k)).filter(Boolean) : [];
  }
  incomingTo(id) {
    let keys = this.incoming.get(id);
    return keys ? Array.from(keys).map((k) => this.links.get(k)).filter(Boolean) : [];
  }
  byRelation(relation) {
    return Array.from(this.links.values()).filter((l) => l.relation === relation);
  }
  traverse(start, relation, maxDepth = 5) {
    let visited = /* @__PURE__ */ new Set([start]), queue = [{ id: start, depth: 0 }];
    for (; queue.length > 0; ) {
      let { id, depth } = queue.shift();
      if (depth >= maxDepth) continue;
      let out = this.outgoingFrom(id).filter((l) => l.relation === relation);
      for (let l of out) visited.has(l.toId) || (visited.add(l.toId), queue.push({ id: l.toId, depth: depth + 1 }));
    }
    return Array.from(visited).filter((id) => id !== start);
  }
  all() {
    return Array.from(this.links.values());
  }
  size() {
    return this.links.size;
  }
};
var PermissionModel = class {
  perms = /* @__PURE__ */ new Map();
  set(permission) {
    if (!permission.recordId) throw new PermissionError("recordId is required");
    this.perms.set(permission.recordId, { ...permission });
  }
  get(recordId) {
    return this.perms.get(recordId);
  }
  canRead(recordId, subject) {
    let p = this.perms.get(recordId);
    return p ? p.readers.includes("*") || p.readers.includes(subject) : true;
  }
  canWrite(recordId, subject) {
    let p = this.perms.get(recordId);
    return p ? p.writers.includes("*") || p.writers.includes(subject) : true;
  }
  canDelete(recordId, subject) {
    let p = this.perms.get(recordId);
    return p ? p.deleters.includes("*") || p.deleters.includes(subject) : true;
  }
  grant(recordId, subject, mode) {
    let p = this.perms.get(recordId);
    p || (p = { recordId, readers: [], writers: [], deleters: [] }, this.perms.set(recordId, p)), mode === "read" && !p.readers.includes(subject) && p.readers.push(subject), mode === "write" && !p.writers.includes(subject) && p.writers.push(subject), mode === "delete" && !p.deleters.includes(subject) && p.deleters.push(subject);
  }
  revoke(recordId, subject, mode) {
    let p = this.perms.get(recordId);
    p && (mode === "read" && (p.readers = p.readers.filter((s) => s !== subject)), mode === "write" && (p.writers = p.writers.filter((s) => s !== subject)), mode === "delete" && (p.deleters = p.deleters.filter((s) => s !== subject)), p.readers.length === 0 && p.writers.length === 0 && p.deleters.length === 0 && this.perms.delete(recordId));
  }
  clear(recordId) {
    return this.perms.delete(recordId);
  }
  all() {
    return Array.from(this.perms.values());
  }
  assertRead(recordId, subject) {
    if (!this.canRead(recordId, subject)) throw new PermissionError(`subject '${subject}' cannot read record '${recordId}'`);
  }
  assertWrite(recordId, subject) {
    if (!this.canWrite(recordId, subject)) throw new PermissionError(`subject '${subject}' cannot write record '${recordId}'`);
  }
};
var InMemoryMemoryStore = class {
  episodic = /* @__PURE__ */ new Map();
  semantic = /* @__PURE__ */ new Map();
  longterm = /* @__PURE__ */ new Map();
  links = /* @__PURE__ */ new Map();
  permissions = /* @__PURE__ */ new Map();
  linkKey(l) {
    return `${l.fromId}|${l.toId}|${l.relation}`;
  }
  async putEpisodic(event) {
    this.episodic.set(event.id, JSON.parse(JSON.stringify(event)));
  }
  async getEpisodic(id) {
    let e = this.episodic.get(id);
    return e ? JSON.parse(JSON.stringify(e)) : null;
  }
  async deleteEpisodic(id) {
    return this.episodic.delete(id);
  }
  async listEpisodic(opts) {
    let results = Array.from(this.episodic.values());
    return opts?.agent && (results = results.filter((e) => e.agent === opts.agent)), opts?.before && (results = results.filter((e) => e.timestamp < opts.before)), results.sort((a, b) => a.timestamp - b.timestamp), opts?.limit && (results = results.slice(0, opts.limit)), results.map((e) => JSON.parse(JSON.stringify(e)));
  }
  async pruneEpisodic(olderThan) {
    let count = 0;
    for (let [id, e] of this.episodic) e.timestamp < olderThan && (this.episodic.delete(id), count++);
    return count;
  }
  async putSemantic(fact) {
    this.semantic.set(fact.id, JSON.parse(JSON.stringify(fact)));
  }
  async getSemantic(id) {
    let f = this.semantic.get(id);
    return f ? JSON.parse(JSON.stringify(f)) : null;
  }
  async deleteSemantic(id) {
    return this.semantic.delete(id);
  }
  async findSemantic(entity, attribute) {
    let results = Array.from(this.semantic.values());
    return attribute ? results = results.filter((f) => f.entity === entity && f.attribute === attribute) : results = results.filter((f) => f.entity === entity), results.map((f) => JSON.parse(JSON.stringify(f)));
  }
  async updateSemanticConfidence(id, confidence) {
    let f = this.semantic.get(id);
    return f ? (f.confidence = confidence, true) : false;
  }
  async putLongterm(record) {
    this.longterm.set(record.id, JSON.parse(JSON.stringify(record)));
  }
  async getLongterm(id) {
    let r = this.longterm.get(id);
    return r ? JSON.parse(JSON.stringify(r)) : null;
  }
  async deleteLongterm(id) {
    return this.longterm.delete(id);
  }
  async listLongterm(opts) {
    let results = Array.from(this.longterm.values());
    return opts?.type && (results = results.filter((r) => r.type === opts.type)), opts?.tag && (results = results.filter((r) => r.tags?.includes(opts.tag))), opts?.limit && (results = results.slice(0, opts.limit)), results.map((r) => JSON.parse(JSON.stringify(r)));
  }
  async touchLongterm(id) {
    let r = this.longterm.get(id);
    return r ? (r.accessCount++, r.lastAccessedAt = Date.now(), true) : false;
  }
  async putLink(link) {
    this.links.set(this.linkKey(link), JSON.parse(JSON.stringify(link)));
  }
  async deleteLink(fromId, toId, relation) {
    return this.links.delete(`${fromId}|${toId}|${relation}`);
  }
  async outgoingFrom(id) {
    return Array.from(this.links.values()).filter((l) => l.fromId === id).map((l) => JSON.parse(JSON.stringify(l)));
  }
  async incomingTo(id) {
    return Array.from(this.links.values()).filter((l) => l.toId === id).map((l) => JSON.parse(JSON.stringify(l)));
  }
  async setPermission(perm) {
    this.permissions.set(perm.recordId, JSON.parse(JSON.stringify(perm)));
  }
  async getPermission(recordId) {
    let p = this.permissions.get(recordId);
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }
  async deletePermission(recordId) {
    return this.permissions.delete(recordId);
  }
  async loadSnapshot() {
    return { schemaVersion: 1, takenAt: (/* @__PURE__ */ new Date()).toISOString(), working: [], episodic: Array.from(this.episodic.values()).map((e) => JSON.parse(JSON.stringify(e))), semantic: Array.from(this.semantic.values()).map((f) => JSON.parse(JSON.stringify(f))), procedural: [], longterm: Array.from(this.longterm.values()).map((r) => JSON.parse(JSON.stringify(r))), links: Array.from(this.links.values()).map((l) => JSON.parse(JSON.stringify(l))), permissions: Array.from(this.permissions.values()).map((p) => JSON.parse(JSON.stringify(p))) };
  }
  async saveSnapshot(snapshot) {
    this.episodic.clear(), this.semantic.clear(), this.longterm.clear(), this.links.clear(), this.permissions.clear();
    for (let e of snapshot.episodic) this.episodic.set(e.id, JSON.parse(JSON.stringify(e)));
    for (let f of snapshot.semantic) this.semantic.set(f.id, JSON.parse(JSON.stringify(f)));
    for (let r of snapshot.longterm) this.longterm.set(r.id, JSON.parse(JSON.stringify(r)));
    for (let l of snapshot.links) this.links.set(this.linkKey(l), JSON.parse(JSON.stringify(l)));
    for (let p of snapshot.permissions) this.permissions.set(p.recordId, JSON.parse(JSON.stringify(p)));
  }
};
var DEFAULT_AGING_POLICY = { workingTtlMs: 3e5, episodicMaxCount: 1e4, episodicPruneThreshold: 0.3, longtermCompressAfterDays: 90 };
function mergeAgingPolicy(p) {
  return { ...DEFAULT_AGING_POLICY, ...p ?? {} };
}
function ageScore(createdAt, now = Date.now()) {
  let ageDays = Math.max(0, (now - createdAt) / 864e5);
  return 1 - Math.exp(-ageDays / 90);
}
function effectiveImportance(record, now = Date.now()) {
  let age = ageScore(record.createdAt, now), accessBoost = Math.min(0.3, Math.log10(record.accessCount + 1) * 0.1);
  return Math.max(0, Math.min(1, record.importance * (1 - age * 0.5) + accessBoost));
}
function shouldPruneEpisodic(event, policy, now = Date.now()) {
  let age = ageScore(event.timestamp, now);
  return (event.importance ?? 0) < policy.episodicPruneThreshold && age > 0.6;
}
function shouldCompressLongTerm(record, policy, now = Date.now()) {
  return (now - record.createdAt) / 864e5 > policy.longtermCompressAfterDays && record.accessCount < 2;
}
var DEFAULT_WEIGHTS2 = { tfidf: 0.4, importance: 0.3, recency: 0.2, access: 0.1 };
function rankLongTerm(tfidfScores, records, weights = DEFAULT_WEIGHTS2, now = Date.now()) {
  let maxTfidf = Math.max(1, ...tfidfScores.values()), maxAccess = Math.max(1, ...records.map((r) => r.accessCount)), out = [];
  for (let r of records) {
    let tfidf = (tfidfScores.get(r.id) ?? 0) / maxTfidf, importance = r.importance, recency = 1 - ageScore(r.lastAccessedAt, now), access = r.accessCount / maxAccess, score = weights.tfidf * tfidf + weights.importance * importance + weights.recency * recency + weights.access * access, matchedBy = [];
    tfidf > 0 && matchedBy.push("tfidf"), importance > 0.5 && matchedBy.push("importance"), recency > 0.5 && matchedBy.push("recency"), out.push({ record: r, score, matchedBy });
  }
  return out.sort((a, b) => b.score - a.score);
}
function rankEpisodic(query, events, weights = { text: 0.5, importance: 0.2, recency: 0.3 }, now = Date.now()) {
  let tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 0), out = [];
  for (let e of events) {
    let text = e.event.toLowerCase(), textScore = 0;
    for (let t of tokens) text.includes(t) && (textScore += 1);
    textScore = tokens.length > 0 ? textScore / tokens.length : 0;
    let importance = e.importance ?? 0.5, recency = 1 - ageScore(e.timestamp, now), score = weights.text * textScore + weights.importance * importance + weights.recency * recency, matchedBy = [];
    textScore > 0 && matchedBy.push("text"), importance > 0.5 && matchedBy.push("importance"), recency > 0.5 && matchedBy.push("recency"), out.push({ record: e, score, matchedBy });
  }
  return out.sort((a, b) => b.score - a.score);
}
function compress(payload) {
  if (payload === void 0) throw new MemoryError("compress: payload is undefined");
  let json = JSON.stringify(payload), originalBuf = Buffer.from(json, "utf8"), compressed = gzipSync(originalBuf);
  return { algorithm: "gzip+json", data: compressed.toString("base64"), originalLength: originalBuf.length, compressedLength: compressed.length };
}
function decompress(c) {
  if (!c || c.algorithm !== "gzip+json") throw new MemoryError("decompress: unsupported algorithm");
  let buf = Buffer.from(c.data, "base64"), json = gunzipSync(buf).toString("utf8");
  return JSON.parse(json);
}
function ratio(c) {
  return c.originalLength === 0 ? 1 : c.compressedLength / c.originalLength;
}
function computeDelta(local, remote) {
  if (!local || !remote) throw new SyncError3("snapshots are required");
  if (local.schemaVersion !== remote.schemaVersion) throw new SyncError3(`schema version mismatch: ${local.schemaVersion} vs ${remote.schemaVersion}`);
  let localEpi = new Map(local.episodic.map((e) => [e.id, e])), remoteEpi = new Map(remote.episodic.map((e) => [e.id, e])), localSem = new Map(local.semantic.map((s) => [s.id, s])), remoteSem = new Map(remote.semantic.map((s) => [s.id, s])), localLt = new Map(local.longterm.map((r) => [r.id, r])), remoteLt = new Map(remote.longterm.map((r) => [r.id, r])), delta = { addedEpisodic: [], updatedEpisodic: [], addedSemantic: [], addedLongTerm: [], updatedLongTerm: [], addedLinks: 0, conflicts: [] };
  for (let [id, e] of remoteEpi) if (!localEpi.has(id)) delta.addedEpisodic.push(id);
  else {
    let local2 = localEpi.get(id);
    e.timestamp > local2.timestamp ? delta.updatedEpisodic.push(id) : e.timestamp < local2.timestamp && delta.conflicts.push({ id, localTimestamp: local2.timestamp, remoteTimestamp: e.timestamp });
  }
  for (let [id] of remoteSem) localSem.has(id) || delta.addedSemantic.push(id);
  for (let [id, r] of remoteLt) localLt.has(id) ? r.lastAccessedAt > localLt.get(id).lastAccessedAt && delta.updatedLongTerm.push(id) : delta.addedLongTerm.push(id);
  let localLinks = new Set(local.links.map((l) => `${l.fromId}|${l.toId}|${l.relation}`));
  for (let l of remote.links) localLinks.has(`${l.fromId}|${l.toId}|${l.relation}`) || delta.addedLinks++;
  return delta;
}
function applyDelta(local, remote, delta) {
  let remoteEpi = new Map(remote.episodic.map((e) => [e.id, e])), remoteSem = new Map(remote.semantic.map((s) => [s.id, s])), remoteLt = new Map(remote.longterm.map((r) => [r.id, r]));
  for (let id of [...delta.addedEpisodic, ...delta.updatedEpisodic]) {
    let e = remoteEpi.get(id);
    if (e) {
      let idx = local.episodic.findIndex((x) => x.id === id);
      idx >= 0 ? local.episodic[idx] = e : local.episodic.push(e);
    }
  }
  for (let id of delta.addedSemantic) {
    let s = remoteSem.get(id);
    s && local.semantic.push(s);
  }
  for (let id of [...delta.addedLongTerm, ...delta.updatedLongTerm]) {
    let r = remoteLt.get(id);
    if (r) {
      let idx = local.longterm.findIndex((x) => x.id === id);
      idx >= 0 ? local.longterm[idx] = r : local.longterm.push(r);
    }
  }
  let localLinkKeys = new Set(local.links.map((l) => `${l.fromId}|${l.toId}|${l.relation}`));
  for (let l of remote.links) {
    let k = `${l.fromId}|${l.toId}|${l.relation}`;
    localLinkKeys.has(k) || local.links.push(l);
  }
  return local;
}
function detectConflicts(local, pkg) {
  if (!local || !pkg) throw new SyncError3("local snapshot and package are required");
  let conflicts = [], localEpi = new Map(local.episodic.map((e) => [e.id, e]));
  for (let remote of pkg.episodic) {
    let existing = localEpi.get(remote.id);
    existing && existing.timestamp !== remote.timestamp && conflicts.push({ id: remote.id, memoryType: "episodic", localTimestamp: existing.timestamp, remoteTimestamp: remote.timestamp, resolution: existing.timestamp >= remote.timestamp ? "local" : "remote" });
  }
  let localSem = new Map(local.semantic.map((s) => [s.id, s]));
  for (let remote of pkg.semantic) {
    let existing = localSem.get(remote.id);
    existing && existing.learnedAt !== remote.learnedAt && conflicts.push({ id: remote.id, memoryType: "semantic", localTimestamp: existing.learnedAt, remoteTimestamp: remote.learnedAt, resolution: existing.learnedAt >= remote.learnedAt ? "local" : "remote" });
  }
  let localLt = new Map(local.longterm.map((r) => [r.id, r]));
  for (let remote of pkg.longterm) {
    let existing = localLt.get(remote.id);
    existing && existing.lastAccessedAt !== remote.lastAccessedAt && conflicts.push({ id: remote.id, memoryType: "longterm", localTimestamp: existing.lastAccessedAt, remoteTimestamp: remote.lastAccessedAt, resolution: existing.lastAccessedAt >= remote.lastAccessedAt ? "local" : "remote" });
  }
  return conflicts;
}
function resolveConflicts(conflicts, strategy) {
  let resolutions = /* @__PURE__ */ new Map();
  for (let c of conflicts) switch (strategy) {
    case "last-write-wins":
      resolutions.set(c.id, c.remoteTimestamp > c.localTimestamp ? "remote" : "local");
      break;
    case "local-wins":
      resolutions.set(c.id, "local");
      break;
    case "remote-wins":
      resolutions.set(c.id, "remote");
      break;
    case "manual":
      resolutions.set(c.id, "skip");
      break;
  }
  return resolutions;
}
function validateCollaborationPackage(pkg) {
  if (!pkg || typeof pkg != "object") return false;
  let p = pkg;
  return !(p.version !== 1 || typeof p.sourceInstanceId != "string" || !p.sourceInstanceId || typeof p.createdAt != "string" || !Array.isArray(p.episodic) || !Array.isArray(p.semantic) || !Array.isArray(p.longterm) || !Array.isArray(p.links));
}
function createBackup(snapshot) {
  if (!snapshot) throw new BackupError("snapshot is required");
  let canon = JSON.stringify(snapshot), hash = createHash5("sha256").update(canon).digest("hex");
  return { schemaVersion: 1, takenAt: (/* @__PURE__ */ new Date()).toISOString(), snapshot, hash };
}
function verifyBackup(backup) {
  if (!backup || !backup.snapshot) return false;
  let canon = JSON.stringify(backup.snapshot);
  return createHash5("sha256").update(canon).digest("hex") === backup.hash;
}
function restoreBackup(backup) {
  if (!verifyBackup(backup)) throw new BackupError("backup integrity check failed");
  return JSON.parse(JSON.stringify(backup.snapshot));
}
function serializeBackup(backup) {
  return JSON.stringify(backup, null, 2);
}
function parseBackup(json) {
  try {
    let b = JSON.parse(json);
    if (!b.snapshot || !b.hash) throw new BackupError("invalid backup structure");
    return b;
  } catch (err) {
    throw new BackupError("failed to parse backup", err);
  }
}
function exportSnapshot(snapshot) {
  if (!snapshot) throw new MemoryError("snapshot is required");
  return JSON.stringify(snapshot, null, 2);
}
function importSnapshot(json) {
  try {
    let s = JSON.parse(json);
    if (!s.schemaVersion || !Array.isArray(s.episodic)) throw new MemoryError("invalid snapshot structure");
    return s;
  } catch (err) {
    throw err instanceof MemoryError ? err : new MemoryError("failed to parse snapshot", void 0, err);
  }
}
function exportEpisodic(snapshot) {
  return JSON.stringify({ schemaVersion: 1, type: "episodic", events: snapshot.episodic }, null, 2);
}
function exportSemantic(snapshot) {
  return JSON.stringify({ schemaVersion: 1, type: "semantic", facts: snapshot.semantic }, null, 2);
}
function mergeImport(base, json) {
  let partial = JSON.parse(json);
  if (partial.type === "episodic" && Array.isArray(partial.events)) {
    let existingIds = new Set(base.episodic.map((e) => e.id));
    for (let e of partial.events) {
      let ev = e;
      existingIds.has(ev.id) || base.episodic.push(ev);
    }
  } else if (partial.type === "semantic" && Array.isArray(partial.facts)) {
    let existingIds = new Set(base.semantic.map((s) => s.id));
    for (let s of partial.facts) {
      let fact = s;
      existingIds.has(fact.id) || base.semantic.push(fact);
    }
  } else throw new MemoryError("unrecognized import format");
  return base;
}
var MemorySystem = class {
  working;
  episodic;
  semantic;
  procedural;
  longterm;
  index;
  links;
  permissions;
  config;
  logger;
  _persistenceBackend;
  instanceId;
  constructor(config) {
    this.config = mergeConfig4(config), this._persistenceBackend = config?.store, this.logger = this.config.logger ?? (this.config.logLevel === "silent" ? new SilentLogger6() : new ConsoleLogger4(this.config.logLevel)), this.instanceId = `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, this.working = new WorkingMemory(this.config.aging.workingTtlMs), this.episodic = new EpisodicMemory(this.config.aging.episodicMaxCount), this.semantic = new SemanticMemory(), this.procedural = new ProceduralMemory(), this.longterm = new LongTermMemory(), this.index = new InvertedIndex(), this.links = new LinkGraph(), this.permissions = new PermissionModel();
  }
  get persistenceStore() {
    return this._persistenceBackend;
  }
  remember(agent, event, context, opts) {
    let id = this.episodic.record(agent, event, context, opts), text = `${event} ${context ? JSON.stringify(context) : ""}`;
    return this.index.add(id, text), this.logger.debug("remember: recorded", { id, agent, event: event.slice(0, 60) }), id;
  }
  recall(query, limit = 10) {
    let events = this.episodic.all(), w = this.config.rankingWeights, episodicWeights = { text: w.tfidf, importance: w.importance, recency: w.recency };
    return rankEpisodic(query, events, episodicWeights).slice(0, limit);
  }
  learn(entity, attribute, value, confidence, source) {
    let id = this.semantic.learn(entity, attribute, value, confidence, source);
    return this.index.add(id, `${entity} ${attribute} ${JSON.stringify(value)}`), id;
  }
  store(payload, opts) {
    let id = this.longterm.store(payload, opts);
    return this.index.add(id, typeof payload == "string" ? payload : JSON.stringify(payload)), id;
  }
  retrieve(id) {
    return this.longterm.retrieve(id);
  }
  search(query, limit = 10) {
    let results = this.index.search(query), tfidf = /* @__PURE__ */ new Map();
    for (let r of results) tfidf.set(r.recordId, r.score);
    let records = [];
    for (let r of results) {
      let rec = this.longterm.peek(r.recordId);
      rec && records.push(rec);
    }
    return rankLongTerm(tfidf, records, this.config.rankingWeights).slice(0, limit);
  }
  link(fromId, toId, relation, weight) {
    return this.links.add(fromId, toId, relation, weight);
  }
  related(id, relation, maxDepth) {
    if (relation) return this.links.traverse(id, relation, maxDepth ?? 5);
    let out = /* @__PURE__ */ new Set();
    for (let l of this.links.outgoingFrom(id)) out.add(l.toId);
    for (let l of this.links.incomingTo(id)) out.add(l.fromId);
    return Array.from(out);
  }
  age(now = Date.now()) {
    let policy = mergeAgingPolicy(this.config.aging), before = this.episodic.count(), all = this.episodic.all(), toKeep = all.filter((e) => !shouldPruneEpisodic(e, policy, now));
    if (toKeep.length < all.length) {
      let recent = all.slice(-100), seen = new Set(recent.map((e) => e.id));
      for (let e of toKeep) seen.add(e.id);
      let oldestKept = Math.min(...toKeep.map((e) => e.timestamp), ...recent.map((e) => e.timestamp));
      this.episodic.pruneOlderThan(oldestKept);
    }
    let prunedEpisodic = before - this.episodic.count(), agedLongTerm = this.longterm.applyAging(now);
    return this.logger.debug("age: complete", { prunedEpisodic, agedLongTerm }), { prunedEpisodic, agedLongTerm };
  }
  snapshot() {
    return { schemaVersion: 1, takenAt: (/* @__PURE__ */ new Date()).toISOString(), working: this.working.entries(), episodic: this.episodic.all(), semantic: this.semantic.all(), procedural: this.procedural.list().map((name) => ({ ...this.procedural.get(name), handler: void 0, handlerSerialized: false })), longterm: this.longterm.all(), links: this.links.all(), permissions: this.permissions.all() };
  }
  restore(snapshot) {
    if (!snapshot || snapshot.schemaVersion !== 1) throw new MemoryError("invalid snapshot");
    this.working.clear(), this.episodic.pruneOlderThan(Date.now() + 1);
    for (let e of snapshot.episodic) this.episodic.record(e.agent, e.event, e.context, { importance: e.importance, tags: e.tags, source: e.source, id: e.id, timestamp: e.timestamp });
    for (let s of snapshot.semantic) this.semantic.learn(s.entity, s.attribute, s.value, s.confidence, s.source);
    for (let r of snapshot.longterm) this.longterm.store(r.payload, { type: r.type, importance: r.importance, tags: r.tags, source: r.source, id: r.id });
    for (let l of snapshot.links) this.links.add(l.fromId, l.toId, l.relation, l.weight);
    for (let p of snapshot.permissions) this.permissions.set(p);
  }
  backup() {
    return createBackup(this.snapshot());
  }
  restoreFromBackup(backup) {
    if (!verifyBackup(backup)) throw new MemoryError("backup verification failed");
    this.restore(restoreBackup(backup));
  }
  synchronize(remoteSnapshot) {
    let local = this.snapshot(), delta = computeDelta(local, remoteSnapshot), merged = applyDelta(local, remoteSnapshot, delta);
    return this.restore(merged), delta;
  }
  createCollaborationPackage(opts) {
    let includeEpi = opts?.includeEpisodic ?? true, includeSem = opts?.includeSemantic ?? true, includeLt = opts?.includeLongterm ?? true, episodic = includeEpi ? this.episodic.all().filter((e) => e.shareable !== false).filter((e) => opts?.filterEpisodic ? opts.filterEpisodic(e) : true) : [], semantic = includeSem ? this.semantic.all().filter((s) => opts?.filterSemantic ? opts.filterSemantic(s) : true) : [], longterm = includeLt ? this.longterm.all().filter((r) => opts?.filterLongterm ? opts.filterLongterm(r) : true) : [], includedIds = /* @__PURE__ */ new Set([...episodic.map((e) => e.id), ...semantic.map((s) => s.id), ...longterm.map((r) => r.id)]), links = this.links.all().filter((l) => includedIds.has(l.fromId) && includedIds.has(l.toId));
    return { version: 1, sourceInstanceId: this.instanceId, createdAt: (/* @__PURE__ */ new Date()).toISOString(), expiresAt: opts?.expiresAt, episodic, semantic, longterm, links, metadata: opts?.metadata };
  }
  applyCollaborationPackage(pkg, opts) {
    if (!validateCollaborationPackage(pkg)) throw new MemoryError("invalid collaboration package");
    if (pkg.expiresAt && new Date(pkg.expiresAt) < /* @__PURE__ */ new Date()) return this.logger.warn("applyCollaborationPackage: package expired", { expiresAt: pkg.expiresAt }), { applied: false, conflicts: [], resolutions: /* @__PURE__ */ new Map() };
    let local = this.snapshot(), conflicts = detectConflicts(local, pkg), strategy = opts?.conflictStrategy ?? "last-write-wins", resolutions = opts?.customResolver ? opts.customResolver(conflicts) : resolveConflicts(conflicts, strategy), skipIds = new Set([...resolutions.entries()].filter(([, v]) => v === "local" || v === "skip").map(([k]) => k));
    for (let e of pkg.episodic) {
      if (skipIds.has(e.id)) continue;
      this.episodic.all().find((x) => x.id === e.id) ? this.episodic.record(e.agent, e.event, e.context, { importance: e.importance, tags: e.tags, source: e.source, id: e.id, timestamp: e.timestamp }) : (this.episodic.record(e.agent, e.event, e.context, { importance: e.importance, tags: e.tags, source: e.source, id: e.id, timestamp: e.timestamp }), this.index.add(e.id, `${e.event} ${e.context ? JSON.stringify(e.context) : ""}`));
    }
    for (let s of pkg.semantic) skipIds.has(s.id) || this.semantic.learn(s.entity, s.attribute, s.value, s.confidence, s.source);
    for (let r of pkg.longterm) skipIds.has(r.id) || this.longterm.store(r.payload, { type: r.type, importance: r.importance, tags: r.tags, source: r.source, id: r.id });
    for (let l of pkg.links) skipIds.has(l.fromId) || skipIds.has(l.toId) || this.links.add(l.fromId, l.toId, l.relation, l.weight);
    return this.logger.debug("applyCollaborationPackage: applied", { sourceInstanceId: pkg.sourceInstanceId, conflicts: conflicts.length, strategy }), { applied: true, conflicts, resolutions };
  }
  setShareable(eventId, shareable) {
    let event = this.episodic.all().find((e) => e.id === eventId);
    if (!event) throw new MemoryError(`event '${eventId}' not found`);
    event.shareable = shareable;
  }
  export() {
    return exportSnapshot(this.snapshot());
  }
  import(json) {
    this.restore(importSnapshot(json));
  }
  async persist() {
    if (!this._persistenceBackend) throw new MemoryError("No persistence store configured");
    let snap = this.snapshot();
    await this._persistenceBackend.saveSnapshot(snap), this.logger.debug("persist: snapshot saved to store");
  }
  async hydrate() {
    if (!this._persistenceBackend) throw new MemoryError("No persistence store configured");
    let snap = await this._persistenceBackend.loadSnapshot();
    this.restore(snap), this.logger.debug("hydrate: snapshot loaded from store");
  }
  dispose() {
    this.working.dispose();
  }
};

// packages/constitution/dist/esm/index.mjs
var ConstitutionError = class extends Error {
  code;
  cause;
  constructor(message, code, cause) {
    super(message), this.name = new.target.name, this.code = code ?? "CONSTITUTION_ERROR", cause !== void 0 && (this.cause = cause), Object.setPrototypeOf(this, new.target.prototype);
  }
};
var RuleError = class extends ConstitutionError {
  constructor(message, cause) {
    super(message, "RULE_ERROR", cause);
  }
};
var PolicyError = class extends ConstitutionError {
  constructor(message, cause) {
    super(message, "POLICY_ERROR", cause);
  }
};
var PermissionError2 = class extends ConstitutionError {
  constructor(message, cause) {
    super(message, "PERMISSION_ERROR", cause);
  }
};
var HierarchyError = class extends ConstitutionError {
  constructor(message, cause) {
    super(message, "HIERARCHY_ERROR", cause);
  }
};
var EmergencyError = class extends ConstitutionError {
  constructor(message, cause) {
    super(message, "EMERGENCY_ERROR", cause);
  }
};
var SafetyError = class extends ConstitutionError {
  constructor(message, cause) {
    super(message, "SAFETY_ERROR", cause);
  }
};
var ConflictError = class extends ConstitutionError {
  constructor(message, cause) {
    super(message, "CONFLICT_ERROR", cause);
  }
};
var EnforcementError = class extends ConstitutionError {
  constructor(message, cause) {
    super(message, "ENFORCEMENT_ERROR", cause);
  }
};
var DocumentError = class extends ConstitutionError {
  constructor(message, cause) {
    super(message, "DOCUMENT_ERROR", cause);
  }
};
var RULE_CATEGORIES = ["harm", "deception", "privacy", "fairness", "autonomy", "transparency"];
function extractActionVerb(description) {
  let lower = description.toLowerCase(), match = lower.replace(/^(do|must|shall|should)\s+not\s+/, "").replace(/^(must|shall|should)\s+/, "").match(/[a-z]+/);
  return match ? match[0] : lower;
}
function evaluateRule(rule, context) {
  if (!rule || typeof rule != "object") throw new RuleError("rule must be a non-null object");
  if (!context || typeof context != "object") throw new RuleError("context must be a non-null object");
  if (typeof rule.id != "string" || rule.id.length === 0) throw new RuleError("rule.id must be a non-empty string");
  let verb = extractActionVerb(rule.description), actionStr = (context.action ?? "").toLowerCase(), reasonStr = typeof context.metadata?.reason == "string" ? String(context.metadata.reason).toLowerCase() : "", matches = `${actionStr} ${reasonStr}`.includes(verb);
  return rule.forbidden ? matches ? { violated: true, reason: `prohibition "${rule.id}" triggered: action matches "${verb}"`, ruleId: rule.id, severity: rule.severity } : { violated: false, ruleId: rule.id, severity: rule.severity } : matches ? { violated: false, ruleId: rule.id, severity: rule.severity } : { violated: true, reason: `requirement "${rule.id}" not satisfied: action missing "${verb}"`, ruleId: rule.id, severity: rule.severity };
}
function evaluateRuleSet(rules, context) {
  if (!rules || !Array.isArray(rules.rules)) throw new RuleError("rules.rules must be an array");
  let out = [];
  for (let r of rules.rules) {
    let ev = evaluateRule(r, context);
    ev.violated && out.push(ev);
  }
  return out;
}
function validateRule(rule) {
  if (!rule || typeof rule != "object") throw new RuleError("rule must be an object");
  if (typeof rule.id != "string" || rule.id.length === 0) throw new RuleError("rule.id must be a non-empty string");
  if (typeof rule.name != "string" || rule.name.length === 0) throw new RuleError("rule.name must be a non-empty string");
  if (typeof rule.description != "string" || rule.description.length === 0) throw new RuleError("rule.description must be a non-empty string");
  if (!RULE_CATEGORIES.includes(rule.category)) throw new RuleError(`rule.category must be one of: ${RULE_CATEGORIES.join(", ")}`);
  if (typeof rule.forbidden != "boolean") throw new RuleError("rule.forbidden must be a boolean");
  let validSev = ["info", "low", "medium", "high", "critical"];
  if (!validSev.includes(rule.severity)) throw new RuleError(`rule.severity must be one of: ${validSev.join(", ")}`);
}
var KEYWORDS = { and: "AND", or: "OR", not: "NOT", in: "IN", true: "TRUE", false: "FALSE", null: "NULL" };
function tokenize(src) {
  let out = [], i = 0, n = src.length;
  for (; i < n; ) {
    let ch = src[i];
    if (ch === " " || ch === "	" || ch === `
` || ch === "\r") {
      i++;
      continue;
    }
    if (ch === "=" && src[i + 1] === "=") {
      out.push({ type: "EQ", value: "==", pos: i }), i += 2;
      continue;
    }
    if (ch === "!" && src[i + 1] === "=") {
      out.push({ type: "NEQ", value: "!=", pos: i }), i += 2;
      continue;
    }
    if (ch === "(") {
      out.push({ type: "LPAREN", value: "(", pos: i }), i++;
      continue;
    }
    if (ch === ")") {
      out.push({ type: "RPAREN", value: ")", pos: i }), i++;
      continue;
    }
    if (ch === "[") {
      out.push({ type: "LBRACKET", value: "[", pos: i }), i++;
      continue;
    }
    if (ch === "]") {
      out.push({ type: "RBRACKET", value: "]", pos: i }), i++;
      continue;
    }
    if (ch === ",") {
      out.push({ type: "COMMA", value: ",", pos: i }), i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      let quote = ch, start = i;
      i++;
      let buf = "";
      for (; i < n && src[i] !== quote; ) src[i] === "\\" && i + 1 < n ? (buf += src[i + 1], i += 2) : (buf += src[i], i++);
      if (i >= n) throw new PolicyError(`unterminated string literal at position ${start}`);
      i++, out.push({ type: "STRING", value: buf, pos: start });
      continue;
    }
    if (ch >= "0" && ch <= "9") {
      let start = i, num = "";
      for (; i < n && (src[i] >= "0" && src[i] <= "9" || src[i] === "."); ) num += src[i], i++;
      out.push({ type: "NUMBER", value: num, pos: start });
      continue;
    }
    if (isIdentStart(ch)) {
      let start = i, ident = "";
      for (; i < n && isIdentPart(src[i]); ) ident += src[i], i++;
      for (; i < n && src[i] === "." && i + 1 < n && isIdentStart(src[i + 1]); ) for (ident += ".", i++; i < n && isIdentPart(src[i]); ) ident += src[i], i++;
      let lower = ident.toLowerCase();
      KEYWORDS[lower] && !ident.includes(".") ? out.push({ type: KEYWORDS[lower], value: ident, pos: start }) : out.push({ type: "IDENT", value: ident, pos: start });
      continue;
    }
    throw new PolicyError(`unexpected character '${ch}' at position ${i}`);
  }
  return out.push({ type: "EOF", value: "", pos: i }), out;
}
function isIdentStart(ch) {
  return ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z" || ch === "_";
}
function isIdentPart(ch) {
  return isIdentStart(ch) || ch >= "0" && ch <= "9";
}
var Parser = class {
  constructor(tokens) {
    this.tokens = tokens;
  }
  tokens;
  pos = 0;
  peek() {
    return this.tokens[this.pos];
  }
  next() {
    return this.tokens[this.pos++];
  }
  expect(type) {
    let t = this.next();
    if (t.type !== type) throw new PolicyError(`expected ${type} but got ${t.type} ('${t.value}') at position ${t.pos}`);
    return t;
  }
  parse() {
    let node = this.parseOr();
    if (this.peek().type !== "EOF") {
      let t = this.peek();
      throw new PolicyError(`unexpected token '${t.value}' at position ${t.pos}`);
    }
    return node;
  }
  parseOr() {
    let left = this.parseAnd();
    for (; this.peek().type === "OR"; ) {
      this.next();
      let right = this.parseAnd();
      left = { kind: "or", left, right };
    }
    return left;
  }
  parseAnd() {
    let left = this.parseNot();
    for (; this.peek().type === "AND"; ) {
      this.next();
      let right = this.parseNot();
      left = { kind: "and", left, right };
    }
    return left;
  }
  parseNot() {
    return this.peek().type === "NOT" ? (this.next(), { kind: "not", operand: this.parseNot() }) : this.parsePrimary();
  }
  parsePrimary() {
    if (this.peek().type === "LPAREN") {
      this.next();
      let node = this.parseOr();
      return this.expect("RPAREN"), node;
    }
    return this.parseComparison();
  }
  parseComparison() {
    let left = this.parseOperand(), opTok = this.peek();
    if (opTok.type === "EQ" || opTok.type === "NEQ" || opTok.type === "IN") {
      this.next();
      let right = this.parseOperand();
      return { kind: "cmp", op: opTok.type === "EQ" ? "==" : opTok.type === "NEQ" ? "!=" : "in", left, right };
    }
    if (left.kind === "field") return { kind: "cmp", op: "==", left, right: { kind: "literal", value: true } };
    throw new PolicyError(`expected operator after operand at position ${opTok.pos}`);
  }
  parseOperand() {
    let t = this.next();
    switch (t.type) {
      case "IDENT":
        return this.parseField(t.value);
      case "STRING":
        return { kind: "literal", value: t.value };
      case "NUMBER":
        return { kind: "literal", value: parseNumber(t.value) };
      case "TRUE":
        return { kind: "literal", value: true };
      case "FALSE":
        return { kind: "literal", value: false };
      case "NULL":
        return { kind: "literal", value: null };
      case "LBRACKET":
        return this.parseList();
      default:
        throw new PolicyError(`unexpected token '${t.value}' at position ${t.pos}`);
    }
  }
  parseField(value) {
    let path4 = value.split(".");
    if (path4[0] === "context" && path4.shift(), path4.length === 0) throw new PolicyError(`invalid field reference '${value}'`);
    return { kind: "field", path: path4 };
  }
  parseList() {
    let items = [];
    if (this.peek().type === "RBRACKET") return this.next(), { kind: "list", items };
    for (; ; ) {
      let t = this.next();
      switch (t.type) {
        case "STRING":
          items.push(t.value);
          break;
        case "NUMBER":
          items.push(parseNumber(t.value));
          break;
        case "TRUE":
          items.push(true);
          break;
        case "FALSE":
          items.push(false);
          break;
        case "NULL":
          items.push(null);
          break;
        default:
          throw new PolicyError(`invalid list element '${t.value}' at position ${t.pos}`);
      }
      if (this.peek().type === "COMMA") {
        this.next();
        continue;
      }
      break;
    }
    return this.expect("RBRACKET"), { kind: "list", items };
  }
};
function parseNumber(s) {
  let n = Number(s);
  if (Number.isNaN(n)) throw new PolicyError(`invalid number literal '${s}'`);
  return n;
}
function lookupField(path4, context) {
  let root = path4[0], TOP_LEVEL = /* @__PURE__ */ new Set(["subject", "action", "resource", "timestamp"]), cur;
  if (TOP_LEVEL.has(root)) {
    let topVal = context[root];
    topVal !== void 0 ? cur = topVal : context.metadata && typeof context.metadata == "object" ? cur = context.metadata[root] : cur = void 0;
  } else context.metadata && typeof context.metadata == "object" ? cur = context.metadata[root] : cur = void 0;
  for (let i = 1; i < path4.length; i++) {
    if (cur == null || typeof cur != "object") return;
    cur = cur[path4[i]];
  }
  return cur;
}
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a != typeof b) return typeof a == "number" && typeof b == "number" ? a === b : false;
  if (a === null || b === null || typeof a != "object") return a === b;
  if (Array.isArray(a) && Array.isArray(b)) return a.length !== b.length ? false : a.every((v, i) => deepEqual(v, b[i]));
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  let ak = Object.keys(a), bk = Object.keys(b);
  return ak.length !== bk.length ? false : ak.every((k) => deepEqual(a[k], b[k]));
}
function evaluate(node, context) {
  switch (node.kind) {
    case "and":
      return evaluate(node.left, context) && evaluate(node.right, context);
    case "or":
      return evaluate(node.left, context) || evaluate(node.right, context);
    case "not":
      return !evaluate(node.operand, context);
    case "cmp": {
      let left = evaluate(node.left, context), right = evaluate(node.right, context);
      switch (node.op) {
        case "==":
          return deepEqual(left, right);
        case "!=":
          return !deepEqual(left, right);
        case "in": {
          if (!Array.isArray(right)) throw new PolicyError("`in` operator requires a list on the right-hand side");
          return right.some((v) => deepEqual(left, v));
        }
        default:
          throw new PolicyError(`unknown operator ${node.op}`);
      }
    }
    case "field":
      return lookupField(node.path, context);
    case "literal":
      return node.value;
    case "list":
      return node.items;
    default:
      throw new PolicyError(`unknown AST node kind ${node.kind}`);
  }
}
var parseCache = /* @__PURE__ */ new Map();
function parseCondition(condition) {
  if (typeof condition != "string" || condition.length === 0) throw new PolicyError("condition must be a non-empty string");
  let cached = parseCache.get(condition);
  if (cached) return cached;
  let tokens = tokenize(condition), ast = new Parser(tokens).parse();
  return parseCache.set(condition, ast), ast;
}
function clearConditionCache() {
  parseCache.clear();
}
function evaluateCondition(condition, context) {
  let ast = parseCondition(condition);
  return !!evaluate(ast, context);
}
function evaluatePolicy(policy, context) {
  if (!policy || typeof policy != "object") throw new PolicyError("policy must be a non-null object");
  if (typeof policy.id != "string" || policy.id.length === 0) throw new PolicyError("policy.id must be a non-empty string");
  let matched = evaluateCondition(policy.condition, context);
  return { matched, action: policy.action, reason: matched ? `condition "${policy.condition}" matched` : `condition "${policy.condition}" did not match`, policyId: policy.id };
}
function evaluatePolicySet(policies, context) {
  if (!policies || !Array.isArray(policies.policies)) throw new PolicyError("policies.policies must be an array");
  let best;
  for (let p of policies.policies) {
    let ev = evaluatePolicy(p, context);
    if (ev.matched) {
      if (!best || p.priority > best.policy.priority) {
        best = { policy: p, eval_: ev };
        continue;
      }
      if (p.priority === best.policy.priority) {
        let rank = { allow: 0, require_approval: 1, deny: 2 };
        rank[p.action] > rank[best.policy.action] && (best = { policy: p, eval_: ev });
      }
    }
  }
  return best ? best.eval_ : { matched: false, action: "allow", reason: "no matching policy; defaulting to allow", policyId: "" };
}
var WILDCARD = "*";
function requireRole(model, name) {
  let r = model.roles.find((x) => x.name === name);
  if (!r) throw new PermissionError2(`unknown role: ${name}`);
  return r;
}
function expandRoles(model, start) {
  let visited = /* @__PURE__ */ new Set(), onStack = /* @__PURE__ */ new Set(), visit = (name) => {
    if (visited.has(name)) return;
    if (onStack.has(name)) throw new PermissionError2(`inheritance cycle detected at role ${name}`);
    onStack.add(name);
    let role = model.roles.find((r) => r.name === name);
    if (!role) throw new PermissionError2(`unknown role: ${name}`);
    if (role.inherits) for (let parent of role.inherits) {
      if (parent === name) throw new PermissionError2(`inheritance cycle detected at role ${name} (self-inheritance)`);
      visit(parent);
    }
    onStack.delete(name), visited.add(name);
  };
  return visit(start), visited;
}
function permissionsForRole(model, role) {
  let roles = expandRoles(model, role), out = /* @__PURE__ */ new Set();
  for (let name of roles) {
    let r = model.roles.find((x) => x.name === name);
    if (r) for (let p of r.permissions) out.add(p);
  }
  return out;
}
function permissionMatches(granted, requested) {
  if (granted === requested || granted === WILDCARD) return true;
  let gParts = granted.split(":"), rParts = requested.split(":");
  return gParts.length === 2 && rParts.length === 2 && gParts[1] === WILDCARD && gParts[0] === rParts[0];
}
function rolesForSubject(model, subject) {
  return model.assignments.filter((a) => a.subject === subject).map((a) => a.role);
}
function can(model, subject, permission) {
  let roles = rolesForSubject(model, subject);
  for (let r of roles) {
    let perms;
    try {
      perms = permissionsForRole(model, r);
    } catch {
      continue;
    }
    for (let p of perms) if (permissionMatches(p, permission)) return true;
  }
  return false;
}
function whoCan(model, permission) {
  let out = /* @__PURE__ */ new Set(), subjects = new Set(model.assignments.map((a) => a.subject));
  for (let s of subjects) can(model, s, permission) && out.add(s);
  return Array.from(out).sort();
}
function grantRole(model, subject, role) {
  if (typeof subject != "string" || subject.length === 0) throw new PermissionError2("subject must be a non-empty string");
  if (requireRole(model, role), model.assignments.some((a) => a.subject === subject && a.role === role)) return model;
  let assignment = { subject, role };
  return { ...model, assignments: [...model.assignments, assignment] };
}
function revokeRole(model, subject, role) {
  return { ...model, assignments: model.assignments.filter((a) => !(a.subject === subject && a.role === role)) };
}
function validatePermissionModel(model) {
  if (!model || !Array.isArray(model.roles) || !Array.isArray(model.assignments)) throw new PermissionError2("model must have roles[] and assignments[]");
  let names = /* @__PURE__ */ new Set();
  for (let r of model.roles) {
    if (names.has(r.name)) throw new PermissionError2(`duplicate role name: ${r.name}`);
    if (names.add(r.name), typeof r.name != "string" || r.name.length === 0) throw new PermissionError2("role.name must be a non-empty string");
    if (!Array.isArray(r.permissions)) throw new PermissionError2(`role ${r.name}: permissions must be an array`);
    for (let p of r.permissions) if (typeof p != "string" || p !== "*" && !p.includes(":")) throw new PermissionError2(`role ${r.name}: invalid permission '${p}' (must be 'module:action' or '*')`);
  }
  for (let r of model.roles) {
    if (r.inherits) {
      for (let parent of r.inherits) if (!names.has(parent)) throw new PermissionError2(`role ${r.name} inherits unknown role ${parent}`);
    }
    expandRoles(model, r.name);
  }
  for (let a of model.assignments) {
    if (typeof a.subject != "string" || a.subject.length === 0) throw new PermissionError2("assignment.subject must be a non-empty string");
    if (!names.has(a.role)) throw new PermissionError2(`assignment references unknown role: ${a.role}`);
  }
}
function requireNode(hierarchy, id) {
  if (!hierarchy || !Array.isArray(hierarchy.nodes)) throw new HierarchyError("hierarchy.nodes must be an array");
  let node = hierarchy.nodes.find((n) => n.id === id);
  if (!node) throw new HierarchyError(`unknown node: ${id}`);
  return node;
}
function escalationPath(hierarchy, id) {
  let path4 = [], seen = /* @__PURE__ */ new Set(), cur = requireNode(hierarchy, id);
  for (; ; ) {
    if (seen.has(cur.id)) throw new HierarchyError(`cycle detected at node ${cur.id}`);
    if (seen.add(cur.id), path4.push(cur.id), !cur.parent) break;
    cur = requireNode(hierarchy, cur.parent);
  }
  return path4;
}
function findCommonAuthority(hierarchy, a, b) {
  let pathA = escalationPath(hierarchy, a).reverse(), pathB = escalationPath(hierarchy, b).reverse(), common, len = Math.min(pathA.length, pathB.length);
  for (let i = 0; i < len && pathA[i] === pathB[i]; i++) common = pathA[i];
  return common;
}
function canOverride(hierarchy, decider, original) {
  let d = requireNode(hierarchy, decider), o = requireNode(hierarchy, original);
  return d.authority > o.authority;
}
function ancestors(hierarchy, id) {
  return escalationPath(hierarchy, id).slice(1);
}
function roots(hierarchy) {
  if (!hierarchy || !Array.isArray(hierarchy.nodes)) throw new HierarchyError("hierarchy.nodes must be an array");
  return hierarchy.nodes.filter((n) => !n.parent);
}
function children(hierarchy, id) {
  if (!hierarchy || !Array.isArray(hierarchy.nodes)) throw new HierarchyError("hierarchy.nodes must be an array");
  return hierarchy.nodes.filter((n) => n.parent === id);
}
function validateHierarchy(hierarchy) {
  if (!hierarchy || !Array.isArray(hierarchy.nodes)) throw new HierarchyError("hierarchy.nodes must be an array");
  let ids = /* @__PURE__ */ new Set();
  for (let n of hierarchy.nodes) {
    if (typeof n.id != "string" || n.id.length === 0) throw new HierarchyError("node.id must be a non-empty string");
    if (ids.has(n.id)) throw new HierarchyError(`duplicate node id: ${n.id}`);
    if (ids.add(n.id), typeof n.authority != "number" || Number.isNaN(n.authority)) throw new HierarchyError(`node ${n.id}: authority must be a number`);
    n.parent !== void 0 && !ids.has(n.parent) && hierarchy.nodes.some((x) => x.id === n.parent);
  }
  for (let n of hierarchy.nodes) if (n.parent !== void 0 && !ids.has(n.parent)) throw new HierarchyError(`node ${n.id} references unknown parent ${n.parent}`);
  for (let n of hierarchy.nodes) escalationPath(hierarchy, n.id);
}
var STATE_RANK = { normal: 0, heightened: 1, emergency: 2, critical: 3 };
var STATE_ORDER = ["normal", "heightened", "emergency", "critical"];
var EmergencyController = class {
  state = "normal";
  procedure;
  declaredAt;
  listeners = [];
  getState() {
    return this.state;
  }
  getActiveProcedure() {
    return this.procedure;
  }
  getDeclaredAt() {
    return this.declaredAt;
  }
  declareEmergency(state, procedure) {
    if (state === "normal") throw new EmergencyError("use liftEmergency() to return to normal");
    if (!procedure || typeof procedure != "object") throw new EmergencyError("procedure must be an object");
    if (procedure.state !== state) throw new EmergencyError(`procedure.state (${procedure.state}) does not match declared state (${state})`);
    let curRank = STATE_RANK[this.state];
    if (STATE_RANK[state] - curRank > 1) throw new EmergencyError(`cannot escalate from ${this.state} to ${state}; intermediate state required`);
    this.state = state, this.procedure = procedure, this.declaredAt = (/* @__PURE__ */ new Date()).toISOString(), this.emit();
  }
  liftEmergency() {
    this.state = "normal", this.procedure = void 0, this.declaredAt = void 0, this.emit();
  }
  isActionAllowed(action) {
    if (!this.procedure) return true;
    let allowed = this.procedure.allowedActions;
    if (allowed.includes("*")) return true;
    for (let entry of allowed) if (entry === action || entry.endsWith(":*") && action.startsWith(entry.slice(0, -1))) return true;
    return false;
  }
  isTimedOut(now) {
    return !this.procedure || !this.declaredAt || this.procedure.timeout <= 0 ? false : Date.parse(now) - Date.parse(this.declaredAt) >= this.procedure.timeout;
  }
  onStateChange(listener) {
    this.listeners.push(listener);
  }
  emit() {
    for (let l of this.listeners) try {
      l(this.state, this.procedure);
    } catch {
    }
  }
};
function validateProcedure(procedure) {
  if (!procedure || typeof procedure != "object") throw new EmergencyError("procedure must be an object");
  if (typeof procedure.id != "string" || procedure.id.length === 0) throw new EmergencyError("procedure.id must be a non-empty string");
  if (typeof procedure.name != "string" || procedure.name.length === 0) throw new EmergencyError("procedure.name must be a non-empty string");
  if (!STATE_ORDER.includes(procedure.state)) throw new EmergencyError(`procedure.state must be one of: ${STATE_ORDER.join(", ")}`);
  if (!Array.isArray(procedure.triggerConditions)) throw new EmergencyError("procedure.triggerConditions must be an array");
  if (!Array.isArray(procedure.allowedActions)) throw new EmergencyError("procedure.allowedActions must be an array");
  if (!Array.isArray(procedure.requiredApprovals)) throw new EmergencyError("procedure.requiredApprovals must be an array");
  if (typeof procedure.timeout != "number" || procedure.timeout < 0) throw new EmergencyError("procedure.timeout must be a non-negative number");
}
var ENFORCEMENT_POINTS = ["pre", "post", "both"];
function validateSafetyRule(rule) {
  if (!rule || typeof rule != "object") throw new SafetyError("rule must be an object");
  if (typeof rule.id != "string" || rule.id.length === 0) throw new SafetyError("rule.id must be a non-empty string");
  if (typeof rule.invariant != "string" || rule.invariant.length === 0) throw new SafetyError("rule.invariant must be a non-empty string");
  if (!ENFORCEMENT_POINTS.includes(rule.enforcementPoint)) throw new SafetyError(`rule.enforcementPoint must be one of: ${ENFORCEMENT_POINTS.join(", ")}`);
  let validSev = ["info", "low", "medium", "high", "critical"];
  if (!validSev.includes(rule.severity)) throw new SafetyError(`rule.severity must be one of: ${validSev.join(", ")}`);
}
var SafetyChecker = class {
  rules = /* @__PURE__ */ new Map();
  predicates = /* @__PURE__ */ new Map();
  order = [];
  register(rule, predicate) {
    if (validateSafetyRule(rule), this.rules.has(rule.id)) throw new SafetyError(`safety rule already registered: ${rule.id}`);
    return this.rules.set(rule.id, rule), this.predicates.set(rule.id, predicate), this.order.push(rule.id), this;
  }
  unregister(id) {
    this.rules.delete(id), this.predicates.delete(id);
    let idx = this.order.indexOf(id);
    return idx >= 0 && this.order.splice(idx, 1), this;
  }
  list() {
    return this.order.map((id) => this.rules.get(id));
  }
  get(id) {
    return this.rules.get(id);
  }
  run(point, context) {
    if (!context || typeof context != "object") throw new SafetyError("context must be a non-null object");
    let out = [];
    for (let id of this.order) {
      let rule = this.rules.get(id);
      if (!appliesAt(rule.enforcementPoint, point)) continue;
      let pred = this.predicates.get(id), result;
      try {
        result = pred(rule, context);
      } catch (err) {
        out.push({ ruleId: rule.id, invariant: rule.invariant, reason: `predicate threw: ${err.message}`, enforcementPoint: point, severity: rule.severity });
        continue;
      }
      result.satisfied || out.push({ ruleId: rule.id, invariant: rule.invariant, reason: result.reason ?? `invariant "${rule.invariant}" not satisfied`, enforcementPoint: point, severity: rule.severity });
    }
    return out;
  }
  runPre(context) {
    return this.run("pre", context);
  }
  runPost(context) {
    return this.run("post", context);
  }
  assertSafe(context) {
    let violations = this.runPre(context), blocking = violations.filter((v) => v.severity === "medium" || v.severity === "high" || v.severity === "critical");
    if (blocking.length > 0) {
      let first = blocking[0];
      throw new SafetyError(`safety assertion failed: ${first.reason} (rule ${first.ruleId}, severity ${first.severity})`);
    }
    return violations;
  }
  verifyInvariants(context) {
    if (!context || typeof context != "object") throw new SafetyError("context must be a non-null object");
    let out = [];
    for (let id of this.order) {
      let rule = this.rules.get(id), pred = this.predicates.get(id), result;
      try {
        result = pred(rule, context);
      } catch (err) {
        out.push({ ruleId: rule.id, invariant: rule.invariant, reason: `predicate threw: ${err.message}`, enforcementPoint: "pre", severity: rule.severity });
        continue;
      }
      result.satisfied || out.push({ ruleId: rule.id, invariant: rule.invariant, reason: result.reason ?? `invariant "${rule.invariant}" not satisfied`, enforcementPoint: "pre", severity: rule.severity });
    }
    return out;
  }
};
function appliesAt(enforcementPoint, point) {
  return enforcementPoint === "both" ? true : enforcementPoint === point;
}
var RESOLUTION_STRATEGIES = ["consensus", "majority", "authority", "arbitration", "escalation"];
var CONFLICT_SEVERITIES = ["low", "medium", "high", "critical"];
function validateConflict(conflict) {
  if (!conflict || typeof conflict != "object") throw new ConflictError("conflict must be an object");
  if (typeof conflict.id != "string" || conflict.id.length === 0) throw new ConflictError("conflict.id must be a non-empty string");
  if (!Array.isArray(conflict.parties) || conflict.parties.length < 2) throw new ConflictError("conflict.parties must have at least 2 entries");
  if (typeof conflict.description != "string" || conflict.description.length === 0) throw new ConflictError("conflict.description must be a non-empty string");
  if (!CONFLICT_SEVERITIES.includes(conflict.severity)) throw new ConflictError(`conflict.severity must be one of: ${CONFLICT_SEVERITIES.join(", ")}`);
  let seen = /* @__PURE__ */ new Set();
  for (let p of conflict.parties) {
    if (typeof p != "string" || p.length === 0) throw new ConflictError("each party must be a non-empty string");
    if (seen.has(p)) throw new ConflictError(`duplicate party: ${p}`);
    seen.add(p);
  }
}
var ConflictResolver = class {
  resolveConflict(conflict, strategy, options = {}) {
    if (validateConflict(conflict), !RESOLUTION_STRATEGIES.includes(strategy)) throw new ConflictError(`unknown strategy: ${strategy}`);
    let proposed = options.proposedResolution ?? `Resolve per ${strategy}`;
    switch (strategy) {
      case "consensus":
        return this.resolveConsensus(conflict, options, proposed);
      case "majority":
        return this.resolveMajority(conflict, options, proposed);
      case "authority":
        return this.resolveAuthority(conflict, options, proposed);
      case "arbitration":
        return this.resolveArbitration(conflict, options, proposed);
      case "escalation":
        return this.resolveEscalation(conflict, proposed);
      default:
        throw new ConflictError(`unhandled strategy: ${strategy}`);
    }
  }
  resolveConsensus(conflict, options, proposed) {
    if (!Array.isArray(options.agreements)) throw new ConflictError("consensus strategy requires options.agreements");
    let agreed = new Set(options.agreements), dissenters = conflict.parties.filter((p) => !agreed.has(p));
    return dissenters.length === 0 ? { resolution: proposed, reason: "all parties agreed", strategy: "consensus" } : { resolution: "No consensus reached; escalation required", reason: `${dissenters.length} of ${conflict.parties.length} parties dissented`, dissenters, strategy: "consensus" };
  }
  resolveMajority(conflict, options, proposed) {
    if (!Array.isArray(options.agreements)) throw new ConflictError("majority strategy requires options.agreements");
    let agreed = new Set(options.agreements), agreeCount = conflict.parties.filter((p) => agreed.has(p)).length, needed = Math.ceil(conflict.parties.length / 2);
    return agreeCount >= needed ? { resolution: proposed, reason: `${agreeCount} of ${conflict.parties.length} parties agreed (needed ${needed})`, dissenters: conflict.parties.filter((p) => !agreed.has(p)), strategy: "majority" } : { resolution: "No majority; escalation required", reason: `only ${agreeCount} of ${conflict.parties.length} agreed (needed ${needed})`, dissenters: conflict.parties.filter((p) => !agreed.has(p)), strategy: "majority" };
  }
  resolveAuthority(conflict, options, proposed) {
    if (!options.authorities || typeof options.authorities != "object") throw new ConflictError("authority strategy requires options.authorities");
    let topParty, topAuth = -1 / 0;
    for (let p of conflict.parties) {
      let a = options.authorities[p];
      if (typeof a != "number") throw new ConflictError(`authority strategy: missing authority for party ${p}`);
      a > topAuth && (topAuth = a, topParty = p);
    }
    return { resolution: proposed, reason: `decided by highest-authority party ${topParty} (authority ${topAuth})`, dissenters: conflict.parties.filter((p) => p !== topParty), strategy: "authority" };
  }
  resolveArbitration(_conflict, options, proposed) {
    if (typeof options.arbitrator != "string" || options.arbitrator.length === 0) throw new ConflictError("arbitration strategy requires options.arbitrator");
    return { resolution: proposed, reason: `arbitrated by ${options.arbitrator}`, strategy: "arbitration" };
  }
  resolveEscalation(conflict, proposed) {
    return { resolution: `Escalated: ${proposed}`, reason: `conflict ${conflict.id} (severity ${conflict.severity}) escalated to higher authority`, strategy: "escalation" };
  }
};
var auditCounter = 0;
function newAuditId(timestamp) {
  return auditCounter += 1, `audit-${timestamp.replace(/[^0-9]/g, "")}-${auditCounter.toString(36).padStart(6, "0")}`;
}
var EnforcementEngine = class {
  ruleSet;
  policySet;
  permissionModel;
  safety;
  audit = [];
  requireApprovalDenies;
  grantCheck;
  grants = [];
  grantRevocations = [];
  constructor(opts = {}) {
    this.requireApprovalDenies = opts.requireApprovalDenies ?? true;
  }
  registerRuleSet(ruleSet) {
    return this.ruleSet = ruleSet, this;
  }
  registerPolicySet(policySet) {
    return this.policySet = policySet, this;
  }
  registerPermissionModel(model) {
    return this.permissionModel = model, this;
  }
  registerSafetyChecker(arg) {
    if (arg instanceof SafetyChecker) this.safety = arg;
    else if (Array.isArray(arg)) {
      let checker = new SafetyChecker();
      for (let { rule, predicate } of arg) checker.register(rule, predicate);
      this.safety = checker;
    } else throw new EnforcementError("registerSafetyChecker: invalid argument");
    return this;
  }
  registerGrantCheck(check) {
    return this.grantCheck = check, this;
  }
  registerGrant(grant) {
    return this.grants.push(grant), this;
  }
  revokeGrant(grantId, revokedBy, reason) {
    let grant = this.grants.find((g) => g.id === grantId);
    if (!grant) throw new EnforcementError(`grant '${grantId}' not found`);
    grant.revoked = true, this.grantRevocations.push({ grantId, revokedAt: (/* @__PURE__ */ new Date()).toISOString(), revokedBy, reason });
  }
  getGrants() {
    return [...this.grants];
  }
  getGrantRevocations() {
    return [...this.grantRevocations];
  }
  evaluate(action, subject, context) {
    if (typeof action != "string" || action.length === 0) throw new EnforcementError("action must be a non-empty string");
    if (typeof subject != "string" || subject.length === 0) throw new EnforcementError("subject must be a non-empty string");
    if (!context || typeof context != "object") throw new EnforcementError("context must be a non-null object");
    let reasons = [], violations = [], grantUsed;
    if (this.grantCheck) {
      let resource = context.resource ?? "*", activeGrants = this.grants.filter((g) => g.subject === context.subject && !g.revoked && /* @__PURE__ */ new Date() >= new Date(g.validFrom) && /* @__PURE__ */ new Date() <= new Date(g.validUntil));
      for (let grant of activeGrants) if (this.grantCheck(grant.id, resource, action)) {
        grantUsed = grant.id, reasons.push(`capability grant '${grant.id}' permits '${action}' on '${resource}'`);
        break;
      }
    }
    if (!grantUsed && this.permissionModel ? can(this.permissionModel, subject, action) ? reasons.push(`permission granted: ${subject} can ${action}`) : violations.push(`permission denied: ${subject} cannot ${action}`) : grantUsed || reasons.push("no permission model registered; skipping permission check"), this.policySet) {
      let ev = evaluatePolicySet(this.policySet, context);
      ev.matched ? ev.action === "allow" ? reasons.push(`policy ${ev.policyId} allowed`) : ev.action === "deny" ? violations.push(`policy ${ev.policyId} denied: ${ev.reason ?? "denied"}`) : ev.action === "require_approval" && (this.requireApprovalDenies ? violations.push(`policy ${ev.policyId} requires approval: ${ev.reason ?? "approval required"}`) : reasons.push(`policy ${ev.policyId} requires approval (non-blocking)`)) : reasons.push("no matching policy; default allow");
    } else reasons.push("no policy set registered; skipping policy check");
    if (this.safety) {
      let sv = this.safety.runPre(context);
      for (let v of sv) v.severity === "medium" || v.severity === "high" || v.severity === "critical" ? violations.push(`safety ${v.ruleId} violated: ${v.reason}`) : reasons.push(`safety ${v.ruleId} advisory: ${v.reason}`);
      sv.length === 0 && reasons.push("safety pre-checks passed");
    } else reasons.push("no safety checker registered; skipping safety check");
    if (this.ruleSet) {
      let rv = evaluateRuleSet(this.ruleSet, context);
      for (let v of rv) violations.push(`ethical rule ${v.ruleId} violated: ${v.reason ?? "violated"}`);
      rv.length === 0 && reasons.push("ethical rules passed");
    } else reasons.push("no rule set registered; skipping ethical check");
    let allowed = violations.length === 0, auditId = newAuditId(context.timestamp), entry = { auditId, timestamp: context.timestamp, action, subject, allowed, reasons, violations };
    return this.audit.push(entry), { allowed, reasons, violations, auditId, grantUsed };
  }
  getAuditLog() {
    return this.audit.map((e) => ({ ...e, reasons: [...e.reasons], violations: [...e.violations] }));
  }
  getAuditEntry(id) {
    return this.audit.find((e) => e.auditId === id);
  }
  clearAuditLog() {
    this.audit.length = 0;
  }
};
var SECTION_TYPES = ["preamble", "article", "amendment", "appendix", "schedule", "other"];
var DOCUMENT_STATUSES = ["draft", "proposed", "ratified", "superseded"];
function compareVersions(a, b) {
  return a.major !== b.major ? a.major - b.major : a.minor !== b.minor ? a.minor - b.minor : a.patch !== b.patch ? a.patch - b.patch : a.prerelease && !b.prerelease ? -1 : !a.prerelease && b.prerelease ? 1 : a.prerelease && b.prerelease ? a.prerelease < b.prerelease ? -1 : a.prerelease > b.prerelease ? 1 : 0 : 0;
}
function formatVersion(v) {
  let s = `${v.major}.${v.minor}.${v.patch}`;
  return v.prerelease && (s += `-${v.prerelease}`), v.build && (s += `+${v.build}`), s;
}
function parseVersion(s) {
  if (typeof s != "string") throw new DocumentError("version must be a string");
  let m = s.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/);
  if (!m) throw new DocumentError(`invalid semver: ${s}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), prerelease: m[4], build: m[5] };
}
function validateSection(section) {
  if (!section || typeof section != "object") throw new DocumentError("section must be an object");
  if (typeof section.id != "string" || section.id.length === 0) throw new DocumentError("section.id must be a non-empty string");
  if (typeof section.title != "string" || section.title.length === 0) throw new DocumentError("section.title must be a non-empty string");
  if (typeof section.content != "string") throw new DocumentError("section.content must be a string");
  if (!SECTION_TYPES.includes(section.type)) throw new DocumentError(`section.type must be one of: ${SECTION_TYPES.join(", ")}`);
}
function validateDocument(doc) {
  if (!doc || typeof doc != "object") throw new DocumentError("doc must be an object");
  if (typeof doc.id != "string" || doc.id.length === 0) throw new DocumentError("doc.id must be a non-empty string");
  if (typeof doc.name != "string" || doc.name.length === 0) throw new DocumentError("doc.name must be a non-empty string");
  if (!doc.version || typeof doc.version != "object") throw new DocumentError("doc.version must be a SemverVersion");
  if (!Array.isArray(doc.sections)) throw new DocumentError("doc.sections must be an array");
  let seen = /* @__PURE__ */ new Set();
  for (let s of doc.sections) {
    if (validateSection(s), seen.has(s.id)) throw new DocumentError(`duplicate section id: ${s.id}`);
    seen.add(s.id);
  }
  if (!DOCUMENT_STATUSES.includes(doc.status)) throw new DocumentError(`doc.status must be one of: ${DOCUMENT_STATUSES.join(", ")}`);
  if (doc.status === "ratified" && typeof doc.ratifiedAt != "string") throw new DocumentError("ratified document must have ratifiedAt");
}
function isRatified(doc) {
  return doc.status === "ratified";
}
function ratify(doc, at) {
  if (validateDocument(doc), doc.status === "ratified") throw new DocumentError("document is already ratified");
  if (doc.status === "superseded") throw new DocumentError("cannot ratify a superseded document");
  return { ...doc, status: "ratified", ratifiedAt: at ?? (/* @__PURE__ */ new Date()).toISOString() };
}
function diffDocuments(oldDoc, newDoc) {
  validateDocument(oldDoc), validateDocument(newDoc);
  let oldMap = /* @__PURE__ */ new Map();
  for (let s of oldDoc.sections) oldMap.set(s.id, s);
  let newMap = /* @__PURE__ */ new Map();
  for (let s of newDoc.sections) newMap.set(s.id, s);
  let added = [], removed = [], changed = [];
  for (let s of newDoc.sections) oldMap.has(s.id) || added.push(s);
  for (let s of oldDoc.sections) newMap.has(s.id) || removed.push(s);
  for (let s of newDoc.sections) {
    let o = oldMap.get(s.id);
    o && (o.title !== s.title || o.content !== s.content || o.type !== s.type) && changed.push({ id: s.id, oldSection: o, newSection: s });
  }
  return { added, removed, changed };
}
function supersede(oldDoc, newDoc) {
  if (validateDocument(oldDoc), validateDocument(newDoc), !isRatified(oldDoc)) throw new DocumentError("only ratified documents can be superseded");
  if (compareVersions(newDoc.version, oldDoc.version) <= 0) throw new DocumentError(`successor version ${formatVersion(newDoc.version)} must be greater than ${formatVersion(oldDoc.version)}`);
  if (newDoc.status !== "proposed" && newDoc.status !== "ratified") throw new DocumentError("successor must be proposed or ratified");
  return { superseded: { ...oldDoc, status: "superseded", supersededBy: newDoc.id }, successor: { ...newDoc } };
}

// packages/council/dist/esm/index.mjs
var CouncilError = class extends Error {
  code;
  cause;
  constructor(message, code, cause) {
    super(message), this.name = new.target.name, this.code = code ?? "COUNCIL_ERROR", cause !== void 0 && (this.cause = cause), Object.setPrototypeOf(this, new.target.prototype);
  }
};
var RoutingError2 = class extends CouncilError {
  constructor(message, cause) {
    super(message, "ROUTING_ERROR", cause);
  }
};
var AnalysisError = class extends CouncilError {
  constructor(message, cause) {
    super(message, "ANALYSIS_ERROR", cause);
  }
};
var ScoringError = class extends CouncilError {
  constructor(message, cause) {
    super(message, "SCORING_ERROR", cause);
  }
};
var ConflictError2 = class extends CouncilError {
  constructor(message, cause) {
    super(message, "CONFLICT_ERROR", cause);
  }
};
var DebateError = class extends CouncilError {
  constructor(message, cause) {
    super(message, "DEBATE_ERROR", cause);
  }
};
var ConsensusError = class extends CouncilError {
  constructor(message, cause) {
    super(message, "CONSENSUS_ERROR", cause);
  }
};
var SynthesisError = class extends CouncilError {
  constructor(message, cause) {
    super(message, "SYNTHESIS_ERROR", cause);
  }
};
var STOP_WORDS = /* @__PURE__ */ new Set(["the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "at", "for", "with", "by", "is", "are", "be", "this", "that", "these", "those", "it", "as", "from", "we", "our", "us", "i", "you", "your", "they", "their", "was", "were", "will", "would", "should", "shall", "may", "might", "can", "could", "has", "have", "had", "do", "does", "did", "if", "then", "else", "so", "than", "too", "very", "just", "about", "into", "over", "under", "again", "further", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "s", "t", "because", "while"]);
var POSITIVE_MARKERS = /* @__PURE__ */ new Set(["yes", "recommend", "support", "approve", "endorse", "agree", "proceed", "accept", "positive", "pass", "correct", "adopt", "allow", "permit", "go", "true", "valid", "sound", "good", "safe", "favor", "continue", "implement", "ship", "launch", "greenlight", "ok", "okay"]);
var NEGATIVE_MARKERS = /* @__PURE__ */ new Set(["no", "not", "against", "oppose", "reject", "deny", "refuse", "decline", "block", "forbid", "prohibit", "fail", "false", "invalid", "unsound", "bad", "unsafe", "risk", "risky", "dont", "shouldnt", "cannot", "cant", "wont", "never", "negative", "veto", "stop", "halt", "abort", "discard", "overturn"]);
function stem(token) {
  if (token.length > 4) {
    if (token.endsWith("ing")) return token.slice(0, -3);
    if (token.endsWith("ed")) return token.slice(0, -2);
    if (token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  }
  return token;
}
function tokenize2(text) {
  return typeof text != "string" || text.length === 0 ? [] : text.toLowerCase().split(/[^a-z0-9]+/g).filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}
function tokenSet(text) {
  return new Set(tokenize2(text));
}
function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0, [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (let t of smaller) larger.has(t) && intersection++;
  let union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}
function polarity(text) {
  let tokens = tokenize2(text), pos = 0, neg = 0;
  for (let t of tokens) {
    let s = stem(t);
    POSITIVE_MARKERS.has(s) && pos++, NEGATIVE_MARKERS.has(s) && neg++;
  }
  return pos > neg ? "positive" : neg > pos ? "negative" : "neutral";
}
function validateSpecialist(specialist) {
  if (!specialist || typeof specialist != "object") throw new RoutingError2("specialist must be an object");
  if (typeof specialist.id != "string" || specialist.id.length === 0) throw new RoutingError2("specialist.id must be a non-empty string");
  if (typeof specialist.name != "string" || specialist.name.length === 0) throw new RoutingError2("specialist.name must be a non-empty string");
  if (!Array.isArray(specialist.expertise)) throw new RoutingError2("specialist.expertise must be an array");
  for (let e of specialist.expertise) if (typeof e != "string" || e.length === 0) throw new RoutingError2("each expertise entry must be a non-empty string");
  if (typeof specialist.weight != "number" || !Number.isFinite(specialist.weight) || specialist.weight < 0) throw new RoutingError2("specialist.weight must be a non-negative finite number");
}
function matchScore(problem, specialist) {
  if (!problem || typeof problem != "object") throw new RoutingError2("problem must be an object");
  validateSpecialist(specialist);
  let problemTokens = /* @__PURE__ */ new Set([...tokenize2(problem.description), ...tokenize2(problem.domain)]), expertTokens = /* @__PURE__ */ new Set();
  for (let e of specialist.expertise) for (let t of tokenize2(e)) expertTokens.add(t);
  if (problemTokens.size === 0 || expertTokens.size === 0) return 0;
  let intersection = 0;
  for (let t of expertTokens) problemTokens.has(t) && intersection++;
  let union = problemTokens.size + expertTokens.size - intersection;
  return union > 0 ? intersection / union : 0;
}
function route(problem, specialists) {
  if (!problem || typeof problem != "object") throw new RoutingError2("problem must be an object");
  if (!Array.isArray(specialists)) throw new RoutingError2("specialists must be an array");
  return specialists.map((s, idx) => ({ specialist: s, score: matchScore(problem, s), idx })).filter((m) => m.score > 0).sort((a, b) => b.score !== a.score ? b.score - a.score : b.specialist.weight !== a.specialist.weight ? b.specialist.weight - a.specialist.weight : a.idx - b.idx).map((m) => m.specialist);
}
function routeAll(problem, specialists) {
  if (!problem || typeof problem != "object") throw new RoutingError2("problem must be an object");
  if (!Array.isArray(specialists)) throw new RoutingError2("specialists must be an array");
  return specialists.map((s, idx) => ({ specialist: s, score: matchScore(problem, s), idx })).sort((a, b) => b.score !== a.score ? b.score - a.score : b.specialist.weight !== a.specialist.weight ? b.specialist.weight - a.specialist.weight : a.idx - b.idx).map((m) => ({ specialist: m.specialist, score: m.score }));
}
var SpecialistRegistry = class {
  specialists = /* @__PURE__ */ new Map();
  order = [];
  register(specialist) {
    if (validateSpecialist(specialist), this.specialists.has(specialist.id)) throw new RoutingError2(`specialist already registered: ${specialist.id}`);
    return this.specialists.set(specialist.id, specialist), this.order.push(specialist.id), this;
  }
  unregister(id) {
    this.specialists.delete(id);
    let idx = this.order.indexOf(id);
    return idx >= 0 && this.order.splice(idx, 1), this;
  }
  get(id) {
    return this.specialists.get(id);
  }
  list() {
    return this.order.map((id) => this.specialists.get(id));
  }
  route(problem) {
    return route(problem, this.list());
  }
  routeAll(problem) {
    return routeAll(problem, this.list());
  }
};
function validateAnalysis(analysis) {
  if (!analysis || typeof analysis != "object") throw new AnalysisError("analysis must be an object");
  if (typeof analysis.id != "string" || analysis.id.length === 0) throw new AnalysisError("analysis.id must be a non-empty string");
  if (typeof analysis.specialistId != "string" || analysis.specialistId.length === 0) throw new AnalysisError("analysis.specialistId must be a non-empty string");
  if (typeof analysis.problemId != "string" || analysis.problemId.length === 0) throw new AnalysisError("analysis.problemId must be a non-empty string");
  if (typeof analysis.content != "string" || analysis.content.length === 0) throw new AnalysisError("analysis.content must be a non-empty string");
  if (typeof analysis.confidence != "number" || !Number.isFinite(analysis.confidence)) throw new AnalysisError("analysis.confidence must be a finite number");
  if (analysis.confidence < 0 || analysis.confidence > 1) throw new AnalysisError("analysis.confidence must be between 0 and 1");
  if (typeof analysis.reasoning != "string" || analysis.reasoning.length === 0) throw new AnalysisError("analysis.reasoning must be a non-empty string");
  if (analysis.caveats !== void 0) {
    if (!Array.isArray(analysis.caveats)) throw new AnalysisError("analysis.caveats must be an array if provided");
    for (let c of analysis.caveats) if (typeof c != "string" || c.length === 0) throw new AnalysisError("each caveat must be a non-empty string");
  }
}
var AnalysisCollector = class {
  analyses = /* @__PURE__ */ new Map();
  order = [];
  byProblem = /* @__PURE__ */ new Map();
  bySpecialist = /* @__PURE__ */ new Map();
  submit(analysis) {
    if (validateAnalysis(analysis), this.analyses.has(analysis.id)) throw new AnalysisError(`analysis already submitted: ${analysis.id}`);
    return this.analyses.set(analysis.id, analysis), this.order.push(analysis.id), this.byProblem.has(analysis.problemId) || this.byProblem.set(analysis.problemId, []), this.byProblem.get(analysis.problemId).push(analysis.id), this.bySpecialist.has(analysis.specialistId) || this.bySpecialist.set(analysis.specialistId, []), this.bySpecialist.get(analysis.specialistId).push(analysis.id), this;
  }
  get(id) {
    return this.analyses.get(id);
  }
  getAll(problemId) {
    return (this.byProblem.get(problemId) ?? []).map((id) => this.analyses.get(id));
  }
  getBySpecialist(specialistId) {
    return (this.bySpecialist.get(specialistId) ?? []).map((id) => this.analyses.get(id));
  }
  list() {
    return this.order.map((id) => this.analyses.get(id));
  }
  size() {
    return this.order.length;
  }
};
var DEFAULT_OUTLIER_THRESHOLD = 0.25;
function assertAnalysis(analysis) {
  if (!analysis || typeof analysis != "object") throw new ScoringError("analysis must be an object");
  let a = analysis;
  if (typeof a.id != "string" || a.id.length === 0) throw new ScoringError("analysis.id must be a non-empty string");
  if (typeof a.specialistId != "string" || a.specialistId.length === 0) throw new ScoringError("analysis.specialistId must be a non-empty string");
  if (typeof a.confidence != "number" || !Number.isFinite(a.confidence) || a.confidence < 0 || a.confidence > 1) throw new ScoringError("analysis.confidence must be a finite number in [0, 1]");
}
function scoreAnalysis(analysis, specialistWeight) {
  if (assertAnalysis(analysis), typeof specialistWeight != "number" || !Number.isFinite(specialistWeight) || specialistWeight < 0) throw new ScoringError("specialistWeight must be a non-negative finite number");
  return { analysisId: analysis.id, raw: analysis.confidence, weight: specialistWeight, weighted: analysis.confidence * specialistWeight };
}
function aggregateScores(analyses, weights) {
  if (!Array.isArray(analyses)) throw new ScoringError("analyses must be an array");
  if (!weights || typeof weights != "object") throw new ScoringError("weights must be an object");
  if (analyses.length === 0) return { combined: 0, variance: 0, stddev: 0, total: 0, weighted: [] };
  let weighted = [], totalWeight = 0, weightedSum = 0;
  for (let a of analyses) {
    assertAnalysis(a);
    let w = weights[a.specialistId];
    if (typeof w != "number" || !Number.isFinite(w) || w < 0) throw new ScoringError(`missing or invalid weight for specialist ${a.specialistId}`);
    let ws = a.confidence * w;
    weighted.push(ws), weightedSum += ws, totalWeight += w;
  }
  let combined = totalWeight > 0 ? weightedSum / totalWeight : 0, mean = analyses.reduce((s, a) => s + a.confidence, 0) / analyses.length, variance = analyses.reduce((s, a) => s + (a.confidence - mean) ** 2, 0) / analyses.length;
  return { combined, variance, stddev: Math.sqrt(variance), total: analyses.length, weighted };
}
function detectOutliers(analyses, threshold = DEFAULT_OUTLIER_THRESHOLD) {
  if (!Array.isArray(analyses)) throw new ScoringError("analyses must be an array");
  if (typeof threshold != "number" || !Number.isFinite(threshold) || threshold < 0) throw new ScoringError("threshold must be a non-negative finite number");
  if (analyses.length < 2) return [];
  for (let a of analyses) assertAnalysis(a);
  let sorted = [...analyses].sort((a, b) => a.confidence - b.confidence), mid = Math.floor(sorted.length / 2), median = sorted.length % 2 === 0 ? (sorted[mid - 1].confidence + sorted[mid].confidence) / 2 : sorted[mid].confidence;
  return analyses.filter((a) => Math.abs(a.confidence - median) > threshold);
}
var CONFLICT_TYPES = ["opposing_conclusion", "factual_contradiction", "divergent_reasoning"];
var OPPOSING_CONFIDENCE_THRESHOLD = 0.6;
var FACTUAL_OVERLAP_THRESHOLD = 0.3;
var DIVERGENT_REASONING_MAX_OVERLAP = 0.2;
var DIVERGENT_CONTENT_MIN_OVERLAP = 0.1;
var SEVERITY_HIGH_GAP = 0.5;
var SEVERITY_MEDIUM_GAP = 0.2;
function severityFor2(numAnalyses, confidenceGap) {
  return numAnalyses >= 3 || confidenceGap >= SEVERITY_HIGH_GAP ? "high" : confidenceGap >= SEVERITY_MEDIUM_GAP ? "medium" : "low";
}
var ConflictDetector = class {
  detect(analyses) {
    if (!Array.isArray(analyses)) throw new ConflictError2("analyses must be an array");
    for (let a of analyses) {
      if (!a || typeof a != "object") throw new ConflictError2("each analysis must be an object");
      if (typeof a.id != "string" || a.id.length === 0) throw new ConflictError2("each analysis.id must be a non-empty string");
    }
    let conflicts = [];
    if (analyses.length < 2) return conflicts;
    let byProblem = /* @__PURE__ */ new Map();
    for (let a of analyses) byProblem.has(a.problemId) || byProblem.set(a.problemId, []), byProblem.get(a.problemId).push(a);
    for (let [problemId, group] of byProblem) for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      let a = group[i], b = group[j], pa = polarity(a.content), pb = polarity(b.content), contentOverlap = jaccard(tokenSet(a.content), tokenSet(b.content)), reasoningOverlap = jaccard(tokenSet(a.reasoning), tokenSet(b.reasoning)), confidenceGap = Math.abs(a.confidence - b.confidence);
      a.confidence > OPPOSING_CONFIDENCE_THRESHOLD && b.confidence > OPPOSING_CONFIDENCE_THRESHOLD && pa !== "neutral" && pb !== "neutral" && pa !== pb && conflicts.push({ id: `conflict-opposing-${a.id}-${b.id}`, problemId, analysisIds: [a.id, b.id], description: `Analyses ${a.id} and ${b.id} reach opposing conclusions (${pa} vs ${pb}) with high confidence (> ${OPPOSING_CONFIDENCE_THRESHOLD}).`, severity: severityFor2(2, confidenceGap), type: "opposing_conclusion" }), contentOverlap >= FACTUAL_OVERLAP_THRESHOLD && pa !== "neutral" && pb !== "neutral" && pa !== pb && conflicts.push({ id: `conflict-factual-${a.id}-${b.id}`, problemId, analysisIds: [a.id, b.id], description: `Analyses ${a.id} and ${b.id} make contradictory factual claims about the same subject (content overlap ${contentOverlap.toFixed(2)}).`, severity: severityFor2(2, confidenceGap), type: "factual_contradiction" }), pa !== "neutral" && pa === pb && reasoningOverlap < DIVERGENT_REASONING_MAX_OVERLAP && contentOverlap > DIVERGENT_CONTENT_MIN_OVERLAP && conflicts.push({ id: `conflict-reasoning-${a.id}-${b.id}`, problemId, analysisIds: [a.id, b.id], description: `Analyses ${a.id} and ${b.id} reach the same conclusion (${pa}) via divergent reasoning (reasoning overlap ${reasoningOverlap.toFixed(2)}).`, severity: severityFor2(2, confidenceGap), type: "divergent_reasoning" });
    }
    return conflicts.sort((x, y) => x.type !== y.type ? x.type.localeCompare(y.type) : x.id.localeCompare(y.id)), conflicts;
  }
};
var DEFAULT_MAX_DEBATE_ROUNDS = 10;
function validateRound(round) {
  if (!round || typeof round != "object") throw new DebateError("round must be an object");
  if (typeof round.id != "string" || round.id.length === 0) throw new DebateError("round.id must be a non-empty string");
  if (typeof round.analystId != "string" || round.analystId.length === 0) throw new DebateError("round.analystId must be a non-empty string");
  if (typeof round.claim != "string" || round.claim.length === 0) throw new DebateError("round.claim must be a non-empty string");
  if (typeof round.evidence != "string" || round.evidence.length === 0) throw new DebateError("round.evidence must be a non-empty string");
  if (round.rebuttalTo !== void 0 && (typeof round.rebuttalTo != "string" || round.rebuttalTo.length === 0)) throw new DebateError("round.rebuttalTo must be a non-empty string when provided");
}
var DebateFacilitator = class {
  debates = /* @__PURE__ */ new Map();
  maxRounds;
  counter = 0;
  constructor(maxRounds = DEFAULT_MAX_DEBATE_ROUNDS) {
    if (typeof maxRounds != "number" || !Number.isFinite(maxRounds) || maxRounds < 1) throw new DebateError("maxRounds must be a positive finite number");
    this.maxRounds = Math.floor(maxRounds);
  }
  open(problemId, conflictIds = []) {
    if (typeof problemId != "string" || problemId.length === 0) throw new DebateError("problemId must be a non-empty string");
    if (!Array.isArray(conflictIds)) throw new DebateError("conflictIds must be an array");
    for (let c of conflictIds) if (typeof c != "string" || c.length === 0) throw new DebateError("each conflictId must be a non-empty string");
    this.counter += 1;
    let id = `debate-${this.counter}`, debate = { id, problemId, conflictIds: [...conflictIds], rounds: [], status: "open", openedAt: (/* @__PURE__ */ new Date()).toISOString() };
    return this.debates.set(id, debate), debate;
  }
  submitRound(debateId, round) {
    let debate = this.debates.get(debateId);
    if (!debate) throw new DebateError(`debate not found: ${debateId}`);
    if (debate.status === "concluded") throw new DebateError(`debate ${debateId} is already concluded`);
    if (validateRound(round), debate.rounds.some((r) => r.id === round.id)) throw new DebateError(`round already exists in debate ${debateId}: ${round.id}`);
    if (round.rebuttalTo !== void 0 && !debate.rounds.some((r) => r.id === round.rebuttalTo)) throw new DebateError(`round.rebuttalTo does not reference an existing round: ${round.rebuttalTo}`);
    if (debate.rounds.length >= this.maxRounds) throw new DebateError(`max rounds (${this.maxRounds}) reached for debate ${debateId}`);
    return debate.rounds.push(round), debate;
  }
  conclude(debateId) {
    let debate = this.debates.get(debateId);
    if (!debate) throw new DebateError(`debate not found: ${debateId}`);
    if (debate.status === "concluded") throw new DebateError(`debate ${debateId} is already concluded`);
    return debate.status = "concluded", debate.concludedAt = (/* @__PURE__ */ new Date()).toISOString(), debate;
  }
  get(debateId) {
    return this.debates.get(debateId);
  }
  list() {
    return Array.from(this.debates.values());
  }
  getMaxRounds() {
    return this.maxRounds;
  }
};
function validateMinorityOpinion(opinion) {
  if (!opinion || typeof opinion != "object") throw new CouncilError("minority opinion must be an object");
  if (typeof opinion.id != "string" || opinion.id.length === 0) throw new CouncilError("minority opinion.id must be a non-empty string");
  if (typeof opinion.problemId != "string" || opinion.problemId.length === 0) throw new CouncilError("minority opinion.problemId must be a non-empty string");
  if (typeof opinion.analystId != "string" || opinion.analystId.length === 0) throw new CouncilError("minority opinion.analystId must be a non-empty string");
  if (typeof opinion.position != "string" || opinion.position.length === 0) throw new CouncilError("minority opinion.position must be a non-empty string");
  if (typeof opinion.reasoning != "string" || opinion.reasoning.length === 0) throw new CouncilError("minority opinion.reasoning must be a non-empty string");
  if (typeof opinion.dissentReason != "string" || opinion.dissentReason.length === 0) throw new CouncilError("minority opinion.dissentReason must be a non-empty string");
}
var MinorityOpinionTracker = class {
  opinions = /* @__PURE__ */ new Map();
  order = [];
  byProblem = /* @__PURE__ */ new Map();
  byAnalyst = /* @__PURE__ */ new Map();
  record(opinion) {
    if (validateMinorityOpinion(opinion), this.opinions.has(opinion.id)) throw new CouncilError(`minority opinion already recorded: ${opinion.id}`);
    return this.opinions.set(opinion.id, opinion), this.order.push(opinion.id), this.byProblem.has(opinion.problemId) || this.byProblem.set(opinion.problemId, []), this.byProblem.get(opinion.problemId).push(opinion.id), this.byAnalyst.has(opinion.analystId) || this.byAnalyst.set(opinion.analystId, []), this.byAnalyst.get(opinion.analystId).push(opinion.id), this;
  }
  get(id) {
    return this.opinions.get(id);
  }
  getForProblem(problemId) {
    return (this.byProblem.get(problemId) ?? []).map((id) => this.opinions.get(id));
  }
  getByAnalyst(analystId) {
    return (this.byAnalyst.get(analystId) ?? []).map((id) => this.opinions.get(id));
  }
  list() {
    return this.order.map((id) => this.opinions.get(id));
  }
  size() {
    return this.order.length;
  }
};
var DEFAULT_CONSENSUS_THRESHOLD = 0.6;
var ConsensusBuilder = class {
  threshold;
  constructor(threshold = DEFAULT_CONSENSUS_THRESHOLD) {
    if (typeof threshold != "number" || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new ConsensusError("threshold must be a finite number in [0, 1]");
    this.threshold = threshold;
  }
  getThreshold() {
    return this.threshold;
  }
  build(problemId, analyses, conflicts = [], options = {}) {
    if (typeof problemId != "string" || problemId.length === 0) throw new ConsensusError("problemId must be a non-empty string");
    if (!Array.isArray(analyses)) throw new ConsensusError("analyses must be an array");
    if (!Array.isArray(conflicts)) throw new ConsensusError("conflicts must be an array");
    if (options && typeof options != "object") throw new ConsensusError("options must be an object when provided");
    if (analyses.length === 0) return null;
    let weights = options.weights ?? {};
    if (!weights || typeof weights != "object") throw new ConsensusError("options.weights must be an object when provided");
    let withPolarity = analyses.map((a) => ({ analysis: a, polarity: polarity(a.content) })).filter((x) => x.polarity !== "neutral");
    if (withPolarity.length === 0) return null;
    let tally = {}, totalWeight = 0;
    for (let { analysis, polarity: pol } of withPolarity) {
      let w = weights[analysis.specialistId];
      if (w !== void 0 && (typeof w != "number" || !Number.isFinite(w) || w < 0)) throw new ConsensusError(`invalid weight for specialist ${analysis.specialistId}`);
      let contribution = (w ?? 1) * analysis.confidence;
      tally[pol] || (tally[pol] = { weight: 0, analysts: [] }), tally[pol].weight += contribution, tally[pol].analysts.push(analysis.specialistId), totalWeight += contribution;
    }
    if (totalWeight === 0) return null;
    let winner = null, winnerWeight = 0;
    for (let pol of Object.keys(tally)) tally[pol].weight > winnerWeight && (winnerWeight = tally[pol].weight, winner = pol);
    if (!winner) return null;
    let supportRatio = winnerWeight / totalWeight;
    if (supportRatio < this.threshold) return null;
    let supportingAnalystIds = Array.from(new Set(tally[winner].analysts)), dissentingAnalystIds = Array.from(new Set(withPolarity.filter((x) => x.polarity !== winner).map((x) => x.analysis.specialistId).concat(options.minorityAnalystIds ?? []))), problemConflicts = conflicts.filter((c) => c.problemId === problemId), conflictsResolved = problemConflicts.map((c) => c.id), openIssues = problemConflicts.filter((c) => c.severity === "high").map((c) => `High-severity conflict ${c.id} remains unresolved: ${c.description}`);
    return { problemId, decision: winner === "positive" ? `Adopt the proposed action for problem ${problemId}.` : `Reject the proposed action for problem ${problemId}.`, confidence: supportRatio, supportingAnalystIds, dissentingAnalystIds, conflictsResolved, openIssues };
  }
};
var DEFAULT_SYNTHESIS_THRESHOLD = 0.6;
var STRONG_CONSENSUS_RATIO = 0.8;
function classifyConsensus(consensus, threshold = DEFAULT_SYNTHESIS_THRESHOLD) {
  return consensus ? consensus.dissentingAnalystIds.length === 0 ? "unanimous" : consensus.confidence >= STRONG_CONSENSUS_RATIO ? "strong" : consensus.confidence >= threshold ? "majority" : "split" : "none";
}
function synthesize(problemId, consensus, analyses, conflicts = [], options = {}) {
  if (typeof problemId != "string" || problemId.length === 0) throw new SynthesisError("problemId must be a non-empty string");
  if (!Array.isArray(analyses)) throw new SynthesisError("analyses must be an array");
  if (!Array.isArray(conflicts)) throw new SynthesisError("conflicts must be an array");
  if (consensus !== null && (!consensus || typeof consensus != "object")) throw new SynthesisError("consensus must be an object or null");
  let threshold = options.threshold ?? DEFAULT_SYNTHESIS_THRESHOLD;
  if (typeof threshold != "number" || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new SynthesisError("threshold must be a finite number in [0, 1]");
  let minorityOpinions = Array.isArray(options.minorityOpinions) ? options.minorityOpinions : [], level = classifyConsensus(consensus, threshold), participants = Array.from(new Set(analyses.map((a) => a.specialistId))), decisionText = options.decision ?? consensus?.decision ?? `No actionable decision for problem ${problemId}; insufficient consensus.`, confidence = consensus?.confidence ?? 0, rationaleParts = [];
  consensus ? (rationaleParts.push(`Consensus reached with ${consensus.supportingAnalystIds.length} supporting and ${consensus.dissentingAnalystIds.length} dissenting (weighted support ${(consensus.confidence * 100).toFixed(1)}%, level: ${level}).`), consensus.conflictsResolved.length > 0 && rationaleParts.push(`${consensus.conflictsResolved.length} conflict${consensus.conflictsResolved.length === 1 ? "" : "s"} considered.`), consensus.openIssues.length > 0 && rationaleParts.push(`Open issues: ${consensus.openIssues.join("; ")}`)) : rationaleParts.push(`No consensus was reached across ${analyses.length} analysis${analyses.length === 1 ? "" : "ies"}.`), conflicts.length > 0 && rationaleParts.push(`${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"} taken into account.`), minorityOpinions.length > 0 && rationaleParts.push(`${minorityOpinions.length} minority opinion${minorityOpinions.length === 1 ? "" : "s"} preserved on record.`);
  let generatedAt = options.generatedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  return { id: options.decisionId ?? `decision-${problemId}-${generatedAt}`, problemId, decision: decisionText, rationale: rationaleParts.join(" "), confidence, consensusLevel: level, participants, generatedAt };
}

// packages/nervous-system/dist/esm/index.mjs
import { randomUUID as randomUUID8 } from "node:crypto";
import { EventEmitter } from "node:events";
import { randomUUID as randomUUID22 } from "node:crypto";
import { watch } from "node:fs";
import * as os2 from "node:os";
import { exec } from "node:child_process";
import * as os22 from "node:os";
import { readFileSync as readFileSync4 } from "node:fs";
import * as os3 from "node:os";
import { EventEmitter as EventEmitter2 } from "node:events";
var NervousSystemError = class extends Error {
  code;
  cause;
  constructor(message, code, cause) {
    super(message), this.name = new.target.name, this.code = code ?? "NERVOUS_SYSTEM_ERROR", cause !== void 0 && (this.cause = cause), Object.setPrototypeOf(this, new.target.prototype);
  }
};
var FabricError = class extends NervousSystemError {
  constructor(message, cause) {
    super(message, "FABRIC_ERROR", cause);
  }
};
var FilterError = class extends NervousSystemError {
  constructor(message, cause) {
    super(message, "FILTER_ERROR", cause);
  }
};
var RouterError = class extends NervousSystemError {
  constructor(message, cause) {
    super(message, "ROUTER_ERROR", cause);
  }
};
var RecorderError = class extends NervousSystemError {
  constructor(message, cause) {
    super(message, "RECORDER_ERROR", cause);
  }
};
var SourceError = class extends NervousSystemError {
  constructor(message, cause) {
    super(message, "SOURCE_ERROR", cause);
  }
};
var QueueError = class extends NervousSystemError {
  constructor(message, cause) {
    super(message, "QUEUE_ERROR", cause);
  }
};
var LEVEL_RANK5 = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
var SCRUBBED_FIELD_NAMES8 = ["secret", "token", "apiKey", "password", "privateKey"];
function shouldScrubField5(name) {
  let lower = name.toLowerCase();
  for (let needle of SCRUBBED_FIELD_NAMES8) {
    let nl = needle.toLowerCase();
    if (lower === nl || lower.endsWith("_" + nl)) return true;
  }
  return false;
}
function scrubMetadata6(meta) {
  if (meta == null || typeof meta != "object") return meta;
  if (Buffer.isBuffer(meta)) return `[buffer:${meta.length}]`;
  if (meta instanceof Date) return meta.toISOString();
  if (Array.isArray(meta)) return meta.map(scrubMetadata6);
  let out = {};
  for (let [k, v] of Object.entries(meta)) out[k] = shouldScrubField5(k) ? "[redacted]" : scrubMetadata6(v);
  return out;
}
var ConsoleLogger5 = class {
  constructor(level = "info") {
    this.level = level;
    this.levelRank = LEVEL_RANK5[level] ?? LEVEL_RANK5.info;
  }
  level;
  levelRank;
  debug(msg, meta) {
    this.emit("debug", msg, meta);
  }
  info(msg, meta) {
    this.emit("info", msg, meta);
  }
  warn(msg, meta) {
    this.emit("warn", msg, meta);
  }
  error(msg, meta) {
    this.emit("error", msg, meta);
  }
  emit(level, msg, meta) {
    try {
      if (LEVEL_RANK5[level] < this.levelRank) return;
      let entry = { level, msg, ts: (/* @__PURE__ */ new Date()).toISOString(), ...meta ? { meta: scrubMetadata6(meta) } : {} }, line = JSON.stringify(entry);
      level === "error" || level === "warn" ? process.stderr.write(line + `
`) : process.stdout.write(line + `
`);
    } catch {
    }
  }
};
var SilentLogger7 = class {
  debug() {
  }
  info() {
  }
  warn() {
  }
  error() {
  }
};
var KNOWN_SEVERITIES = /* @__PURE__ */ new Set(["debug", "info", "warn", "error"]);
function generateEventId() {
  try {
    if (typeof randomUUID8 == "function") return randomUUID8();
  } catch {
  }
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
function isSeverity(s) {
  return typeof s == "string" && KNOWN_SEVERITIES.has(s);
}
function createEvent2(topic, source, payload, opts) {
  if (!topic || typeof topic != "string") throw new NervousSystemError("Event topic is required");
  if (!source || typeof source != "string") throw new NervousSystemError("Event source is required");
  let severity = opts?.severity ?? "info";
  if (!isSeverity(severity)) throw new NervousSystemError(`Invalid severity: ${String(severity)}`);
  let event = { id: opts?.id ?? generateEventId(), topic, source, payload, timestamp: opts?.timestamp ?? Date.now(), severity };
  return opts?.tags && (event.tags = [...opts.tags]), opts?.metadata && (event.metadata = { ...opts.metadata }), event;
}
function serialize(event, pretty) {
  try {
    return JSON.stringify(event, null, pretty ? 2 : 0);
  } catch (e) {
    throw new NervousSystemError("Failed to serialize event", void 0, e);
  }
}
function deserialize(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new NervousSystemError("Failed to parse event JSON", void 0, e);
  }
  if (!parsed || typeof parsed != "object") throw new NervousSystemError("Event JSON must be an object");
  let obj = parsed;
  if (typeof obj.id != "string") throw new NervousSystemError("Event missing string field: id");
  if (typeof obj.topic != "string") throw new NervousSystemError("Event missing string field: topic");
  if (typeof obj.source != "string") throw new NervousSystemError("Event missing string field: source");
  if (typeof obj.timestamp != "number") throw new NervousSystemError("Event missing number field: timestamp");
  if (!isSeverity(obj.severity)) throw new NervousSystemError(`Event has invalid severity: ${String(obj.severity)}`);
  if (obj.tags !== void 0 && !Array.isArray(obj.tags)) throw new NervousSystemError("Event tags must be array if present");
  if (obj.metadata !== void 0 && (typeof obj.metadata != "object" || obj.metadata === null || Array.isArray(obj.metadata))) throw new NervousSystemError("Event metadata must be object if present");
  let out = { id: obj.id, topic: obj.topic, source: obj.source, payload: obj.payload, timestamp: obj.timestamp, severity: obj.severity };
  return obj.tags !== void 0 && (out.tags = obj.tags), obj.metadata !== void 0 && (out.metadata = obj.metadata), out;
}
function eventsEqual(a, b) {
  return serialize(a) === serialize(b);
}
function compileFilter(filter) {
  if (!filter || typeof filter != "object") throw new FilterError("Filter must be an object");
  let cf = filter;
  if (cf.__combinatorKind === "and") {
    let children2 = cf.__combinatorChildren ?? [];
    return children2.length === 0 ? () => true : (e) => {
      for (let f of children2) if (!f(e)) return false;
      return true;
    };
  }
  if (cf.__combinatorKind === "or") {
    let children2 = cf.__combinatorChildren ?? [];
    return children2.length === 0 ? () => false : (e) => {
      for (let f of children2) if (f(e)) return true;
      return false;
    };
  }
  if (cf.__combinatorKind === "not") {
    let child = cf.__combinatorChild;
    return (e) => !child(e);
  }
  let topicCheck;
  if (filter.topic === void 0) topicCheck = () => true;
  else if (filter.topic === "*") topicCheck = () => true;
  else if (filter.topic instanceof RegExp) {
    let rx = filter.topic;
    topicCheck = (e) => rx.test(e.topic);
  } else if (typeof filter.topic == "string") {
    let t = filter.topic;
    topicCheck = (e) => e.topic === t;
  } else throw new FilterError("Filter topic must be string or RegExp");
  let sourceCheck;
  if (filter.source === void 0) sourceCheck = () => true;
  else if (typeof filter.source == "string") {
    let s = filter.source;
    sourceCheck = (e) => e.source === s;
  } else throw new FilterError("Filter source must be string");
  let severityCheck;
  if (filter.severity === void 0) severityCheck = () => true;
  else if (Array.isArray(filter.severity)) if (filter.severity.length === 0) severityCheck = () => true;
  else {
    let set = new Set(filter.severity);
    severityCheck = (e) => set.has(e.severity);
  }
  else if (typeof filter.severity == "string") {
    let sev = filter.severity;
    severityCheck = (e) => e.severity === sev;
  } else throw new FilterError("Filter severity must be string or array of strings");
  let tagsCheck;
  if (filter.tags === void 0 || filter.tags.length === 0) tagsCheck = () => true;
  else {
    let required = filter.tags.slice();
    tagsCheck = (e) => {
      let ev = e.tags;
      if (!ev || ev.length === 0) return false;
      for (let t of required) if (!ev.includes(t)) return false;
      return true;
    };
  }
  let payloadCheck = null;
  if (typeof filter.payloadPredicate == "function") {
    let fn = filter.payloadPredicate;
    payloadCheck = (e) => {
      try {
        return !!fn(e.payload);
      } catch (err) {
        throw new FilterError("payloadPredicate threw", err);
      }
    };
  }
  return (event) => !(!event || !topicCheck(event) || !sourceCheck(event) || !severityCheck(event) || !tagsCheck(event) || payloadCheck && !payloadCheck(event));
}
function matchEvent(filter, event) {
  return compileFilter(filter)(event);
}
function and(...filters) {
  return { __combinatorKind: "and", __combinatorChildren: filters.map((f) => {
    try {
      return compileFilter(f);
    } catch (e) {
      throw new FilterError("and(): invalid filter", e);
    }
  }) };
}
function or(...filters) {
  return { __combinatorKind: "or", __combinatorChildren: filters.map((f) => {
    try {
      return compileFilter(f);
    } catch (e) {
      throw new FilterError("or(): invalid filter", e);
    }
  }) };
}
function not(filter) {
  let child;
  try {
    child = compileFilter(filter);
  } catch (e) {
    throw new FilterError("not(): invalid filter", e);
  }
  return { __combinatorKind: "not", __combinatorChild: child };
}
var DEFAULT_RECORDER_MAX_SIZE = 1e4;
var EventRecorder = class {
  buffer;
  capacity;
  head = 0;
  filled = 0;
  recording = false;
  constructor(maxSize = DEFAULT_RECORDER_MAX_SIZE) {
    if (!Number.isInteger(maxSize) || maxSize <= 0) throw new RecorderError("maxSize must be a positive integer");
    this.capacity = maxSize, this.buffer = new Array(maxSize);
  }
  start(maxSize) {
    if (maxSize !== void 0 && maxSize !== this.capacity) throw new RecorderError(`start(maxSize=${maxSize}) does not match constructor capacity ${this.capacity}; construct a new recorder instead`);
    this.recording = true;
  }
  stop() {
    this.recording = false;
  }
  isRecording() {
    return this.recording;
  }
  getCapacity() {
    return this.capacity;
  }
  size() {
    return this.filled;
  }
  record(event) {
    if (!this.recording) return false;
    if (!event || typeof event != "object") throw new RecorderError("record(): event must be an object");
    return this.buffer[this.head] = event, this.head = (this.head + 1) % this.capacity, this.filled < this.capacity && this.filled++, true;
  }
  getEvents(filter) {
    let compiled = filter ? compileFilter(filter) : null, out = [];
    if (this.filled === 0) return out;
    if (this.filled < this.capacity) for (let i = 0; i < this.filled; i++) {
      let e = this.buffer[i];
      (!compiled || compiled(e)) && out.push(e);
    }
    else for (let i = 0; i < this.capacity; i++) {
      let idx = (this.head + i) % this.capacity, e = this.buffer[idx];
      (!compiled || compiled(e)) && out.push(e);
    }
    return out;
  }
  clear() {
    this.head = 0, this.filled = 0, this.buffer.fill(void 0);
  }
  export(filter) {
    return this.getEvents(filter);
  }
  exportJSON(filter, pretty) {
    try {
      return JSON.stringify(this.getEvents(filter), null, pretty ? 2 : 0);
    } catch (e) {
      throw new RecorderError("exportJSON(): serialization failed", e);
    }
  }
};
var DEFAULT_LATENCY_BUFFER = 1024;
var DEFAULT_LATENCY_SAMPLE_EVERY = 1;
var MetricsCollector = class {
  buffer;
  capacity;
  sampleEvery;
  head = 0;
  filled = 0;
  published = 0;
  delivered = 0;
  dropped = 0;
  activeSubscriptions = 0;
  activeSources = 0;
  sampledCount = 0;
  sampleCounter = 0;
  constructor(capacity = 1024, sampleEvery = 1) {
    if (!Number.isInteger(capacity) || capacity <= 0) throw new RangeError("capacity must be positive integer");
    if (!Number.isInteger(sampleEvery) || sampleEvery <= 0) throw new RangeError("sampleEvery must be positive integer");
    this.capacity = capacity, this.buffer = new Float64Array(capacity), this.sampleEvery = sampleEvery;
  }
  recordPublish() {
    this.published++;
  }
  recordDeliver() {
    this.delivered++;
  }
  recordDrop() {
    this.dropped++;
  }
  setActiveSubscriptions(n) {
    if (!Number.isInteger(n) || n < 0) throw new RangeError("activeSubscriptions must be >= 0 integer");
    this.activeSubscriptions = n;
  }
  incSubscription() {
    this.activeSubscriptions++;
  }
  decSubscription() {
    this.activeSubscriptions > 0 && this.activeSubscriptions--;
  }
  setActiveSources(n) {
    if (!Number.isInteger(n) || n < 0) throw new RangeError("activeSources must be >= 0 integer");
    this.activeSources = n;
  }
  incSource() {
    this.activeSources++;
  }
  decSource() {
    this.activeSources > 0 && this.activeSources--;
  }
  recordLatency(ms) {
    typeof ms != "number" || !Number.isFinite(ms) || ms < 0 || (this.sampleCounter++, this.sampleCounter % this.sampleEvery === 0 && (this.buffer[this.head] = ms, this.head = (this.head + 1) % this.capacity, this.filled < this.capacity && this.filled++, this.sampledCount++));
  }
  sampleCount() {
    return this.filled;
  }
  totalSamplesObserved() {
    return this.sampledCount;
  }
  avgLatency() {
    if (this.filled === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.filled; i++) sum += this.buffer[i];
    return sum / this.filled;
  }
  percentile(p) {
    if (p < 0 || p > 100) throw new RangeError("percentile must be in [0,100]");
    if (this.filled === 0) return 0;
    let copy = Array.prototype.slice.call(this.buffer.subarray(0, this.filled));
    if (copy.sort((a, b) => a - b), p === 0) return copy[0];
    if (p === 100) return copy[copy.length - 1];
    let rank = Math.ceil(p / 100 * copy.length), idx = Math.max(0, Math.min(copy.length - 1, rank - 1));
    return copy[idx];
  }
  snapshot() {
    return { eventsPublished: this.published, eventsDelivered: this.delivered, eventsDropped: this.dropped, activeSubscriptions: this.activeSubscriptions, activeSources: this.activeSources, avgLatencyMs: round3(this.avgLatency()), p50LatencyMs: round3(this.percentile(50)), p99LatencyMs: round3(this.percentile(99)) };
  }
  reset() {
    this.head = 0, this.filled = 0, this.published = 0, this.delivered = 0, this.dropped = 0, this.activeSubscriptions = 0, this.activeSources = 0, this.sampledCount = 0, this.sampleCounter = 0, this.buffer.fill(0);
  }
};
function round3(n) {
  return Number.isFinite(n) ? Math.round(n * 1e3) / 1e3 : 0;
}
var DEFAULT_NERVOUS_CONFIG = { defaultMaxSize: DEFAULT_RECORDER_MAX_SIZE, recordByDefault: false, logLevel: "info", collaborationQueueCapacity: 256, collaborationRequestTtlMs: 3e5 };
var subscriptionCounter = 0;
function newSubscriptionId() {
  subscriptionCounter++;
  try {
    if (typeof randomUUID22 == "function") return `sub-${randomUUID22()}`;
  } catch {
  }
  return `sub-${Date.now().toString(36)}-${subscriptionCounter.toString(36)}`;
}
var EventFabric = class {
  ee = new EventEmitter();
  subscribers = /* @__PURE__ */ new Map();
  topicIndex = /* @__PURE__ */ new Map();
  sources = /* @__PURE__ */ new Map();
  logger;
  config;
  recorder;
  metrics;
  recordByDefault;
  constructor(config) {
    let merged = { ...DEFAULT_NERVOUS_CONFIG, ...config ?? {} };
    this.config = merged, this.logger = config?.logger ?? (merged.logLevel === "silent" ? new SilentLogger7() : new ConsoleLogger5(merged.logLevel)), this.recorder = new EventRecorder(merged.defaultMaxSize), this.metrics = new MetricsCollector(), this.recordByDefault = !!merged.recordByDefault, this.recordByDefault && this.recorder.start(), this.ee.setMaxListeners(0);
  }
  getLogger() {
    return this.logger;
  }
  isRecording() {
    return this.recorder.isRecording();
  }
  startRecording() {
    this.recorder.start();
  }
  stopRecording() {
    this.recorder.stop();
  }
  subscribe(filter, idOrHandler, maybeHandler) {
    if (!filter || typeof filter != "object") throw new FabricError("subscribe(): filter must be an object");
    let id, handler;
    if (typeof idOrHandler == "function") id = newSubscriptionId(), handler = idOrHandler;
    else if (typeof idOrHandler == "string" && typeof maybeHandler == "function") {
      if (id = idOrHandler, handler = maybeHandler, this.subscribers.has(id)) throw new FabricError(`subscribe(): subscription id '${id}' already exists`);
    } else throw new FabricError("subscribe(): invalid arguments");
    if (typeof handler != "function") throw new FabricError("subscribe(): handler must be a function");
    let compiled = compileFilter(filter), topicKey = indexKeyForFilter(filter), sub = { id, filter, compiled, handler, topicKey };
    this.subscribers.set(id, sub);
    let bucket = this.topicIndex.get(topicKey);
    return bucket || (bucket = /* @__PURE__ */ new Set(), this.topicIndex.set(topicKey, bucket)), bucket.add(id), this.metrics.setActiveSubscriptions(this.subscribers.size), this.logger.debug("subscribe", { id, topicKey }), id;
  }
  unsubscribe(id) {
    let sub = this.subscribers.get(id);
    if (!sub) return false;
    this.subscribers.delete(id);
    let bucket = this.topicIndex.get(sub.topicKey);
    return bucket && (bucket.delete(id), bucket.size === 0 && this.topicIndex.delete(sub.topicKey)), this.metrics.setActiveSubscriptions(this.subscribers.size), this.logger.debug("unsubscribe", { id }), true;
  }
  subscriptionCount() {
    return this.subscribers.size;
  }
  topicCount() {
    return this.topicIndex.size;
  }
  publish(event) {
    if (!event || typeof event != "object") throw new FabricError("publish(): event must be an object");
    if (typeof event.topic != "string" || !event.topic) throw new FabricError("publish(): event.topic must be a non-empty string");
    let start = process.hrtime.bigint();
    this.metrics.recordPublish(), this.recorder.isRecording() && this.recorder.record(event);
    let delivered = 0, errored = 0, exactBucket = this.topicIndex.get(event.topic), wildcardBucket = this.topicIndex.get("*"), seen = /* @__PURE__ */ new Set(), runBucket = (bucket) => {
      if (!bucket || bucket.size === 0) return;
      let ids = Array.from(bucket);
      for (let id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        let sub = this.subscribers.get(id);
        if (!sub) continue;
        let matched = false;
        try {
          matched = sub.compiled(event);
        } catch (e) {
          errored++;
          let err = e instanceof Error ? e : new FabricError("filter threw", e);
          this.logger.warn("publish: filter threw", { id, error: err.message });
          try {
            this.ee.emit("error", err, event);
          } catch {
          }
          this.metrics.recordDrop();
          continue;
        }
        if (matched) try {
          sub.handler(event), delivered++, this.metrics.recordDeliver();
        } catch (e) {
          errored++;
          let err = e instanceof Error ? e : new FabricError("handler threw", e);
          this.logger.warn("publish: handler threw", { id, error: err.message });
          try {
            this.ee.emit("error", err, event);
          } catch {
          }
          this.metrics.recordDrop();
        }
      }
    };
    runBucket(exactBucket), runBucket(wildcardBucket);
    let elapsedNs = Number(process.hrtime.bigint() - start);
    if (this.metrics.recordLatency(elapsedNs / 1e6), delivered === 0 && errored === 0) try {
      this.ee.emit("dropped", event);
    } catch {
    }
    try {
      this.ee.emit("published", event);
    } catch {
    }
    return delivered;
  }
  attach(source) {
    if (!source || typeof source != "object") throw new FabricError("attach(): source must be an object");
    if (typeof source.id != "string" || !source.id) throw new FabricError("attach(): source.id must be non-empty string");
    if (this.sources.has(source.id)) throw new FabricError(`attach(): source '${source.id}' already attached`);
    if (typeof source.start != "function" || typeof source.stop != "function") throw new FabricError("attach(): source must implement start() and stop()");
    this.sources.set(source.id, source), this.metrics.setActiveSources(this.sources.size);
    let sink = (event) => {
      try {
        this.publish(event);
      } catch (e) {
        let err = e instanceof Error ? e : new FabricError("source sink publish failed", e);
        this.logger.warn("source sink error", { sourceId: source.id, error: err.message });
      }
    };
    try {
      source.start(sink), this.logger.debug("attached source", { id: source.id });
    } catch (e) {
      throw this.sources.delete(source.id), this.metrics.setActiveSources(this.sources.size), new FabricError(`attach(): source '${source.id}' start() threw`, e);
    }
  }
  detach(sourceId) {
    let source = this.sources.get(sourceId);
    if (!source) return false;
    try {
      source.stop();
    } catch (e) {
      this.logger.warn("source stop threw", { sourceId, error: e.message });
    }
    return this.sources.delete(sourceId), this.metrics.setActiveSources(this.sources.size), this.logger.debug("detached source", { id: sourceId }), true;
  }
  detachAll() {
    for (let id of Array.from(this.sources.keys())) this.detach(id);
  }
  listSources() {
    return Array.from(this.sources.keys());
  }
  sourceCount() {
    return this.sources.size;
  }
  on(event, handler) {
    return this.ee.on(event, handler), this;
  }
  off(event, handler) {
    return this.ee.off(event, handler), this;
  }
  shutdown() {
    this.detachAll(), this.recorder.stop(), this.subscribers.clear(), this.topicIndex.clear(), this.metrics.setActiveSubscriptions(0), this.metrics.setActiveSources(0), this.ee.removeAllListeners();
  }
};
function indexKeyForFilter(filter) {
  return filter.topic === void 0 ? "*" : typeof filter.topic == "string" ? filter.topic === "*" ? "*" : filter.topic : (filter.topic instanceof RegExp, "*");
}
function validateRoute(route2) {
  if (!route2 || typeof route2 != "object") throw new RouterError("Route must be an object");
  if (typeof route2.id != "string" || !route2.id) throw new RouterError("Route.id must be non-empty string");
  if (!route2.filter || typeof route2.filter != "object") throw new RouterError("Route.filter must be an object");
  if (route2.destination !== "handler" && route2.destination !== "queue" && route2.destination !== "topic") throw new RouterError(`Route.destination must be 'handler' | 'queue' | 'topic', got: ${String(route2.destination)}`);
  if (typeof route2.target != "string" || !route2.target) throw new RouterError("Route.target must be non-empty string");
  if (typeof route2.priority != "number" || !Number.isFinite(route2.priority)) throw new RouterError("Route.priority must be a finite number");
}
var EventRouter = class {
  routes = /* @__PURE__ */ new Map();
  order = [];
  addRoute(route2) {
    if (validateRoute(route2), this.routes.has(route2.id)) throw new RouterError(`Route with id '${route2.id}' already exists`);
    this.routes.set(route2.id, { route: route2, compiled: compileFilter(route2.filter) }), this.order.push(route2.id), this.order.sort((a, b) => {
      let pa = this.routes.get(a).route.priority, pb = this.routes.get(b).route.priority;
      return pa !== pb ? pa - pb : a < b ? -1 : a > b ? 1 : 0;
    });
  }
  removeRoute(id) {
    return this.routes.has(id) ? (this.routes.delete(id), this.order = this.order.filter((rid) => rid !== id), true) : false;
  }
  getRoute(id) {
    let entry = this.routes.get(id);
    return entry ? { ...entry.route, filter: { ...entry.route.filter } } : null;
  }
  listRoutes() {
    return this.order.slice();
  }
  size() {
    return this.routes.size;
  }
  route(event) {
    if (!event || typeof event != "object") throw new RouterError("route(): event must be an object");
    let destinations = [];
    for (let id of this.order) {
      let entry = this.routes.get(id);
      try {
        entry.compiled(event) && destinations.push({ routeId: entry.route.id, destination: entry.route.destination, target: entry.route.target, priority: entry.route.priority });
      } catch (e) {
        throw new RouterError(`route(): filter for route '${id}' threw`, e);
      }
    }
    return { event, destinations };
  }
  clear() {
    this.routes.clear(), this.order = [];
  }
};
var routeCounter = 0;
function makeRouteId(prefix = "route") {
  return routeCounter++, `${prefix}-${routeCounter.toString(36)}`;
}
function makeRoute(filter, destination, target, priority = 0, id) {
  return { id: id ?? makeRouteId(), filter, destination, target, priority };
}
var DEFAULT_QUEUE_CAPACITY = 1024;
var EventQueue = class {
  buf = [];
  capacity;
  waitWhenFull;
  waiters = [];
  dequeuers = [];
  producersPending = 0;
  stopped = false;
  constructor(opts) {
    let o = opts ?? {};
    if (this.waitWhenFull = !!o.waitWhenFull, o.capacity !== void 0 && (!Number.isInteger(o.capacity) || o.capacity < 0)) throw new QueueError("capacity must be a non-negative integer");
    this.capacity = o.capacity && o.capacity > 0 ? o.capacity : this.waitWhenFull ? DEFAULT_QUEUE_CAPACITY : 0;
  }
  getCapacity() {
    return this.capacity;
  }
  isBlocking() {
    return this.waitWhenFull;
  }
  size() {
    return this.buf.length;
  }
  isEmpty() {
    return this.buf.length === 0;
  }
  isFull() {
    return this.capacity > 0 && this.buf.length >= this.capacity;
  }
  isStopped() {
    return this.stopped;
  }
  enqueue(event) {
    if (this.stopped) throw new QueueError("enqueue(): queue is stopped");
    if (!event || typeof event != "object") throw new QueueError("enqueue(): event must be an object");
    if (this.capacity === 0 || this.buf.length < this.capacity) return this.pushInternal(event), true;
    if (!this.waitWhenFull) throw new QueueError("enqueue(): queue is full");
    return this.producersPending++, new Promise((resolve, reject) => {
      this.waiters.push({ resolve: () => {
        this.producersPending--;
        try {
          this.pushInternal(event), resolve(true);
        } catch (e) {
          reject(e instanceof Error ? e : new QueueError("enqueue failed", e));
        }
      }, reject: (e) => {
        this.producersPending--, reject(e);
      } });
    });
  }
  dequeue() {
    return this.buf.length > 0 ? Promise.resolve(this.popInternal()) : this.stopped ? Promise.resolve(null) : new Promise((resolve, reject) => {
      this.dequeuers.push({ resolve: (e) => resolve(e), reject: (e) => reject(e) });
    });
  }
  async drain() {
    for (; this.producersPending > 0 || this.waiters.length > 0; ) await nextTick();
  }
  stop() {
    if (!this.stopped) {
      this.stopped = true;
      for (let w of this.waiters) w.reject(new QueueError("queue stopped"));
      this.waiters.length = 0;
      for (let d of this.dequeuers) d.resolve(null);
      this.dequeuers.length = 0;
    }
  }
  clear() {
    this.buf.length = 0;
  }
  pushInternal(event) {
    if (this.buf.push(event), this.dequeuers.length > 0) {
      let next = this.dequeuers.shift(), e = this.buf.shift();
      next.resolve(e);
    }
  }
  popInternal() {
    let e = this.buf.shift();
    return this.waiters.length > 0 && this.waiters.shift().resolve(), e;
  }
};
function nextTick() {
  return new Promise((resolve) => setImmediate(resolve));
}
var DEFAULT_COLLABORATION_QUEUE_CAPACITY = 256;
var DEFAULT_COLLABORATION_REQUEST_TTL_MS = 3e5;
var CollaborationRequestQueue = class {
  queue = [];
  capacity;
  ttlMs;
  pending = /* @__PURE__ */ new Map();
  constructor(opts) {
    this.capacity = opts?.capacity ?? DEFAULT_COLLABORATION_QUEUE_CAPACITY, this.ttlMs = opts?.ttlMs ?? DEFAULT_COLLABORATION_REQUEST_TTL_MS;
  }
  enqueue(event) {
    if (this.evictExpired(), this.queue.length >= this.capacity) throw new QueueError(`collaboration queue is full (${this.capacity})`);
    let tracked = { event, status: "pending", updatedAt: Date.now() };
    this.queue.push(tracked);
    let waiter = this.pending.values().next().value;
    return waiter && (this.pending.delete(this.pending.keys().next().value), clearTimeout(waiter.timer), waiter.resolve(tracked)), tracked;
  }
  dequeue() {
    this.evictExpired();
    let next = this.queue.find((r) => r.status === "pending");
    if (next) return next.status = "processing", next.updatedAt = Date.now(), Promise.resolve(next);
    let reconnect = this.queue.find((r) => r.status === "retrying");
    if (reconnect) return reconnect.status = "processing", reconnect.updatedAt = Date.now(), Promise.resolve(reconnect);
    let key = `waiter_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve, reject) => {
      let timer = setTimeout(() => {
        this.pending.has(key) && (this.pending.delete(key), resolve(null));
      }, this.ttlMs);
      typeof timer.unref == "function" && timer.unref(), this.pending.set(key, { resolve: (v) => resolve(v), reject: (e) => reject(e), timer });
    });
  }
  complete(requestId) {
    let tracked = this.queue.find((r) => r.event.id === requestId);
    return tracked ? (tracked.status = "completed", tracked.updatedAt = Date.now(), true) : false;
  }
  fail(requestId, error) {
    let tracked = this.queue.find((r) => r.event.id === requestId);
    return tracked ? (tracked.status = "failed", tracked.error = error, tracked.updatedAt = Date.now(), true) : false;
  }
  retry(requestId) {
    let tracked = this.queue.find((r) => r.event.id === requestId);
    if (!tracked || tracked.status !== "failed") return false;
    tracked.status = "retrying", tracked.event.isReconnect = true, tracked.event.retryCount = (tracked.event.retryCount ?? 0) + 1, tracked.updatedAt = Date.now();
    let waiter = this.pending.values().next().value;
    return waiter && (this.pending.delete(this.pending.keys().next().value), clearTimeout(waiter.timer), waiter.resolve(tracked)), true;
  }
  surfaceReconnects() {
    return this.queue.filter((r) => r.status === "retrying");
  }
  all() {
    return this.evictExpired(), [...this.queue];
  }
  byStatus(status) {
    return this.all().filter((r) => r.status === status);
  }
  size() {
    return this.evictExpired(), this.queue.length;
  }
  gc() {
    let before = this.queue.length;
    this.evictExpired();
    for (let i = this.queue.length - 1; i >= 0; i--) this.queue[i].status === "completed" && this.queue.splice(i, 1);
    return before - this.queue.length;
  }
  pendingWaiters() {
    return this.pending.size;
  }
  stop() {
    this.queue.length = 0;
    for (let [, w] of this.pending) clearTimeout(w.timer), w.reject(new QueueError("queue stopped"));
    this.pending.clear();
  }
  evictExpired() {
    let now = Date.now();
    for (let i = this.queue.length - 1; i >= 0; i--) {
      let r = this.queue[i];
      r.status === "pending" && now > r.event.expiresAt && (r.status = "expired", r.updatedAt = now);
    }
  }
};
var FilesystemSource = class {
  id;
  path;
  recursive;
  severity;
  tags;
  watcher = null;
  sink = null;
  constructor(opts) {
    if (!opts || typeof opts.path != "string" || !opts.path) throw new SourceError("FilesystemSource: path is required");
    this.id = opts.id ?? "filesystem", this.path = opts.path, this.recursive = !!opts.recursive, this.severity = opts.severity ?? "info", this.tags = opts.tags;
  }
  isAvailable() {
    return this.watcher !== null;
  }
  start(sink) {
    if (!this.watcher) {
      this.sink = sink;
      try {
        this.watcher = watch(this.path, { recursive: this.recursive }, (event, filename) => {
          if (!this.sink) return;
          let payload = { path: filename ? String(filename) : "", event }, ev = createEvent2("fs.change", this.id, payload, { severity: this.severity, tags: this.tags, metadata: { directory: this.path } });
          try {
            this.sink(ev);
          } catch {
          }
        }), this.watcher.on("error", (err) => {
          let ev = createEvent2("fs.error", this.id, { error: err instanceof Error ? err.message : String(err), directory: this.path }, { severity: "error" });
          try {
            this.sink?.(ev);
          } catch {
          }
        });
      } catch (e) {
        throw this.watcher = null, new SourceError(`FilesystemSource: cannot watch '${this.path}'`, e);
      }
    }
  }
  stop() {
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch {
      }
      this.watcher = null;
    }
    this.sink = null;
  }
};
var DEFAULT_OS_INTERVAL_MS = 5e3;
var OSSource = class {
  id;
  intervalMs;
  severity;
  tags;
  timer = null;
  sink = null;
  constructor(opts) {
    let o = opts ?? {};
    if (this.id = o.id ?? "os", this.intervalMs = o.intervalMs ?? DEFAULT_OS_INTERVAL_MS, this.severity = o.severity ?? "info", this.tags = o.tags, !Number.isFinite(this.intervalMs) || this.intervalMs <= 0) throw new RangeError("OSSource: intervalMs must be a positive number");
  }
  start(sink) {
    this.timer || (this.sink = sink, this.sample(), this.timer = setInterval(() => this.sample(), this.intervalMs), typeof this.timer.unref == "function" && this.timer.unref());
  }
  stop() {
    this.timer && (clearInterval(this.timer), this.timer = null), this.sink = null;
  }
  sample() {
    if (!this.sink) return;
    let cpus22 = os2.cpus(), loadavg2 = os2.loadavg(), total = os2.totalmem(), free = os2.freemem(), used = total - free, usedPct = total > 0 ? used / total : 0, payload = { cpus: cpus22, loadavg: [loadavg2[0] ?? 0, loadavg2[1] ?? 0, loadavg2[2] ?? 0], memory: { total, free, used, usedPct }, uptime: os2.uptime() }, ev = createEvent2("os.metrics", this.id, payload, { severity: this.severity, tags: this.tags });
    try {
      this.sink(ev);
    } catch {
    }
  }
};
var DEFAULT_PROCESS_INTERVAL_MS = 5e3;
var ProcessSource = class {
  id;
  intervalMs;
  severity;
  tags;
  timer = null;
  sink = null;
  seen = /* @__PURE__ */ new Map();
  warnedUnavailable = false;
  polling = false;
  constructor(opts) {
    let o = opts ?? {};
    if (this.id = o.id ?? "process", this.intervalMs = o.intervalMs ?? DEFAULT_PROCESS_INTERVAL_MS, this.severity = o.severity ?? "info", this.tags = o.tags, !Number.isFinite(this.intervalMs) || this.intervalMs <= 0) throw new RangeError("ProcessSource: intervalMs must be a positive number");
  }
  start(sink) {
    this.timer || (this.sink = sink, this.timer = setInterval(() => {
      this.poll();
    }, this.intervalMs), typeof this.timer.unref == "function" && this.timer.unref(), this.poll());
  }
  stop() {
    this.timer && (clearInterval(this.timer), this.timer = null), this.sink = null, this.seen.clear();
  }
  isAvailable() {
    return !this.warnedUnavailable;
  }
  async poll() {
    if (!(!this.sink || this.polling)) {
      this.polling = true;
      try {
        let entries = await this.snapshot();
        if (entries === null) {
          if (!this.warnedUnavailable) {
            this.warnedUnavailable = true;
            let ev = createEvent2("process.warning", this.id, { reason: "process list command unavailable" }, { severity: "warn" });
            this.emit(ev);
          }
          return;
        }
        this.warnedUnavailable = false;
        let currentPids = /* @__PURE__ */ new Set();
        for (let entry of entries) if (currentPids.add(entry.pid), !this.seen.has(entry.pid)) {
          this.seen.set(entry.pid, entry);
          let ev = createEvent2("process.spawn", this.id, { pid: entry.pid, name: entry.name }, { severity: this.severity, tags: this.tags });
          this.emit(ev);
        }
        for (let [pid, entry] of this.seen) if (!currentPids.has(pid)) {
          this.seen.delete(pid);
          let ev = createEvent2("process.exit", this.id, { pid, name: entry.name }, { severity: this.severity, tags: this.tags });
          this.emit(ev);
        }
      } finally {
        this.polling = false;
      }
    }
  }
  emit(ev) {
    try {
      this.sink?.(ev);
    } catch {
    }
  }
  snapshot() {
    let platform2 = os22.platform(), cmd = platform2 === "win32" ? "tasklist /FO CSV /NH" : "ps -A -o pid=,comm=";
    return new Promise((resolve) => {
      exec(cmd, { timeout: 5e3 }, (err, stdout) => {
        if (err || !stdout) {
          resolve(null);
          return;
        }
        let out = [], lines = stdout.split(/\r?\n/);
        for (let raw of lines) {
          let line = raw.trim();
          if (!line) continue;
          let entry = platform2 === "win32" ? parseTasklistLine(line) : parsePsLine(line);
          entry && out.push(entry);
        }
        resolve(out);
      });
    });
  }
};
function parsePsLine(line) {
  let match = line.match(/^\s*(\d+)\s+(.+)$/);
  if (!match) return null;
  let pid = Number(match[1]);
  return !Number.isInteger(pid) || pid <= 0 ? null : { pid, name: match[2].trim() };
}
function parseTasklistLine(line) {
  let cells = line.split('","').map((s) => s.replace(/^"|"$/g, ""));
  if (cells.length < 2) return null;
  let name = cells[0], pid = Number(cells[1]);
  return !name || !Number.isInteger(pid) || pid < 0 ? null : { pid, name };
}
var DEFAULT_NETWORK_INTERVAL_MS = 5e3;
var NetworkSource = class {
  id;
  intervalMs;
  severity;
  tags;
  timer = null;
  sink = null;
  warned = false;
  constructor(opts) {
    let o = opts ?? {};
    if (this.id = o.id ?? "network", this.intervalMs = o.intervalMs ?? DEFAULT_NETWORK_INTERVAL_MS, this.severity = o.severity ?? "info", this.tags = o.tags, !Number.isFinite(this.intervalMs) || this.intervalMs <= 0) throw new RangeError("NetworkSource: intervalMs must be a positive number");
  }
  start(sink) {
    this.timer || (this.sink = sink, this.sample(), this.timer = setInterval(() => this.sample(), this.intervalMs), typeof this.timer.unref == "function" && this.timer.unref());
  }
  stop() {
    this.timer && (clearInterval(this.timer), this.timer = null), this.sink = null;
  }
  sample() {
    if (!this.sink) return;
    let interfaces = readLinuxNetDev();
    if (interfaces === null) {
      if (!this.warned) {
        this.warned = true;
        let ev = createEvent2("net.warning", this.id, { reason: "/proc/net/dev unavailable on this platform; reporting interface names only" }, { severity: "warn" });
        this.emit(ev);
      }
      let fallback = Object.keys(os3.networkInterfaces() ?? {}).map((name) => ({ name, rxBytes: 0, txBytes: 0 }));
      this.emitStats(fallback);
      return;
    }
    this.emitStats(interfaces);
  }
  emitStats(interfaces) {
    let rx = 0, tx = 0;
    for (let i of interfaces) rx += i.rxBytes, tx += i.txBytes;
    let ev = createEvent2("net.stats", this.id, { interfaces, rx_bytes: rx, tx_bytes: tx }, { severity: this.severity, tags: this.tags });
    this.emit(ev);
  }
  emit(ev) {
    try {
      this.sink?.(ev);
    } catch {
    }
  }
};
function readLinuxNetDev() {
  let data;
  try {
    data = readFileSync4("/proc/net/dev", "utf8");
  } catch {
    return null;
  }
  let lines = data.split(`
`), out = [];
  for (let i = 2; i < lines.length; i++) {
    let line = lines[i];
    if (!line || !line.trim()) continue;
    let colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;
    let name = line.slice(0, colonIdx).trim(), rest = line.slice(colonIdx + 1).trim().split(/\s+/), rxBytes = Number(rest[0] ?? 0), txBytes = Number(rest[8] ?? 0);
    !Number.isFinite(rxBytes) || !Number.isFinite(txBytes) || out.push({ name, rxBytes, txBytes });
  }
  return out;
}
var CustomSource = class {
  id;
  producer;
  severity;
  tags;
  sink = null;
  started = false;
  onStop = null;
  constructor(opts) {
    if (!opts || typeof opts.producer != "function") throw new SourceError("CustomSource: producer function is required");
    this.id = opts.id ?? "custom", this.producer = opts.producer, this.severity = opts.severity ?? "info", this.tags = opts.tags;
  }
  start(sink) {
    if (this.started) return;
    this.sink = sink, this.started = true;
    let emit = (input) => {
      if (!this.sink) return;
      let ev;
      if (input && typeof input == "object" && "id" in input && typeof input.id == "string" && "timestamp" in input) ev = input;
      else {
        let i = input;
        ev = createEvent2(i.topic, this.id, i.payload, { severity: i.severity ?? this.severity, tags: i.tags ?? this.tags, metadata: i.metadata });
      }
      try {
        this.sink(ev);
      } catch {
      }
    };
    try {
      let ret = this.producer(emit);
      typeof ret == "function" && (this.onStop = ret);
    } catch (e) {
      throw this.started = false, this.sink = null, new SourceError("CustomSource: producer threw", e);
    }
  }
  stop() {
    if (this.onStop) {
      try {
        this.onStop();
      } catch {
      }
      this.onStop = null;
    }
    this.started = false, this.sink = null;
  }
};
var NotificationSource = class {
  id;
  severity;
  tags;
  sink = null;
  constructor(opts) {
    let o = opts ?? {};
    this.id = o.id ?? "notifications", this.severity = o.severity ?? "info", this.tags = o.tags;
  }
  start(sink) {
    this.sink = sink;
  }
  stop() {
    this.sink = null;
  }
  notify(topic, payload, opts) {
    if (!this.sink) return null;
    if (typeof topic != "string" || !topic) throw new SourceError("notify(): topic is required");
    let fullTopic = topic.startsWith("notification.") ? topic : `notification.${topic}`, ev = createEvent2(fullTopic, this.id, payload, { severity: opts?.severity ?? this.severity, tags: opts?.tags ?? this.tags, metadata: opts?.metadata });
    try {
      this.sink(ev);
    } catch {
    }
    return ev;
  }
};
var ApplicationSource = class {
  id;
  severity;
  tags;
  emitter;
  ownsEmitter;
  sink = null;
  listener = null;
  constructor(opts) {
    let o = opts ?? {};
    this.id = o.id ?? "application", this.severity = o.severity ?? "info", this.tags = o.tags, o.emitter ? (this.emitter = o.emitter, this.ownsEmitter = false) : (this.emitter = new EventEmitter2(), this.emitter.setMaxListeners(0), this.ownsEmitter = true);
  }
  start(sink) {
    this.listener || (this.sink = sink, this.listener = (req) => {
      if (!this.sink) return;
      let payload = normalizeRequest(req), ev = createEvent2("app.request", this.id, payload, { severity: this.severity, tags: this.tags });
      try {
        this.sink(ev);
      } catch {
      }
    }, this.emitter.on("request", this.listener));
  }
  stop() {
    this.listener && (this.emitter.off("request", this.listener), this.listener = null), this.sink = null;
  }
  recordRequest(req) {
    this.emitter.emit("request", req);
  }
  getEmitter() {
    return this.emitter;
  }
};
function normalizeRequest(req) {
  if (!req || typeof req != "object") return { method: "UNKNOWN", url: "" };
  let r = req;
  return { method: typeof r.method == "string" ? r.method : "UNKNOWN", url: typeof r.url == "string" ? r.url : "", ...r.headers ? { headers: r.headers } : {}, ...r.body !== void 0 ? { body: r.body } : {} };
}
var StubSource = class {
  id;
  name;
  severity;
  emitStatus;
  simulationIntervalMs;
  sink = null;
  timer = null;
  constructor(name, opts) {
    let o = opts ?? {};
    this.name = name, this.id = o.id ?? name, this.severity = o.severity ?? "debug", this.emitStatus = o.emitStatus !== false, this.simulationIntervalMs = o.simulationIntervalMs ?? 0;
  }
  start(sink) {
    this.sink = sink, this.emitStatus && this.emit(createEvent2(`stub.${this.name}.started`, this.id, { message: `${this.name} source is a stub; no platform bindings attached` }, { severity: this.severity })), this.simulationIntervalMs > 0 && (this.timer = setInterval(() => {
      let sample = this.produceSample();
      sample !== null && this.emit(createEvent2(`stub.${this.name}.sample`, this.id, sample, { severity: this.severity }));
    }, this.simulationIntervalMs), typeof this.timer.unref == "function" && this.timer.unref());
  }
  stop() {
    this.timer && (clearInterval(this.timer), this.timer = null), this.sink = null;
  }
  isRunning() {
    return this.sink !== null;
  }
  produceSample() {
    return null;
  }
  emit(ev) {
    try {
      this.sink?.(ev);
    } catch {
    }
  }
};
var UsbSource = class extends StubSource {
  constructor(opts) {
    super("usb", opts);
  }
  produceSample() {
    return { devices: [], simulated: true };
  }
};
var BluetoothSource = class extends StubSource {
  constructor(opts) {
    super("bluetooth", opts);
  }
  produceSample() {
    return { devices: [], simulated: true };
  }
};
var SensorSource = class extends StubSource {
  constructor(opts) {
    super("sensor", opts);
  }
  produceSample() {
    return { readings: {}, simulated: true };
  }
};
var CameraSource = class extends StubSource {
  constructor(opts) {
    super("camera", opts);
  }
  produceSample() {
    return { frame: null, simulated: true };
  }
};
var MicrophoneSource = class extends StubSource {
  constructor(opts) {
    super("microphone", opts);
  }
  produceSample() {
    return { sample: null, simulated: true };
  }
};
export {
  AES_256_KEY_BYTES,
  AES_GCM_IV_BYTES,
  AES_GCM_TAG_BYTES,
  ALL_CONTEXT_DETECTORS,
  ALL_PATTERN_DETECTORS,
  ALL_ROLES,
  ATTESTATION_QUOTE_VERSION,
  AccessDeniedError,
  AccessEnforcer,
  AccessPolicySet,
  AnalysisCollector,
  AnalysisError,
  AnonymizeError,
  Anonymizer,
  ApiValidationError,
  ApplicationSource,
  AttestError,
  AttestationError,
  AuthenticationWorkflow,
  BACKUP_VERSION,
  BluetoothSource,
  BoundaryError,
  CHALLENGE_DECISION_THRESHOLD,
  COMMITMENT_BYTES,
  COMMITMENT_NONCE_BYTES,
  CONFLICT_TYPES,
  CameraSource,
  CapabilityGrantManager,
  ChainError,
  ChallengeError,
  CollaborationLedger,
  CollaborationRequestQueue,
  CompatibilityError,
  ComplianceError,
  ConfidenceError,
  ConfidenceEstimator,
  ConflictDetector,
  ConflictResolver,
  ConsensusBuilder,
  ConsensusError,
  ConstitutionError,
  ContractsError,
  CoordinationError,
  Coordinator,
  Cortex,
  CortexError,
  CouncilError,
  CredentialError,
  CustomSource,
  CustomsShield,
  CustomsShieldError,
  DEFAULT_AGING_POLICY,
  DEFAULT_ATTESTATION_FRESHNESS_MS,
  DEFAULT_CHALLENGE_BYTES,
  DEFAULT_CHALLENGE_TTL_MS,
  DEFAULT_COMPACT_THRESHOLD_BYTES,
  DEFAULT_CONSENSUS_THRESHOLD,
  DEFAULT_COUNTRY_SANCTIONS,
  DEFAULT_FACTOR_WEIGHTS,
  DEFAULT_LATENCY_BUFFER,
  DEFAULT_LATENCY_SAMPLE_EVERY,
  DEFAULT_MAX_DEBATE_ROUNDS,
  DEFAULT_NERVOUS_CONFIG,
  DEFAULT_NETWORK_INTERVAL_MS,
  DEFAULT_NONCE_BYTES,
  DEFAULT_NONCE_TTL_MS,
  DEFAULT_OS_INTERVAL_MS,
  DEFAULT_OUTLIER_THRESHOLD,
  DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS,
  DEFAULT_POLICY_SESSION_TTL_MS,
  DEFAULT_PROCESS_INTERVAL_MS,
  DEFAULT_PRODUCT_RESTRICTIONS,
  DEFAULT_QUEUE_CAPACITY,
  DEFAULT_RECORDER_MAX_SIZE,
  DEFAULT_RENDER_CONFIG,
  DEFAULT_RETRY_POLICY,
  DEFAULT_RULE_SET,
  DEFAULT_SESSION_TTL_MS,
  DEFAULT_SYNTHESIS_THRESHOLD,
  DEFAULT_VIEWPORT,
  DIVERGENT_CONTENT_MIN_OVERLAP,
  DIVERGENT_REASONING_MAX_OVERLAP,
  DOCUMENT_STATUSES,
  DebateError,
  DebateFacilitator,
  DecompositionError,
  DecryptionError,
  DetectorError,
  DetectorRegistry,
  DeviceFingerprint,
  DocumentError,
  ENFORCEMENT_POINTS,
  EmergencyController,
  EmergencyError,
  EncryptionError,
  EnforcementEngine,
  EnforcementError,
  EpisodicMemory,
  EpisodicMemoryError,
  EventError,
  EventFabric,
  EventQueue,
  EventRecorder,
  EventReplayer,
  EventRouter,
  FACTUAL_OVERLAP_THRESHOLD,
  FabricError,
  FileLedgerStore,
  FileStorage,
  FilesystemSource,
  FilterError,
  FingerprintError,
  FullRedactor,
  GENESIS_PREV_HASH,
  GeneralizeRedactor,
  GoalError,
  GoalManager,
  Graph,
  GraphError,
  HIGH_RISK_TRANSSHIPMENT,
  HSCodeError,
  HardwareKeyError,
  HardwareValidationError,
  HardwareValidator,
  HashRedactor,
  HierarchyError,
  IDENTITY_VIEWPORT,
  INDICATOR_WEIGHTS,
  Identity,
  InMemoryLedgerStore,
  InMemoryMemoryStore,
  InMemorySessionStore,
  InMemoryStorage,
  IndexError,
  InvertedIndex,
  KeyGenerationError,
  KeyringError,
  KeyringWallet,
  KnowledgeError,
  KnowledgeRegistry,
  LINUX_MACHINE_ID_PATHS,
  LayoutError,
  LedgerChain,
  LedgerError,
  LinkGraph,
  LocalTimestampAuthority,
  LongTermMemory,
  LongTermMemoryError,
  MANIFEST_ERROR_CODES,
  ManifestError,
  MaskRedactor,
  MemoryError,
  MemorySystem,
  MerkleError,
  MerkleTree,
  MetricsCollector,
  MicrophoneSource,
  MinorityOpinionTracker,
  MultiDeviceSync,
  NervousSystemError,
  NetworkSource,
  NonceError,
  NonceStore,
  NotificationSource,
  OPPOSING_CONFIDENCE_THRESHOLD,
  OSSource,
  PermissionModel,
  Planner,
  PlanningError,
  PolicyError,
  ProceduralMemory,
  ProceduralMemoryError,
  ProcessSource,
  PublishingError,
  QueueError,
  REDACTED,
  RESOLUTION_STRATEGIES,
  RULE_CATEGORIES,
  RecorderError,
  RecoveryError,
  RedactionError,
  ReplayError,
  ResourceError,
  ResourceManager,
  RestrictionError,
  RetryError,
  RiskError,
  Role,
  RoleManager,
  Router,
  RouterError,
  RuleError,
  SCHEMA_TYPES,
  SECTION_TYPES,
  SENSITIVE_METADATA_KEYS,
  SESSION_TOKEN_BYTES,
  SEVERITY_HIGH_GAP,
  SEVERITY_MEDIUM_GAP,
  STATE_ORDER,
  STATE_RANK,
  STRONG_CONSENSUS_RATIO,
  SafetyChecker,
  SafetyError,
  SanctionsError,
  Scheduler,
  SchedulerError,
  SchemaError,
  ScoringError,
  SelectionModel,
  SemanticMemory,
  SemanticMemoryError,
  SensorSource,
  SessionError,
  SessionManager,
  SignatureError,
  SoftwareAttestationProvider,
  SoftwareKeyProvider,
  SourceError,
  SpecialistRegistry,
  StorageError,
  StoreError,
  StubSource,
  SynthesisError,
  SynthesizeRedactor,
  TIMESTAMP_TOKEN_VERSION,
  TRUST_DECISION_THRESHOLD,
  TamperError,
  TimestampError,
  TokenRedactor,
  ToolError,
  ToolRegistry,
  TopologyTracker,
  TrustEvaluationError,
  TrustEvaluator,
  UsbSource,
  ValidationError,
  Validator,
  VerificationError,
  WALLET_MASTER_KEY_BYTES,
  WALLET_PBKDF2_ITERATIONS,
  WALLET_SALT_BYTES,
  WILDCARD,
  WeaveError,
  WorkflowEngine,
  WorkingMemory,
  WorkingMemoryError,
  globDir as _globDir,
  _internal,
  addressDetector,
  ageScore,
  aggregateReports,
  aggregateScore,
  aggregateScores,
  analyzeVulnerabilities,
  ancestors,
  and,
  anonymize,
  apiKeyDetector,
  applyDelta,
  applyRedactions,
  applyViewport,
  assertClean,
  assertDocumentClean,
  assertManifest,
  assertValidContract,
  assertValidKey,
  backoffDelay,
  bandFor,
  base58Encode,
  bfsPath,
  buildBundleFromParts,
  buildDefaultCatalog,
  buildImportDeclaration,
  buildManifest,
  buildPolicy,
  buildSanctionsRecord,
  buildTrustScore,
  calculateDuty,
  can,
  canOverride,
  canonicalCredentialBytes,
  canonicalQuoteBytes,
  canonicalSerialize,
  canonicalSerializeToString,
  canonicalTimestampBytes,
  chapter,
  checkBackwardCompat,
  checkEmbargoes,
  checkLicenses,
  checkRestrictedOrigins,
  children,
  classifyConsensus,
  clearConditionCache,
  cloneEvent,
  collectDeviceSignals,
  commit,
  compareParsedSemver,
  compareSemver,
  compareVersions,
  compileFilter,
  compileSchema,
  compress,
  computeDelta,
  computeEventHash,
  computeFactors,
  createGraph,
  createSoftwareWorkflow,
  creditCardDetector,
  decideFromScore,
  decodeChallenge,
  decompose,
  decompress,
  decrypt,
  defaultPolicy,
  defaultPolicySet,
  defaultRegistry,
  defaultTrustEvaluator,
  deriveDeviceId,
  deriveDidKey,
  deriveKey,
  describeType,
  deserialize,
  deserializeAndVerifyAttestation,
  deserializeQuote,
  detectConflicts,
  detectIndicators,
  detectOutliers,
  detectViolations,
  dhash,
  diffDocuments,
  diffMetadata,
  diffSchemas,
  diffSnapshots,
  dijkstra,
  effectiveImportance,
  emailDetector,
  encrypt,
  enforceBoundary,
  escalationPath,
  estimateComplexity,
  evaluateCondition,
  evaluatePolicy,
  evaluatePolicySet,
  evaluateRule,
  evaluateRuleSet,
  eventKeyId,
  eventsEqual,
  expandRoles,
  exportAuditLog,
  exportEpisodic,
  exportSemantic,
  exportSnapshot,
  fieldsEqual,
  filterByComponent,
  filterByDepth,
  filterByEdgeType,
  filterByLabel,
  filterByProperty,
  filterByType,
  filterEdges,
  filterNodes,
  findCommonAuthority,
  findEndpoint,
  findOcrPiiCandidates,
  forceDirected,
  formatVersion,
  fuzzySearch,
  generateChallenge,
  generateEventId,
  getCatalog,
  getKeyId,
  getRestrictions,
  getRuleSet,
  getSanctionsList,
  gfDiv,
  gfEval,
  gfMul,
  grantRole,
  grid,
  hashConfig,
  hashDataset,
  hashRecord,
  heading,
  healthConditionDetector,
  hierarchical,
  hkdf,
  ibanDetector,
  imageIdentifier,
  importJsonl,
  importSnapshot,
  international,
  inverseViewport,
  ipv4Detector,
  ipv6Detector,
  isChallengeExpired,
  isPolicySatisfied,
  isRatified,
  isRetryable,
  isSemver,
  isSensitiveKey,
  isSeverity,
  isValidFormat,
  isValidManifest,
  isoDateDetector,
  issueCredential,
  issueTimestamp,
  jwtDetector,
  lookup,
  luhnValid,
  macDetector,
  makeFinding,
  makeRoute,
  makeRouteId,
  matchEvent,
  matchResource,
  matchRule,
  matchScore,
  medicationDetector,
  mergeAgingPolicy,
  mergeImport,
  mergeRenderConfig,
  mergeSchemas,
  mulberry32,
  newCorrelationId,
  newRoleAssignmentId,
  normalize,
  normalizeMetadata,
  normalizeName,
  normalizeOcrText,
  not,
  ocrPageToText,
  or,
  panTo,
  parseBackup,
  parseCondition,
  parseDocxCoreXml,
  parsePdfInfo,
  parseRole,
  parseSemver,
  parseVersion,
  pbkdf2,
  permissionMatches,
  permissionsForRole,
  personNameDetector,
  phoneDetector,
  postalCodeDetector,
  produceAndSerializeAttestation,
  produceAttestation,
  providerDetector,
  radial,
  rankEpisodic,
  rankLongTerm,
  ratify,
  ratio,
  readLinuxNetDev,
  redactImage,
  redactSignals,
  redactorForStrategy,
  renderToSVG,
  requireHardwareOrThrow,
  requireNode,
  resolveConflicts,
  resolveOverlaps,
  reveal,
  revokeRole,
  rolesForSubject,
  roots,
  route,
  routeAll,
  satisfies,
  scoreAnalysis,
  scoreFrom,
  screen,
  screenParties,
  screenParty,
  scrubDocumentMetadata,
  scrubMetadata2 as scrubObjectMetadata,
  search,
  serializeBackup,
  serializeManifest,
  serializeQuote,
  setCatalog,
  setRestrictions,
  setRuleSet,
  setSanctionsList,
  sha256Hex,
  shamirCombine,
  shamirSplit,
  shouldCompressLongTerm,
  shouldPruneEpisodic,
  signChallenge,
  signEvent,
  signForAttestation,
  signForChallenge,
  stableStringify,
  strictPolicy,
  stripJpegExif,
  stripOcrGeometry,
  suggest,
  supersede,
  synthesize,
  takeSnapshot,
  toDot,
  toJSON,
  toMermaid,
  toSVG,
  topoSort,
  urlDetector,
  usSsnDetector,
  validate,
  validateAnalysis,
  validateCollaborationPackage,
  validateConflict,
  validateCredential,
  validateDocument,
  validateHierarchy,
  validateManifest,
  validateMinorityOpinion,
  validatePermissionModel,
  validatePolicy,
  validateProcedure,
  validateQuote,
  validate2 as validateReport,
  validateRequest,
  validateResponse,
  validateRound,
  validateRule,
  validateSafetyRule,
  validateSection,
  validateSpecialist,
  validateValue,
  verifyAttestation,
  verifyBackup,
  verifyChain,
  verifyCredential,
  verifyEventSignature,
  verifyManifest,
  verifyMatch,
  verifyProof,
  verifyResponse,
  verifySharesConsistent,
  verifyTimestamp,
  whoCan,
  withRetry,
  zaIdChecksumValid,
  zaIdDetector,
  zoomAt
};
//# sourceMappingURL=manya-os.mjs.map
