import React, { useState } from 'react';
import { KeyRound, AlertTriangle, ArrowLeft, Lock, Unlock } from 'lucide-react';

interface ModeSelectionModalProps {
  isOpen: boolean;
  onSelectMode: (mode: 'dev' | 'guest') => void;
  onClose?: () => void;
}

export const ModeSelectionModal: React.FC<ModeSelectionModalProps> = ({
  isOpen,
  onSelectMode,
  onClose,
}) => {
  const [step, setStep] = useState<'choose' | 'devPin'>('choose');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChooseGuest = () => {
    onSelectMode('guest');
    if (onClose) onClose();
  };

  const handleProceedToDev = () => {
    setStep('devPin');
    setPin('');
    setErrorMsg(null);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === '270892') {
      onSelectMode('dev');
      if (onClose) onClose();
    } else {
      setErrorMsg('Incorrect PIN. Access denied!');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden space-y-5">
        {/* Subtle accent glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        {step === 'choose' ? (
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#1c1c1c] border border-[#333333] flex items-center justify-center text-cyan-400">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Select Operating Mode
              </h2>
              <p className="text-xs text-zinc-400">
                Choose access mode for Leobog Hi75 C Pro Configurator:
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-1">
              {/* Dev Mode Button */}
              <button
                type="button"
                onClick={handleProceedToDev}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 hover:border-amber-500/60 transition-all text-left group flex items-start gap-3 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <Unlock className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                    <span>Dev Mode</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200">
                      PIN Protected
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Full hardware access enabled (Key Remap, Software Stream BETA, Backup & Recovery BETA).
                  </p>
                </div>
              </button>

              {/* Guest Mode Button */}
              <button
                type="button"
                onClick={handleChooseGuest}
                className="w-full p-4 rounded-xl bg-[#181818] hover:bg-[#202020] border border-[#2a2a2a] hover:border-zinc-500 transition-all text-left group flex items-start gap-3 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Guest Mode</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                      Read Only
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Safe testing mode. Flashing and hardware modification features are locked and hidden.
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setStep('choose');
                setErrorMsg(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mode Selection</span>
            </button>

            {/* Warning Banner */}
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-left space-y-1">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Do With Your Own Risk</span>
              </div>
              <p className="text-[11px] text-red-200/80 leading-relaxed">
                Developer Mode grants direct hardware EEPROM write access. Enter the security authorization PIN to unlock:
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
                Enter Security PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                autoFocus
                placeholder="••••••"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full bg-[#161616] border border-[#2e2e2e] focus:border-amber-400 rounded-xl px-4 py-2.5 text-center font-mono text-lg text-white tracking-[0.3em] placeholder-zinc-600 focus:outline-none transition-colors"
              />
              {errorMsg && (
                <p className="text-[11px] text-rose-400 font-medium text-center pt-0.5">
                  {errorMsg}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="flex-1 py-2.5 rounded-xl bg-[#181818] hover:bg-[#202020] text-zinc-300 font-semibold text-xs border border-[#2a2a2a] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Unlock Dev Mode
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
