import React, { useState, useEffect } from 'react';
import { batteryService, type BatteryState } from '../services/batteryService';
import { Battery, BatteryCharging, BatteryWarning, Wifi, Usb } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  modifiedCount: number;
  deviceName?: string;
  userMode?: 'none' | 'guest' | 'dev';
  onOpenModeModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isConnected, deviceName, userMode = 'guest', onOpenModeModal }) => {
  const [batteryState, setBatteryState] = useState<BatteryState>(batteryService.getState());

  useEffect(() => {
    const unsub = batteryService.subscribe((s) => {
      setBatteryState(s);
    });
    return unsub;
  }, []);

  const getBatteryIcon = () => {
    if (batteryState.isCharging) {
      return <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (batteryState.percentage <= 20) {
      return <BatteryWarning className="w-3.5 h-3.5 text-rose-400 animate-pulse" />;
    }
    return <Battery className="w-3.5 h-3.5 text-cyan-400" />;
  };

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

      <div className="flex flex-wrap items-center gap-3 pt-2">
        {/* Battery Telemetry Badge */}
        {isConnected && (
          <div
            title={`Battery Status: ${batteryState.statusText}\nEstimated Runtime: ~${batteryState.estimatedHoursRemaining} hrs\nVoltage: ${batteryState.voltageEstimate}V (4000mAh LiPo)`}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-default select-none ${
              batteryState.isCharging
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : batteryState.percentage <= 20
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            }`}
          >
            {getBatteryIcon()}
            <span className="font-mono font-bold text-[11px]">{batteryState.percentage}%</span>
            <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
              {batteryState.isWireless ? (
                <>
                  <Wifi className="w-3 h-3 text-cyan-400" />
                  <span>2.4G</span>
                </>
              ) : (
                <>
                  <Usb className="w-3 h-3 text-emerald-400" />
                  <span>USB</span>
                </>
              )}
            </span>
          </div>
        )}

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
            <span>{userMode === 'dev' ? 'Dev Mode' : 'Safe Mode'}</span>
          </button>
        )}

        {/* HID Connection Indicator */}
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
