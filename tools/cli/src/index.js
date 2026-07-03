/**
 * Manya CLI — argument parsing and command dispatch.
 *
 * The CLI is organized as a tiny harness that parses `process.argv` into
 * a { command, subcommand, args, flags } shape and dispatches to a handler
 * module. Handlers are pure functions of (state, args, flags) → output,
 * which makes them testable without spawning a process.
 *
 * Everything Connected. Everyone Unified.
 */

import { parseArgs } from './parser.js';
import { runCommand } from './dispatcher.js';
import { startServer } from './serve.js';
import { startRepl } from './repl.js';

/**
 * Main entry point for the CLI.
 * @param {string[]} argv - Process arguments (typically process.argv.slice(2)).
 * @param {object} [options] - Execution options.
 * @param {NodeJS.Process} [options.process=process] - Process object (for testing).
 * @returns {Promise<number>} Exit code (0 = success, 1 = error).
 */
export async function main(argv, options = {}) {
  const proc = options.process || process;
  try {
    const parsed = parseArgs(argv);
    if (parsed.help) {
      proc.stdout.write(HELP_TEXT + '\n');
      return 0;
    }
    if (parsed.version) {
      proc.stdout.write('manya 0.6.0\n');
      return 0;
    }
    // Long-running commands that need to be handled outside the dispatcher
    if (parsed.command === 'serve') {
      const port = parseInt(parsed.flags.port || '3100', 10);
      const { server, url } = await startServer({ port });
      proc.stdout.write(`Manya server listening on ${url}\n`);
      proc.stdout.write(`  Dashboards: ${url}/  ${url}/weave\n`);
      proc.stdout.write(`  REST API:   ${url}/api/health\n`);
      proc.stdout.write(`  SSE stream: ${url}/api/events\n`);
      proc.stdout.write(`Press Ctrl+C to stop.\n`);
      return new Promise(() => {}); // never return — server runs until killed
    }
    if (parsed.command === 'repl') {
      await startRepl({ process: proc, stateFile: parsed.flags.state });
      return 0;
    }
    if (parsed.command === 'browse') {
      // Launch the Lycon browser via Electron
      const { spawn } = await import('node:child_process');
      const url = parsed.args[0] || parsed.flags.url || null;
      const isPrivate = !!parsed.flags.private;
      proc.stdout.write('Launching Lycon browser (Manya-integrated)...\n');
      if (url) proc.stdout.write(`  Initial URL: ${url}\n`);
      if (isPrivate) proc.stdout.write('  Mode: Private (temporary federated identity)\n');
      try {
        const args = ['.'];
        if (url) args.push(url);
        if (isPrivate) args.push('--private');
        if (parsed.flags.noSandbox) args.push('--no-sandbox');
        const child = spawn('npx', ['electron', ...args], {
          cwd: process.cwd() + '/tools/lycon-browser',
          stdio: 'inherit',
          shell: true,
        });
        return new Promise((resolve) => {
          child.on('exit', (code) => resolve(code || 0));
        });
      } catch (err) {
        proc.stderr.write(`Failed to launch Lycon: ${err.message}\n`);
        proc.stderr.write('Make sure Electron is installed: cd tools/lycon-browser && npm install\n');
        return 1;
      }
    }
    const result = await runCommand(parsed, { process: proc });
    if (result && typeof result.output === 'string' && result.output.length > 0) {
      proc.stdout.write(result.output + (result.output.endsWith('\n') ? '' : '\n'));
    }
    return result?.exitCode ?? 0;
  } catch (err) {
    proc.stderr.write(`manya: ${err.message}\n`);
    if (process.env.MANYA_DEBUG) {
      proc.stderr.write(err.stack + '\n');
    }
    return 1;
  }
}

const HELP_TEXT = `Manya CLI — command-line interface to the Manya ecosystem

USAGE
  manya <command> [subcommand] [args] [flags]

COMMANDS
  version                              Show CLI version
  help                                 Show this help text

  mesh list                            List all registered tools
  mesh register <toolId>               Register a tool by id (forge, research-academic, ...)
  mesh register-all                    Register all 15 known tools
  mesh dispatch <capability> <method> [args...]
                                       Dispatch a capability-based call
  mesh channels                        List all declared sync channels
  mesh reset                           Clear the mesh registry

  identity create <type> <value> [--metadata <json>]
                                       Create a federated identity
  identity link <id> <type> <value> [--source <toolId>] [--confidence <0-1>]
                                       Link an identifier to an identity
  identity resolve <type> <value>      Resolve an identifier to its federated identity
  identity list                        List all identities
  identity merge <idA> <idB>           Merge two identities into one
  identity find-by-source <toolId>     Find identities linked from a tool
  identity reset                       Clear the identity store

  bus publish <topic> <json> [--source <toolId>]
                                       Publish an event to a topic
  bus route <toolId> <json>            Auto-route an event via a tool's sync channels
  bus stats                            Show event-bus statistics
  bus reset                            Reset the event bus

  translate <from> <to> <value>        Translate a value between vocabularies
  translations                         List supported translation pairs

  weave [--out <path>]                 Generate the Manya Weave visualization HTML

  serve [--port <port>]                Start the HTTP server with REST API + SSE event stream
                                      (serves /, /weave, /api/* endpoints)
  repl                                 Start the interactive shell (tab-completion, history)
  browse [url] [--no-sandbox] [--private]
                                      Launch the Lycon browser (Manya-integrated)
                                      --private: auto-creates a temporary federated identity

FLAGS
  --pretty                             Pretty-print JSON output
  --quiet                              Suppress output
  --state <path>                       Path to state file (default: ~/.manya/state.json)
  --help, -h                           Show help
  --version, -v                        Show version

EXAMPLES
  manya mesh register-all
  manya mesh dispatch citationValidation validateDOI 10.1000/182
  manya identity create orcid 0000-0002-1825-0097
  manya identity link id-abc doi 10.1000/182 --source research-academic
  manya identity resolve orcid 0000-0002-1825-0097
  manya bus publish citation-verified '{"type":"doi-verified"}' --source research-academic
  manya translate hs_code industry 300490
  manya weave --out ./manya-weave.html

Everything Connected. Everyone Unified.`;

export { HELP_TEXT };

// Auto-execute when run as a script (not when imported as a module).
// Uses URL comparison to support both `node index.js` and `./index.js` invocations.
if (process.argv[1] && process.argv[1].endsWith('tools/cli/src/index.js')) {
  const args = process.argv.slice(2);
  main(args).then((exitCode) => {
    process.exit(exitCode);
  });
}
