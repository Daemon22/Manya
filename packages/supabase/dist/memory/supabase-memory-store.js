"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseMemoryStore = void 0;
const errors_js_1 = require("../errors.js");
const retry_js_1 = require("../retry.js");
// ----- Row mappers -----
function episodicToRow(e) {
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
function rowToEpisodic(r) {
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
function semanticToRow(f) {
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
function rowToSemantic(r) {
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
function longtermToRow(rec) {
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
function rowToLongterm(r) {
    return {
        id: r.id,
        type: r.type,
        payload: r.payload,
        createdAt: r.created_at,
        lastAccessedAt: r.last_accessed_at,
        accessCount: r.access_count,
        importance: r.importance,
        ...(r.tags?.length ? { tags: r.tags } : {}),
        ...(r.source ? { source: r.source } : {}),
    };
}
function linkToRow(l) {
    return {
        from_id: l.fromId,
        to_id: l.toId,
        relation: l.relation,
        weight: l.weight ?? null,
    };
}
function rowToLink(r) {
    return {
        fromId: r.from_id,
        toId: r.to_id,
        relation: r.relation,
        ...(r.weight != null ? { weight: r.weight } : {}),
    };
}
function permToRow(p) {
    return {
        record_id: p.recordId,
        readers: p.readers,
        writers: p.writers,
        deleters: p.deleters,
    };
}
function rowToPerm(r) {
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
class SupabaseMemoryStore {
    client;
    tables;
    logger;
    retryConfig;
    constructor(client, config, logger) {
        this.client = client;
        this.tables = config.tables;
        this.logger = logger;
        this.retryConfig = config.retry;
    }
    // ----- Episodic -----
    async putEpisodic(event) {
        return (0, retry_js_1.withRetry)(async () => {
            const { error } = await this.client
                .from(this.tables.memoryEpisodic)
                .upsert(episodicToRow(event), { onConflict: 'id' });
            if (error)
                throw (0, errors_js_1.classifyError)(error);
        }, this.retryConfig, this.logger, 'memory putEpisodic');
    }
    async getEpisodic(id) {
        return (0, retry_js_1.withRetry)(async () => {
            const { data, error } = await this.client
                .from(this.tables.memoryEpisodic)
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null;
                throw (0, errors_js_1.classifyError)(error);
            }
            return rowToEpisodic(data);
        }, this.retryConfig, this.logger, 'memory getEpisodic');
    }
    async deleteEpisodic(id) {
        return (0, retry_js_1.withRetry)(async () => {
            const { error, count } = await this.client
                .from(this.tables.memoryEpisodic)
                .delete({ count: 'exact' })
                .eq('id', id);
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return (count ?? 0) > 0;
        }, this.retryConfig, this.logger, 'memory deleteEpisodic');
    }
    async listEpisodic(opts) {
        return (0, retry_js_1.withRetry)(async () => {
            let query = this.client
                .from(this.tables.memoryEpisodic)
                .select('*')
                .order('timestamp', { ascending: true });
            if (opts?.agent)
                query = query.eq('agent', opts.agent);
            if (opts?.before)
                query = query.lt('timestamp', opts.before);
            if (opts?.limit)
                query = query.limit(opts.limit);
            const { data, error } = await query;
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return data.map(rowToEpisodic);
        }, this.retryConfig, this.logger, 'memory listEpisodic');
    }
    async pruneEpisodic(olderThan) {
        return (0, retry_js_1.withRetry)(async () => {
            const { error, count } = await this.client
                .from(this.tables.memoryEpisodic)
                .delete({ count: 'exact' })
                .lt('timestamp', olderThan);
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return count ?? 0;
        }, this.retryConfig, this.logger, 'memory pruneEpisodic');
    }
    // ----- Semantic -----
    async putSemantic(fact) {
        return (0, retry_js_1.withRetry)(async () => {
            const { error } = await this.client
                .from(this.tables.memorySemantic)
                .upsert(semanticToRow(fact), { onConflict: 'id' });
            if (error)
                throw (0, errors_js_1.classifyError)(error);
        }, this.retryConfig, this.logger, 'memory putSemantic');
    }
    async getSemantic(id) {
        return (0, retry_js_1.withRetry)(async () => {
            const { data, error } = await this.client
                .from(this.tables.memorySemantic)
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null;
                throw (0, errors_js_1.classifyError)(error);
            }
            return rowToSemantic(data);
        }, this.retryConfig, this.logger, 'memory getSemantic');
    }
    async deleteSemantic(id) {
        return (0, retry_js_1.withRetry)(async () => {
            const { error, count } = await this.client
                .from(this.tables.memorySemantic)
                .delete({ count: 'exact' })
                .eq('id', id);
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return (count ?? 0) > 0;
        }, this.retryConfig, this.logger, 'memory deleteSemantic');
    }
    async findSemantic(entity, attribute) {
        return (0, retry_js_1.withRetry)(async () => {
            let query = this.client
                .from(this.tables.memorySemantic)
                .select('*')
                .eq('entity', entity);
            if (attribute)
                query = query.eq('attribute', attribute);
            const { data, error } = await query;
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return data.map(rowToSemantic);
        }, this.retryConfig, this.logger, 'memory findSemantic');
    }
    async updateSemanticConfidence(id, confidence) {
        return (0, retry_js_1.withRetry)(async () => {
            const { error, count } = await this.client
                .from(this.tables.memorySemantic)
                .update({ confidence }, { count: 'exact' })
                .eq('id', id);
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return (count ?? 0) > 0;
        }, this.retryConfig, this.logger, 'memory updateSemanticConfidence');
    }
    // ----- Long-term -----
    async putLongterm(record) {
        return (0, retry_js_1.withRetry)(async () => {
            const { error } = await this.client
                .from(this.tables.memoryLongterm)
                .upsert(longtermToRow(record), { onConflict: 'id' });
            if (error)
                throw (0, errors_js_1.classifyError)(error);
        }, this.retryConfig, this.logger, 'memory putLongterm');
    }
    async getLongterm(id) {
        return (0, retry_js_1.withRetry)(async () => {
            const { data, error } = await this.client
                .from(this.tables.memoryLongterm)
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null;
                throw (0, errors_js_1.classifyError)(error);
            }
            return rowToLongterm(data);
        }, this.retryConfig, this.logger, 'memory getLongterm');
    }
    async deleteLongterm(id) {
        return (0, retry_js_1.withRetry)(async () => {
            const { error, count } = await this.client
                .from(this.tables.memoryLongterm)
                .delete({ count: 'exact' })
                .eq('id', id);
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return (count ?? 0) > 0;
        }, this.retryConfig, this.logger, 'memory deleteLongterm');
    }
    async listLongterm(opts) {
        return (0, retry_js_1.withRetry)(async () => {
            let query = this.client
                .from(this.tables.memoryLongterm)
                .select('*')
                .order('created_at', { ascending: true });
            if (opts?.type)
                query = query.eq('type', opts.type);
            if (opts?.tag)
                query = query.contains('tags', [opts.tag]);
            if (opts?.limit)
                query = query.limit(opts.limit);
            const { data, error } = await query;
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return data.map(rowToLongterm);
        }, this.retryConfig, this.logger, 'memory listLongterm');
    }
    async touchLongterm(id) {
        return (0, retry_js_1.withRetry)(async () => {
            const now = Date.now();
            const { data, error } = await this.client.rpc('touch_longterm_record', {
                p_id: id,
                p_accessed_at: now,
            });
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return data === true;
        }, this.retryConfig, this.logger, 'memory touchLongterm');
    }
    // ----- Links -----
    async putLink(link) {
        return (0, retry_js_1.withRetry)(async () => {
            const { error } = await this.client
                .from(this.tables.memoryLinks)
                .upsert(linkToRow(link), { onConflict: 'from_id,to_id,relation' });
            if (error)
                throw (0, errors_js_1.classifyError)(error);
        }, this.retryConfig, this.logger, 'memory putLink');
    }
    async deleteLink(fromId, toId, relation) {
        return (0, retry_js_1.withRetry)(async () => {
            const { error, count } = await this.client
                .from(this.tables.memoryLinks)
                .delete({ count: 'exact' })
                .eq('from_id', fromId)
                .eq('to_id', toId)
                .eq('relation', relation);
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return (count ?? 0) > 0;
        }, this.retryConfig, this.logger, 'memory deleteLink');
    }
    async outgoingFrom(id) {
        return (0, retry_js_1.withRetry)(async () => {
            const { data, error } = await this.client
                .from(this.tables.memoryLinks)
                .select('*')
                .eq('from_id', id);
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return data.map(rowToLink);
        }, this.retryConfig, this.logger, 'memory outgoingFrom');
    }
    async incomingTo(id) {
        return (0, retry_js_1.withRetry)(async () => {
            const { data, error } = await this.client
                .from(this.tables.memoryLinks)
                .select('*')
                .eq('to_id', id);
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return data.map(rowToLink);
        }, this.retryConfig, this.logger, 'memory incomingTo');
    }
    // ----- Permissions -----
    async setPermission(perm) {
        return (0, retry_js_1.withRetry)(async () => {
            const { error } = await this.client
                .from(this.tables.memoryPermissions)
                .upsert(permToRow(perm), { onConflict: 'record_id' });
            if (error)
                throw (0, errors_js_1.classifyError)(error);
        }, this.retryConfig, this.logger, 'memory setPermission');
    }
    async getPermission(recordId) {
        return (0, retry_js_1.withRetry)(async () => {
            const { data, error } = await this.client
                .from(this.tables.memoryPermissions)
                .select('*')
                .eq('record_id', recordId)
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null;
                throw (0, errors_js_1.classifyError)(error);
            }
            return rowToPerm(data);
        }, this.retryConfig, this.logger, 'memory getPermission');
    }
    async deletePermission(recordId) {
        return (0, retry_js_1.withRetry)(async () => {
            const { error, count } = await this.client
                .from(this.tables.memoryPermissions)
                .delete({ count: 'exact' })
                .eq('record_id', recordId);
            if (error)
                throw (0, errors_js_1.classifyError)(error);
            return (count ?? 0) > 0;
        }, this.retryConfig, this.logger, 'memory deletePermission');
    }
    // ----- Bulk operations -----
    async loadSnapshot() {
        return (0, retry_js_1.withRetry)(async () => {
            const [episodic, semantic, longterm, links, permissions] = await Promise.all([
                this.client.from(this.tables.memoryEpisodic).select('*'),
                this.client.from(this.tables.memorySemantic).select('*'),
                this.client.from(this.tables.memoryLongterm).select('*'),
                this.client.from(this.tables.memoryLinks).select('*'),
                this.client.from(this.tables.memoryPermissions).select('*'),
            ]);
            if (episodic.error)
                throw (0, errors_js_1.classifyError)(episodic.error);
            if (semantic.error)
                throw (0, errors_js_1.classifyError)(semantic.error);
            if (longterm.error)
                throw (0, errors_js_1.classifyError)(longterm.error);
            if (links.error)
                throw (0, errors_js_1.classifyError)(links.error);
            if (permissions.error)
                throw (0, errors_js_1.classifyError)(permissions.error);
            return {
                schemaVersion: 1,
                takenAt: new Date().toISOString(),
                working: [],
                episodic: episodic.data.map(rowToEpisodic),
                semantic: semantic.data.map(rowToSemantic),
                procedural: [],
                longterm: longterm.data.map(rowToLongterm),
                links: links.data.map(rowToLink),
                permissions: permissions.data.map(rowToPerm),
            };
        }, this.retryConfig, this.logger, 'memory loadSnapshot');
    }
    async saveSnapshot(snapshot) {
        await (0, retry_js_1.withRetry)(async () => {
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
            if (error)
                throw (0, errors_js_1.classifyError)(error);
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
exports.SupabaseMemoryStore = SupabaseMemoryStore;
//# sourceMappingURL=supabase-memory-store.js.map