#!/usr/bin/env node
/**
 * @manya-os/supabase — Minimal Supabase-compatible REST API server.
 *
 * Provides a PostgREST-compatible HTTP API over PostgreSQL so that
 * @supabase/supabase-js integration tests can run without Docker.
 *
 * Supports: SELECT, INSERT, UPDATE, DELETE, RPC (function calls),
 * JWT-based role resolution, and RLS policy enforcement (via PostgreSQL).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

const http = require('http');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

const PORT = parseInt(process.env.PORT || '15433', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret-manya-os';
const PG_CONFIG = {
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '15432', 10),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  database: process.env.PG_DATABASE || 'manya_test',
};

const JSON_COLUMNS = {
  ledger_events: new Set(['payload', 'metadata']),
  memory_episodic: new Set(['context']),
  memory_semantic: new Set(['value']),
  memory_longterm: new Set(['payload']),
  keyring_identities: new Set(['metadata']),
  keyring_credentials: new Set(['claims', 'proof']),
  council_debates: new Set(['rounds']),
  constitution_audit: new Set([]),
  customs_reports: new Set(['findings', 'counts']),
};

function resolveRole(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return 'anon';
  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return payload.role || 'anon';
  } catch {
    return 'anon';
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(null);
      try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
    });
    req.on('error', reject);
  });
}

function parseUrl(url) {
  const u = new URL(url, 'http://localhost');
  let parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (parts[0] === 'rest' && parts[1] === 'v1') {
    parts = parts.slice(2);
  }
  return { parts, params: u.searchParams, hash: u.hash };
}

function parseFilter(raw) {
  const dot = raw.indexOf('.');
  if (dot === -1) return { op: 'eq', value: raw };
  return { op: raw.slice(0, dot), value: raw.slice(dot + 1) };
}

function addFilters(params, conditions, values, startIdx) {
  let paramIdx = startIdx;

  for (const [key, rawValue] of params.entries()) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue;
    if (key === 'columns') continue;

    const { op, value } = parseFilter(rawValue);
    switch (op) {
      case 'eq':
        conditions.push(`"${key}" = $${paramIdx}`);
        values.push(value);
        paramIdx++;
        break;
      case 'neq':
        conditions.push(`"${key}" != $${paramIdx}`);
        values.push(value);
        paramIdx++;
        break;
      case 'gt':
        conditions.push(`"${key}" > $${paramIdx}`);
        values.push(value);
        paramIdx++;
        break;
      case 'gte':
        conditions.push(`"${key}" >= $${paramIdx}`);
        values.push(value);
        paramIdx++;
        break;
      case 'lt':
        conditions.push(`"${key}" < $${paramIdx}`);
        values.push(value);
        paramIdx++;
        break;
      case 'lte':
        conditions.push(`"${key}" <= $${paramIdx}`);
        values.push(value);
        paramIdx++;
        break;
      case 'like':
        conditions.push(`"${key}" LIKE $${paramIdx}`);
        values.push(value.replace(/\*/g, '%'));
        paramIdx++;
        break;
      case 'ilike':
        conditions.push(`"${key}" ILIKE $${paramIdx}`);
        values.push(value.replace(/\*/g, '%'));
        paramIdx++;
        break;
      case 'in': {
        const vals = value.replace(/^\(|\)$/g, '').split(',');
        const placeholders = vals.map((_, i) => `$${paramIdx + i}`).join(', ');
        conditions.push(`"${key}" IN (${placeholders})`);
        values.push(...vals);
        paramIdx += vals.length;
        break;
      }
      case 'is':
        conditions.push(`"${key}" IS ${value === 'null' ? 'NULL' : 'NOT NULL'}`);
        break;
      case 'cs':
        conditions.push(`"${key}" @> $${paramIdx}`);
        values.push(value);
        paramIdx++;
        break;
      default:
        conditions.push(`"${key}" = $${paramIdx}`);
        values.push(rawValue);
        paramIdx++;
    }
  }

  return paramIdx;
}

