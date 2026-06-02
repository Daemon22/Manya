#!/usr/bin/env node
/**
 * CRAFT CLI
 *
 * Usage:
 *   craft nano <file> -p <passphrase> [-o <output.craft>]
 *   craft macro <craft-file> -p <passphrase> [-o <output>]
 *   craft peek <craft-file>
 *   craft benchmark <file>
 *   craft checksum <file>
 *   craft version
 */

import * as fs from 'fs';
import * as path from 'path';
import { nano } from '../lib/nano';
import { macro, peekMetadata } from '../lib/macro';
import { compress7 } from '../lib/compress7';
import { checksum } from '../lib/integrity';
import { CRAFT_VERSION } from '../lib/types';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function parseArgs(args: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('-')) {
      const key = arg.replace(/^-+/, '');
      const next = args[i + 1];
      if (next && !next.startsWith('-')) { parsed[key] = next; i++; }
      else { parsed[key] = true; }
    }
  }
  return parsed;
}

function getMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf', '.json': 'application/json', '.txt': 'text/plain',
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.ts': 'application/typescript', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.zip': 'application/zip', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
    '.csv': 'text/csv', '.xml': 'application/xml', '.md': 'text/markdown',
  };
  return map[ext] || 'application/octet-stream';
}

async function cmdNano(filePath: string, opts: Record<string, string | boolean>) {
  const passphrase = opts.p || opts.passphrase;
  const outputPath = opts.o || opts.output;
  if (!passphrase || typeof passphrase !== 'string') { console.error(`${RED}Error: Passphrase is required. Use -p <passphrase>${RESET}`); process.exit(1); }
  if (passphrase.length < 8) { console.error(`${RED}Error: Passphrase must be at least 8 characters.${RESET}`); process.exit(1); }
  if (!fs.existsSync(filePath)) { console.error(`${RED}Error: File not found: ${filePath}${RESET}`); process.exit(1); }

  const data = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const mime = getMime(filePath);

  console.log(`  Input: ${fileName} (${formatBytes(data.length)})`);

  const result = await nano(data, fileName, mime, passphrase, { compressionMode: '7fold' });

  // Show strategy benchmarks as a simple table
  if (result.strategyBenchmarks && result.strategyBenchmarks.length > 1) {
    const sorted = [...result.strategyBenchmarks].sort((a, b) => a.size - b.size);
    console.log('');
    console.log('  Strategy                   Size        Savings');
    console.log('  ─────────────────────────────────────────────────');
    for (const s of sorted) {
      const pct = data.length > 0 ? ((1 - s.size / data.length) * 100).toFixed(1) : '0.0';
      const best = s.name === result.metadata.compressionStrategyName ? ' *' : '';
      console.log(`  #${s.strategy} ${s.name.padEnd(25)} ${formatBytes(s.size).padStart(10)}  ${pct.padStart(6)}%${best}`);
    }
  }

  console.log('');
  console.log(`  Original:    ${formatBytes(result.metadata.originalSize)}`);
  console.log(`  Compressed:  ${formatBytes(result.metadata.compressedSize)}`);
  console.log(`  Output:      ${formatBytes(result.buffer.length)}`);
  if (result.spaceSavedPercent > 0) {
    console.log(`  Saved:       ${result.spaceSavedPercent.toFixed(1)}% (${formatBytes(result.spaceSaved)})`);
  }
  console.log(`  Strategy:    ${result.metadata.compressionStrategyName || 'brotli'}`);
  console.log(`  Checksum:    ${result.metadata.originalChecksum.slice(0, 16)}...`);

  const outPath = typeof outputPath === 'string' ? outputPath : filePath + '.craft';
  fs.writeFileSync(outPath, result.buffer);
  console.log(`${GREEN}  Saved: ${outPath}${RESET}`);
}

async function cmdMacro(filePath: string, opts: Record<string, string | boolean>) {
  const passphrase = opts.p || opts.passphrase;
  const outputPath = opts.o || opts.output;
  if (!passphrase || typeof passphrase !== 'string') { console.error(`${RED}Error: Passphrase is required. Use -p <passphrase>${RESET}`); process.exit(1); }
  if (!fs.existsSync(filePath)) { console.error(`${RED}Error: File not found: ${filePath}${RESET}`); process.exit(1); }

  const craftBuffer = fs.readFileSync(filePath);

  try {
    const result = await macro(craftBuffer, passphrase);
    console.log(`  Name:      ${result.metadata.originalName}`);
    console.log(`  Size:      ${formatBytes(result.buffer.length)}`);
    console.log(`  Integrity: ${result.integrityVerified ? `${GREEN}VERIFIED${RESET}` : `${RED}FAILED${RESET}`}`);
    if (result.metadata.compressionStrategyName) {
      console.log(`  Strategy:  ${result.metadata.compressionStrategyName}`);
    }
    console.log(`  Checksum:  ${result.metadata.originalChecksum.slice(0, 16)}...`);

    const outPath = typeof outputPath === 'string' ? outputPath : result.metadata.originalName;
    fs.writeFileSync(outPath, result.buffer);
    console.log(`${GREEN}  Saved: ${outPath}${RESET}`);
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('auth tag') || err.message.includes('Unsupported state')) {
        console.error(`${RED}Error: Decryption failed — incorrect passphrase.${RESET}`);
      } else { console.error(`${RED}Error: ${err.message}${RESET}`); }
    } else { console.error(`${RED}Error: Unknown error during extraction.${RESET}`); }
    process.exit(1);
  }
}

