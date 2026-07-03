/**
 * Manya CLI — command dispatcher.
 *
 * Receives a parsed command from the parser and routes it to the right
 * handler. Handlers receive a context object with the loaded state, the
 * parsed args/flags, and the process object for I/O. Each handler returns
 * { output, exitCode } where output is the string to print and exitCode
 * is 0 for success or 1 for error.
 *
 * State hydration strategy:
 *   - On every invocation we reset the in-memory mesh + federation, then
 *     re-hydrate from the persisted state file.
 *   - Tools: re-register each persisted tool via its apiLoader (so the
 *     manifest and api object are both available for dispatch).
 *   - Identities: re-create via createIdentity + linkIdentity to rebuild
 *     the value index.
 *   - Bus events: not re-hydrated (subscribers are functions, not serializable);
 *     bus is always fresh per invocation. We persist the last N events for
 *     inspection only.
 */

import {
  registerTool,
  unregisterTool,
  listTools,
  route,
  dispatch,
  getSyncChannels,
  _resetMesh,
  // Federation
  createIdentity,
  linkIdentity,
  resolveIdentity,
  findByIdentitySource,
  mergeIdentities,
  listIdentities,
  identityCount,
  _resetFederation,
  _hydrateIdentities,
  // Event bus
  createBus,
  subscribe,
  publish,
  routeEvent,
  busStats,
  // Vocabularies
  translate,
  listTranslations,
  getIndustryDomainMap,
} from '@manya/unify';

import { loadState, saveState, resetState, statePath } from './state.js';
import { getToolDef, knownToolIds, allToolDefs } from './registry.js';
import { generateWeaveHtml } from './weave.js';
import { tryParseJson } from './parser.js';

/**
 * Runs a parsed command.
 * @param {object} parsed - Parsed args from parseArgs().
 * @param {object} [context] - Execution context.
 * @param {NodeJS.Process} [context.process=process]
 * @returns {Promise<{ output: string, exitCode: number }>}
 */