function selectedColumns(params) {
  const select = params.get('select');
  if (!select || select === '*') return '*';
  return select.split(',').map(c => `"${c.trim()}"`).join(', ');
}

function normalizeColumnValue(table, column, value) {
  if (value == null) return value;
  if (JSON_COLUMNS[table]?.has(column)) {
    return typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value);
  }
  return value;
}

function responseShape(req, rows) {
  const accept = req.headers.accept || '';
  if (accept.includes('application/vnd.pgrst.object+json')) {
    if (rows.length !== 1) {
      return {
        error: {
          message: 'JSON object requested, multiple (or no) rows returned',
          details: `Results contain ${rows.length} rows`,
          code: 'PGRST116',
        },
        status: 406,
      };
    }
    return { data: rows[0], status: 200 };
  }
  return { data: rows, status: 200 };
}

function jsonOrHead(req, res, data, status = 200, headers = {}) {
  if (req.method === 'HEAD') {
    res.writeHead(status, headers);
    res.end();
    return;
  }
  json(res, data, status, headers);
}

async function handleRequest(req, res) {
  const role = resolveRole(req);
  const client = new Client(PG_CONFIG);
  await client.connect();

  try {
    // Set the JWT claims for RLS enforcement
    await client.query(`SET request.jwt.claims = '${JSON.stringify({ role, sub: role })}'`);
    await client.query(`SET role = '${role}'`);

    const { parts, params } = parseUrl(req.url);

    // Health check
    if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
      return json(res, { healthy: true });
    }

    // POST /rpc/{function_name} — RPC calls
    if (req.method === 'POST' && parts[0] === 'rpc') {
      const fnName = parts[1];
      if (!fnName) return json(res, { error: 'Missing function name' }, 400);
      const body = await parseBody(req);
      const params = body || {};
      const keys = Object.keys(params);
      const values = keys.map(k => params[k]);

      if (fnName === 'record_migration') {
        await client.query(
          `INSERT INTO schema_migrations (version, name, checksum)
           VALUES ($1, $2, $3)
           ON CONFLICT (version) DO NOTHING`,
          [params.p_version, params.p_name, params.p_checksum],
        );
        return json(res, null);
      }

      // Resolve parameter types using pg_proc (works across PG versions)
      const typeQuery = `
        SELECT
          p.proargnames AS names,
          ARRAY(
            SELECT format_type(type_oid, NULL)
            FROM unnest(p.proargtypes::oid[]) AS arg(type_oid)
          ) AS types
        FROM pg_proc p
        WHERE p.proname = $1
          AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY p.oid
        LIMIT 1
      `;
      const typeResult = await client.query(typeQuery, [fnName]);
      const signature = typeResult.rows[0];
      const paramTypes = signature
        ? (signature.types || []).map((typname, i) => ({
            parameter_name: signature.names?.[i],
            typname,
          }))
        : [];
      const fallbackSignatures = {
        record_migration: ['integer', 'text', 'text'],
        exec_sql: ['text'],
        increment_longterm_access: ['text'],
        touch_longterm_record: ['text', 'bigint'],
      };
      if (paramTypes.length === 0 && fallbackSignatures[fnName]) {
        paramTypes.push(...fallbackSignatures[fnName].map(typname => ({ typname })));
      }

      let sql;
      if (paramTypes.length === 0) {
        sql = `SELECT * FROM ${fnName}()`;
      } else {
        const typedArgs = paramTypes.map((p, i) => `$${i + 1}::${p.typname}`).join(', ');
        sql = `SELECT * FROM ${fnName}(${typedArgs})`;
      }

      const result = await client.query(sql, values);
      return json(res, result.rows.length === 1 && Object.keys(result.rows[0]).length === 1
        ? Object.values(result.rows[0])[0]
        : result.rows);
    }

    // Table operations: /{table}
    if (parts.length === 1 || (parts.length === 2 && parts[0] === '')) {
      const table = parts[parts.length - 1];
      if (!table) return json(res, { error: 'No table specified' }, 400);

      // SELECT
      if (req.method === 'GET' || req.method === 'HEAD') {
        let sql = `SELECT ${selectedColumns(params)} FROM "${table}"`;
        const conditions = [];
        const values = [];
        addFilters(params, conditions, values, 1);

        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        if (params.get('order')) {
          const order = params.get('order').split('.').map((part, idx) => idx === 0 ? `"${part}"` : part).join(' ');
          sql += ` ORDER BY ${order}`;
        }
        if (params.get('limit')) sql += ` LIMIT ${parseInt(params.get('limit'), 10)}`;
        if (params.get('offset')) sql += ` OFFSET ${parseInt(params.get('offset'), 10)}`;

        const result = await client.query(sql, values);
        const shaped = responseShape(req, result.rows);
        return jsonOrHead(req, res, shaped.error || shaped.data, shaped.status, {
          'Content-Range': `0-${Math.max(result.rowCount - 1, 0)}/${result.rowCount}`,
        });
      }

      // INSERT
      if (req.method === 'POST') {
        const body = await parseBody(req);
        if (!body) return json(res, { error: 'Empty body' }, 400);
        const rows = Array.isArray(body) ? body : [body];
        const inserted = [];
        for (const row of rows) {
          const cols = Object.keys(row);
          const vals = cols.map(col => normalizeColumnValue(table, col, row[col]));
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
          const colNames = cols.map(c => `"${c}"`).join(', ');
          const conflicts = params.get('on_conflict');
          let sql = `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders})`;
          if (conflicts) {
            const conflictCols = conflicts.split(',').map(c => `"${c.trim()}"`).join(', ');
            const updates = cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
            sql += ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updates}`;
          }
          sql += ' RETURNING *';
          const result = await client.query(sql, vals);
          inserted.push(result.rows[0]);
        }
        return json(res, inserted.length === 1 ? inserted[0] : inserted, 201);
      }

      // UPDATE
      if (req.method === 'PATCH') {
        const body = await parseBody(req);
        if (!body) return json(res, { error: 'Empty body' }, 400);
        const conditions = [];
        const values = [];
        let paramIdx = 1;
        paramIdx = addFilters(params, conditions, values, paramIdx);

        const setClauses = Object.entries(body).map(([col, val]) => {
          values.push(normalizeColumnValue(table, col, val));
          return `"${col}" = $${paramIdx++}`;
        });

        if (conditions.length === 0 && setClauses.length === 0) return json(res, []);

        let sql = `UPDATE "${table}" SET ${setClauses.join(', ')}`;
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' RETURNING *';

        const result = await client.query(sql, values);
        return json(res, result.rows, 200, { 'Content-Range': `0-${Math.max(result.rowCount - 1, 0)}/${result.rowCount}` });
      }

      // DELETE
      if (req.method === 'DELETE') {
        const conditions = [];
        const values = [];
        addFilters(params, conditions, values, 1);

        let sql = `DELETE FROM "${table}"`;
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' RETURNING *';

        const result = await client.query(sql, values);
        return json(res, result.rows, 200, { 'Content-Range': `0-${Math.max(result.rowCount - 1, 0)}/${result.rowCount}` });
      }
    }

    json(res, { error: 'Not found' }, 404);
  } catch (e) {
    console.error(`[supabase-proxy:error] ${req.method} ${req.url}: ${e.message}`);
    json(res, { message: e.message, code: e.code || 'INTERNAL_ERROR' }, 400);
  } finally {
    await client.end();
  }
}

function json(res, data, status = 200, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (e) {
    json(res, { message: e.message }, 500);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[supabase-proxy] listening on http://127.0.0.1:${PORT}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
