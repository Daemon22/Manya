/**
 * @manya-os/supabase — Supabase-backed MemoryStore.
 *
 * Implements the @manya-os/memory MemoryStore interface against
 * a Postgres/Supabase database. Provides durable persistence for
 * episodic, semantic, long-term memory, links, and permissions.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MemoryStore,
  EpisodicEvent,
  SemanticFact,
  LongTermRecord,
  MemoryLink,
  MemoryPermission,
  MemorySnapshot,
  MemoryType,
} from '@manya-os/memory';
import type { Logger } from '../logging.js';
import type { ResolvedConfig } from '../config.js';
import type {
  MemoryEpisodicRow,
  MemorySemanticRow,
  MemoryLongtermRow,
  MemoryLinkRow,
  MemoryPermissionRow,
} from '../types.js';
import { classifyError } from '../errors.js';
import { withRetry } from '../retry.js';

// ----- Row mappers -----

function episodicToRow(e: EpisodicEvent): Record<string, unknown> {
  return {
    id: e.id,
    agent: e.agent,
    event: e.event,
    context: e.context ?? null,
    tags: e.tags ?? [],
    importance: e.importance ?? null,
    source: e.source ?? null,
    timestamp: e.timestamp,
  };
}

function rowToEpisodic(r: MemoryEpisodicRow): EpisodicEvent {
  return {
    id: r.id,
    agent: r.agent,
    event: r.event,
    ...(r.context ? { context: r.context } : {}),
    ...(r.tags?.length ? { tags: r.tags } : {}),
    ...(r.importance != null ? { importance: r.importance } : {}),
    ...(r.source ? { source: r.source } : {}),
    timestamp: r.timestamp,
  };
}

function semanticToRow(f: SemanticFact): Record<string, unknown> {
  return {
    id: f.id,
    entity: f.entity,
    attribute: f.attribute,
    value: f.value,
    confidence: f.confidence,
    learned_at: f.learnedAt,
    source: f.source ?? null,
    tags: f.tags ?? [],
  };
}

function rowToSemantic(r: MemorySemanticRow): SemanticFact {
  return {
    id: r.id,
    entity: r.entity,
    attribute: r.attribute,
    value: r.value,
    confidence: r.confidence,
    learnedAt: r.learned_at,
    ...(r.source ? { source: r.source } : {}),
    ...(r.tags?.length ? { tags: r.tags } : {}),
  };
}

function longtermToRow(rec: LongTermRecord): Record<string, unknown> {
  return {
    id: rec.id,
    type: rec.type,
    payload: rec.payload,
    created_at: rec.createdAt,
    last_accessed_at: rec.lastAccessedAt,
    access_count: rec.accessCount,
    importance: rec.importance,
    tags: rec.tags ?? [],
    source: rec.source ?? null,
  };
}

function rowToLongterm(r: MemoryLongtermRow): LongTermRecord {
  return {
    id: r.id,
    type: r.type as MemoryType,
    payload: r.payload,
    createdAt: r.created_at,
    lastAccessedAt: r.last_accessed_at,
    accessCount: r.access_count,
    importance: r.importance,
    ...(r.tags?.length ? { tags: r.tags } : {}),
    ...(r.source ? { source: r.source } : {}),
  };
}

function linkToRow(l: MemoryLink): Record<string, unknown> {
  return {
    from_id: l.fromId,
    to_id: l.toId,
    relation: l.relation,
    weight: l.weight ?? null,
  };
}

function rowToLink(r: MemoryLinkRow): MemoryLink {
  return {
    fromId: r.from_id,
    toId: r.to_id,
    relation: r.relation,
    ...(r.weight != null ? { weight: r.weight } : {}),
  };
}

function permToRow(p: MemoryPermission): Record<string, unknown> {
  return {
    record_id: p.recordId,
    readers: p.readers,
    writers: p.writers,
    deleters: p.deleters,
  };
}

function rowToPerm(r: MemoryPermissionRow): MemoryPermission {
  return {
    recordId: r.record_id,
    readers: r.readers,
    writers: r.writers,
    deleters: r.deleters,
  };
}

/**
 * Supabase-backed memory persistence store.
 *
 * Implements the MemoryStore interface from @manya-os/memory.
 * All operations are async and use parameterized queries via the Supabase client.
 */
