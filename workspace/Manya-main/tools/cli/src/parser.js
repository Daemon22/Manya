/**
 * Manya CLI — argument parser.
 *
 * Parses argv into a structured shape:
 *   { command, subcommand, args, flags, help, version }
 *
 * Flags start with `--` or `-`. The first non-flag token is the command;
 * the second non-flag token (when present) is the subcommand. All other
 * non-flag tokens become positional args. Flags with values consume the
 * next token (e.g. `--source research-academic`).
 */

/** Set of flags that DO take a value. */
const VALUE_FLAGS = new Set([
  '--source',
  '--confidence',
  '--metadata',
  '--state',
  '--out',
  '--port',
]);

/**
 * Parses argv into a structured command.
 * @param {string[]} argv - Arguments (typically process.argv.slice(2)).
 * @returns {{ command: string|null, subcommand: string|null, args: string[], flags: Record<string, string|boolean>, help: boolean, version: boolean }}
 */
export function parseArgs(argv) {
  const result = {
    command: null,
    subcommand: null,
    args: [],
    flags: {},
    help: false,
    version: false,
  };
  if (!Array.isArray(argv)) return result;

  const positionals = [];
  let i = 0;
  while (i < argv.length) {
    const tok = argv[i];
    if (tok === '--help' || tok === '-h') {
      result.help = true;
      i++;
      continue;
    }
    if (tok === '--version' || tok === '-v') {
      result.version = true;
      i++;
      continue;
    }
    if (tok === '--pretty') {
      result.flags.pretty = true;
      i++;
      continue;
    }
    if (tok === '--quiet') {
      result.flags.quiet = true;
      i++;
      continue;
    }
    if (tok.startsWith('--')) {
      const flagName = tok;
      if (VALUE_FLAGS.has(flagName)) {
        const value = argv[i + 1];
        if (value === undefined) {
          throw new Error(`Flag ${flagName} requires a value`);
        }
        result.flags[flagName.slice(2)] = value;
        i += 2;
        continue;
      }
      // Unknown boolean flag — store as true
      result.flags[flagName.slice(2)] = true;
      i++;
      continue;
    }
    if (tok.startsWith('-') && tok.length > 1) {
      // Short flag — treat as boolean
      result.flags[tok.slice(1)] = true;
      i++;
      continue;
    }
    positionals.push(tok);
    i++;
  }

  if (positionals.length > 0) {
    result.command = positionals[0];
  }
  if (positionals.length > 1) {
    result.subcommand = positionals[1];
  }
  if (positionals.length > 2) {
    result.args = positionals.slice(2);
  }
  return result;
}

/**
 * Helper: attempts to parse a JSON string, returning the original string on failure.
 * @param {string} s
 * @returns {any}
 */
export function tryParseJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
