/**
 * Data format detection for the Manya Lens tool.
 * Identifies the format and encoding of input data.
 */

/** Known format signatures (magic bytes). */
const SIGNATURES = [
  { name: 'pdf', check: (buf) => buf.length >= 5 && buf.toString('ascii', 0, 5) === '%PDF-' },
  { name: 'png', check: (buf) => buf.length >= 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG' },
  { name: 'jpeg', check: (buf) => buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xD8 },
  { name: 'gif', check: (buf) => buf.length >= 6 && (buf.toString('ascii', 0, 6) === 'GIF87a' || buf.toString('ascii', 0, 6) === 'GIF89a') },
  { name: 'zip', check: (buf) => buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4B },
  { name: 'gzip', check: (buf) => buf.length >= 2 && buf[0] === 0x1F && buf[1] === 0x8B },
  { name: 'brotli', check: (buf) => buf.length >= 1 && (buf[0] === 0x5E || buf[0] === 0x3B || buf[0] === 0x81) },
];

/**
 * Detects the format of a data buffer.
 * @param {Buffer} data - The data to inspect.
 * @returns {{ format: string, encoding: string, confidence: number, binary: boolean, size: number }}
 */
export function detect(data) {
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new Error('Data must be a non-empty Buffer');
  }
  const size = data.length;
  // Check binary signatures first
  for (const sig of SIGNATURES) {
    if (sig.check(data)) {
      return { format: sig.name, encoding: 'binary', confidence: 0.99, binary: true, size };
    }
  }
  // Try text-based detection
  const text = data.toString('utf8').trim();
  // JSON
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      JSON.parse(text);
      return { format: 'json', encoding: 'utf8', confidence: 0.95, binary: false, size };
    } catch {}
  }
  // XML
  if (text.startsWith('<?xml') || (text.startsWith('<') && text.endsWith('>') && /<\/[a-zA-Z]/.test(text))) {
    return { format: 'xml', encoding: 'utf8', confidence: 0.85, binary: false, size };
  }
  // CSV (simple heuristic: multiple lines with consistent delimiters)
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length >= 2) {
    const commaCount = (lines[0].match(/,/g) || []).length;
    const tabCount = (lines[0].match(/\t/g) || []).length;
    if (commaCount >= 1 && (lines[1].match(/,/g) || []).length === commaCount) {
      return { format: 'csv', encoding: 'utf8', confidence: 0.80, binary: false, size };
    }
    if (tabCount >= 1 && (lines[1].match(/\t/g) || []).length === tabCount) {
      return { format: 'tsv', encoding: 'utf8', confidence: 0.80, binary: false, size };
    }
  }
  // YAML (very simple heuristic)
  if (lines.length >= 2 && /^[a-zA-Z_][a-zA-Z0-9_]*:/.test(lines[0]) && !text.includes('<')) {
    return { format: 'yaml', encoding: 'utf8', confidence: 0.60, binary: false, size };
  }
  // Check for binary content (null bytes in first 8KB)
  const checkLen = Math.min(data.length, 8192);
  let nullCount = 0;
  for (let i = 0; i < checkLen; i++) {
    if (data[i] === 0) nullCount++;
  }
  if (nullCount > checkLen * 0.01) {
    return { format: 'binary', encoding: 'binary', confidence: 0.70, binary: true, size };
  }
  // Default to plain text
  return { format: 'text', encoding: 'utf8', confidence: 0.50, binary: false, size };
}
