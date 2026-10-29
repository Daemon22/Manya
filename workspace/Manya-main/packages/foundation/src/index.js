/**
 * Manya Foundation — the HAEL Foundation people-and-organization domain.
 *
 * Domain B of the two-domain model:
 *   Domain A (@manya/transport presence) — technical connectivity:
 *     intelligences, devices, services, runtimes.
 *   Domain B (this package) — the Foundation community:
 *     members, council, partners, organizations, and people exploring HAEL.
 *
 * The same Manya nervous system carries both; this package isolates the
 * Foundation's permission realm, roles, profiles, organization directory,
 * and the live relationship web that spans both domains.
 *
 * Security principle (deliberate): discovery, visibility, and access are
 * three separate permissions. A visitor can see that the Foundation exists
 * and browse public profiles; members see each other; partners and council
 * see progressively more; nobody sees everything unless explicitly trusted.
 */

import * as shield from '@manya/shield';
import * as weave from '@manya/weave';
import { randomUUID } from 'node:crypto';

export const FOUNDATION_ROLES = Object.freeze([
  'visitor',      // exploring the Foundation — public slice only
  'member',       // recognized HAEL member
  'partner',      // partner business/organization representative
  'organization', // a registered Foundation organization actor
  'council',      // council participant — governance visibility
  'steward',      // Foundation steward — full domain administration
]);

export const RELATIONSHIP_TYPES = Object.freeze([
  // Domain B (people & organizations)
  'member-of',        // person -> Foundation
  'partner-with',     // org -> Foundation
  'employs',          // org -> person
  'affiliated-with',  // person -> org
  'explores',         // person -> Foundation (prospective)
  'council-seat',     // person -> Foundation (governance)
  // Cross-domain bridges (Domain B person/org -> Domain A entity)
  'hosts-intelligence',
  'owns-device',
  'sponsors-service',
  // Domain A internal (usually attached from presence, not declared here)
  'connected-via',
]);

const ROLE_PERMISSIONS = Object.freeze({
  visitor: [
    { resource: 'foundation:public/**', actions: ['discover', 'read'] },
    { resource: 'foundation:directory', actions: ['search'] },
  ],
  member: [
    { resource: 'foundation:public/**', actions: ['discover', 'read'] },
    { resource: 'foundation:members/**', actions: ['discover', 'read'] },
    { resource: 'foundation:directory', actions: ['search'] },
    { resource: 'foundation:graph', actions: ['view'] },
  ],
  partner: [
    { resource: 'foundation:public/**', actions: ['discover', 'read'] },
    { resource: 'foundation:members/**', actions: ['discover', 'read'] },
    { resource: 'foundation:partners/**', actions: ['discover', 'read'] },
    { resource: 'foundation:directory', actions: ['search'] },
    { resource: 'foundation:graph', actions: ['view'] },
  ],
  organization: [
    { resource: 'foundation:public/**', actions: ['discover', 'read'] },
    { resource: 'foundation:members/**', actions: ['discover', 'read'] },
    { resource: 'foundation:directory', actions: ['search'] },
    { resource: 'foundation:graph', actions: ['view'] },
  ],
  council: [
    { resource: 'foundation:**', actions: ['discover', 'read', 'manage'] },
    { resource: 'foundation:directory', actions: ['search'] },
    { resource: 'foundation:graph', actions: ['view'] },
  ],
  steward: [
    { resource: 'foundation:**', actions: ['discover', 'read', 'manage'] },
    { resource: 'foundation:directory', actions: ['search'] },
    { resource: 'foundation:graph', actions: ['view'] },
  ],
});

/**
 * Creates the Foundation domain.
 * @param {object} [options]
 * @param {string} [options.domainId='hael-foundation']
 * @param {object} [options.policy] - Existing shield policy (a realm of its own).
 * @param {string[]} [options.stewards] - Subject ids to bootstrap as stewards.
 * @param {object} [options.bus] - unify bus for foundation events (optional).
 */
