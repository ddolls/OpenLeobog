import React, { useEffect } from 'react';
import { Radio, AlertTriangle, Cpu, X, CheckCircle2 } from 'lucide-react';

interface WirelessWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WirelessWarningModal: React.FC<WirelessWarningModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#101010] border border-[#262626] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden space-y-5 animate-in zoom-in-95 duration-200 text-left"
      >
        {/* Subtle Ambient Background Glows */}
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  2.4GHz Wireless Mode Notice
                </h2>
                <span className="text-[10px] font-mono uppercase bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                  2.4G Active
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-normal mt-0.5">
                Volatile Memory (SRAM / SROM) Warning
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800/60 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Content Card */}
        <div className="bg-[#141414] border border-[#242424] rounded-xl p-4 space-y-3 relative z-10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-zinc-300 leading-relaxed">
              <p className="font-semibold text-amber-300">
                Customizations made in 2.4GHz mode are temporary.
              </p>
              <p className="text-zinc-400 text-[11px] leading-normal">
                Any settings, key remappings, or RGB lighting adjustments made while connected via the 2.4GHz wireless dongle are stored only in the keyboard's volatile memory (<strong>SRAM / SROM</strong>).
              </p>
              <p className="text-zinc-400 text-[11px] leading-normal">
                If the keyboard is powered off, restarted, or deep sleeps, <strong>all changes will revert to the previous/factory defaults</strong> upon reboot.
              </p>
            </div>
          </div>
        </div>

        {/* Recommended Solutions Card */}
        <div className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl p-3.5 space-y-2 text-xs relative z-10">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
            <Cpu className="w-4 h-4" />
            <span>How to save settings permanently:</span>
          </div>

          <ul className="space-y-1.5 text-[11px] text-zinc-400 pl-1">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold shrink-0 mt-0.5">•</span>
              <span>
                <strong className="text-zinc-200">Connect via Wired USB:</strong> Configuration saved in wired mode is permanently flashed to onboard non-volatile memory (EEPROM) and will persist across reboots.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold shrink-0 mt-0.5">•</span>
              <span>
                <strong className="text-zinc-200">Export Profile:</strong> You can export your current setup from the <em>Profiles &amp; Layouts</em> tab as a JSON file and re-import it whenever needed.
              </span>
            </li>
          </ul>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#1c1c1c] relative z-10">
          <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>SRAM Mode • Non-Persistent</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>I Understand</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
};
