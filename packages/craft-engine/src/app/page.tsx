'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shrink,
  Expand,
  Shield,
  ShieldCheck,
  Lock,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Package,
  FileUp,
  FileType,
  HardDrive,
  Hash,
  Search,
  Terminal,
  Sparkles,
  Leaf,
  Gem,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ─────────────────────────────────────────────────────────────
// Passphrase Strength
// ─────────────────────────────────────────────────────────────

function getPassphraseStrength(passphrase: string): {
  level: number; // 0=none, 1=basic, 2=strong, 3=fortress
  label: string;
  percent: number;
  barColor: string;
  labelColor: string;
} {
  const len = passphrase.length;
  if (len < 12) return { level: 0, label: 'Too short', percent: 0, barColor: '', labelColor: 'text-emerald-800/30' };
  if (len < 16) return { level: 1, label: 'Basic', percent: 33, barColor: '[&>[data-slot=indicator]]:bg-red-500', labelColor: 'text-red-400/70' };
  if (len < 24) return { level: 2, label: 'Strong', percent: 66, barColor: '[&>[data-slot=indicator]]:bg-amber-500', labelColor: 'text-amber-400/70' };
  return { level: 3, label: 'Fortress', percent: 100, barColor: '[&>[data-slot=indicator]]:bg-emerald-500', labelColor: 'text-emerald-400/70' };
}

function PassphraseStrength({ passphrase }: { passphrase: string }) {
  const strength = getPassphraseStrength(passphrase);
  if (passphrase.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${strength.labelColor}`}>{strength.label}</span>
        <span className="text-xs text-emerald-700/40">{passphrase.length} characters</span>
      </div>
      <Progress
        value={strength.percent}
        className={`h-1.5 bg-emerald-950/40 ${strength.barColor}`}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface CraftResult {
  originalSize: number;
  craftedSize: number;
  compressedSize: number;
  compressionRatio: number;
  spaceSaved: number;
  spaceSavedPercent: number;
  checksum: string;
  fileName: string;
  strategyName: string;
  mode: string;
  benchmarks: Array<{ strategy: number; name: string; size: number }>;
  processingTimeMs: number | null;
  blob: Blob;
}

interface MacroResult {
  restoredSize: number;
  originalName: string;
  originalMime: string;
  integrityVerified: boolean;
  checksum: string;
  processingTimeMs: number | null;
  blob: Blob;
}

// ─────────────────────────────────────────────────────────────
// Drop Zone — The Living Canvas
// ─────────────────────────────────────────────────────────────

function DropZone({
  onFileSelect,
  accept,
  label,
  icon: Icon,
  accent = 'gold',
}: {
  onFileSelect: (file: File) => void;
  accept?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'gold' | 'teal';
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const goldClasses = isDragging
    ? 'border-amber-500/60 bg-amber-500/5 shadow-[0_0_30px_rgba(217,170,60,0.08)]'
    : 'border-emerald-900/40 bg-emerald-950/20 hover:border-amber-600/30 hover:bg-emerald-950/30';
  const tealClasses = isDragging
    ? 'border-teal-400/60 bg-teal-500/5 shadow-[0_0_30px_rgba(45,212,191,0.08)]'
    : 'border-emerald-900/40 bg-emerald-950/20 hover:border-teal-500/30 hover:bg-emerald-950/30';

  const iconGold = isDragging ? 'text-amber-400 bg-amber-500/15' : 'text-amber-500/70 bg-amber-500/5';
  const iconTeal = isDragging ? 'text-teal-400 bg-teal-500/15' : 'text-teal-500/70 bg-teal-500/5';

  const isGold = accent === 'gold';

  return (
    <div
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) onFileSelect(f); }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 transition-all duration-500 ${isGold ? goldClasses : tealClasses}`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }}
      />
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={`rounded-full p-3 ${isGold ? iconGold : iconTeal} transition-all duration-300`}>
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm font-medium text-emerald-100/80">{label}</p>
          <p className="mt-1 text-xs text-emerald-800/60">Drag & drop or click to browse</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat Card — Living Current Style
// ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'gold',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}) {
  const colorMap: Record<string, { icon: string; border: string; glow: string }> = {
    gold: { icon: 'text-amber-400 bg-amber-500/10', border: 'border-amber-800/20', glow: '' },
    teal: { icon: 'text-teal-400 bg-teal-500/10', border: 'border-teal-800/20', glow: '' },
    emerald: { icon: 'text-emerald-400 bg-emerald-500/10', border: 'border-emerald-800/20', glow: '' },
    violet: { icon: 'text-violet-400 bg-violet-500/10', border: 'border-violet-800/20', glow: '' },
    rose: { icon: 'text-rose-400 bg-rose-500/10', border: 'border-rose-800/20', glow: '' },
  };
  const c = colorMap[color] || colorMap.gold;

  return (
    <div className={`rounded-lg border ${c.border} bg-emerald-950/30 p-3 transition-all duration-300 hover:bg-emerald-950/40`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`rounded-md p-1 ${c.icon}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[11px] uppercase tracking-wider text-emerald-700/60">{label}</span>
      </div>
      <p className="text-sm font-bold text-emerald-100/90">{value}</p>
      {subValue && <p className="text-[11px] text-emerald-700/50 mt-0.5">{subValue}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Application — The Living Canvas
// ─────────────────────────────────────────────────────────────

export default function Home() {
  // Nano state
  const [nanoFile, setNanoFile] = useState<File | null>(null);
  const [nanoPassphrase, setNanoPassphrase] = useState('');
  const [nanoShowPass, setNanoShowPass] = useState(false);
  const [nanoLoading, setNanoLoading] = useState(false);
  const [nanoResult, setNanoResult] = useState<CraftResult | null>(null);
  const [nanoError, setNanoError] = useState<string | null>(null);

  // Macro state
  const [macroFile, setMacroFile] = useState<File | null>(null);
  const [macroPassphrase, setMacroPassphrase] = useState('');
  const [macroShowPass, setMacroShowPass] = useState(false);
  const [macroLoading, setMacroLoading] = useState(false);
  const [macroResult, setMacroResult] = useState<MacroResult | null>(null);
  const [macroError, setMacroError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('nano');

  // ─── Nano Handler ──────────────────────────────────────────
  const handleNano = useCallback(async () => {
    if (!nanoFile || !nanoPassphrase) return;
    setNanoLoading(true);
    setNanoError(null);
    setNanoResult(null);
    try {
      const formData = new FormData();
      formData.append('file', nanoFile);
      formData.append('passphrase', nanoPassphrase);
      const res = await fetch('/api/craft/nano', { method: 'POST', body: formData });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Nano crafting failed'); }
      const blob = await res.blob();
      const h = res.headers;
      setNanoResult({
        originalSize: parseInt(h.get('X-Craft-Original-Size') || '0'),
        craftedSize: parseInt(h.get('X-Craft-Crafted-Size') || '0'),
        compressedSize: parseInt(h.get('X-Craft-Compressed-Size') || '0'),
        compressionRatio: parseFloat(h.get('X-Craft-Compression-Ratio') || '1'),
        spaceSaved: parseInt(h.get('X-Craft-Space-Saved') || '0'),
        spaceSavedPercent: parseFloat(h.get('X-Craft-Space-Saved-Percent') || '0'),
        checksum: h.get('X-Craft-Checksum') || '',
        fileName: nanoFile.name + '.craft',
        strategyName: h.get('X-Craft-Strategy') || 'brotli',
        mode: h.get('X-Craft-Mode') || '7fold',
        benchmarks: (() => { try { return JSON.parse(h.get('X-Craft-Benchmarks') || '[]'); } catch { return []; } })(),
        processingTimeMs: h.get('X-Craft-Processing-Time') ? parseInt(h.get('X-Craft-Processing-Time')!) : null,
        blob,
      });
    } catch (err: unknown) { setNanoError(err instanceof Error ? err.message : 'Nano crafting failed'); }
    finally { setNanoLoading(false); }
  }, [nanoFile, nanoPassphrase]);

  // ─── Macro Handler ──────────────────────────────────────────
  const handleMacro = useCallback(async () => {
    if (!macroFile || !macroPassphrase) return;
    setMacroLoading(true);
    setMacroError(null);
    setMacroResult(null);
    try {
      const formData = new FormData();
      formData.append('file', macroFile);
      formData.append('passphrase', macroPassphrase);
      const res = await fetch('/api/craft/macro', { method: 'POST', body: formData });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Macro extraction failed'); }
      const blob = await res.blob();
      const h = res.headers;
      setMacroResult({
        restoredSize: parseInt(h.get('X-Craft-Restored-Size') || '0'),
        originalName: h.get('X-Craft-Original-Name') || 'unknown',
        originalMime: h.get('Content-Type') || 'application/octet-stream',
        integrityVerified: h.get('X-Craft-Integrity-Verified') === 'true',
        checksum: h.get('X-Craft-Checksum') || '',
        processingTimeMs: h.get('X-Craft-Processing-Time') ? parseInt(h.get('X-Craft-Processing-Time')!) : null,
        blob,
      });
    } catch (err: unknown) { setMacroError(err instanceof Error ? err.message : 'Macro extraction failed'); }
    finally { setMacroLoading(false); }
  }, [macroFile, macroPassphrase]);

  const downloadFile = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const resetNano = useCallback(() => { setNanoFile(null); setNanoPassphrase(''); setNanoResult(null); setNanoError(null); }, []);
  const resetMacro = useCallback(() => { setMacroFile(null); setMacroPassphrase(''); setMacroResult(null); setMacroError(null); }, []);

  return (
    <div className="min-h-screen bg-[#0a1a14] text-emerald-50">
      {/* ─── Hero — The Living Canvas ──────────────────────── */}
      <header className="relative overflow-hidden border-b border-emerald-900/30">
        {/* Deep forest gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d2218] via-[#0a1a14] to-[#071510]" />
        {/* Glowing orbs — ancient wisdom meets future innovation */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[250px] bg-amber-500/5 blur-[100px] rounded-full" />
        <div className="absolute top-10 right-1/4 w-[400px] h-[200px] bg-teal-500/5 blur-[80px] rounded-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[150px] bg-emerald-500/3 blur-[120px] rounded-full" />

        <div className="relative max-w-5xl mx-auto px-4 py-14 sm:py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            {/* Logo — The Gem */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="relative">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500/80 via-amber-600 to-amber-700 flex items-center justify-center shadow-[0_0_30px_rgba(217,170,60,0.15)]">
                  <Gem className="h-7 w-7 text-amber-950" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Zap className="h-3 w-3 text-amber-950" />
                </motion.div>
              </div>
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-clip-text text-transparent">
                  Craft
                </span>
              </h1>
            </div>

            <div className="text-center">
              <p className="text-lg sm:text-xl text-emerald-200/60 max-w-xl mx-auto leading-relaxed font-light">
                7-Fold Encryption & Compression Engine
              </p>
              <p className="mt-3 text-sm text-emerald-700/50 max-w-lg mx-auto">
                Shrink data to its weightless form with{' '}
                <span className="text-amber-500/80 font-medium">7 adaptive strategies</span>,
                lock it with{' '}
                <span className="text-teal-400/80 font-medium">AES-256-GCM encryption</span>,
                verify with{' '}
                <span className="text-emerald-400/80 font-medium">SHA-256 integrity</span>.
              </p>

              {/* Pipeline — The Living Current */}
              <div className="mt-8 flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
                <Badge variant="outline" className="border-amber-800/30 bg-amber-950/20 text-amber-400/80 px-3 py-1.5 font-light">
                  <Shrink className="h-3 w-3 mr-1.5" />
                  Brotli Q11
                </Badge>
                <ArrowRight className="h-3.5 w-3.5 text-emerald-800/40" />
                <Badge variant="outline" className="border-teal-800/30 bg-teal-950/20 text-teal-400/80 px-3 py-1.5 font-light">
                  <Shield className="h-3 w-3 mr-1.5" />
                  AES-256-GCM
                </Badge>
                <ArrowRight className="h-3.5 w-3.5 text-emerald-800/40" />
                <Badge variant="outline" className="border-emerald-800/30 bg-emerald-950/20 text-emerald-400/80 px-3 py-1.5 font-light">
                  <Hash className="h-3 w-3 mr-1.5" />
                  SHA-256
                </Badge>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ─── Main Workspace ──────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-emerald-950/50 border border-emerald-900/30 h-12 rounded-xl p-1">
            <TabsTrigger
              value="nano"
              className="rounded-lg data-[state=active]:bg-amber-600/80 data-[state=active]:text-amber-50 transition-all h-full text-sm font-semibold gap-2 data-[state=active]:shadow-[0_0_15px_rgba(217,170,60,0.1)]"
            >
              <Shrink className="h-4 w-4" />
              Nano — Craft
            </TabsTrigger>
            <TabsTrigger
              value="macro"
              className="rounded-lg data-[state=active]:bg-teal-600/80 data-[state=active]:text-teal-50 transition-all h-full text-sm font-semibold gap-2 data-[state=active]:shadow-[0_0_15px_rgba(45,212,191,0.1)]"
            >
              <Expand className="h-4 w-4" />
              Macro — Extract
            </TabsTrigger>
          </TabsList>

          {/* ─── Nano Tab ──────────────────────────────────────── */}
          <TabsContent value="nano" className="mt-6">
            <AnimatePresence mode="wait">
              {!nanoResult ? (
                <motion.div key="nano-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="bg-emerald-950/20 border-emerald-900/30 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg text-amber-300/90">
                        <div className="rounded-lg bg-amber-500/10 p-2 border border-amber-800/20">
                          <Shrink className="h-5 w-5 text-amber-400" />
                        </div>
                        Nano — Compress & Encrypt
                      </CardTitle>
                      <CardDescription className="text-emerald-700/50">
                        Upload any file to compress it down to its smallest form and encrypt it.
                        The result is a .craft package — weightless and secure.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <DropZone onFileSelect={(f) => { setNanoFile(f); setNanoError(null); }} label={nanoFile ? nanoFile.name : 'Drop any file here to craft'} icon={nanoFile ? FileType : FileUp} accent="gold" />

                      {nanoFile && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          className="rounded-lg border border-emerald-900/30 bg-emerald-950/30 p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-amber-500/5 p-2"><FileType className="h-4 w-4 text-amber-500/70" /></div>
                            <div>
                              <p className="text-sm font-medium text-emerald-100/80 truncate max-w-[200px] sm:max-w-[400px]">{nanoFile.name}</p>
                              <p className="text-xs text-emerald-700/50">{formatBytes(nanoFile.size)} · {nanoFile.type || 'unknown type'}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-emerald-700/50 hover:text-emerald-200/80" onClick={() => setNanoFile(null)}>Remove</Button>
                        </motion.div>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-emerald-200/60 flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 text-amber-500/70" />
                          Encryption Passphrase
                        </label>
                        <div className="relative">
                          <Input type={nanoShowPass ? 'text' : 'password'} placeholder="Enter a strong passphrase (min 12 characters)"
                            value={nanoPassphrase} onChange={(e) => { setNanoPassphrase(e.target.value); setNanoError(null); }}
                            className="bg-emerald-950/40 border-emerald-900/30 pr-10 text-emerald-100/80 placeholder:text-emerald-800/40 focus:border-amber-600/40 focus:ring-amber-500/10"
                          />
                          <button type="button" onClick={() => setNanoShowPass(!nanoShowPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700/50 hover:text-amber-400/70">
                            {nanoShowPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <PassphraseStrength passphrase={nanoPassphrase} />
                      </div>

                      {nanoError && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="rounded-lg border border-rose-800/30 bg-rose-950/20 p-3 flex items-start gap-2"
                        >
                          <AlertTriangle className="h-4 w-4 text-rose-400/70 mt-0.5 shrink-0" />
                          <p className="text-sm text-rose-300/70">{nanoError}</p>
                        </motion.div>
                      )}

                      <Button onClick={handleNano} disabled={!nanoFile || nanoPassphrase.length < 12 || nanoLoading}
                        className="w-full h-11 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-amber-50 font-semibold gap-2 shadow-[0_0_20px_rgba(217,170,60,0.1)] transition-all"
                      >
                        {nanoLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Crafting...</> : <><Shrink className="h-4 w-4" />Craft with Nano</>}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="nano-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="bg-emerald-950/20 border-emerald-900/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg text-amber-300/90">
                        <div className="rounded-lg bg-amber-500/10 p-2 border border-amber-800/20">
                          <CheckCircle2 className="h-5 w-5 text-amber-400" />
                        </div>
                        Nano Crafting Complete
                      </CardTitle>
                      <CardDescription className="text-emerald-700/50">
                        Your file has been compressed and encrypted into a .craft package.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="rounded-lg border border-amber-800/20 bg-amber-950/15 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <CheckCircle2 className="h-5 w-5 text-amber-400/80" />
                          <div>
                            <p className="text-sm font-semibold text-amber-300/80">Successfully Crafted</p>
                            <p className="text-xs text-amber-600/50">{nanoResult.fileName}</p>
                          </div>
                        </div>
                        {nanoResult.spaceSaved > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-emerald-600/50 mb-1">
                              <span>Compression</span>
                              <span className="text-amber-400/70 font-medium">{nanoResult.spaceSavedPercent.toFixed(1)}% smaller</span>
                            </div>
                            <Progress value={Math.min(100, nanoResult.spaceSavedPercent)}
                              className="h-2 bg-emerald-950/40 [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-amber-500 [&>[data-slot=indicator]]:to-amber-600"
                            />
                          </div>
                        )}
                      </div>

                      {/* 7-Fold Strategy Benchmarks */}
                      {nanoResult.benchmarks && nanoResult.benchmarks.length > 1 && (
                        <div className="rounded-lg border border-amber-800/15 bg-amber-950/8 p-4">
                          <p className="text-xs uppercase tracking-wider text-amber-600/50 mb-3 font-semibold">7-Fold Strategy Benchmarks</p>
                          <div className="space-y-1.5">
                            {[...nanoResult.benchmarks].sort((a, b) => a.size - b.size).map((s) => {
                              const pct = nanoResult.originalSize > 0 ? ((1 - s.size / nanoResult.originalSize) * 100) : 0;
                              const isWinner = s.name === nanoResult.strategyName;
                              return (
                                <div key={s.strategy} className={`flex items-center gap-2 text-xs ${isWinner ? 'text-amber-300/80' : 'text-emerald-700/50'}`}>
                                  <span className="w-5 text-center">{isWinner ? '★' : `#${s.strategy}`}</span>
                                  <span className={`w-36 truncate ${isWinner ? 'font-semibold' : ''}`}>{s.name}</span>
                                  <div className="flex-1 h-3 bg-emerald-950/40 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${isWinner ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-emerald-800/30'}`}
                                      style={{ width: `${Math.max(2, pct)}%` }}
                                    />
                                  </div>
                                  <span className="w-16 text-right">{formatBytes(s.size)}</span>
                                  <span className="w-14 text-right">{pct.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <StatCard icon={HardDrive} label="Original" value={formatBytes(nanoResult.originalSize)} color="emerald" />
                        <StatCard icon={Shrink} label="Crafted" value={formatBytes(nanoResult.craftedSize)} color="gold" />
                        <StatCard icon={Zap} label="Saved" value={formatBytes(nanoResult.spaceSaved)} subValue={`${nanoResult.spaceSavedPercent.toFixed(1)}% reduction`} color="teal" />
                        <StatCard icon={FileArchive} label="Compressed" value={formatBytes(nanoResult.compressedSize)} subValue={`Ratio: ${nanoResult.compressionRatio.toFixed(3)}`} color="gold" />
                        <StatCard icon={Shield} label="Encryption" value="AES-256-GCM" subValue="PBKDF2 key derivation" color="teal" />
                        <StatCard icon={Hash} label="Strategy" value={nanoResult.strategyName} subValue={nanoResult.mode + ' mode'} color="emerald" />
                        {nanoResult.processingTimeMs !== null && (
                          <StatCard icon={Zap} label="Processing" value={`${(nanoResult.processingTimeMs / 1000).toFixed(2)}s`} subValue="Server time" color="gold" />
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Button onClick={() => downloadFile(nanoResult.blob, nanoResult.fileName)}
                          className="flex-1 h-11 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-amber-50 font-semibold gap-2 shadow-[0_0_20px_rgba(217,170,60,0.08)]"
                        >
                          Download .craft Package
                        </Button>
                        <Button variant="outline" onClick={resetNano}
                          className="border-emerald-900/30 text-emerald-300/60 hover:bg-emerald-950/40"
                        >Craft Another</Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ─── Macro Tab ──────────────────────────────────────── */}
          <TabsContent value="macro" className="mt-6">
            <AnimatePresence mode="wait">
              {!macroResult ? (
                <motion.div key="macro-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="bg-emerald-950/20 border-emerald-900/30 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg text-teal-300/90">
                        <div className="rounded-lg bg-teal-500/10 p-2 border border-teal-800/20">
                          <Expand className="h-5 w-5 text-teal-400" />
                        </div>
                        Macro — Decrypt & Restore
                      </CardTitle>
                      <CardDescription className="text-emerald-700/50">
                        Upload a .craft package and provide the passphrase to decrypt and restore the original file.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <DropZone onFileSelect={(f) => { setMacroFile(f); setMacroError(null); }}
                        label={macroFile ? macroFile.name : 'Drop a .craft file here to restore'}
                        icon={FileArchive} accept=".craft" accent="teal"
                      />

                      {macroFile && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          className="rounded-lg border border-emerald-900/30 bg-emerald-950/30 p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-teal-500/5 p-2"><FileArchive className="h-4 w-4 text-teal-500/70" /></div>
                            <div>
                              <p className="text-sm font-medium text-emerald-100/80 truncate max-w-[200px] sm:max-w-[400px]">{macroFile.name}</p>
                              <p className="text-xs text-emerald-700/50">{formatBytes(macroFile.size)}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-emerald-700/50 hover:text-emerald-200/80" onClick={() => setMacroFile(null)}>Remove</Button>
                        </motion.div>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-emerald-200/60 flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 text-teal-500/70" />
                          Decryption Passphrase
                        </label>
                        <div className="relative">
                          <Input type={macroShowPass ? 'text' : 'password'} placeholder="Enter the passphrase used during Nano crafting"
                            value={macroPassphrase} onChange={(e) => { setMacroPassphrase(e.target.value); setMacroError(null); }}
                            className="bg-emerald-950/40 border-emerald-900/30 pr-10 text-emerald-100/80 placeholder:text-emerald-800/40 focus:border-teal-500/40 focus:ring-teal-500/10"
                          />
                          <button type="button" onClick={() => setMacroShowPass(!macroShowPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700/50 hover:text-teal-400/70">
                            {macroShowPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <PassphraseStrength passphrase={macroPassphrase} />
                      </div>

                      {macroError && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="rounded-lg border border-rose-800/30 bg-rose-950/20 p-3 flex items-start gap-2"
                        >
                          <AlertTriangle className="h-4 w-4 text-rose-400/70 mt-0.5 shrink-0" />
                          <p className="text-sm text-rose-300/70">{macroError}</p>
                        </motion.div>
                      )}

                      <Button onClick={handleMacro} disabled={!macroFile || macroPassphrase.length < 12 || macroLoading}
                        className="w-full h-11 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-teal-50 font-semibold gap-2 shadow-[0_0_20px_rgba(45,212,191,0.08)] transition-all"
                      >
                        {macroLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Extracting...</> : <><Expand className="h-4 w-4" />Extract with Macro</>}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="macro-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="bg-emerald-950/20 border-emerald-900/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg text-teal-300/90">
                        <div className="rounded-lg bg-teal-500/10 p-2 border border-teal-800/20">
                          <ShieldCheck className="h-5 w-5 text-teal-400" />
                        </div>
                        Macro Extraction Complete
                      </CardTitle>
                      <CardDescription className="text-emerald-700/50">
                        Your .craft package has been decrypted and restored.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className={`rounded-lg border p-4 ${macroResult.integrityVerified ? 'border-emerald-800/30 bg-emerald-950/15' : 'border-rose-800/30 bg-rose-950/15'}`}>
                        <div className="flex items-center gap-3">
                          {macroResult.integrityVerified ? <CheckCircle2 className="h-5 w-5 text-emerald-400/80" /> : <AlertTriangle className="h-5 w-5 text-rose-400/80" />}
                          <div>
                            <p className={`text-sm font-semibold ${macroResult.integrityVerified ? 'text-emerald-300/80' : 'text-rose-300/80'}`}>
                              {macroResult.integrityVerified ? 'Integrity Verified — SHA-256 Checksum Match' : 'Integrity Failed — Checksum Mismatch'}
                            </p>
                            <p className={`text-xs ${macroResult.integrityVerified ? 'text-emerald-600/50' : 'text-rose-600/50'}`}>
                              {macroResult.integrityVerified ? 'The restored file is bit-identical to the original.' : 'The restored file does not match the original.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <StatCard icon={HardDrive} label="Restored" value={formatBytes(macroResult.restoredSize)} color="teal" />
                        <StatCard icon={FileType} label="Original Name" value={macroResult.originalName} color="gold" />
                        <StatCard icon={ShieldCheck} label="Integrity" value={macroResult.integrityVerified ? 'Verified' : 'Failed'} subValue="SHA-256" color={macroResult.integrityVerified ? 'emerald' : 'rose'} />
                        <StatCard icon={Hash} label="Checksum" value={macroResult.checksum.slice(0, 10) + '...'} subValue="SHA-256 digest" color="emerald" />
                        {macroResult.processingTimeMs !== null && (
                          <StatCard icon={Zap} label="Processing" value={`${(macroResult.processingTimeMs / 1000).toFixed(2)}s`} subValue="Server time" color="teal" />
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Button onClick={() => downloadFile(macroResult.blob, macroResult.originalName)}
                          className="flex-1 h-11 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-teal-50 font-semibold gap-2 shadow-[0_0_20px_rgba(45,212,191,0.08)]"
                        >
                          Download Restored File
                        </Button>
                        <Button variant="outline" onClick={resetMacro}
                          className="border-emerald-900/30 text-emerald-300/60 hover:bg-emerald-950/40"
                        >Extract Another</Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>

        {/* ─── The Seven Folds ─────────────────────────────── */}
        <section className="mt-16">
          <h2 className="text-xl font-bold text-center mb-8 text-amber-300/70 tracking-wide">
            The Seven Folds
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-emerald-950/15 border-emerald-900/20">
              <CardContent className="pt-5 text-center">
                <div className="rounded-xl bg-amber-500/8 p-2 inline-flex mb-3 border border-amber-800/15">
                  <span className="text-amber-400/80 text-sm font-bold">1</span>
                </div>
                <h3 className="font-semibold text-amber-300/80 text-sm mb-1">Analyze & Classify</h3>
                <p className="text-xs text-emerald-700/50">Detect data patterns to choose optimal pre-processing transforms.</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-950/15 border-emerald-900/20">
              <CardContent className="pt-5 text-center">
                <div className="rounded-xl bg-teal-500/8 p-2 inline-flex mb-3 border border-teal-800/15">
                  <span className="text-teal-400/80 text-sm font-bold">2</span>
                </div>
                <h3 className="font-semibold text-teal-300/80 text-sm mb-1">Delta Encode</h3>
                <p className="text-xs text-emerald-700/50">Store byte differences for sequential/structured data optimization.</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-950/15 border-emerald-900/20">
              <CardContent className="pt-5 text-center">
                <div className="rounded-xl bg-amber-500/8 p-2 inline-flex mb-3 border border-amber-800/15">
                  <span className="text-amber-400/80 text-sm font-bold">3</span>
                </div>
                <h3 className="font-semibold text-amber-300/80 text-sm mb-1">Move-to-Front</h3>
                <p className="text-xs text-emerald-700/50">Reorder recurring symbols so frequent ones get small indices.</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-950/15 border-emerald-900/20">
              <CardContent className="pt-5 text-center">
                <div className="rounded-xl bg-teal-500/8 p-2 inline-flex mb-3 border border-teal-800/15">
                  <span className="text-teal-400/80 text-sm font-bold">4</span>
                </div>
                <h3 className="font-semibold text-teal-300/80 text-sm mb-1">Run-Length Encode</h3>
                <p className="text-xs text-emerald-700/50">Collapse repeated byte sequences into compact run tokens.</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-950/15 border-emerald-900/20">
              <CardContent className="pt-5 text-center">
                <div className="rounded-xl bg-amber-500/8 p-2 inline-flex mb-3 border border-amber-800/15">
                  <span className="text-amber-400/80 text-sm font-bold">5</span>
                </div>
                <h3 className="font-semibold text-amber-300/80 text-sm mb-1">Byte-Pair Encode</h3>
                <p className="text-xs text-emerald-700/50">Replace the most frequent byte pairs with single unused bytes.</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-950/15 border-emerald-900/20">
              <CardContent className="pt-5 text-center">
                <div className="rounded-xl bg-teal-500/8 p-2 inline-flex mb-3 border border-teal-800/15">
                  <span className="text-teal-400/80 text-sm font-bold">6</span>
                </div>
                <h3 className="font-semibold text-teal-300/80 text-sm mb-1">Brotli Q11</h3>
                <p className="text-xs text-emerald-700/50">Maximum quality Brotli compression on pre-processed data.</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-950/15 border-emerald-900/20 sm:col-span-2">
              <CardContent className="pt-5 text-center">
                <div className="rounded-xl bg-emerald-500/8 p-2 inline-flex mb-3 border border-emerald-800/15">
                  <span className="text-emerald-400/80 text-sm font-bold">7</span>
                </div>
                <h3 className="font-semibold text-emerald-300/80 text-sm mb-1">Adaptive Selection</h3>
                <p className="text-xs text-emerald-700/50">Try all strategy combinations and always pick the smallest result. Craft never guesses — it measures.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ─── CLI Usage ──────────────────────────────────────── */}
        <section className="mt-10">
          <Card className="bg-emerald-950/15 border-emerald-900/20">
            <CardContent className="pt-5">
              <h3 className="font-semibold text-emerald-200/60 mb-4 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-amber-500/60" />
                Command-Line Usage
              </h3>
              <div className="space-y-2 font-mono text-xs">
                <div className="rounded-lg bg-[#061210] border border-emerald-900/20 p-3">
                  <span className="text-emerald-600/40">$</span> <span className="text-amber-400/70">craft nano</span> <span className="text-emerald-100/50">document.pdf</span> <span className="text-amber-400/50">-p</span> <span className="text-amber-300/60">"my secret"</span> <span className="text-amber-400/50">-o</span> <span className="text-emerald-100/50">doc.craft</span>
                </div>
                <div className="rounded-lg bg-[#061210] border border-emerald-900/20 p-3">
                  <span className="text-emerald-600/40">$</span> <span className="text-teal-400/70">craft macro</span> <span className="text-emerald-100/50">doc.craft</span> <span className="text-teal-400/50">-p</span> <span className="text-teal-300/60">"my secret"</span>
                </div>
                <div className="rounded-lg bg-[#061210] border border-emerald-900/20 p-3">
                  <span className="text-emerald-600/40">$</span> <span className="text-amber-400/70">craft benchmark</span> <span className="text-emerald-100/50">document.pdf</span> <span className="text-emerald-700/40"># compare all 7 strategies</span>
                </div>
                <div className="rounded-lg bg-[#061210] border border-emerald-900/20 p-3">
                  <span className="text-emerald-600/40">$</span> <span className="text-emerald-400/70">craft peek</span> <span className="text-emerald-100/50">doc.craft</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ─── Technical Specifications ──────────────────────── */}
        <section className="mt-6">
          <Card className="bg-emerald-950/15 border-emerald-900/20">
            <CardContent className="pt-5">
              <h3 className="font-semibold text-emerald-200/60 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500/40" />
                Technical Specifications
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg bg-[#061210] border border-emerald-900/15 p-2.5">
                  <p className="text-emerald-700/40 mb-0.5">Compression</p>
                  <p className="font-semibold text-amber-300/70">7-Fold Adaptive</p>
                </div>
                <div className="rounded-lg bg-[#061210] border border-emerald-900/15 p-2.5">
                  <p className="text-emerald-700/40 mb-0.5">Encryption</p>
                  <p className="font-semibold text-teal-300/70">AES-256-GCM</p>
                </div>
                <div className="rounded-lg bg-[#061210] border border-emerald-900/15 p-2.5">
                  <p className="text-emerald-700/40 mb-0.5">Key Derivation</p>
                  <p className="font-semibold text-amber-300/70">PBKDF2-SHA256</p>
                </div>
                <div className="rounded-lg bg-[#061210] border border-emerald-900/15 p-2.5">
                  <p className="text-emerald-700/40 mb-0.5">Integrity</p>
                  <p className="font-semibold text-emerald-300/70">SHA-256</p>
                </div>
                <div className="rounded-lg bg-[#061210] border border-emerald-900/15 p-2.5">
                  <p className="text-emerald-700/40 mb-0.5">Strategies</p>
                  <p className="font-semibold text-amber-300/70">7 Adaptive</p>
                </div>
                <div className="rounded-lg bg-[#061210] border border-emerald-900/15 p-2.5">
                  <p className="text-emerald-700/40 mb-0.5">Pre-processing</p>
                  <p className="font-semibold text-teal-300/70">Delta+MTF+RLE+BPE</p>
                </div>
                <div className="rounded-lg bg-[#061210] border border-emerald-900/15 p-2.5">
                  <p className="text-emerald-700/40 mb-0.5">Primary Codec</p>
                  <p className="font-semibold text-amber-300/70">Brotli Q11</p>
                </div>
                <div className="rounded-lg bg-[#061210] border border-emerald-900/15 p-2.5">
                  <p className="text-emerald-700/40 mb-0.5">Lossless</p>
                  <p className="font-semibold text-emerald-400/80">Guaranteed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* ─── Footer — The Roots ──────────────────────────────── */}
      <footer className="border-t border-emerald-900/20 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-amber-500/40" />
            <span className="text-xs text-emerald-700/40 font-medium">Craft</span>
            <Badge variant="outline" className="border-amber-800/20 bg-amber-950/15 text-amber-400/60 text-[10px] px-1.5 py-0 h-5 font-semibold">v2</Badge>
            <span className="text-xs text-emerald-700/40 font-medium">— 7-Fold Engine</span>
          </div>
          <p className="text-xs text-emerald-800/30">
            7-Fold Adaptive · Brotli + Delta + MTF + RLE + BPE + AES-256-GCM + SHA-256
          </p>
        </div>
      </footer>
    </div>
  );
}
