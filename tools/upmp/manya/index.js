/**
 * @manya/upmp — Manya integration layer for UPMP-ADT.
 *
 * UPMP (Universal Progress Monitoring — Active Device Tracker) is a Python
 * personal activity tracker that captures writing sessions, stuck points,
 * discoveries, and intelligence engagement. This JS adapter mirrors its
 * event model and wires it into the Manya event bus.
 *
 * Three integration points:
 * 1. **Event forwarding** — UPMP session/stuck/discovery events flow into
 *    Manya's event bus on `upmp:*` sync channels.
 * 2. **Intelligence as identity** — UPMP's intelligence engagement model
 *    (Gardner's 9 + custom) can be linked to Manya federated identities,
 *    so your "linguistic intelligence profile" is part of who you are.
 * 3. **Discussion artifact export** — UPMP's discussion artifacts can be
 *    exported via the Manya CLI and shared with other Manya tools.
 */

import { randomUUID } from 'node:crypto';

/**
 * UPMP sync channels — declared in the upmpManifest.
 */
export const UPMP_SYNC_CHANNELS = [
  'upmp:session-started',
  'upmp:session-ended',
  'upmp:stuck-point',
  'upmp:stuck-resolved',
  'upmp:discovery',
  'upmp:intelligence-engaged',
  'upmp:breakthrough',
];

/**
 * UPMP capabilities — owned by the upmp tool.
 */
export const UPMP_CAPABILITIES = [
  'activityTracking',
  'stuckPointDetection',
  'discoveryLogging',
  'intelligenceEngagement',
  'progressMonitoring',
  'discussionExport',
];

/**
 * Gardner's 9 default intelligences.
 */
export const DEFAULT_INTELLIGENCES = [
  { key: 'linguistic', name: 'Linguistic', engagedBy: 'writing, reading, wordplay' },
  { key: 'logical_math', name: 'Logical-Mathematical', engagedBy: 'coding, math, planning' },
  { key: 'spatial', name: 'Spatial', engagedBy: 'design, drawing, diagrams' },
  { key: 'bodily_kinesthetic', name: 'Bodily-Kinesthetic', engagedBy: 'sports, dance, craft' },
  { key: 'musical', name: 'Musical', engagedBy: 'music, rhythm, composition' },
  { key: 'interpersonal', name: 'Interpersonal', engagedBy: 'conversations, teaching' },
  { key: 'intrapersonal', name: 'Intrapersonal', engagedBy: 'journaling, meditation' },
  { key: 'naturalist', name: 'Naturalist', engagedBy: 'gardening, hiking, taxonomy' },
  { key: 'existential', name: 'Existential', engagedBy: 'philosophy, purpose-work' },
];

/**
 * Creates a UPMP adapter that wires activity tracking events into Manya's event bus.
 *
 * @param {object} options
 * @param {object} options.bus - A Manya Unify event bus.
 * @returns {UpmpAdapter}
 */
