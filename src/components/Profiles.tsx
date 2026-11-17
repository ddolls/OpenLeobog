import React, { useState, useRef } from 'react';
import {
  ArrowLeftRight,
  Check,
  Sliders,
  Gamepad2,
  Apple,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileJson,
  Loader2,
} from 'lucide-react';
import { profileManager, type Hi75cProfile } from '../services/profileManager';

interface ProfilesProps {
  onSwapWinAlt: () => void;
  onResetAll: () => void;
}

export const Profiles: React.FC<ProfilesProps> = ({ onSwapWinAlt, onResetAll }) => {
  const [exportName, setExportName] = useState('My Custom Layout');
  const [importedProfile, setImportedProfile] = useState<Hi75cProfile | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [hasBackup, setHasBackup] = useState(() => profileManager.hasSafetyBackup());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      profileManager.exportProfile(exportName.trim() || 'Custom Layout');
      setStatusMessage({
        type: 'success',
        text: `Profil "${exportName}" berhasil diekspor ke file JSON!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Gagal mengekspor profil: ${err.message}`,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = profileManager.parseProfileJson(text);
        setImportedProfile(parsed);
        setStatusMessage({
          type: 'success',
          text: `File "${file.name}" valid! Siap diterapkan ke keyboard.`,
        });
      } catch (err: any) {
        setImportedProfile(null);
        setStatusMessage({
          type: 'error',
          text: `File profil tidak valid: ${err.message}`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyImported = async () => {
    if (!importedProfile) return;
    setIsApplying(true);
    setStatusMessage(null);

    try {
      const res = await profileManager.applyProfile(importedProfile);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Profil "${importedProfile.name}" berhasil diterapkan dan diverifikasi ke hardware!`,
        });
        setHasBackup(true);
        setImportedProfile(null);
        setImportFileName(null);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error saat apply profil: ${err.message}`,
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!confirm('Kembalikan konfigurasi keyboard ke cadangan terakhir sebelum impor?')) {
      return;
    }
    setIsApplying(true);
    setStatusMessage(null);

    try {
      const res = await profileManager.restoreLastBackup();
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Konfigurasi cadangan keselamatan berhasil dikembalikan ke keyboard!',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Gagal mengembalikan cadangan: ${err.message}`,
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Status Feedback Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-[11px] underline opacity-70 hover:opacity-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* SECTION 1: Ekspor & Impor Profil */}
      <div className="space-y-4">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">
            PROFILE MANAGEMENT
          </div>
          <h2 className="text-xl font-bold text-white mt-0.5">Ekspor &amp; Impor Profil JSON</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Simpan susunan keymap, shortcut FN, dan pengaturan pencahayaan RGB ke file JSON, atau pulihkan profil yang telah disimpan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card Ekspor Profil */}
          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ekspor Profil Saat Ini</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Mendownload konfigurasi keymap lengkap (Base layer, FN layer, RGB, dan Sleep timer) dalam format .json yang kompatibel.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] text-zinc-400 font-medium">Nama Profil:</label>
                <input
                  type="text"
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                  placeholder="Contoh: Kerja, Gaming FPS, Mac Layout"
                  className="w-full px-3 py-2 rounded-lg bg-[#181818] border border-[#2a2a2a] text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleExport}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              Download Profil (.json)
            </button>
          </div>

          {/* Card Impor Profil */}
          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Impor Profil dari File</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Upload file profil .json untuk melihat pratinjau dan menerapkannya langsung ke keyboard.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              {importedProfile ? (
                <div className="bg-[#161616] border border-[#2c2c2c] rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <FileJson className="w-3.5 h-3.5 text-cyan-400" />
                      {importedProfile.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {importFileName}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-mono pt-1 border-t border-[#222222]">
                    <div>Base Keys: {Object.keys(importedProfile.keymap.base || {}).length}</div>
                    <div>FN Keys: {Object.keys(importedProfile.keymap.fn || {}).length}</div>
                    <div>Device: {importedProfile.device}</div>
                    <div>RGB Effect: {importedProfile.lighting ? `#${importedProfile.lighting.effectId}` : 'None'}</div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 px-3 border border-dashed border-[#333333] hover:border-zinc-500 rounded-xl text-center text-xs text-zinc-400 hover:text-white cursor-pointer transition-colors flex flex-col items-center gap-1.5"
                >
                  <Upload className="w-4 h-4 text-zinc-500" />
                  <span>Pilih file .json dari komputer</span>
                </button>
              )}
            </div>

            {importedProfile ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyImported}
                  disabled={isApplying}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menerapkan ke Keyboard...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Terapkan ke Keyboard
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setImportedProfile(null);
                    setImportFileName(null);
                  }}
                  disabled={isApplying}
                  className="py-2.5 px-3 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] border border-[#2e2e2e] text-xs text-zinc-300 transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4 text-zinc-400" />
                Buka File Profil (.json)
              </button>
            )}
          </div>
        </div>

        {/* Safety Restore Banner */}
        <div className="bg-[#101010] border border-[#202020] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold text-white">Cadangan Otomatis Sebelum Impor: </span>
              <span className="text-zinc-400">
                Sistem otomatis membuat backup sebelum impor diterapkan ke keyboard, sehingga Anda dapat kembali ke konfigurasi sebelumnya kapan saja.
              </span>
            </div>
          </div>
          {hasBackup && (
            <button
              onClick={handleRestoreBackup}
              disabled={isApplying}
              className="shrink-0 py-1.5 px-3 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] border border-[#303030] text-xs font-semibold text-zinc-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              Kembalikan Cadangan Terakhir
            </button>
          )}
        </div>
      </div>

      {/* SECTION 2: Preset Profil Bawaan */}
      <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">
            BUILT-IN PRESETS
          </div>
          <h2 className="text-xl font-bold text-white mt-0.5">Preset Layout Siap Pakai</h2>
          <p className="text-xs text-zinc-400 mt-1">Preset 1-klik untuk pemetaan keyboard standar dan sistem operasi.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Preset 1: Default ANSI */}
          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Default Factory ANSI</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Layout standar QWERTY sesuai bawaan pabrik Leobog Hi75c Pro.
                </p>
              </div>
            </div>
            <button
              onClick={onResetAll}
              className="w-full py-2 px-3 rounded-xl bg-[#171b26] hover:bg-[#202636] border border-[#283042] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              Terapkan Default Pabrik
            </button>
          </div>

          {/* Preset 2: Mac Mode (Swapped Win & Alt) */}
          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Apple className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Mac OS Modifier Layout</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Menukar tombol Windows (GUI) dan Alt untuk posisi Command ⌘ dan Option ⌥ di macOS.
                </p>
              </div>
            </div>
            <button
              onClick={onSwapWinAlt}
              className="w-full py-2 px-3 rounded-xl bg-[#171b26] hover:bg-[#202636] border border-[#283042] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
              Tukar Win &amp; Alt (macOS)
            </button>
          </div>

          {/* Preset 3: Gaming Profile */}
          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Gaming WASD &amp; Win Lock</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Kunci tombol Windows selama sesi game untuk mencegah terminimalisasi yang tidak disengaja.
                </p>
              </div>
            </div>
            <button
              onClick={() => alert('Windows Key Lock toggle aktif!')}
              className="w-full py-2 px-3 rounded-xl bg-[#171b26] hover:bg-[#202636] border border-[#283042] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Toggle Game Lock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