export function createFoundation(options = {}) {
  const domainId = options.domainId || 'hael-foundation';
  const policy = options.policy || shield.createPolicy(domainId, {
    description: `HAEL Foundation permission realm (${domainId})`,
    defaultAction: 'deny',
  });

  for (const role of FOUNDATION_ROLES) {
    if (!policy.roles.has(role)) {
      shield.defineRole(policy, role, { description: `HAEL Foundation ${role}` });
      shield.grant(policy, role, ROLE_PERMISSIONS[role]);
    }
  }

  /** subjectId -> profile */
  const profiles = new Map();
  /** orgId -> organization */
  const organizations = new Map();
  /** edgeId -> relationship */
  const relationships = new Map();
  /** attached technical presence (Domain A), null until attachPresence */
  let presence = null;
  const bus = options.bus || null;

  function emit(topicSuffix, payload) {
    try {
      api.foundationEvents.push({
        topic: `foundation:${topicSuffix}`,
        payload,
        at: new Date().toISOString(),
      });
    } catch { /* events must never break domain ops */ }
  }

  function can(viewer, resource, action) {
    if (!viewer) return { allowed: false, reason: 'anonymous' };
    return shield.checkAccess(policy, viewer, resource, action);
  }

  // -- Roles -----------------------------------------------------------------

  function assignRole(registry, actor, subjectId, role) {
    if (registry !== api) throw new Error('assignRole must be called as assignRole(registry, actor, subjectId, role)');
    if (!FOUNDATION_ROLES.includes(role)) {
      throw new Error(`unknown Foundation role "${role}"; known: ${FOUNDATION_ROLES.join(', ')}`);
    }
    const managers = (options.stewards || []);
    if (managers.length > 0 && !managers.includes(actor)) {
      throw new Error(`actor "${actor}" is not a bootstrap steward`);
    }
    if (!policy.subjects.has(subjectId)) {
      shield.registerSubject(policy, subjectId, {});
    }
    shield.assignRole(policy, subjectId, role);
    emit('role-assigned', { subjectId, role });
    return { subjectId, role };
  }

  function roleOf(subjectId) {
    const subject = policy.subjects.get(subjectId);
    return subject ? [...subject.roles].filter((r) => FOUNDATION_ROLES.includes(r)) : [];
  }

  // -- Profiles --------------------------------------------------------------

  function upsertProfile(registry, actor, input) {
    if (registry !== api) throw new Error('upsertProfile must be called as upsertProfile(registry, actor, input)');
    const { subjectId, displayName, kind = 'person', sector, bio, visibility = 'public' } = input || {};
    if (!subjectId || typeof subjectId !== 'string') throw new Error('profile requires subjectId');
    if (!['person', 'organization', 'partner'].includes(kind)) {
      throw new Error(`profile kind must be person | organization | partner (got "${kind}")`);
    }
    if (!['public', 'members', 'private'].includes(visibility)) {
      throw new Error(`profile visibility must be public | members | private (got "${visibility}")`);
    }
    const existing = profiles.get(subjectId);
    const isSelf = actor === subjectId;
    const isCouncil = actor && can(actor, 'foundation:**', 'manage').allowed;
    if (!existing && !isSelf && !isCouncil) {
      throw new Error(`actor "${actor}" may not create a profile for "${subjectId}"`);
    }
    if (existing && !isSelf && !isCouncil) {
      throw new Error(`actor "${actor}" may not update the profile of "${subjectId}"`);
    }
    const now = new Date().toISOString();
    const profileRecord = {
      subjectId,
      displayName: displayName || (existing && existing.displayName) || subjectId,
      kind,
      sector: sector !== undefined ? sector : (existing ? existing.sector : null),
      bio: bio !== undefined ? bio : (existing ? existing.bio : ''),
      visibility,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    profiles.set(subjectId, profileRecord);
    // A profiled subject is a Foundation member: register them in the policy
    // so visibility gates (getProfile) can evaluate them as a viewer.
    if (!policy.subjects.has(subjectId)) {
      shield.registerSubject(policy, subjectId, {});
    }
    emit('profile-updated', { subjectId, kind });
    return { ...profileRecord };
  }

  function profileView(profile, viewer) {
    const memberPlus = viewer && (
      profile.subjectId === viewer ||
      can(viewer, 'foundation:members/**', 'read').allowed
    );
    const base = {
      subjectId: profile.subjectId,
      displayName: profile.displayName,
      kind: profile.kind,
      visibility: profile.visibility,
    };
    if (memberPlus) {
      return { ...base, sector: profile.sector, bio: profile.bio, createdAt: profile.createdAt, updatedAt: profile.updatedAt };
    }
    return base; // visitors see the public slice only
  }

  function getProfile(registry, viewer, subjectId) {
    // Anonymous viewers (no Foundation subject) see nothing at all.
    if (!viewer || !policy.subjects.has(viewer)) return null;
    const profileRecord = profiles.get(subjectId);
    if (!profileRecord) return null;
    if (profileRecord.visibility === 'private' && viewer !== subjectId) {
      // Private profiles: only self + council/steward discover them at all.
      if (!can(viewer, 'foundation:**', 'discover').allowed) return null;
    }
    if (profileRecord.visibility === 'members' && viewer !== subjectId) {
      if (!can(viewer, 'foundation:members/**', 'discover').allowed) return null;
    }
    return profileView(profileRecord, viewer);
  }

  function listProfiles(registry, viewer, filter = {}) {
    const out = [];
    for (const profileRecord of profiles.values()) {
      const view = getProfile(registry, viewer, profileRecord.subjectId);
      if (!view) continue;
      if (filter.kind && view.kind !== filter.kind) continue;
      out.push(view);
    }
    out.sort((a, b) => a.subjectId.localeCompare(b.subjectId));
    return out;
  }

  // -- Organization directory --------------------------------------------------

  function registerOrganization(registry, actor, input) {
    if (registry !== api) throw new Error('registerOrganization must be called as registerOrganization(registry, actor, input)');
    const { orgId, name, sector, representative, description = '', visibility = 'public' } = input || {};
    if (!orgId || !name) throw new Error('organization requires orgId and name');
    if (!['public', 'directory', 'members'].includes(visibility)) {
      throw new Error(`organization visibility must be public | directory | members (got "${visibility}")`);
    }
    if (representative && !profiles.has(representative)) {
      throw new Error(`representative "${representative}" has no Foundation profile yet`);
    }
    const actorRoles = actor ? roleOf(actor) : [];
    const mayRegister =
      (options.stewards || []).includes(actor) ||
      actorRoles.includes('steward') ||
      actorRoles.includes('council') ||
      actorRoles.includes('partner') ||
      actorRoles.includes('organization');
    if (!mayRegister) {
      throw new Error(`actor "${actor}" may not register an organization (needs partner/organization/steward role)`);
    }
    const now = new Date().toISOString();
    const existing = organizations.get(orgId);
    const org = {
      orgId,
      name,
      sector: sector !== undefined ? sector : (existing ? existing.sector : null),
      representative: representative || (existing ? existing.representative : null),
      description,
      visibility,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    organizations.set(orgId, org);
    emit('organization-registered', { orgId, name });
    return { ...org };
  }

  function directoryView(org, viewer) {
    const partnerPlus = viewer && (
      can(viewer, 'foundation:partners/**', 'read').allowed ||
      can(viewer, 'foundation:**', 'read').allowed
    );
    const base = { orgId: org.orgId, name: org.name, sector: org.sector, visibility: org.visibility };
    if (partnerPlus) {
      return { ...base, representative: org.representative, description: org.description, updatedAt: org.updatedAt };
    }
    return base;
  }

  function searchDirectory(registry, viewer, filter = {}) {
    const decision = can(viewer, 'foundation:directory', 'search');
    if (!decision.allowed) return [];
    const { q, sector } = filter;
    const out = [];
    for (const org of organizations.values()) {
      if (org.visibility === 'members' && !can(viewer, 'foundation:members/**', 'read').allowed) continue;
      if (sector && org.sector !== sector) continue;
      if (q) {
        const haystack = `${org.name} ${org.sector || ''} ${org.description}`.toLowerCase();
        if (!haystack.includes(String(q).toLowerCase())) continue;
      }
      out.push(directoryView(org, viewer));
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  // -- Relationships -----------------------------------------------------------

  function link(registry, actor, input) {
    if (registry !== api) throw new Error('link must be called as link(registry, actor, input)');
    const { from, to, type, visibility = 'members' } = input || {};
    if (!RELATIONSHIP_TYPES.includes(type)) {
      throw new Error(`unknown relationship type "${type}"; known: ${RELATIONSHIP_TYPES.join(', ')}`);
    }
    if (!from || !to) throw new Error('relationship requires from and to');
    const endpointsKnown = (id) => profiles.has(id) || organizations.has(id) || (presence && !!presence.get(id)) || id === domainId;
    if (!endpointsKnown(from)) throw new Error(`relationship endpoint "${from}" is not a known profile, organization, or connected entity`);
    if (!endpointsKnown(to)) throw new Error(`relationship endpoint "${to}" is not a known profile, organization, or connected entity`);
    const org = organizations.get(from);
    const representsOrg = org && org.representative === actor;
    if (actor !== from && !representsOrg && !(actor && can(actor, 'foundation:**', 'manage').allowed)) {
      throw new Error(`actor "${actor}" may not create relationships for "${from}"`);
    }
    const edge = {
      edgeId: `edge-${randomUUID().slice(0, 10)}`,
      from,
      to,
      type,
      visibility,
      createdAt: new Date().toISOString(),
    };
    relationships.set(edge.edgeId, edge);
    emit('relationship-linked', { from, to, type });
    return { ...edge };
  }

  function unlink(registry, actor, edgeId) {
    const edge = relationships.get(edgeId);
    if (!edge) return false;
    const org = organizations.get(edge.from);
    const representsOrg = org && org.representative === actor;
    if (actor !== edge.from && !representsOrg && !(actor && can(actor, 'foundation:**', 'manage').allowed)) {
      throw new Error(`actor "${actor}" may not remove relationship "${edgeId}"`);
    }
    relationships.delete(edgeId);
    emit('relationship-unlinked', { edgeId });
    return true;
  }

  function edgeVisibleTo(edge, viewer) {
    if (viewer === edge.from) return true;
    if (viewer && can(viewer, 'foundation:**', 'read').allowed) return true;
    if (edge.visibility === 'public') return true;
    if (edge.visibility === 'members') return !!(viewer && can(viewer, 'foundation:members/**', 'read').allowed);
    return false;
  }

  function listRelationships(registry, viewer, filter = {}) {
    const out = [];
    for (const edge of relationships.values()) {
      if (!edgeVisibleTo(edge, viewer)) continue;
      if (filter.subjectId && edge.from !== filter.subjectId && edge.to !== filter.subjectId) continue;
      if (filter.type && edge.type !== filter.type) continue;
      out.push({ ...edge });
    }
    return out;
  }

  // -- Presence (Domain A bridge) ----------------------------------------------

  function attachPresence(registry, presenceRegistry) {
    if (registry !== api) throw new Error('attachPresence must be called as attachPresence(registry, presenceRegistry)');
    presence = presenceRegistry;
    return api;
  }

  function technicalEntities(viewer) {
    if (!presence) return [];
    const viewerMaySeeTechnical = viewer && (
      can(viewer, 'foundation:graph', 'view').allowed ||
      can(viewer, 'foundation:**', 'read').allowed
    );
    if (!viewerMaySeeTechnical) return [];
    return presence.list().map((entry) => ({
      id: entry.identity.id,
      kind: entry.identity.kind || 'service',
      displayName: entry.identity.displayName || entry.identity.id,
      domains: entry.identity.domains || ['technical'],
      via: entry.via,
      connectedAt: entry.connectedAt,
    }));
  }

  // -- Relationship map (weave) --------------------------------------------------

  function relationshipGraph(registry, viewer, opts = {}) {
    if (registry !== api) throw new Error('relationshipGraph must be called as relationshipGraph(registry, viewer, opts)');
    const nodes = [];
    const edges = [];
    const nodeIds = new Set();

    const addNode = (id, label, type, properties = {}) => {
      if (nodeIds.has(id)) return;
      nodeIds.add(id);
      nodes.push({ id, label, type, properties });
    };

    const viewerRoles = viewer ? roleOf(viewer) : [];
    const isTrusted = viewerRoles.includes('steward') || viewerRoles.includes('council');

    for (const profileViewResult of listProfiles(registry, viewer)) {
      addNode(profileViewResult.subjectId, profileViewResult.displayName, `foundation:${profileViewResult.kind}`, {
        sector: profileViewResult.sector ?? null,
      });
    }
    for (const org of searchDirectory(registry, viewer, {})) {
      addNode(org.orgId, org.name, 'foundation:organization', { sector: org.sector ?? null });
    }
    if (viewer && (can(viewer, 'foundation:graph', 'view').allowed || isTrusted)) {
      addNode(domainId, 'HAEL Foundation', 'foundation:root', {});
      for (const entity of technicalEntities(viewer)) {
        addNode(entity.id, entity.displayName, `technical:${entity.kind}`, { via: entity.via });
      }
    }

    for (const edge of listRelationships(registry, viewer)) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
      edges.push({ id: edge.edgeId, source: edge.from, target: edge.to, label: edge.type, type: edge.type });
    }

    // Structural edges implied by roles (visible graph still respects discovery).
    if (viewer && (can(viewer, 'foundation:graph', 'view').allowed || isTrusted)) {
      for (const profileViewResult of listProfiles(registry, viewer)) {
        for (const role of roleOf(profileViewResult.subjectId)) {
          const type = role === 'member' ? 'member-of'
            : role === 'partner' ? 'partner-with'
            : role === 'council' ? 'council-seat'
            : role === 'visitor' ? 'explores'
            : null;
          if (type && nodeIds.has(profileViewResult.subjectId)) {
            edges.push({
              id: `implied-${profileViewResult.subjectId}-${type}`,
              source: profileViewResult.subjectId,
              target: domainId,
              label: type,
              type,
            });
          }
        }
      }
    }

    const graph = weave.createGraph(
      nodes.map((n) => ({ id: n.id, label: n.label, type: n.type, properties: n.properties })),
      edges,
    );

    const result = {
      viewer: viewer || 'anonymous',
      nodeCount: graph.size(),
      edgeCount: graph.edgeCount(),
      nodes,
      edges,
    };

    if (opts.format === 'svg') {
      const layout = weave.forceDirected(graph, { seed: 7 });
      result.svg = weave.renderToSVG(graph, layout, { width: opts.width || 960, height: opts.height || 640 });
    }
    if (opts.format === 'dot') {
      result.dot = weave.toDot(graph, 'HAELFoundation');
    }
    if (opts.format === 'mermaid') {
      result.mermaid = weave.toMermaid(graph);
    }
    return result;
  }

  function stats(registry) {
    return {
      domainId,
      profiles: profiles.size,
      organizations: organizations.size,
      relationships: relationships.size,
      technicalEntities: presence ? presence.size() : 0,
      subjects: policy.subjects.size,
    };
  }

  const api = {
    domainId,
    policy,
    profiles,
    organizations,
    relationships,
    assignRole,
    roleOf,
    upsertProfile,
    getProfile,
    listProfiles,
    registerOrganization,
    searchDirectory,
    link,
    unlink,
    relationships,
    attachPresence,
    relationshipGraph,
    listRelationships,
    stats,
    foundationEvents: [],
  };

  return api;
}
