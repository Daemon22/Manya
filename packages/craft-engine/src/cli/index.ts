#!/usr/bin/env node
/**
 * CRAFT CLI — 7-Fold Compression Edition
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

const colors = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  red: '\x1b[31m', magenta: '\x1b[35m', amber: '\x1b[38;5;178m',
  teal: '\x1b[38;5;80m', emerald: '\x1b[38;5;35m',
};

function log(emoji: string, message: string) { console.log(`${colors.dim}[${emoji}]${colors.reset} ${message}`); }
function success(message: string) { console.log(`${colors.emerald}${colors.bold}  ✓${colors.reset} ${message}`); }
function error(message: string) { console.error(`${colors.red}${colors.bold}  ✗${colors.reset} ${message}`); }
function info(message: string) { console.log(`${colors.teal}  →${colors.reset} ${colors.dim}${message}${colors.reset}`); }

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
  if (!passphrase || typeof passphrase !== 'string') { error('Passphrase is required. Use -p <passphrase>'); process.exit(1); }
  if (passphrase.length < 8) { error('Passphrase must be at least 8 characters.'); process.exit(1); }
  if (!fs.existsSync(filePath)) { error(`File not found: ${filePath}`); process.exit(1); }

  console.log('');
  log('⚙', `${colors.amber}${colors.bold}CRAFT Nano${colors.reset} — 7-Fold Compress & Encrypt`);
  console.log('');

  const data = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const mime = getMime(filePath);

  info(`Input: ${fileName} (${formatBytes(data.length)})`);
  info(`Running 7-fold compression strategies...`);

  const result = await nano(data, fileName, mime, passphrase, { compressionMode: '7fold' });

  // Show strategy benchmarks
  if (result.strategyBenchmarks && result.strategyBenchmarks.length > 1) {
    console.log('');
    const sorted = [...result.strategyBenchmarks].sort((a, b) => a.size - b.size);
    for (const s of sorted) {
      const pct = data.length > 0 ? ((1 - s.size / data.length) * 100).toFixed(1) : '0.0';
      const isWinner = s.name === result.metadata.compressionStrategyName;
      const marker = isWinner ? `${colors.amber} ← WINNER${colors.reset}` : '';
      const line = `    #${s.strategy} ${s.name.padEnd(25)} ${formatBytes(s.size).padStart(10)}  (${pct}% saved)${marker}`;
      console.log(isWinner ? `${colors.bold}${line}${colors.reset}` : line);
    }
  }

  console.log('');
  success(`Original:   ${formatBytes(result.metadata.originalSize)}`);
  success(`Compressed: ${formatBytes(result.metadata.compressedSize)}`);
  success(`Crafted:    ${formatBytes(result.buffer.length)}`);
  if (result.spaceSavedPercent > 0) {
    success(`Space saved: ${result.spaceSavedPercent.toFixed(1)}% (${formatBytes(result.spaceSaved)})`);
  }
  success(`Strategy:   ${result.metadata.compressionStrategyName || 'brotli'}`);

  console.log('');
  info(`SHA-256: ${result.metadata.originalChecksum.slice(0, 16)}...`);

  const outPath = typeof outputPath === 'string' ? outputPath : filePath + '.craft';
  fs.writeFileSync(outPath, result.buffer);
  console.log('');
  success(`Crafted package saved: ${outPath}`);
  console.log('');
}

async function cmdMacro(filePath: string, opts: Record<string, string | boolean>) {
  const passphrase = opts.p || opts.passphrase;
  const outputPath = opts.o || opts.output;
  if (!passphrase || typeof passphrase !== 'string') { error('Passphrase is required. Use -p <passphrase>'); process.exit(1); }
  if (!fs.existsSync(filePath)) { error(`File not found: ${filePath}`); process.exit(1); }

  console.log('');
  log('⚙', `${colors.teal}${colors.bold}CRAFT Macro${colors.reset} — Decrypt & Restore`);
  console.log('');

  const craftBuffer = fs.readFileSync(filePath);
  info(`Decrypting...`);
  info(`Decompressing (7-fold adaptive)...`);

  try {
    const result = await macro(craftBuffer, passphrase);
    console.log('');
    success(`Original name: ${result.metadata.originalName}`);
    success(`Restored size: ${formatBytes(result.buffer.length)}`);
    success(`Integrity:     ${result.integrityVerified ? `${colors.emerald}VERIFIED${colors.reset}` : `${colors.red}FAILED${colors.reset}`}`);
    if (result.metadata.compressionStrategyName) {
      success(`Strategy:      ${result.metadata.compressionStrategyName}`);
    }

    console.log('');
    info(`SHA-256: ${result.metadata.originalChecksum.slice(0, 16)}...`);

    const outPath = typeof outputPath === 'string' ? outputPath : result.metadata.originalName;
    fs.writeFileSync(outPath, result.buffer);
    console.log('');
    success(`Restored file saved: ${outPath}`);
    console.log('');
  } catch (err: unknown) {
    console.log('');
    if (err instanceof Error) {
      if (err.message.includes('auth tag') || err.message.includes('Unsupported state')) {
        error('Decryption failed — incorrect passphrase.');
      } else { error(err.message); }
    } else { error('Unknown error during Macro extraction.'); }
    process.exit(1);
  }
}

function cmdBenchmark(filePath: string) {
  if (!fs.existsSync(filePath)) { error(`File not found: ${filePath}`); process.exit(1); }

  console.log('');
  log('⚙', `${colors.amber}${colors.bold}CRAFT Benchmark${colors.reset} — 7-Fold Strategy Comparison`);
  console.log('');

  const data = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  info(`File: ${fileName} (${formatBytes(data.length)})`);
  info(`Running all 7 compression strategies...`);
  console.log('');

  const result = compress7(data);
  const sorted = [...result.allResults].sort((a, b) => a.size - b.size);

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const pct = data.length > 0 ? ((1 - s.size / data.length) * 100).toFixed(1) : '0.0';
    const isWinner = s.strategy === result.strategy;
    const rank = isWinner ? `${colors.amber}★${colors.reset}` : ` `;
    const bar = '█'.repeat(Math.max(1, Math.round(parseFloat(pct) / 2)));
    const marker = isWinner ? `${colors.amber} ← WINNER${colors.reset}` : '';

    console.log(`  ${rank} #${s.strategy} ${s.name.padEnd(25)} ${formatBytes(s.size).padStart(10)}  ${colors.emerald}${bar}${colors.reset} ${pct}%${marker}`);
  }

  console.log('');
  success(`Best strategy: ${result.strategyName} (${formatBytes(result.compressedSize + 1)})`);
  success(`Total savings: ${((1 - (result.compressedSize + 1) / data.length) * 100).toFixed(1)}%`);
  console.log('');
}

function cmdPeek(filePath: string) {
  if (!fs.existsSync(filePath)) { error(`File not found: ${filePath}`); process.exit(1); }
  console.log('');
  log('⚙', `${colors.cyan}${colors.bold}CRAFT Peek${colors.reset} — Package Inspection`);
  console.log('');
  const craftBuffer = fs.readFileSync(filePath);
  try {
    const meta = peekMetadata(craftBuffer);
    success(`Original name: ${meta.originalName}`);
    success(`Original size: ${formatBytes(meta.originalSize)}`);
    success(`MIME type:     ${meta.originalMime}`);
    success(`Compression:   ${meta.compressionMode || 'brotli'}${meta.compressionStrategyName ? ` (${meta.compressionStrategyName})` : ''}`);
    success(`Encryption:    ${meta.encryptionAlgo}`);
    success(`Created:       ${new Date(meta.createdAt).toLocaleString()}`);
    success(`Version:       ${meta.version}`);
    console.log('');
    info(`SHA-256: ${meta.originalChecksum}`);
    console.log('');
  } catch (err: unknown) {
    if (err instanceof Error) error(err.message);
    process.exit(1);
  }
}

function cmdChecksum(filePath: string) {
  if (!fs.existsSync(filePath)) { error(`File not found: ${filePath}`); process.exit(1); }
  const data = fs.readFileSync(filePath);
  console.log(`${checksum(data)}  ${path.basename(filePath)}`);
}

function cmdVersion() {
  console.log(`Craft v${CRAFT_VERSION} — 7-Fold Nano/Macro Encryption & Compression Engine`);
  console.log('Brotli Q11 + Delta + MTF + RLE + BPE + AES-256-GCM + SHA-256');
}

const args = process.argv.slice(2);
const command = args[0];
const filePath = args[1];
const opts = parseArgs(args.slice(2));

switch (command) {
  case 'nano':
    if (!filePath) { error('Usage: craft nano <file> -p <passphrase> [-o <output>]'); process.exit(1); }
    cmdNano(filePath, opts);
    break;
  case 'macro':
    if (!filePath) { error('Usage: craft macro <file.craft> -p <passphrase> [-o <output>]'); process.exit(1); }
    cmdMacro(filePath, opts);
    break;
  case 'peek':
    if (!filePath) { error('Usage: craft peek <file.craft>'); process.exit(1); }
    cmdPeek(filePath);
    break;
  case 'benchmark':
    if (!filePath) { error('Usage: craft benchmark <file>'); process.exit(1); }
    cmdBenchmark(filePath);
    break;
  case 'checksum':
    if (!filePath) { error('Usage: craft checksum <file>'); process.exit(1); }
    cmdChecksum(filePath);
    break;
  case 'version': case '-v': case '--version':
    cmdVersion();
    break;
  default:
    console.log('');
    console.log(`${colors.amber}${colors.bold}CRAFT${colors.reset} — 7-Fold Nano/Macro Encryption & Compression Engine`);
    console.log('');
    console.log('  craft nano <file> -p <passphrase> [-o output.craft]    7-Fold Compress & encrypt');
    console.log('  craft macro <file.craft> -p <passphrase> [-o output]   Decrypt & restore');
    console.log('  craft benchmark <file>                                 Compare all 7 strategies');
    console.log('  craft peek <file.craft>                                Inspect metadata');
    console.log('  craft checksum <file>                                  SHA-256 digest');
    console.log('  craft version                                         Show version');
    console.log('');
    break;
}