export function createAdapter({ bus } = {}) {
  if (!bus) throw new Error('createAdapter requires a bus (Manya event bus)');

  const sessionId = `upmp-${randomUUID().slice(0, 8)}`;
  const sessions = new Map(); // sessionId -> session
  const intelligences = new Map(); // intelligenceKey -> { progress, sessions, stuckCount, breakthroughCount }
  const intelligenceLinks = new Map(); // intelligenceKey -> federatedIdentityId

  // Initialize default intelligences
  for (const intel of DEFAULT_INTELLIGENCES) {
    intelligences.set(intel.key, {
      ...intel,
      progress: 0,
      sessions: 0,
      stuckCount: 0,
      breakthroughCount: 0,
      lastEngaged: null,
    });
  }

  let activeSession = null;

  return {
    sessionId,
    bus,

    /**
     * Starts a new activity session.
     * @param {object} input
     * @param {string} input.activityType - e.g. 'writing', 'coding', 'design'
     * @param {string} [input.intelligence] - Intelligence key (e.g. 'linguistic')
     * @param {string} [input.context] - Context description
     * @param {string} [input.intent] - Intent statement
     * @param {string[]} [input.goals] - List of goals
     * @returns {object} The created session.
     */
    startSession({ activityType, intelligence, context, intent, goals } = {}) {
      if (!activityType) throw new Error('startSession requires an activityType');
      if (activeSession) throw new Error(`Session already active: ${activeSession.id}`);

      const id = `session-${randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();
      const session = {
        id,
        activityType,
        intelligence: intelligence || null,
        context: context || '',
        intent: intent || '',
        goals: goals || [],
        status: 'active',
        startedAt: now,
        endedAt: null,
        events: [{ type: 'start', at: now }],
        stuckPoints: [],
        discoveries: [],
      };
      sessions.set(id, session);
      activeSession = session;

      // Update intelligence engagement
      if (intelligence && intelligences.has(intelligence)) {
        const intel = intelligences.get(intelligence);
        intel.sessions++;
        intel.lastEngaged = now;
      }

      this.forward('upmp:session-started', {
        sessionId: id,
        activityType,
        intelligence,
        context,
        intent,
        goals,
        startedAt: now,
      });

      if (intelligence) {
        this.forward('upmp:intelligence-engaged', {
          intelligence,
          sessionId: id,
          engagedAt: now,
        });
      }

      return session;
    },

    /**
     * Ends the active session.
     * @param {string} [summary] - Optional session summary.
     * @returns {object} The ended session.
     */
    endSession(summary) {
      if (!activeSession) throw new Error('No active session to end');
      const now = new Date().toISOString();
      activeSession.status = 'ended';
      activeSession.endedAt = now;
      activeSession.summary = summary || '';
      activeSession.events.push({ type: 'end', at: now, summary });

      this.forward('upmp:session-ended', {
        sessionId: activeSession.id,
        activityType: activeSession.activityType,
        intelligence: activeSession.intelligence,
        summary,
        startedAt: activeSession.startedAt,
        endedAt: now,
        stuckPointCount: activeSession.stuckPoints.length,
        discoveryCount: activeSession.discoveries.length,
      });

      const ended = activeSession;
      activeSession = null;
      return ended;
    },

    /**
     * Records a stuck point in the active session.
     * @param {string} description - What you're stuck on.
     * @returns {object} The stuck point record.
     */
    recordStuckPoint(description) {
      if (!activeSession) throw new Error('No active session');
      if (!description) throw new Error('recordStuckPoint requires a description');
      const now = new Date().toISOString();
      const stuck = {
        id: `stuck-${randomUUID().slice(0, 8)}`,
        description,
        recordedAt: now,
        resolved: false,
        resolution: null,
        resolutionType: null,
      };
      activeSession.stuckPoints.push(stuck);
      activeSession.events.push({ type: 'stuck', at: now, stuckId: stuck.id });

      if (activeSession.intelligence && intelligences.has(activeSession.intelligence)) {
        intelligences.get(activeSession.intelligence).stuckCount++;
      }

      this.forward('upmp:stuck-point', {
        sessionId: activeSession.id,
        stuckId: stuck.id,
        description,
        intelligence: activeSession.intelligence,
        recordedAt: now,
      });

      return stuck;
    },

    /**
     * Resolves a stuck point.
     * @param {string} stuckId - The stuck point id (or 'latest' for the most recent).
     * @param {object} options
     * @param {string} [options.strategy] - How you got unstuck.
     * @param {string} [options.resolutionType] - 'breakthrough' | 'workaround' | 'abandoned'
     * @returns {object} The resolved stuck point.
     */
    resolveStuckPoint(stuckId, { strategy, resolutionType } = {}) {
      if (!activeSession) throw new Error('No active session');
      let stuck;
      if (stuckId === 'latest') {
        stuck = activeSession.stuckPoints.filter(s => !s.resolved).pop();
      } else {
        stuck = activeSession.stuckPoints.find(s => s.id === stuckId);
      }
      if (!stuck) throw new Error(`Stuck point not found: ${stuckId}`);
      if (stuck.resolved) throw new Error(`Stuck point already resolved: ${stuck.id}`);

      const now = new Date().toISOString();
      stuck.resolved = true;
      stuck.resolution = strategy || '';
      stuck.resolutionType = resolutionType || 'workaround';
      stuck.resolvedAt = now;

      if (resolutionType === 'breakthrough' && activeSession.intelligence && intelligences.has(activeSession.intelligence)) {
        intelligences.get(activeSession.intelligence).breakthroughCount++;
        this.forward('upmp:breakthrough', {
          sessionId: activeSession.id,
          stuckId: stuck.id,
          intelligence: activeSession.intelligence,
          strategy,
          resolvedAt: now,
        });
      }

      this.forward('upmp:stuck-resolved', {
        sessionId: activeSession.id,
        stuckId: stuck.id,
        strategy,
        resolutionType: stuck.resolutionType,
        resolvedAt: now,
      });

      return stuck;
    },

    /**
     * Records a discovery.
     * @param {object} input
     * @param {string} input.type - 'post' | 'image' | 'snippet' | 'link'
     * @param {string} [input.url]
     * @param {string} [input.path]
     * @param {string} [input.text]
     * @param {string} [input.note]
     * @param {string} [input.relatedStuckId] - Link to a stuck point.
     * @returns {object} The discovery record.
     */
    recordDiscovery({ type, url, path, text, note, relatedStuckId } = {}) {
      if (!type) throw new Error('recordDiscovery requires a type');
      const now = new Date().toISOString();
      const discovery = {
        id: `discovery-${randomUUID().slice(0, 8)}`,
        type,
        url: url || null,
        path: path || null,
        text: text || null,
        note: note || '',
        relatedStuckId: relatedStuckId || null,
        capturedAt: now,
        sessionId: activeSession?.id || null,
      };

      if (activeSession) {
        activeSession.discoveries.push(discovery);
        activeSession.events.push({ type: 'discovery', at: now, discoveryId: discovery.id });
      }

      this.forward('upmp:discovery', {
        discoveryId: discovery.id,
        type,
        url: discovery.url,
        note,
        relatedStuckId,
        sessionId: discovery.sessionId,
        capturedAt: now,
      });

      return discovery;
    },

    /**
     * Forwards a UPMP event to the Manya event bus.
     * @param {string} channel - One of UPMP_SYNC_CHANNELS.
     * @param {object} event - The event payload.
     * @returns {{ delivered: number, eventId: string }}
     */
    forward(channel, event) {
      if (!UPMP_SYNC_CHANNELS.includes(channel)) {
        throw new Error(`Unknown UPMP sync channel: ${channel}. Valid: ${UPMP_SYNC_CHANNELS.join(', ')}`);
      }
      const enriched = {
        ...event,
        sourceToolId: 'upmp',
        adapterSessionId: this.sessionId,
        timestamp: event.timestamp || new Date().toISOString(),
      };
      return publishToBus(bus, channel, enriched);
    },

    /**
     * Returns the active session (if any).
     * @returns {object|null}
     */
    getActiveSession() {
      return activeSession;
    },

    /**
     * Returns a session by id.
     * @param {string} id
     * @returns {object|null}
     */
    getSession(id) {
      return sessions.get(id) || null;
    },

    /**
     * Returns all sessions.
     * @returns {object[]}
     */
    listSessions() {
      return Array.from(sessions.values());
    },

    /**
     * Returns the intelligence profile.
     * @returns {object[]}
     */
    getIntelligences() {
      return Array.from(intelligences.values());
    },

    /**
     * Adds a custom intelligence.
     * @param {object} intel - { key, name, engagedBy, description }
     * @returns {object} The added intelligence.
     */
    addIntelligence({ key, name, engagedBy, description } = {}) {
      if (!key || !name) throw new Error('addIntelligence requires key and name');
      if (intelligences.has(key)) throw new Error(`Intelligence already exists: ${key}`);
      const intel = {
        key,
        name,
        engagedBy: engagedBy || '',
        description: description || '',
        progress: 0,
        sessions: 0,
        stuckCount: 0,
        breakthroughCount: 0,
        lastEngaged: null,
      };
      intelligences.set(key, intel);
      return intel;
    },

    /**
     * Links an intelligence to a Manya federated identity.
     * @param {string} intelligenceKey
     * @param {string} identityId
     * @returns {{ linked: boolean, intelligenceKey: string, identityId: string }}
     */
    linkIntelligenceToIdentity(intelligenceKey, identityId) {
      if (!intelligences.has(intelligenceKey)) throw new Error(`Unknown intelligence: ${intelligenceKey}`);
      intelligenceLinks.set(intelligenceKey, identityId);
      return { linked: true, intelligenceKey, identityId };
    },

    /**
     * Resolves the federated identity linked to an intelligence.
     * @param {string} intelligenceKey
     * @returns {string|null}
     */
    resolveIntelligenceIdentity(intelligenceKey) {
      return intelligenceLinks.get(intelligenceKey) || null;
    },

    /**
     * Returns all intelligence → identity links.
     * @returns {Array<{ intelligenceKey: string, identityId: string }>}
     */
    listIntelligenceLinks() {
      return Array.from(intelligenceLinks.entries()).map(([intelligenceKey, identityId]) => ({
        intelligenceKey,
        identityId,
      }));
    },

    /**
     * Returns the list of UPMP sync channels.
     * @returns {string[]}
     */
    getSyncChannels() {
      return [...UPMP_SYNC_CHANNELS];
    },

    /**
     * Returns the list of UPMP capabilities.
     * @returns {string[]}
     */
    getCapabilities() {
      return [...UPMP_CAPABILITIES];
    },
  };
}

/**
 * Creates a session-started event.
 */
export function createSessionStartedEvent({ activityType, intelligence, context, intent, goals }) {
  return {
    type: 'session-started',
    activityType,
    intelligence,
    context,
    intent,
    goals: goals || [],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a stuck-point event.
 */
export function createStuckPointEvent({ description, intelligence }) {
  return {
    type: 'stuck-point',
    description,
    intelligence,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a discovery event.
 */
export function createDiscoveryEvent({ type, url, note, relatedStuckId }) {
  return {
    type: 'discovery',
    discoveryType: type,
    url,
    note,
    relatedStuckId,
    timestamp: new Date().toISOString(),
  };
}

// -- Internal: publish to a Manya bus --

function publishToBus(bus, topic, event) {
  const enriched = {
    eventId: `evt-${randomUUID().slice(0, 12)}`,
    topic,
    type: event.type || 'generic',
    sourceToolId: event.sourceToolId || 'upmp',
    payload: event,
    publishedAt: new Date().toISOString(),
  };
  let delivered = 0;
  const subs = bus.subscribers?.get(topic);
  if (subs) {
    for (const sub of subs) {
      try { sub.handler(enriched); delivered++; } catch (e) { /* swallow */ }
    }
  }
  if (bus.history) {
    bus.history.push(enriched);
    if (bus.history.length > (bus.maxHistory || 1000)) bus.history.shift();
  }
  bus.eventCount = (bus.eventCount || 0) + 1;
  return { delivered, eventId: enriched.eventId, publishedAt: enriched.publishedAt };
}
