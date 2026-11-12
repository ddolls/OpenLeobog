import React, { useEffect } from 'react';
import { X, Sparkles, Tag, ShieldCheck, CheckCircle2, Bug, Zap } from 'lucide-react';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChangelogEntry {
  version: string;
  releaseDate: string;
  isLatest?: boolean;
  title: string;
  items: {
    type: 'fix' | 'feature' | 'safety' | 'perf';
    text: string;
  }[];
}

const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: 'v1.3.2',
    releaseDate: 'November 2026',
    isLatest: true,
    title: 'LEOBOG ONE Reverse-Engineered Hardware Ground Truth Alignment',
    items: [
      {
        type: 'fix',
        text: 'Official KB.ini Hardware Matrix: Reverse-engineered official LEOBOG ONE desktop driver to restore true hardware indices for all keys.',
      },
      {
        type: 'fix',
        text: 'Restored Right Control (#65): Fixed physical RCtrl index to 65 (was disconnected at empty index #71), completely fixing dead Right Control after factory reset.',
      },
      {
        type: 'fix',
        text: 'Navigation Cluster Calibration: Aligned End (#86), Page Up (#87), and Page Down (#88) with exact hardware matrix, eliminating key rotation bug on remap reset.',
      },
      {
        type: 'fix',
        text: 'Windows AltGr Synthetic Ghost Fix: Suppressed Windows synthetic ControlLeft event during Right Alt / AltGr key presses, preventing Left Control from lighting up with Right Alt.',
      },
    ],
  },
  {
    version: 'v1.3.1',
    releaseDate: 'November 2026',
    title: 'Key Remap Reset Fix & Hardware Safety Hardening',
    items: [
      {
        type: 'fix',
        text: 'Fixed Key Remap factory reset: Restored factory stock matrix baseline instead of wiping keys to empty (0x00) records.',
      },
      {
        type: 'fix',
        text: 'Physical Matrix Alignment: Fixed F12 (#78, was PrintScreen), Right Alt (#53), Fn (#59), Right Control (#71), and accurately aligned navigation cluster End (#87), Page Up (#88), and Page Down (#86).',
      },
      {
        type: 'fix',
        text: 'Resilient WebHID Disconnect: Populated offline fallback matrix so key map tables never collapse into empty states when device disconnects.',
      },
      {
        type: 'safety',
        text: 'MCU Write Protection: Added strict Dev Mode gating and 1024-byte payload integrity check for raw flash restores, preventing hardware bricking.',
      },
      {
        type: 'feature',
        text: 'Version & Changelog Modal: Added dedicated version inspector in sidebar displaying complete update history.',
      },
      {
        type: 'perf',
        text: 'React State Optimization: Cleaned up ref render mutations, hook dependencies, and listener teardowns across typing benchmark and RGB panels.',
      },
    ],
  },
  {
    version: 'v1.3.0',
    releaseDate: 'October 2026',
    title: 'Typing Benchmark & Mechanical Sound Synthesizer',
    items: [
      {
        type: 'feature',
        text: 'Typing Test Benchmark: Real-time WPM, raw speed, accuracy, consistency score, and dual-language (Indonesian & English) sentence generator.',
      },
      {
        type: 'feature',
        text: 'Mechanical Switch Sound Simulator: High-fidelity Web Audio synthesis for Thocky, Linear, Clacky, and Silent profiles.',
      },
      {
        type: 'feature',
        text: 'Polling Rate Benchmark: Hardware polling frequency counter (125Hz - 1000Hz) with jitter histogram and latency metrics.',
      },
      {
        type: 'feature',
        text: 'Switch Health Diagnostics: Real-time contact debounce chatter detector and actuation wear tracking.',
      },
    ],
  },
  {
    version: 'v1.2.0',
    releaseDate: 'October 2026',
    title: 'Interactive Per-Key RGB & Dynamic OS Switcher',
    items: [
      {
        type: 'feature',
        text: 'Planar Per-Key RGB Painter: Interactive lighting canvas with brush modes, HEX code parser, quick palettes, and safe batching.',
      },
      {
        type: 'feature',
        text: 'Dynamic OS Switching: Seamless Windows / macOS keyboard layout switcher and matrix state diff inspector.',
      },
      {
        type: 'safety',
        text: 'Role-Based Access Control (Safe Mode vs Dev Mode): Guarded experimental memory offsets to prevent accidental MCU corruption.',
      },
    ],
  },
  {
    version: 'v1.1.0',
    releaseDate: 'September 2026',
    title: 'Hardware Timers & Surgical Flash Recovery',
    items: [
      {
        type: 'feature',
        text: 'Hardware Power Settings: Configurable sleep timers (Off, 1m, 3m, 5m, 10m, 30m) and deep debounce tuning.',
      },
      {
        type: 'safety',
        text: 'Surgical Fn Recovery: Non-destructive restoration of corrupted Fn key records without modifying OS mode or keymaps.',
      },
      {
        type: 'perf',
        text: 'WebHID Pipeline: Non-blocking buffered report I/O with automatic device listener cleanup.',
      },
    ],
  },
  {
    version: 'v1.0.0',
    releaseDate: 'September 2026',
    title: 'Initial WebHID Protocol Reverse Engineering',
    items: [
      {
        type: 'feature',
        text: 'Core WebHID Driver: Initial implementation for Leobog Hi75c Pro proprietary protocol (VendorID 0x0c45, ProductID 0x8008 / 0x8009).',
      },
      {
        type: 'feature',
        text: 'Live Key Matrix Visualizer: 75% exploded ANSI layout with real-time physical keypress detection and knob tracking.',
      },
    ],
  },
];

export const VersionModal: React.FC<VersionModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getTypeBadge = (type: 'fix' | 'feature' | 'safety' | 'perf') => {
    switch (type) {
      case 'fix':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bug className="w-2.5 h-2.5" />
            Fix
          </span>
        );
      case 'feature':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Sparkles className="w-2.5 h-2.5" />
            Feature
          </span>
        );
      case 'safety':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <ShieldCheck className="w-2.5 h-2.5" />
            Safety
          </span>
        );
      case 'perf':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
            <Zap className="w-2.5 h-2.5" />
            Perf
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#0c0c0c] border border-[#222222] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1c1c1c] flex items-center justify-between shrink-0 bg-[#0f0f0f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Version &amp; Changelog</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.3.1 (Latest)
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Leobog Hi75c Pro Web Driver Release History
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-800"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Changelog Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 divide-y divide-[#181818] custom-scrollbar">
          {CHANGELOG_DATA.map((entry) => (
            <div key={entry.version} className={entry.isLatest ? 'space-y-3' : 'pt-6 space-y-3'}>
              {/* Version Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-black text-white font-mono tracking-tight">
                    {entry.version}
                  </span>
                  {entry.isLatest && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      CURRENT RELEASE
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 font-medium">
                    {entry.title}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                  {entry.releaseDate}
                </span>
              </div>

              {/* Items List */}
              <ul className="space-y-2">
                {entry.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed bg-[#121212]/50 p-2 rounded-lg border border-[#1b1b1b]"
                  >
                    <span className="shrink-0 mt-0.5">{getTypeBadge(item.type)}</span>
                    <span className="flex-1">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#1c1c1c] bg-[#0a0a0a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hardware Safe Mode Active &bull; Zero MCU Risks</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer border border-zinc-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