function cmdBenchmark(filePath: string) {
  if (!fs.existsSync(filePath)) { console.error(`${RED}Error: File not found: ${filePath}${RESET}`); process.exit(1); }

  const data = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  console.log(`  File: ${fileName} (${formatBytes(data.length)})`);
  console.log('');

  const result = compress7(data);
  const sorted = [...result.allResults].sort((a, b) => a.size - b.size);

  console.log('  Strategy                   Size        Savings');
  console.log('  ─────────────────────────────────────────────────');
  for (const s of sorted) {
    const pct = data.length > 0 ? ((1 - s.size / data.length) * 100).toFixed(1) : '0.0';
    const best = s.strategy === result.strategy ? ' *' : '';
    console.log(`  #${s.strategy} ${s.name.padEnd(25)} ${formatBytes(s.size).padStart(10)}  ${pct.padStart(6)}%${best}`);
  }

  console.log('');
  console.log(`  Best:    ${result.strategyName} (${formatBytes(result.compressedSize + 1)})`);
  console.log(`  Savings: ${((1 - (result.compressedSize + 1) / data.length) * 100).toFixed(1)}%`);
}

function cmdPeek(filePath: string) {
  if (!fs.existsSync(filePath)) { console.error(`${RED}Error: File not found: ${filePath}${RESET}`); process.exit(1); }

  const craftBuffer = fs.readFileSync(filePath);
  try {
    const meta = peekMetadata(craftBuffer);
    console.log(`  Name:        ${meta.originalName}`);
    console.log(`  Size:        ${formatBytes(meta.originalSize)}`);
    console.log(`  MIME:        ${meta.originalMime}`);
    console.log(`  Compression: ${meta.compressionMode || 'brotli'}${meta.compressionStrategyName ? ` (${meta.compressionStrategyName})` : ''}`);
    console.log(`  Encryption:  ${meta.encryptionAlgo}`);
    console.log(`  Created:     ${new Date(meta.createdAt).toLocaleString()}`);
    console.log(`  Version:     ${meta.version}`);
    console.log(`  Checksum:    ${meta.originalChecksum}`);
  } catch (err: unknown) {
    if (err instanceof Error) console.error(`${RED}Error: ${err.message}${RESET}`);
    process.exit(1);
  }
}

function cmdChecksum(filePath: string) {
  if (!fs.existsSync(filePath)) { console.error(`${RED}Error: File not found: ${filePath}${RESET}`); process.exit(1); }
  const data = fs.readFileSync(filePath);
  console.log(`${checksum(data)}  ${path.basename(filePath)}`);
}

function cmdVersion() {
  console.log(`Craft v${CRAFT_VERSION}`);
}

const args = process.argv.slice(2);
const command = args[0];
const filePath = args[1];
const opts = parseArgs(args.slice(2));

switch (command) {
  case 'nano':
    if (!filePath) { console.error(`${RED}Usage: craft nano <file> -p <passphrase> [-o <output>]${RESET}`); process.exit(1); }
    cmdNano(filePath, opts);
    break;
  case 'macro':
    if (!filePath) { console.error(`${RED}Usage: craft macro <file.craft> -p <passphrase> [-o <output>]${RESET}`); process.exit(1); }
    cmdMacro(filePath, opts);
    break;
  case 'peek':
    if (!filePath) { console.error(`${RED}Usage: craft peek <file.craft>${RESET}`); process.exit(1); }
    cmdPeek(filePath);
    break;
  case 'benchmark':
    if (!filePath) { console.error(`${RED}Usage: craft benchmark <file>${RESET}`); process.exit(1); }
    cmdBenchmark(filePath);
    break;
  case 'checksum':
    if (!filePath) { console.error(`${RED}Usage: craft checksum <file>${RESET}`); process.exit(1); }
    cmdChecksum(filePath);
    break;
  case 'version': case '-v': case '--version':
    cmdVersion();
    break;
  default:
    console.log('CRAFT — Nano/Macro Encryption & Compression Engine');
    console.log('');
    console.log('  craft nano <file> -p <passphrase> [-o output.craft]    Compress & encrypt');
    console.log('  craft macro <file.craft> -p <passphrase> [-o output]   Decrypt & restore');
    console.log('  craft benchmark <file>                                 Compare all strategies');
    console.log('  craft peek <file.craft>                                Inspect metadata');
    console.log('  craft checksum <file>                                  SHA-256 digest');
    console.log('  craft version                                         Show version');
    break;
}