export async function runCommand(parsed, context = {}) {
  const proc = context.process || process;
  const quiet = !!parsed.flags.quiet;
  const pretty = !!parsed.flags.pretty;
  const stateFile = parsed.flags.state;

  // Reset and hydrate
  _resetMesh();
  _resetFederation();
  const state = loadState(stateFile);
  await hydrateMesh(state);
  _hydrateIdentities(state.identities || []);

  const format = (obj) => {
    if (quiet) return '';
    return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  };

  try {
    switch (parsed.command) {
      case 'version':
        return { output: 'manya 0.6.0', exitCode: 0 };

      case 'help':
      case null:
        return { output: '', exitCode: 0 }; // Help handled by main()

      // -- MESH --
      case 'mesh': {
        switch (parsed.subcommand) {
          case 'list': {
            const tools = listTools();
            return { output: format({ count: tools.length, tools }), exitCode: 0 };
          }
          case 'register': {
            const toolId = parsed.args[0];
            if (!toolId) throw new Error('mesh register requires a tool id');
            const def = getToolDef(toolId);
            if (!def) throw new Error(`Unknown tool id: "${toolId}". Known: ${knownToolIds().join(', ')}`);
            if (listTools().some(t => t.toolId === toolId)) {
              throw new Error(`Tool "${toolId}" is already registered`);
            }
            const api = await def.apiLoader();
            registerTool({ manifest: def.manifest, api });
            await persist(stateFile);
            return { output: format({ registered: toolId, owns: def.manifest.owns, syncChannels: def.manifest.syncChannels }), exitCode: 0 };
          }
          case 'register-all': {
            const registered = [];
            for (const def of allToolDefs()) {
              if (listTools().some(t => t.toolId === def.id)) continue;
              const api = await def.apiLoader();
              registerTool({ manifest: def.manifest, api });
              registered.push(def.id);
            }
            await persist(stateFile);
            return { output: format({ registered, totalRegistered: listTools().length }), exitCode: 0 };
          }
          case 'dispatch': {
            const [capability, method, ...methodArgs] = parsed.args;
            if (!capability || !method) throw new Error('mesh dispatch requires <capability> <method> [args...]');
            const parsedArgs = methodArgs.map(tryParseJson);
            const result = dispatch(capability, method, parsedArgs);
            return { output: format({ capability, method, args: parsedArgs, result }), exitCode: 0 };
          }
          case 'channels': {
            const channels = getSyncChannels();
            return { output: format({ count: channels.length, channels }), exitCode: 0 };
          }
          case 'reset': {
            _resetMesh();
            resetState(stateFile);
            return { output: format({ reset: true }), exitCode: 0 };
          }
          default:
            throw new Error(`Unknown mesh subcommand: "${parsed.subcommand}". Try: list, register, register-all, dispatch, channels, reset`);
        }
      }

      // -- IDENTITY --
      case 'identity': {
        switch (parsed.subcommand) {
          case 'create': {
            const [type, value] = parsed.args;
            if (!type || !value) throw new Error('identity create requires <type> <value>');
            const metadata = parsed.flags.metadata ? tryParseJson(parsed.flags.metadata) : {};
            const id = createIdentity({ type, value, metadata: typeof metadata === 'object' ? metadata : {} });
            await persist(stateFile);
            return { output: format(id), exitCode: 0 };
          }
          case 'link': {
            const [identityId, type, value] = parsed.args;
            if (!identityId || !type || !value) throw new Error('identity link requires <id> <type> <value>');
            const confidence = parsed.flags.confidence !== undefined ? Number(parsed.flags.confidence) : undefined;
            const linkInput = { type, value };
            if (confidence !== undefined) linkInput.confidence = confidence;
            if (parsed.flags.source) linkInput.source = parsed.flags.source;
            const id = linkIdentity(identityId, linkInput);
            await persist(stateFile);
            return { output: format(id), exitCode: 0 };
          }
          case 'resolve': {
            const [type, value] = parsed.args;
            if (!type || !value) throw new Error('identity resolve requires <type> <value>');
            const id = resolveIdentity(type, value);
            return { output: format({ resolved: !!id, identity: id }), exitCode: 0 };
          }
          case 'list': {
            const ids = listIdentities();
            return { output: format({ count: ids.length, identities: ids }), exitCode: 0 };
          }
          case 'merge': {
            const [idA, idB] = parsed.args;
            if (!idA || !idB) throw new Error('identity merge requires <idA> <idB>');
            const merged = mergeIdentities(idA, idB);
            await persist(stateFile);
            return { output: format(merged), exitCode: 0 };
          }
          case 'find-by-source': {
            const toolId = parsed.args[0];
            if (!toolId) throw new Error('identity find-by-source requires <toolId>');
            const ids = findByIdentitySource(toolId);
            return { output: format({ count: ids.length, identities: ids }), exitCode: 0 };
          }
          case 'reset': {
            _resetFederation();
            resetState(stateFile);
            return { output: format({ reset: true }), exitCode: 0 };
          }
          default:
            throw new Error(`Unknown identity subcommand: "${parsed.subcommand}". Try: create, link, resolve, list, merge, find-by-source, reset`);
        }
      }

      // -- BUS --
      case 'bus': {
        // Create a fresh bus for this invocation
        const bus = createBus({ replay: true, maxHistory: 1000 });
        switch (parsed.subcommand) {
          case 'publish': {
            const [topic, json] = parsed.args;
            if (!topic || !json) throw new Error('bus publish requires <topic> <json>');
            const event = tryParseJson(json);
            const eventInput = typeof event === 'object' ? event : { type: 'string', payload: event };
            if (parsed.flags.source) eventInput.sourceToolId = parsed.flags.source;
            const result = publish(bus, topic, eventInput);
            return { output: format({ topic, ...result }), exitCode: 0 };
          }
          case 'route': {
            const [toolId, json] = parsed.args;
            if (!toolId || !json) throw new Error('bus route requires <toolId> <json>');
            const def = getToolDef(toolId);
            if (!def) throw new Error(`Unknown tool id: ${toolId}`);
            const event = tryParseJson(json);
            const eventInput = typeof event === 'object' ? event : { type: 'string', payload: event };
            eventInput.sourceToolId = toolId;
            const result = routeEvent(bus, eventInput, def.manifest.syncChannels);
            return { output: format({ toolId, ...result }), exitCode: 0 };
          }
          case 'stats': {
            const stats = busStats(bus);
            return { output: format(stats), exitCode: 0 };
          }
          case 'reset': {
            resetState(stateFile);
            return { output: format({ reset: true }), exitCode: 0 };
          }
          default:
            throw new Error(`Unknown bus subcommand: "${parsed.subcommand}". Try: publish, route, stats, reset`);
        }
      }

      // -- TRANSLATE --
      case 'translate': {
        // translate is a top-level command with 3 positional args (from, to, value),
        // not a subcommand. Reconstruct the full positional list.
        const translateArgs = [parsed.subcommand, ...parsed.args].filter(x => x !== null && x !== undefined);
        const [from, to, value] = translateArgs;
        if (!from || !to || !value) throw new Error('translate requires <from> <to> <value>');
        const result = translate(from, to, value);
        return { output: format({ from, to, input: value, ...result }), exitCode: 0 };
      }
      case 'translations': {
        return { output: format({ translations: listTranslations() }), exitCode: 0 };
      }
      case 'domains': {
        return { output: format(getIndustryDomainMap()), exitCode: 0 };
      }

      // -- WEAVE --
      case 'weave': {
        const outPath = parsed.flags.out;
        const identities = listIdentities();
        const tools = listTools();
        const channels = getSyncChannels();
        const html = generateWeaveHtml({ tools, identities, channels });
        if (outPath) {
          const { writeFileSync } = await import('node:fs');
          writeFileSync(outPath, html, 'utf8');
          return { output: format({ generated: true, path: outPath, bytes: html.length, tools: tools.length, identities: identities.length }), exitCode: 0 };
        }
        // No --out: write to stdout (suppress JSON formatting)
        return { output: html, exitCode: 0 };
      }

      // -- SERVE (placeholder; real implementation lives in serve.js and is wired in main()) --
      case 'serve': {
        return { output: format({ message: 'manya serve is handled by the main entry point. Run: manya serve [--port 3100]', port: parsed.flags.port || 3100 }), exitCode: 0 };
      }

      default:
        throw new Error(`Unknown command: "${parsed.command}". Run "manya help" for usage.`);
    }
  } catch (err) {
    return { output: format({ error: err.message }), exitCode: 1 };
  }

  // Helper: persist current state
  async function persist(path) {
    const tools = listTools().map(t => ({ toolId: t.toolId, registeredAt: t.registeredAt }));
    const identities = listIdentities();
    saveState({ tools, identities, busEvents: [] }, path);
  }
}

/**
 * Hydrates the mesh from persisted state by re-registering each tool.
 * @param {object} state
 */
async function hydrateMesh(state) {
  for (const entry of state.tools || []) {
    const def = getToolDef(entry.toolId);
    if (!def) continue;
    try {
      const api = await def.apiLoader();
      registerTool({ manifest: def.manifest, api });
    } catch (err) {
      // Skip tools whose source can't be loaded
    }
  }
}