export class SupabaseMemoryStore implements MemoryStore {
  private readonly tables: ResolvedConfig['tables'];
  private readonly logger: Logger;
  private readonly retryConfig: ResolvedConfig['retry'];

  constructor(
    private readonly client: SupabaseClient,
    config: ResolvedConfig,
    logger: Logger,
  ) {
    this.tables = config.tables;
    this.logger = logger;
    this.retryConfig = config.retry;
  }

  // ----- Episodic -----

  async putEpisodic(event: EpisodicEvent): Promise<void> {
    return withRetry(async () => {
      const { error } = await this.client
        .from(this.tables.memoryEpisodic)
        .upsert(episodicToRow(event), { onConflict: 'id' });
      if (error) throw classifyError(error);
    }, this.retryConfig, this.logger, 'memory putEpisodic');
  }

  async getEpisodic(id: string): Promise<EpisodicEvent | null> {
    return withRetry(async () => {
      const { data, error } = await this.client
        .from(this.tables.memoryEpisodic)
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw classifyError(error);
      }
      return rowToEpisodic(data as MemoryEpisodicRow);
    }, this.retryConfig, this.logger, 'memory getEpisodic');
  }

  async deleteEpisodic(id: string): Promise<boolean> {
    return withRetry(async () => {
      const { error, count } = await this.client
        .from(this.tables.memoryEpisodic)
        .delete({ count: 'exact' })
        .eq('id', id);
      if (error) throw classifyError(error);
      return (count ?? 0) > 0;
    }, this.retryConfig, this.logger, 'memory deleteEpisodic');
  }

  async listEpisodic(opts?: { agent?: string; limit?: number; before?: number }): Promise<EpisodicEvent[]> {
    return withRetry(async () => {
      let query = this.client
        .from(this.tables.memoryEpisodic)
        .select('*')
        .order('timestamp', { ascending: true });

      if (opts?.agent) query = query.eq('agent', opts.agent);
      if (opts?.before) query = query.lt('timestamp', opts.before);
      if (opts?.limit) query = query.limit(opts.limit);

      const { data, error } = await query;
      if (error) throw classifyError(error);
      return (data as MemoryEpisodicRow[]).map(rowToEpisodic);
    }, this.retryConfig, this.logger, 'memory listEpisodic');
  }

  async pruneEpisodic(olderThan: number): Promise<number> {
    return withRetry(async () => {
      const { error, count } = await this.client
        .from(this.tables.memoryEpisodic)
        .delete({ count: 'exact' })
        .lt('timestamp', olderThan);
      if (error) throw classifyError(error);
      return count ?? 0;
    }, this.retryConfig, this.logger, 'memory pruneEpisodic');
  }

  // ----- Semantic -----

  async putSemantic(fact: SemanticFact): Promise<void> {
    return withRetry(async () => {
      const { error } = await this.client
        .from(this.tables.memorySemantic)
        .upsert(semanticToRow(fact), { onConflict: 'id' });
      if (error) throw classifyError(error);
    }, this.retryConfig, this.logger, 'memory putSemantic');
  }

  async getSemantic(id: string): Promise<SemanticFact | null> {
    return withRetry(async () => {
      const { data, error } = await this.client
        .from(this.tables.memorySemantic)
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw classifyError(error);
      }
      return rowToSemantic(data as MemorySemanticRow);
    }, this.retryConfig, this.logger, 'memory getSemantic');
  }

  async deleteSemantic(id: string): Promise<boolean> {
    return withRetry(async () => {
      const { error, count } = await this.client
        .from(this.tables.memorySemantic)
        .delete({ count: 'exact' })
        .eq('id', id);
      if (error) throw classifyError(error);
      return (count ?? 0) > 0;
    }, this.retryConfig, this.logger, 'memory deleteSemantic');
  }

  async findSemantic(entity: string, attribute?: string): Promise<SemanticFact[]> {
    return withRetry(async () => {
      let query = this.client
        .from(this.tables.memorySemantic)
        .select('*')
        .eq('entity', entity);

      if (attribute) query = query.eq('attribute', attribute);

      const { data, error } = await query;
      if (error) throw classifyError(error);
      return (data as MemorySemanticRow[]).map(rowToSemantic);
    }, this.retryConfig, this.logger, 'memory findSemantic');
  }

  async updateSemanticConfidence(id: string, confidence: number): Promise<boolean> {
    return withRetry(async () => {
      const { error, count } = await this.client
        .from(this.tables.memorySemantic)
        .update({ confidence }, { count: 'exact' })
        .eq('id', id);
      if (error) throw classifyError(error);
      return (count ?? 0) > 0;
    }, this.retryConfig, this.logger, 'memory updateSemanticConfidence');
  }

  // ----- Long-term -----

  async putLongterm(record: LongTermRecord): Promise<void> {
    return withRetry(async () => {
      const { error } = await this.client
        .from(this.tables.memoryLongterm)
        .upsert(longtermToRow(record), { onConflict: 'id' });
      if (error) throw classifyError(error);
    }, this.retryConfig, this.logger, 'memory putLongterm');
  }

  async getLongterm(id: string): Promise<LongTermRecord | null> {
    return withRetry(async () => {
      const { data, error } = await this.client
        .from(this.tables.memoryLongterm)
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw classifyError(error);
      }
      return rowToLongterm(data as MemoryLongtermRow);
    }, this.retryConfig, this.logger, 'memory getLongterm');
  }

  async deleteLongterm(id: string): Promise<boolean> {
    return withRetry(async () => {
      const { error, count } = await this.client
        .from(this.tables.memoryLongterm)
        .delete({ count: 'exact' })
        .eq('id', id);
      if (error) throw classifyError(error);
      return (count ?? 0) > 0;
    }, this.retryConfig, this.logger, 'memory deleteLongterm');
  }

  async listLongterm(opts?: { type?: MemoryType; tag?: string; limit?: number }): Promise<LongTermRecord[]> {
    return withRetry(async () => {
      let query = this.client
        .from(this.tables.memoryLongterm)
        .select('*')
        .order('created_at', { ascending: true });

      if (opts?.type) query = query.eq('type', opts.type);
      if (opts?.tag) query = query.contains('tags', [opts.tag]);
      if (opts?.limit) query = query.limit(opts.limit);

      const { data, error } = await query;
      if (error) throw classifyError(error);
      return (data as MemoryLongtermRow[]).map(rowToLongterm);
    }, this.retryConfig, this.logger, 'memory listLongterm');
  }

  async touchLongterm(id: string): Promise<boolean> {
    return withRetry(async () => {
      const now = Date.now();
      const { data, error } = await this.client.rpc('touch_longterm_record', {
        p_id: id,
        p_accessed_at: now,
      });
      if (error) throw classifyError(error);
      return data === true;
    }, this.retryConfig, this.logger, 'memory touchLongterm');
  }

  // ----- Links -----

  async putLink(link: MemoryLink): Promise<void> {
    return withRetry(async () => {
      const { error } = await this.client
        .from(this.tables.memoryLinks)
        .upsert(linkToRow(link), { onConflict: 'from_id,to_id,relation' });
      if (error) throw classifyError(error);
    }, this.retryConfig, this.logger, 'memory putLink');
  }

  async deleteLink(fromId: string, toId: string, relation: string): Promise<boolean> {
    return withRetry(async () => {
      const { error, count } = await this.client
        .from(this.tables.memoryLinks)
        .delete({ count: 'exact' })
        .eq('from_id', fromId)
        .eq('to_id', toId)
        .eq('relation', relation);
      if (error) throw classifyError(error);
      return (count ?? 0) > 0;
    }, this.retryConfig, this.logger, 'memory deleteLink');
  }

  async outgoingFrom(id: string): Promise<MemoryLink[]> {
    return withRetry(async () => {
      const { data, error } = await this.client
        .from(this.tables.memoryLinks)
        .select('*')
        .eq('from_id', id);
      if (error) throw classifyError(error);
      return (data as MemoryLinkRow[]).map(rowToLink);
    }, this.retryConfig, this.logger, 'memory outgoingFrom');
  }

  async incomingTo(id: string): Promise<MemoryLink[]> {
    return withRetry(async () => {
      const { data, error } = await this.client
        .from(this.tables.memoryLinks)
        .select('*')
        .eq('to_id', id);
      if (error) throw classifyError(error);
      return (data as MemoryLinkRow[]).map(rowToLink);
    }, this.retryConfig, this.logger, 'memory incomingTo');
  }

  // ----- Permissions -----

  async setPermission(perm: MemoryPermission): Promise<void> {
    return withRetry(async () => {
      const { error } = await this.client
        .from(this.tables.memoryPermissions)
        .upsert(permToRow(perm), { onConflict: 'record_id' });
      if (error) throw classifyError(error);
    }, this.retryConfig, this.logger, 'memory setPermission');
  }

  async getPermission(recordId: string): Promise<MemoryPermission | null> {
    return withRetry(async () => {
      const { data, error } = await this.client
        .from(this.tables.memoryPermissions)
        .select('*')
        .eq('record_id', recordId)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw classifyError(error);
      }
      return rowToPerm(data as MemoryPermissionRow);
    }, this.retryConfig, this.logger, 'memory getPermission');
  }

  async deletePermission(recordId: string): Promise<boolean> {
    return withRetry(async () => {
      const { error, count } = await this.client
        .from(this.tables.memoryPermissions)
        .delete({ count: 'exact' })
        .eq('record_id', recordId);
      if (error) throw classifyError(error);
      return (count ?? 0) > 0;
    }, this.retryConfig, this.logger, 'memory deletePermission');
  }

  // ----- Bulk operations -----

  async loadSnapshot(): Promise<MemorySnapshot> {
    return withRetry(async () => {
      const [episodic, semantic, longterm, links, permissions] = await Promise.all([
        this.client.from(this.tables.memoryEpisodic).select('*'),
        this.client.from(this.tables.memorySemantic).select('*'),
        this.client.from(this.tables.memoryLongterm).select('*'),
        this.client.from(this.tables.memoryLinks).select('*'),
        this.client.from(this.tables.memoryPermissions).select('*'),
      ]);

      if (episodic.error) throw classifyError(episodic.error);
      if (semantic.error) throw classifyError(semantic.error);
      if (longterm.error) throw classifyError(longterm.error);
      if (links.error) throw classifyError(links.error);
      if (permissions.error) throw classifyError(permissions.error);

      return {
        schemaVersion: 1,
        takenAt: new Date().toISOString(),
        working: [],
        episodic: (episodic.data as MemoryEpisodicRow[]).map(rowToEpisodic),
        semantic: (semantic.data as MemorySemanticRow[]).map(rowToSemantic),
        procedural: [],
        longterm: (longterm.data as MemoryLongtermRow[]).map(rowToLongterm),
        links: (links.data as MemoryLinkRow[]).map(rowToLink),
        permissions: (permissions.data as MemoryPermissionRow[]).map(rowToPerm),
      };
    }, this.retryConfig, this.logger, 'memory loadSnapshot');
  }

  async saveSnapshot(snapshot: MemorySnapshot): Promise<void> {
    await withRetry(async () => {
      const episodicJson = snapshot.episodic.map(episodicToRow);
      const semanticJson = snapshot.semantic.map(semanticToRow);
      const longtermJson = snapshot.longterm.map(longtermToRow);
      const linksJson = snapshot.links.map(linkToRow);
      const permissionsJson = snapshot.permissions.map(permToRow);

      const { error } = await this.client.rpc('save_memory_snapshot', {
        p_episodic: episodicJson,
        p_semantic: semanticJson,
        p_longterm: longtermJson,
        p_links: linksJson,
        p_permissions: permissionsJson,
      });

      if (error) throw classifyError(error);

      this.logger.info('memory snapshot saved', {
        episodic: snapshot.episodic.length,
        semantic: snapshot.semantic.length,
        longterm: snapshot.longterm.length,
        links: snapshot.links.length,
        permissions: snapshot.permissions.length,
      });
    }, this.retryConfig, this.logger, 'memory saveSnapshot');
  }
}
