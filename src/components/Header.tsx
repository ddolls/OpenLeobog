import React from 'react';

interface HeaderProps {
  isConnected: boolean;
  modifiedCount: number;
  deviceName?: string;
  userMode?: 'none' | 'guest' | 'dev';
  onOpenModeModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isConnected, deviceName, userMode = 'guest', onOpenModeModal }) => {
  return (
    <header className="px-10 pt-8 pb-6 flex items-start justify-between bg-[#0a0a0a]">
      <div className="space-y-1">
        <p className="text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase font-semibold">
          Mech Keyboard Configurator
        </p>
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
          {(!deviceName || deviceName.toLowerCase() === 'gaming keyboard') ? 'LEOBOG Hi75c Pro' : deviceName}
        </h1>
      </div>

      <div className="flex items-center gap-3 pt-2">
        {/* Mode Indicator Badge */}
        {userMode !== 'none' && (
          <button
            type="button"
            onClick={onOpenModeModal}
            title="Click to view Terms or change mode"
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              userMode === 'dev'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${userMode === 'dev' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
            <span>{userMode === 'dev' ? 'Dev Mode' : 'Guest Mode'}</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isConnected
              ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]'
              : 'bg-zinc-600'
              }`}
          />
          <span className="text-xs font-semibold text-zinc-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </header>
  );
};
