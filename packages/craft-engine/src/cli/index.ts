#!/usr/bin/env node
/**
 * CRAFT CLI
 *
 * Usage:
 *   craft nano <file> -p <passphrase> [-o <output.craft>]
 *   craft macro <craft-file> -p <passphrase> [-o <output>]
 *   craft peek <craft-file>
 *   craft batch <dir> -p <passphrase> [-o <output.craft>]
 *   craft unbatch <archive.craft> -p <passphrase> [-o <output-dir>]
 *   craft inspect <file.craft>
 *   craft strength <passphrase>
 *   craft hash <file> [-a algorithm]
 *   craft benchmark <file>
 *   craft checksum <file>
 *   craft stamp <file> [-i issuer]
 *   craft detect <file>
 *   craft redact <file> [-r rules] [--replacement text]
 *   craft classify <file>
 *   craft version
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { nano } from '../lib/nano';
import { macro, peekMetadata } from '../lib/macro';
import { compress7 } from '../lib/compress7';
import { checksum } from '../lib/integrity';
import { archive, extract, peekArchiveMetadata } from '../lib/archive';
import { CRAFT_VERSION, CRAFT_MAGIC } from '../lib/types';

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

// ── Inline Passphrase Strength Scorer ────────────────────────────────

interface StrengthResult {
  score: number;        // 0–100
  level: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  entropyBits: number;
  crackTime: string;
  suggestions: string[];
}

function scorePassphrase(pp: string): StrengthResult {
  const len = pp.length;
  const hasLower = /[a-z]/.test(pp);
  const hasUpper = /[A-Z]/.test(pp);
  const hasDigit = /[0-9]/.test(pp);
  const hasSymbol = /[^a-zA-Z0-9]/.test(pp);

  // Calculate character pool size
  let poolSize = 0;
  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasDigit) poolSize += 10;
  if (hasSymbol) poolSize += 33;

  // Entropy in bits
  const entropyBits = poolSize > 0 ? Math.floor(len * Math.log2(poolSize)) : 0;

  // Estimate crack time (10 billion guesses/sec for a strong offline attack)
  const combinations = poolSize > 0 ? Math.pow(poolSize, len) : 0;
  const secondsToCrack = combinations / (10e9 * 2); // average: half the search space
  const crackTime = formatCrackTime(secondsToCrack);

  // Score calculation
  let score = 0;
  score += Math.min(len * 4, 40);            // length contribution (max 40)
  score += hasLower ? 10 : 0;
  score += hasUpper ? 10 : 0;
  score += hasDigit ? 10 : 0;
  score += hasSymbol ? 15 : 0;
  score += len >= 12 ? 10 : len >= 8 ? 5 : 0; // bonus for adequate length
  score += entropyBits >= 80 ? 5 : 0;          // high entropy bonus

  // Penalties
  if (len < 8) score -= 15;
  if (/^[a-z]+$/.test(pp) || /^[0-9]+$/.test(pp)) score -= 15; // single class
  if (/(.)\1{2,}/.test(pp)) score -= 10;                        // repeated chars

  score = Math.max(0, Math.min(100, score));

  // Level
  let level: StrengthResult['level'];
  if (score < 25) level = 'weak';
  else if (score < 45) level = 'fair';
  else if (score < 65) level = 'good';
  else if (score < 85) level = 'strong';
  else level = 'excellent';

  // Suggestions
  const suggestions: string[] = [];
  if (len < 12) suggestions.push('Use at least 12 characters for better security');
  if (!hasUpper) suggestions.push('Add uppercase letters');
  if (!hasLower) suggestions.push('Add lowercase letters');
  if (!hasDigit) suggestions.push('Add numbers');
  if (!hasSymbol) suggestions.push('Add symbols (!@#$%...)');
  if (/(.)\1{2,}/.test(pp)) suggestions.push('Avoid repeated characters');
  if (/^(123|abc|qwerty|password)/i.test(pp)) suggestions.push('Avoid common patterns');

  return { score, level, entropyBits, crackTime, suggestions };
}

function formatCrackTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return 'instant';
  if (seconds < 1) return 'less than a second';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 86400 * 30) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 86400 * 365) return `${Math.round(seconds / (86400 * 30))} months`;
  const years = seconds / (86400 * 365);
  if (years < 1000) return `${Math.round(years)} years`;
  if (years < 1e6) return `${(years / 1e3).toFixed(1)} thousand years`;
  if (years < 1e9) return `${(years / 1e6).toFixed(1)} million years`;
  if (years < 1e12) return `${(years / 1e9).toFixed(1)} billion years`;
  return 'centuries+';
}

// ── Command Implementations ──────────────────────────────────────────

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

// ── New Commands ─────────────────────────────────────────────────────

async function cmdBatch(dirPath: string, opts: Record<string, string | boolean>) {
  const passphrase = opts.p || opts.passphrase;
  const outputPath = opts.o || opts.output;
  if (!passphrase || typeof passphrase !== 'string') { console.error(`${RED}Error: Passphrase is required. Use -p <passphrase>${RESET}`); process.exit(1); }
  if (passphrase.length < 8) { console.error(`${RED}Error: Passphrase must be at least 8 characters.${RESET}`); process.exit(1); }
  if (!fs.existsSync(dirPath)) { console.error(`${RED}Error: Directory not found: ${dirPath}${RESET}`); process.exit(1); }
  if (!fs.statSync(dirPath).isDirectory()) { console.error(`${RED}Error: Not a directory: ${dirPath}${RESET}`); process.exit(1); }

  // Read all files from the directory (non-recursive, skip subdirectories)
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const fileEntries = entries.filter(e => e.isFile());

  if (fileEntries.length === 0) {
    console.error(`${RED}Error: No files found in directory: ${dirPath}${RESET}`);
    process.exit(1);
  }

  // Build ArchiveEntry[] from the files
  const archiveEntries = fileEntries.map(dirent => {
    const fullPath = path.join(dirPath, dirent.name);
    const data = fs.readFileSync(fullPath);
    return {
      name: dirent.name,
      mime: getMime(fullPath),
      data,
    };
  });

  const totalSize = archiveEntries.reduce((sum, e) => sum + e.data.length, 0);
  console.log(`  Directory:  ${dirPath}`);
  console.log(`  Files:      ${archiveEntries.length}`);
  console.log(`  Total size: ${formatBytes(totalSize)}`);
  console.log('');

  try {
    const result = await archive(archiveEntries, passphrase);

    console.log(`  Files:       ${result.entryCount}`);
    console.log(`  Total size:  ${formatBytes(result.totalOriginalSize)}`);
    console.log(`  Compressed:  ${formatBytes(result.compressedSize)}`);
    console.log(`  Output:      ${formatBytes(result.buffer.length)}`);
    if (result.spaceSavedPercent > 0) {
      console.log(`  Saved:       ${result.spaceSavedPercent.toFixed(1)}% (${formatBytes(result.spaceSaved)})`);
    }
    console.log(`  Strategy:    ${result.strategyName}`);
    console.log(`  Checksum:    ${result.checksum.slice(0, 16)}...`);

    const outPath = typeof outputPath === 'string' ? outputPath : path.join(dirPath, 'archive.craft');
    fs.writeFileSync(outPath, result.buffer);
    console.log(`${GREEN}  Saved: ${outPath}${RESET}`);
  } catch (err: unknown) {
    if (err instanceof Error) { console.error(`${RED}Error: ${err.message}${RESET}`); }
    else { console.error(`${RED}Error: Unknown error during batch operation.${RESET}`); }
    process.exit(1);
  }
}

async function cmdUnbatch(archivePath: string, opts: Record<string, string | boolean>) {
  const passphrase = opts.p || opts.passphrase;
  const outputDir = opts.o || opts.output;
  if (!passphrase || typeof passphrase !== 'string') { console.error(`${RED}Error: Passphrase is required. Use -p <passphrase>${RESET}`); process.exit(1); }
  if (!fs.existsSync(archivePath)) { console.error(`${RED}Error: File not found: ${archivePath}${RESET}`); process.exit(1); }

  const craftBuffer = fs.readFileSync(archivePath);

  try {
    const result = await extract(craftBuffer, passphrase);
    const dirPath = typeof outputDir === 'string' ? outputDir : path.join(path.dirname(archivePath), 'extracted');

    // Create output directory if needed
    fs.mkdirSync(dirPath, { recursive: true });

    // Write each entry to the directory
    for (const entry of result.entries) {
      const outFilePath = path.join(dirPath, entry.name);
      fs.writeFileSync(outFilePath, entry.data);
    }

    const totalSize = result.entries.reduce((sum, e) => sum + e.data.length, 0);

    console.log(`  Files:      ${result.entries.length}`);
    console.log(`  Total size: ${formatBytes(totalSize)}`);
    console.log(`  Integrity:  ${result.integrityVerified ? `${GREEN}VERIFIED${RESET}` : `${RED}FAILED${RESET}`}`);
    console.log(`  Strategy:   ${result.strategyName}`);
    console.log(`${GREEN}  Extracted to: ${dirPath}${RESET}`);
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('auth tag') || err.message.includes('Unsupported state')) {
        console.error(`${RED}Error: Decryption failed — incorrect passphrase.${RESET}`);
      } else { console.error(`${RED}Error: ${err.message}${RESET}`); }
    } else { console.error(`${RED}Error: Unknown error during extraction.${RESET}`); }
    process.exit(1);
  }
}

function cmdInspect(filePath: string) {
  if (!fs.existsSync(filePath)) { console.error(`${RED}Error: File not found: ${filePath}${RESET}`); process.exit(1); }

  const craftBuffer = fs.readFileSync(filePath);

  // Read magic bytes and version
  if (craftBuffer.length < 7) {
    console.error(`${RED}Error: File too small to be a valid .craft package.${RESET}`);
    process.exit(1);
  }

  const magicBuf = craftBuffer.subarray(0, 6);
  if (!magicBuf.equals(CRAFT_MAGIC)) {
    console.error(`${RED}Error: Not a valid .craft file — magic bytes mismatch.${RESET}`);
    process.exit(1);
  }

  const version = craftBuffer[6];

  console.log(`  File:       ${path.basename(filePath)}`);
  console.log(`  Format:     ${version === 3 ? 'Archive (multi-file)' : 'Nano (single-file)'}`);
  console.log(`  Version:    ${version}`);
  console.log(`  Magic:      ${magicBuf.toString('utf-8')}`);
  console.log('');

  try {
    if (version === 3) {
      // Multi-file archive — use peekArchiveMetadata
      const meta = peekArchiveMetadata(craftBuffer);

      // Also parse the full metadata JSON from the header for richer display
      const metaLen = craftBuffer.readUInt32BE(7);
      const metaJson = craftBuffer.subarray(11, 11 + metaLen).toString('utf-8');
      const fullMeta = JSON.parse(metaJson);

      console.log('  ── Archive Metadata ──────────────────────────');
      console.log(`  Entry count:     ${meta.entryCount}`);
      console.log(`  Strategy:        ${fullMeta.compressionStrategy || 'unknown'}`);
      console.log(`  Total size:      ${formatBytes(fullMeta.totalSize)}`);
      console.log(`  Checksum:        ${meta.checksum.slice(0, 32)}...`);
      console.log('');

      console.log('  ── File Listing ──────────────────────────────');
      for (const entry of fullMeta.entries) {
        console.log(`    ${entry.name.padEnd(30)} ${formatBytes(entry.size).padStart(10)}  ${entry.mime}`);
      }
    } else if (version === 1 || version === 2) {
      // Single-file package — use peekMetadata
      const meta = peekMetadata(craftBuffer);

      console.log('  ── Package Metadata ──────────────────────────');
      console.log(`  Name:            ${meta.originalName}`);
      console.log(`  Size:            ${formatBytes(meta.originalSize)}`);
      console.log(`  MIME:            ${meta.originalMime}`);
      console.log(`  Compression:     ${meta.compressionMode || 'brotli'}${meta.compressionStrategyName ? ` (${meta.compressionStrategyName})` : ''}`);
      console.log(`  Encryption:      ${meta.encryptionAlgo}`);
      console.log(`  Compressed size: ${formatBytes(meta.compressedSize)}`);
      console.log(`  Created:         ${new Date(meta.createdAt).toLocaleString()}`);
      console.log(`  Checksum:        ${meta.originalChecksum}`);
    } else {
      console.error(`${RED}Error: Unsupported CRAFT version: ${version}.${RESET}`);
      process.exit(1);
    }
  } catch (err: unknown) {
    if (err instanceof Error) console.error(`${RED}Error: ${err.message}${RESET}`);
    process.exit(1);
  }
}

function cmdStrength(passphrase: string) {
  if (!passphrase || passphrase.length === 0) {
    console.error(`${RED}Error: Passphrase is required. Usage: craft strength <passphrase>${RESET}`);
    process.exit(1);
  }

  const result = scorePassphrase(passphrase);

  const levelColors: Record<string, string> = {
    weak: RED,
    fair: '\x1b[33m',       // yellow
    good: '\x1b[36m',       // cyan
    strong: GREEN,
    excellent: '\x1b[35m',  // magenta
  };

  const color = levelColors[result.level] || RESET;

  console.log(`  Score:      ${result.score}/100`);
  console.log(`  Level:      ${color}${result.level.toUpperCase()}${RESET}`);
  console.log(`  Entropy:    ${result.entropyBits} bits`);
  console.log(`  Crack time: ${result.crackTime}`);

  if (result.suggestions.length > 0) {
    console.log('');
    console.log('  Suggestions:');
    for (const s of result.suggestions) {
      console.log(`    - ${s}`);
    }
  }
}

// ── Stamp Command ──────────────────────────────────────────────────

function cmdStamp(filePath: string, opts: Record<string, string | boolean>) {
  if (!fs.existsSync(filePath)) { console.error(`${RED}Error: File not found: ${filePath}${RESET}`); process.exit(1); }

  const data = fs.readFileSync(filePath);
  const issuer = (typeof opts.i === 'string' ? opts.i : (typeof opts.issuer === 'string' ? opts.issuer : null)) || 'manya';
  const nonce = createHash('sha256').update(data).update(Date.now().toString()).digest('hex').slice(0, 32);
  const hash = createHash('sha256').update(data).update(nonce).digest('hex');
  const timestamp = new Date().toISOString();

  console.log(`  File:       ${path.basename(filePath)}`);
  console.log(`  Size:       ${formatBytes(data.length)}`);
  console.log(`  Hash:       ${hash}`);
  console.log(`  Timestamp:  ${timestamp}`);
  console.log(`  Issuer:     ${issuer}`);
  console.log(`  Nonce:      ${nonce}`);
  console.log(`  Algorithm:  sha256`);
  console.log(`  Version:    1`);
}

// ── Detect Command ──────────────────────────────────────────────────

function cmdDetect(filePath: string) {
  if (!fs.existsSync(filePath)) { console.error(`${RED}Error: File not found: ${filePath}${RESET}`); process.exit(1); }

  const data = fs.readFileSync(filePath);
  const size = data.length;

  // Check binary signatures
  const sigs: Array<{ name: string; check: (b: Buffer) => boolean }> = [
    { name: 'PDF', check: (b) => b.length >= 5 && b.toString('ascii', 0, 5) === '%PDF-' },
    { name: 'PNG', check: (b) => b.length >= 8 && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG' },
    { name: 'JPEG', check: (b) => b.length >= 2 && b[0] === 0xFF && b[1] === 0xD8 },
    { name: 'GIF', check: (b) => b.length >= 6 && (b.toString('ascii', 0, 6) === 'GIF87a' || b.toString('ascii', 0, 6) === 'GIF89a') },
    { name: 'ZIP', check: (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4B },
    { name: 'GZIP', check: (b) => b.length >= 2 && b[0] === 0x1F && b[1] === 0x8B },
  ];

  for (const sig of sigs) {
    if (sig.check(data)) {
      console.log(`  Format:     ${sig.name}`);
      console.log(`  Encoding:   binary`);
      console.log(`  Size:       ${formatBytes(size)}`);
      console.log(`  Binary:     yes`);
      return;
    }
  }

  // Text-based detection
  const text = data.toString('utf8').trim();
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try { JSON.parse(text); console.log(`  Format:     JSON`); console.log(`  Encoding:   utf8`); console.log(`  Size:       ${formatBytes(size)}`); console.log(`  Binary:     no`); return; } catch {}
  }
  if (text.startsWith('<?xml') || (text.startsWith('<') && text.endsWith('>') && /<\/[a-zA-Z]/.test(text))) {
    console.log(`  Format:     XML`); console.log(`  Encoding:   utf8`); console.log(`  Size:       ${formatBytes(size)}`); console.log(`  Binary:     no`); return;
  }
  const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
  if (lines.length >= 2) {
    const commaCount = (lines[0].match(/,/g) || []).length;
    if (commaCount >= 1 && (lines[1].match(/,/g) || []).length === commaCount) {
      console.log(`  Format:     CSV`); console.log(`  Encoding:   utf8`); console.log(`  Size:       ${formatBytes(size)}`); console.log(`  Binary:     no`); return;
    }
  }

  // Check null bytes
  const checkLen = Math.min(size, 8192);
  let nullCount = 0;
  for (let i = 0; i < checkLen; i++) { if (data[i] === 0) nullCount++; }
  if (nullCount > checkLen * 0.01) {
    console.log(`  Format:     binary`); console.log(`  Encoding:   binary`); console.log(`  Size:       ${formatBytes(size)}`); console.log(`  Binary:     yes`); return;
  }

  console.log(`  Format:     text`); console.log(`  Encoding:   utf8`); console.log(`  Size:       ${formatBytes(size)}`); console.log(`  Binary:     no`);
}

// ── Redact Command ──────────────────────────────────────────────────

function cmdRedact(filePath: string, opts: Record<string, string | boolean>) {
  if (!fs.existsSync(filePath)) { console.error(`${RED}Error: File not found: ${filePath}${RESET}`); process.exit(1); }

  const rawRules = (typeof opts.r === 'string' ? opts.r : (typeof opts.rules === 'string' ? opts.rules : null)) || 'pii';
  const rules = rawRules.split(',').map((r: string) => r.trim());
  const replacement = (typeof opts.replacement === 'string' ? opts.replacement : '[REDACTED]');

  const text = fs.readFileSync(filePath, 'utf8');

  const patterns: Record<string, { regex: RegExp; label: string }> = {
    email: { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: 'EMAIL' },
    phone: { regex: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, label: 'PHONE' },
    ssn: { regex: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, label: 'SSN' },
    creditCard: { regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, label: 'CREDIT_CARD' },
    ipAddress: { regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, label: 'IP' },
  };

  // Resolve presets
  const presets: Record<string, string[]> = {
    pii: ['email', 'phone', 'ssn', 'ipAddress'],
    phi: ['email', 'phone', 'ssn'],
    financial: ['creditCard', 'ssn'],
    all: Object.keys(patterns),
  };

  const resolvedRules: string[] = [];
  for (const rule of rules) {
    if (presets[rule]) resolvedRules.push(...presets[rule]);
    else resolvedRules.push(rule);
  }

  let redacted = text;
  let totalCount = 0;
  const found: Array<{ type: string; count: number }> = [];

  for (const ruleName of resolvedRules) {
    const pattern = patterns[ruleName];
    if (!pattern) continue;
    const matches = redacted.match(pattern.regex);
    if (matches && matches.length > 0) {
      found.push({ type: pattern.label, count: matches.length });
      totalCount += matches.length;
      redacted = redacted.replace(pattern.regex, `${replacement}(${pattern.label})`);
    }
  }

  // Write redacted output
  const outPath = filePath + '.redacted';
  fs.writeFileSync(outPath, redacted);

  console.log(`  File:          ${path.basename(filePath)}`);
  console.log(`  Rules:         ${rawRules}`);
  console.log(`  Replacement:   ${replacement}`);
  console.log(`  Redactions:    ${totalCount}`);
  for (const f of found) {
    console.log(`    - ${f.type}: ${f.count}`);
  }
  console.log(`${GREEN}  Saved: ${outPath}${RESET}`);
}

// ── Classify Command ──────────────────────────────────────────────────

function cmdClassify(filePath: string) {
  if (!fs.existsSync(filePath)) { console.error(`${RED}Error: File not found: ${filePath}${RESET}`); process.exit(1); }

  const text = fs.readFileSync(filePath, 'utf8');
  const lower = text.toLowerCase();

  const classificationRules = [
    { level: 'restricted', keywords: ['top secret', 'classified', 'secret', 'noforn'], score: 100 },
    { level: 'restricted', keywords: ['hipaa', 'phi', 'protected health', 'patient record'], score: 90 },
    { level: 'restricted', keywords: ['pci-dss', 'cardholder data', 'pan', 'cvv'], score: 90 },
    { level: 'confidential', keywords: ['confidential', 'proprietary', 'trade secret', 'internal only'], score: 70 },
    { level: 'confidential', keywords: ['ssn', 'social security', 'date of birth', 'passport number', 'bank account'], score: 75 },
    { level: 'confidential', keywords: ['salary', 'compensation', 'performance review'], score: 65 },
    { level: 'internal', keywords: ['internal', 'employee only', 'staff only', 'company use'], score: 50 },
    { level: 'internal', keywords: ['draft', 'work in progress', 'not for public'], score: 45 },
    { level: 'public', keywords: ['public', 'published', 'press release', 'marketing'], score: 10 },
  ];

  let maxScore = 0;
  const matched: Array<{ level: string; keyword: string; score: number }> = [];

  for (const rule of classificationRules) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        maxScore = Math.max(maxScore, rule.score);
        matched.push({ level: rule.level, keyword, score: rule.score });
      }
    }
  }

  let level = 'public';
  if (maxScore >= 85) level = 'restricted';
  else if (maxScore >= 55) level = 'confidential';
  else if (maxScore >= 30) level = 'internal';

  const levelColors: Record<string, string> = {
    public: GREEN,
    internal: '\x1b[36m',
    confidential: '\x1b[33m',
    restricted: RED,
  };

  const color = levelColors[level] || RESET;

  console.log(`  File:        ${path.basename(filePath)}`);
  console.log(`  Level:       ${color}${level.toUpperCase()}${RESET}`);
  console.log(`  Score:       ${maxScore}/100`);
  if (matched.length > 0) {
    console.log(`  Matched:`);
    for (const m of matched) {
      console.log(`    - ${m.keyword} (${m.level}, ${m.score})`);
    }
  }
  console.log('');
  console.log('  Recommendations:');
  if (level === 'restricted') {
    console.log('    - Encrypt at rest and in transit');
    console.log('    - Implement role-based access control');
    console.log('    - Audit all access attempts');
    console.log('    - Consider data residency requirements');
  } else if (level === 'confidential') {
    console.log('    - Encrypt at rest and in transit');
    console.log('    - Limit access to authorized personnel');
    console.log('    - Log access for audit purposes');
  } else if (level === 'internal') {
    console.log('    - Do not share externally without approval');
    console.log('    - Consider access logging');
  } else {
    console.log('    - No special handling required');
  }
}

function cmdHash(filePath: string, opts: Record<string, string | boolean>) {
  if (!fs.existsSync(filePath)) { console.error(`${RED}Error: File not found: ${filePath}${RESET}`); process.exit(1); }

  const rawAlgo = opts.a !== true ? opts.a : opts.algorithm;
  const algorithm: string = (typeof rawAlgo === 'string' ? rawAlgo : null) || 'sha256';
  const supportedAlgorithms = ['sha256', 'sha384', 'sha512', 'sha3-256', 'sha3-512', 'blake2b512'];

  if (!supportedAlgorithms.includes(algorithm)) {
    console.error(`${RED}Error: Unsupported algorithm '${algorithm}'. Supported: ${supportedAlgorithms.join(', ')}${RESET}`);
    process.exit(1);
  }

  const data = fs.readFileSync(filePath);
  const hash = createHash(algorithm).update(data).digest('hex');
  console.log(`${hash}  ${path.basename(filePath)}`);
  console.log(`  Algorithm: ${algorithm}`);
}

// ── CLI Router ───────────────────────────────────────────────────────

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
  case 'batch':
    if (!filePath) { console.error(`${RED}Usage: craft batch <dir> -p <passphrase> [-o <output.craft>]${RESET}`); process.exit(1); }
    cmdBatch(filePath, opts);
    break;
  case 'unbatch':
    if (!filePath) { console.error(`${RED}Usage: craft unbatch <archive.craft> -p <passphrase> [-o <output-dir>]${RESET}`); process.exit(1); }
    cmdUnbatch(filePath, opts);
    break;
  case 'inspect':
    if (!filePath) { console.error(`${RED}Usage: craft inspect <file.craft>${RESET}`); process.exit(1); }
    cmdInspect(filePath);
    break;
  case 'strength':
    if (!filePath) { console.error(`${RED}Usage: craft strength <passphrase>${RESET}`); process.exit(1); }
    cmdStrength(filePath);
    break;
  case 'hash':
    if (!filePath) { console.error(`${RED}Usage: craft hash <file> [-a algorithm]${RESET}`); process.exit(1); }
    cmdHash(filePath, opts);
    break;
  case 'benchmark':
    if (!filePath) { console.error(`${RED}Usage: craft benchmark <file>${RESET}`); process.exit(1); }
    cmdBenchmark(filePath);
    break;
  case 'checksum':
    if (!filePath) { console.error(`${RED}Usage: craft checksum <file>${RESET}`); process.exit(1); }
    cmdChecksum(filePath);
    break;
  case 'stamp':
    if (!filePath) { console.error(`${RED}Usage: craft stamp <file> [-i issuer]${RESET}`); process.exit(1); }
    cmdStamp(filePath, opts);
    break;
  case 'detect':
    if (!filePath) { console.error(`${RED}Usage: craft detect <file>${RESET}`); process.exit(1); }
    cmdDetect(filePath);
    break;
  case 'redact':
    if (!filePath) { console.error(`${RED}Usage: craft redact <file> [-r rules] [--replacement text]${RESET}`); process.exit(1); }
    cmdRedact(filePath, opts);
    break;
  case 'classify':
    if (!filePath) { console.error(`${RED}Usage: craft classify <file>${RESET}`); process.exit(1); }
    cmdClassify(filePath);
    break;
  case 'version': case '-v': case '--version':
    cmdVersion();
    break;
  default:
    console.log('CRAFT — Manya Encryption, Compression & Data Toolkit');
    console.log('');
    console.log('  Compression & Encryption:');
    console.log('    craft nano <file> -p <passphrase> [-o output.craft]      Compress & encrypt');
    console.log('    craft macro <file.craft> -p <passphrase> [-o output]     Decrypt & restore');
    console.log('    craft batch <dir> -p <passphrase> [-o output.craft]      Archive directory');
    console.log('    craft unbatch <archive.craft> -p <passphrase> [-o dir]   Extract archive');
    console.log('');
    console.log('  Inspection & Security:');
    console.log('    craft inspect <file.craft>                               Detailed package analysis');
    console.log('    craft peek <file.craft>                                  Inspect metadata');
    console.log('    craft hash <file> [-a algorithm]                         Compute file hash');
    console.log('    craft checksum <file>                                    SHA-256 digest');
    console.log('    craft strength <passphrase>                              Score passphrase strength');
    console.log('    craft benchmark <file>                                   Compare all strategies');
    console.log('');
    console.log('  Data Intelligence (Stamp / Lens):');
    console.log('    craft stamp <file> [-i issuer]                           Create timestamp proof');
    console.log('    craft detect <file>                                      Detect file format');
    console.log('    craft redact <file> [-r rules] [--replacement text]      Redact PII/PHI');
    console.log('    craft classify <file>                                    Classify sensitivity');
    console.log('');
    console.log('    craft version                                            Show version');
    break;
}
