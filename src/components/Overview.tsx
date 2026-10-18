import React, { useState, useEffect } from 'react';
import { ArrowRight, Battery, BatteryCharging, BatteryWarning } from 'lucide-react';
import { batteryService, type BatteryState } from '../services/batteryService';

interface OverviewProps {
  isConnected: boolean;
  modifiedCount: number;
  onConnect: () => void;
  keyboardElement: React.ReactNode;
  deviceName?: string;
  vendorId?: string;
  productId?: string;
  firmwareVersion?: string;
  onNavigateToTester?: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  isConnected,
  modifiedCount,
  onConnect,
  keyboardElement,
  deviceName,
  vendorId,
  productId,
  firmwareVersion,
  onNavigateToTester,
}) => {
  const [battery, setBattery] = useState<BatteryState>(batteryService.getState());

  useEffect(() => {
    const unsub = batteryService.subscribe((b) => {
      setBattery(b);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Hero Layout - Split (Left Hero Canvas / Right Stat Stack) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Hero Canvas (66% Width) */}
        <div className="lg:col-span-2 bg-[#111111] border border-[#222222] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[420px]">
          {/* Orbital Grid Rings Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="orbit-ring-1 flex items-center justify-center">
              <div className="orbit-ring-2" />
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
              HARDWARE MATRIX VIEW
            </span>

            {!isConnected && (
              <button
                onClick={onConnect}
                className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                Connect HID
              </button>
            )}
          </div>

          {/* Centered Keyboard View */}
          <div className="relative z-10 my-auto py-4">
            {keyboardElement}
          </div>

          <div className="relative z-10 flex items-center justify-between">
            {onNavigateToTester ? (
              <button
                onClick={onNavigateToTester}
                className="px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2c2c2c] text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Test Switch Chatter &amp; Latency</span>
                <ArrowRight className="w-3 h-3 text-zinc-500" />
              </button>
            ) : <div />}

            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              {deviceName || 'LEOBOG Hi75c Pro'}
            </span>
          </div>
        </div>

        {/* Right Stat Cards Stack (33% Width) */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 flex flex-col justify-between space-y-4">
          {/* Card 1: KEYBOARD LAYOUT */}
          <div className="space-y-1 border-b border-[#1f1f1f] pb-4">
            <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
              KEYBOARD LAYOUT
            </div>
            <div className="text-3xl font-extrabold text-white">75% ANSI</div>
            <div className="text-[11px] text-zinc-500 mt-1">
              81 Physical Key Caps + Rotary Volume Knob
            </div>
          </div>

          {/* Card 2: FIRMWARE / MODIFIED COUNT */}
          <div className="space-y-1 border-b border-[#1f1f1f] pb-4">
            <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
              FIRMWARE
            </div>
            <div className="text-xl font-extrabold text-white">
              {firmwareVersion || (isConnected ? 'V8.0.0 (USB)' : 'V8.0.0 (USB)')}
            </div>
            <div className="text-[11px] text-zinc-500">
              {modifiedCount > 0 ? `${modifiedCount} remapped keys active` : 'Stock factory state (0 custom keys)'}
            </div>
          </div>

          {/* Card 3: BATTERY & POWER */}
          <div className="space-y-1 border-b border-[#1f1f1f] pb-4">
            <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium flex items-center justify-between">
              <span>BATTERY &amp; POWER</span>
              {battery.isCharging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              ) : battery.percentage <= 20 ? (
                <BatteryWarning className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </div>
            <div className="text-xl font-extrabold text-white flex items-center gap-2">
              <span>{isConnected ? `${battery.percentage}%` : '—'}</span>
              {isConnected && (
                <span className="text-xs font-mono font-normal text-zinc-400">
                  ({battery.isCharging ? 'AC Powered' : `~${battery.estimatedHoursRemaining}h left`})
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-500">
              {isConnected ? `4000mAh LiPo • ${battery.voltageEstimate}V` : 'Connect keyboard to inspect power status'}
            </div>
          </div>

          {/* Card 4: CONNECTION */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
              CONNECTION
            </div>
            <div className="text-xl font-extrabold text-white">
              {isConnected ? (battery.isWireless ? '2.4G Wireless' : 'Wired USB') : 'Disconnected'}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              {isConnected ? `VID ${vendorId || '0x258A'} : PID ${productId || '0x010C'}` : 'Click Connect to attach WebHID'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
