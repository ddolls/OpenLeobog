import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Unlock,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

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
  const [step, setStep] = useState<'termsAndMode' | 'devPin'>('termsAndMode');
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAgreementWarning, setShowAgreementWarning] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleChooseGuest = () => {
    if (!hasAgreed) {
      setShowAgreementWarning(true);
      return;
    }
    onSelectMode('guest');
    if (onClose) onClose();
  };

  const handleProceedToDev = () => {
    if (!hasAgreed) {
      setShowAgreementWarning(true);
      return;
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden space-y-5">
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {step === 'termsAndMode' ? (
          <div className="space-y-4">
            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-[#222222] pb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Terms &amp; Conditions Agreement
                </h2>
                <p className="text-[11px] text-zinc-400">
                  OpenLeobog WebHID Configurator • Leobog Hi75c Pro
                </p>
              </div>
            </div>

            {/* Scrollable Terms & Conditions Box */}
            <div className="relative">
              <div className="bg-[#0c0c0c] border border-[#242424] rounded-xl p-3.5 max-h-48 overflow-y-auto text-left text-[11px] text-zinc-300 space-y-3 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700">
                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5 text-xs text-amber-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>1. Risiko Modifikasi Mandiri (Do With Your Own Risk)</span>
                  </div>
                  <p className="text-zinc-400 pl-5">
                    Aplikasi ini berkomunikasi langsung dengan hardware melalui WebHID. Penggunaan fitur modifikasi seperti <span className="text-zinc-200 font-semibold">Key Remapping, Penulisan EEPROM/Flash, dan Custom Lighting</span> dilakukan atas risiko Anda sendiri. Pengembang tidak bertanggung jawab atas kerusakan, kegagalan fungsi, atau ketidakstabilan perangkat.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5 text-xs text-cyan-300">
                    <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>2. Komunikasi WebHID Langsung</span>
                  </div>
                  <p className="text-zinc-400 pl-5">
                    Aplikasi mengirimkan paket raw vendor feature report langsung ke chip mikrokontroler SinoWealth pada Leobog Hi75c Pro. Harap jangan mencabut kabel USB saat proses penulisan konfigurasi sedang berlangsung.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5 text-xs text-zinc-200">
                    <span>3. Proyek Komunitas Independen (Non-Afiliasi)</span>
                  </div>
                  <p className="text-zinc-400 pl-5">
                    OpenLeobog merupakan perangkat lunak open-source independen yang dikembangkan oleh komunitas dan tidak memiliki afiliasi resmi dengan merek dagang LEOBOG atau SinoWealth.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5 text-xs text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>4. Keamanan &amp; Privasi Data (Zero Telemetry)</span>
                  </div>
                  <p className="text-zinc-400 pl-5">
                    Aplikasi berjalan 100% di browser Anda (client-side). Tidak ada keystroke logger, telemetry, atau data pengetikan keyboard yang dikirim ke server luar mana pun.
                  </p>
                </div>
              </div>
            </div>

            {/* Mandatory Checkbox Agreement */}
            <div
              onClick={() => {
                setHasAgreed(!hasAgreed);
                setShowAgreementWarning(false);
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                hasAgreed
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                  : showAgreementWarning
                  ? 'bg-red-500/10 border-red-500/50 text-red-300 animate-pulse'
                  : 'bg-[#181818] border-[#2c2c2c] text-zinc-300 hover:border-zinc-500'
              }`}
            >
              <input
                type="checkbox"
                checked={hasAgreed}
                onChange={() => {}} // Handled by container click
                className="mt-0.5 w-4 h-4 rounded border-zinc-600 text-cyan-500 focus:ring-0 cursor-pointer accent-cyan-400 shrink-0"
              />
              <div className="text-left text-xs leading-snug">
                <span className="font-semibold text-white">
                  Saya telah membaca, memahami, dan menyetujui
                </span>{' '}
                seluruh Syarat &amp; Ketentuan serta Disclaimer penggunaan aplikasi di atas.
              </div>
            </div>

            {showAgreementWarning && !hasAgreed && (
              <p className="text-[11px] text-red-400 font-medium text-center">
                ⚠️ Harap centang persetujuan Syarat &amp; Ketentuan terlebih dahulu untuk melanjutkan.
              </p>
            )}

            {/* Mode Selection Options */}
            <div className="space-y-2 pt-1 text-left">
              <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
                Pilih Mode Penggunaan:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Guest Mode Button */}
                <button
                  type="button"
                  onClick={handleChooseGuest}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 group cursor-pointer ${
                    hasAgreed
                      ? 'bg-[#171717] hover:bg-[#1f1f1f] border-[#2e2e2e] hover:border-cyan-500/50 shadow-sm'
                      : 'bg-[#141414] border-[#222222] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-cyan-400 transition-colors">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      Recommended
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      Guest Mode
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                      Mode aman (Read Only). Fitur modifikasi hardware terkunci dan tersembunyi.
                    </p>
                  </div>
                </button>

                {/* Dev Mode Button */}
                <button
                  type="button"
                  onClick={handleProceedToDev}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 group cursor-pointer ${
                    hasAgreed
                      ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 hover:from-amber-500/20 hover:to-orange-500/15 border-amber-500/30 hover:border-amber-500/60 shadow-sm'
                      : 'bg-[#141414] border-[#222222] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <Unlock className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200">
                      PIN Protected
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-300">
                      Dev Mode
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                      Akses penulisan hardware penuh (Key Remap, Stream BETA, Backup/Restore).
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Step 2: PIN Verification for Dev Mode */
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setStep('termsAndMode');
                setErrorMsg(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Terms &amp; Pilihan Mode</span>
            </button>

            {/* Warning Banner */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Developer Authorization</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Developer Mode memberikan akses penulisan langsung ke EEPROM hardware Leobog Hi75c Pro. Masukkan PIN keamanan untuk membuka akses:
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
                Masukkan Security PIN
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
                onClick={() => setStep('termsAndMode')}
                className="flex-1 py-2.5 rounded-xl bg-[#181818] hover:bg-[#202020] text-zinc-300 font-semibold text-xs border border-[#2a2a2a] transition-all cursor-pointer"
              >
                Batal
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
