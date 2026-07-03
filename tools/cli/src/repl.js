/**
 * Manya CLI — Interactive REPL.
 *
 * A read-eval-print loop that gives interactive access to all CLI commands
 * with persistent session state, tab completion, command history, and
 * inline help. Each command runs against the in-memory mesh + federation,
 * so identity create + link + resolve all happen in one session without
 * round-tripping through a state file.
 *
 * Commands inside the REPL mirror the CLI subcommands:
 *   :help             show REPL help
 *   :quit (or :q)     exit the REPL
 *   :history          show command history
 *   mesh list         list registered tools
 *   mesh register <id>
 *   mesh register-all
 *   mesh dispatch <cap> <method> [args...]
 *   mesh channels
 *   identity create <type> <value>
 *   identity link <id> <type> <value>
 *   identity resolve <type> <value>
 *   identity list
 *   identity merge <idA> <idB>
 *   bus publish <topic> <json>
 *   bus route <toolId> <json>
 *   bus stats
 *   translate <from> <to> <value>
 *   translations
 *   weave [--out <path>]
 */

import { createInterface } from 'node:readline';
import { parseArgs } from './parser.js';
import { runCommand } from './dispatcher.js';
import { generateWeaveHtml } from './weave.js';

/**
 * Starts the interactive REPL.
 * @param {object} [options]
 * @param {NodeJS.Process} [options.process=process]
 * @param {string} [options.stateFile] - Optional state file path (not used for persistence in REPL; everything is in-memory).
 * @param {object} [options.input] - Readable stream (for testing).
 * @param {object} [options.output] - Writable stream (for testing).
 * @returns {Promise<void>}
 */
export async function startRepl(options = {}) {
  const proc = options.process || process;
  const input = options.input || proc.stdin;
  const output = options.output || proc.stdout;
  const stateFile = options.stateFile || `/tmp/manya-repl-${Date.now()}.json`;

  // The REPL keeps everything in memory; we use a unique state file
  // that we never persist to disk so sessions don't leak.
  const history = [];

  const rl = createInterface({
    input,
    output,
    prompt: 'manya> ',
    completer: (line) => completer(line),
  });

  // Safe prompt that no-ops if the readline is already closed
  function safePrompt() {
    try { rl.prompt(); } catch (e) { /* readline closed — ignore */ }
  }

  // Serialize command processing so async commands complete before the next line is processed
  let pending = Promise.resolve();
  function enqueue(fn) {
    pending = pending.then(fn, fn);
    return pending;
  }

  output.write('\n');
  output.write('  Manya REPL v0.6.0 — Everything Connected. Everyone Unified.\n');
  output.write('  Type :help for commands, :quit to exit.\n');
  output.write('\n');
  rl.prompt();

  return new Promise((resolve) => {
    let resolved = false;
    function done() {
      if (resolved) return;
      resolved = true;
      // Wait for all pending commands to flush, then resolve
      pending.then(() => { try { rl.close(); } catch (e) {} resolve(); });
    }

    rl.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed) { safePrompt(); return; }
      history.push(trimmed);

      // REPL meta-commands
      if (trimmed === ':quit' || trimmed === ':q' || trimmed === ':exit') {
        enqueue(async () => {
          output.write('Goodbye.\n');
        });
        done();
        return;
      }
      if (trimmed === ':help') {
        enqueue(async () => {
          output.write(REPL_HELP + '\n');
          safePrompt();
        });
        return;
      }
      if (trimmed === ':history') {
        enqueue(async () => {
          for (const h of history) output.write(`  ${h}\n`);
          safePrompt();
        });
        return;
      }

      // Dispatch to the regular command handler
      const argv = trimmed.split(/\s+/);
      const parsed = parseArgs([...argv, '--state', stateFile]);
      enqueue(async () => {
        try {
          const result = await runCommand(parsed, { process: proc });
          if (result && result.output && !parsed.flags.quiet) {
            // For weave without --out, output is HTML — print a notice instead
            if (parsed.command === 'weave' && !parsed.flags.out) {
              output.write(`  (Generated ${result.output.length} bytes of HTML. Use 'weave --out <path>' to save.)\n`);
            } else {
              let outStr;
              if (parsed.flags.pretty) {
                try { outStr = JSON.stringify(JSON.parse(result.output), null, 2); }
                catch { outStr = result.output; }
              } else {
                outStr = result.output;
              }
              output.write(outStr + '\n');
            }
          }
        } catch (err) {
          try { output.write(`  Error: ${err.message}\n`); } catch (e) { /* ignore */ }
        }
        safePrompt();
      });
    });
    // If the input stream closes without :quit (e.g. piped input ends), flush and resolve
    rl.on('close', () => { done(); });
  });
}

/**
 * Tab-completion for the REPL.
 * @param {string} line - The current line.
 * @returns {[string[], string]}
 */
function completer(line) {
  const tokens = line.split(/\s+/);
  const lastToken = tokens[tokens.length - 1];

  // Top-level commands
  if (tokens.length === 1) {
    const commands = ['mesh', 'identity', 'bus', 'translate', 'translations', 'weave', ':help', ':quit', ':q', ':history'];
    const hits = commands.filter(c => c.startsWith(lastToken));
    return [hits.length ? hits : commands, lastToken];
  }

  // Subcommands
  if (tokens.length === 2) {
    const cmd = tokens[0];
    let subs = [];
    if (cmd === 'mesh') subs = ['list', 'register', 'register-all', 'dispatch', 'channels', 'reset'];
    else if (cmd === 'identity') subs = ['create', 'link', 'resolve', 'list', 'merge', 'find-by-source', 'reset'];
    else if (cmd === 'bus') subs = ['publish', 'route', 'stats', 'reset'];
    const hits = subs.filter(s => s.startsWith(lastToken));
    return [hits, lastToken];
  }

  // 3rd arg: toolId for mesh register / bus route
  if (tokens.length === 3) {
    if ((tokens[0] === 'mesh' && tokens[1] === 'register') || (tokens[0] === 'bus' && tokens[1] === 'route')) {
      const toolIds = ['forge', 'pulse', 'primary-sector', 'cybersecurity', 'transport-logistics', 'research-academic', 'unify'];
      const hits = toolIds.filter(t => t.startsWith(lastToken));
      return [hits, lastToken];
    }
  }

  return [[], lastToken];
}

const REPL_HELP = `Manya REPL commands:

  Meta:
    :help                       Show this help
    :history                    Show command history
    :quit (or :q, :exit)        Exit the REPL

  Mesh:
    mesh list                   List registered tools
    mesh register <toolId>      Register a tool
    mesh register-all           Register all 7 tools
    mesh dispatch <cap> <method> [args...]
                                Dispatch a capability call
    mesh channels               List declared sync channels
    mesh reset                  Clear the mesh

  Identity:
    identity create <type> <value> [--metadata '<json>']
    identity link <id> <type> <value> [--source <toolId>]
    identity resolve <type> <value>
    identity list
    identity merge <idA> <idB>
    identity find-by-source <toolId>
    identity reset

  Bus:
    bus publish <topic> '<json>' [--source <toolId>]
    bus route <toolId> '<json>'
    bus stats
    bus reset

  Vocabularies:
    translate <from> <to> <value>
    translations
    domains

  Visualization:
    weave [--out <path>]

Tip: Use --pretty for indented JSON output. Press Tab for completion.
Everything Connected. Everyone Unified.`;
