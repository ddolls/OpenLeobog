import React, { useState, useEffect } from 'react';
import {
  switchHealthService,
  type KeyHealthState,
  type ChatterLogEntry,
  type SwitchTesterSummary,
} from '../services/switchHealthService';
import { LEOBOG_HI75C_LAYOUT, type KeyDefinition } from '../types/hid';
import { inputManager, type KnobState } from '../services/inputManager';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
  RotateCcw,
  Download,
  Sliders,
  ShieldAlert,
  Info,
} from 'lucide-react';

export const SwitchTesterWidget: React.FC = () => {
  const [, setTick] = useState(0);
  const [pressedIndices, setPressedIndices] = useState<Set<number>>(new Set());
  const [knobState, setKnobState] = useState<KnobState>(inputManager.getKnobState());
  const [selectedKeyIdx, setSelectedKeyIdx] = useState<number | null>(null);

  // Subscribe to switch health updates and inputs
  useEffect(() => {
    const unsubHealth = switchHealthService.subscribe(() => {
      setTick((t) => t + 1);
    });

    const unsubInput = inputManager.subscribe((pressed) => {
      setPressedIndices(new Set(pressed));
    });

    const unsubKnob = inputManager.subscribeKnob((knob) => {
      setKnobState(knob);
    });

    return () => {
      unsubHealth();
      unsubInput();
      unsubKnob();
    };
  }, []);

  const summary: SwitchTesterSummary = switchHealthService.getSummary();
  const keyStates: Map<number, KeyHealthState> = switchHealthService.getKeyStates();
  const chatterLogs: ChatterLogEntry[] = switchHealthService.getChatterLogs();
  const threshold = switchHealthService.getChatterThreshold();
  const soundEnabled = switchHealthService.isSoundEnabled();

  const handleReset = () => {
    switchHealthService.resetAll();
    setSelectedKeyIdx(null);
  };

  const handleExport = () => {
    const reportText = switchHealthService.exportReport();
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leobog-hi75c-switch-test-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedKeyData = selectedKeyIdx !== null ? keyStates.get(selectedKeyIdx) : null;
  const rows = [0, 1, 2, 3, 4, 5];

  // Helper to color key buttons on test grid
  const getKeyAppearance = (matrixIdx: number, isPressed: boolean) => {
    const state = keyStates.get(matrixIdx);
    const isSelected = selectedKeyIdx === matrixIdx;

    if (isPressed) {
      return 'bg-cyan-500 text-black font-black border-cyan-300 shadow-[0_0_15px_#06b6d4] scale-[0.96] z-20';
    }

    if (!state || state.status === 'untested') {
      return isSelected
        ? 'bg-[#222222] border-white text-white shadow-md'
        : 'bg-[#121212] border-[#222222] text-zinc-400 hover:border-zinc-500 hover:text-white';
    }

    if (state.status === 'chattering') {
      return isSelected
        ? 'bg-rose-950 border-rose-400 text-rose-200 ring-2 ring-rose-500 animate-pulse'
        : 'bg-rose-950/70 border-rose-500 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.4)]';
    }

    if (state.status === 'warning') {
      return isSelected
        ? 'bg-amber-950 border-amber-400 text-amber-200 ring-2 ring-amber-500'
        : 'bg-amber-950/60 border-amber-600/80 text-amber-200';
    }

    // Healthy
    return isSelected
      ? 'bg-emerald-950 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500'
      : 'bg-emerald-950/50 border-emerald-500/80 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#101010] border border-[#222222] rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-950/80 border border-rose-800 text-rose-300">
                Switch Diagnostics
              </span>
              <span className="text-xs text-zinc-500 font-mono">Chatter Detection • Switch Latency • Health Map</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-rose-400" />
              Switch Chatter &amp; Latency Tester
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Real-time mechanical switch bounce inspection. Detects micro-switch chatter (unintended double-typing) caused by worn switch leaves, bent pins, or dust. Directly correlates with internal hardware debounce filtering.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => switchHealthService.setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Audio Tone' : 'Enable Audio Tone'}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs transition-all cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            </button>

            <button
              onClick={handleReset}
              className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleExport}
              disabled={summary.totalKeystrokes === 0}
              className="px-4 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Coverage */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-1.5">
          <div className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Tested Keys</div>
          <div className="text-2xl font-black text-white">
            {summary.testedKeysCount} <span className="text-xs text-zinc-500 font-normal">/ {summary.totalKeys}</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.round((summary.testedKeysCount / summary.totalKeys) * 100)}%` }}
            />
          </div>
        </div>

        {/* Keystrokes */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-1.5">
          <div className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Total Keystrokes</div>
          <div className="text-2xl font-black text-white">{summary.totalKeystrokes}</div>
          <div className="text-[11px] text-zinc-500">Live keystroke events</div>
        </div>

        {/* Chatter Status */}
        <div className={`border rounded-xl p-4 space-y-1.5 ${
          summary.chatterEventsCount > 0
            ? 'bg-rose-950/30 border-rose-800/80 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
            : 'bg-[#111111] border-[#222222]'
        }`}>
          <div className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase flex items-center justify-between">
            <span>Chatter Errors</span>
            {summary.chatterEventsCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className={`text-2xl font-black ${summary.chatterEventsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {summary.chatterEventsCount}
          </div>
          <div className="text-[11px] text-zinc-400">
            {summary.chatteringKeysCount > 0 ? `${summary.chatteringKeysCount} chattering key(s)` : 'No double-clicks detected'}
          </div>
        </div>

        {/* Fastest Bounce */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-1.5">
          <div className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Fastest Bounce</div>
          <div className="text-2xl font-black text-white">
            {summary.fastestBounceMs !== null ? `${summary.fastestBounceMs}ms` : '—'}
          </div>
          <div className="text-[11px] text-zinc-500">Min. release-to-press interval</div>
        </div>

        {/* HW Debounce Correlation */}
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-1.5">
          <div className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Active Debounce</div>
          <div className="text-2xl font-black text-cyan-400">
            Stage {summary.currentDebounceStage} <span className="text-xs text-zinc-500 font-normal">({summary.currentDebounceMs}ms)</span>
          </div>
          <div className="text-[11px] text-zinc-500">Keyboard EEPROM filter</div>
        </div>
      </div>

      {/* Threshold Slider & Debounce Advisory */}
      <div className="bg-[#141414] border border-[#242424] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              Chatter Detection Threshold:
              <span className="font-mono text-cyan-300 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 text-[11px]">
                {threshold} ms
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Key releases re-pressed within &lt; {threshold}ms will be flagged as switch chatter.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={threshold}
            onChange={(e) => switchHealthService.setChatterThreshold(parseInt(e.target.value, 10))}
            className="w-48 accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Main Interactive Matrix Layout */}
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 relative overflow-hidden flex flex-col items-center shadow-xl">
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-medium">
              PHYSICAL 75% MATRIX TEST BED (PRESS ANY KEY)
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-zinc-400">Tested Healthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-zinc-400">Fast Bounce (&lt;40ms)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-zinc-400">Chatter Detected</span>
            </div>
          </div>
        </div>

        {/* 75% Physical Matrix */}
        <div className="w-full flex flex-col items-center justify-center space-y-2 py-2">
          {rows.map((rowIdx) => {
            const keysInRow = LEOBOG_HI75C_LAYOUT.filter((k) => k.row === rowIdx);
            return (
              <div key={rowIdx} className="flex items-center gap-1.5 relative h-11 w-full max-w-[704px]">
                {keysInRow.map((keyDef: KeyDefinition) => {
                  const isPressed = pressedIndices.has(keyDef.matrixIdx);
                  const state = keyStates.get(keyDef.matrixIdx);

                  if (keyDef.isKnob) {
                    const isKnobActive = isPressed || knobState.isActive;
                    return (
                      <div
                        key={keyDef.matrixIdx}
                        style={{ left: `${keyDef.col * 44}px`, width: '38px' }}
                        className="absolute top-0 bottom-0 flex flex-col items-center justify-center cursor-pointer select-none"
                        onClick={() => {
                          setSelectedKeyIdx(keyDef.matrixIdx);
                          inputManager.triggerKnobAction('mute');
                        }}
                      >
                        <div
                          style={{
                            transform: `rotate(${knobState.rotation}deg) ${isKnobActive ? 'scale(0.92)' : 'scale(1)'}`,
                            transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
                          }}
                          className={`relative w-9 h-9 rounded-full bg-gradient-to-b from-[#282828] to-[#121212] border flex items-center justify-center shadow-lg transition-all ${
                            isKnobActive
                              ? 'border-cyan-400 shadow-[0_0_18px_#06b6d4] bg-[#142333]'
                              : 'border-[#333333] hover:border-zinc-400'
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        </div>
                      </div>
                    );
                  }

                  const widthMulti = keyDef.width || 1;
                  const pixelWidth = Math.round(widthMulti * 44 - 6);
                  const appearanceClasses = getKeyAppearance(keyDef.matrixIdx, isPressed);

                  return (
                    <button
                      key={keyDef.matrixIdx}
                      type="button"
                      onClick={() => setSelectedKeyIdx(keyDef.matrixIdx)}
                      style={{
                        left: `${keyDef.col * 44}px`,
                        width: `${pixelWidth}px`,
                      }}
                      className={`absolute top-0 bottom-0 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer select-none text-[11px] font-bold ${appearanceClasses}`}
                    >
                      <span className="truncate px-1">{keyDef.label}</span>
                      {state && state.chatterCount > 0 && (
                        <span className="absolute -top-1 -right-1 px-1 bg-rose-600 text-white rounded text-[8px] font-mono font-bold leading-tight shadow">
                          !{state.chatterCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Split Details: Selected Key Diagnostic Inspector & Live Keystroke Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selected Key Inspector */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 space-y-4">
          <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
            SWITCH INSPECTOR
          </div>

          {selectedKeyData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                <div>
                  <h3 className="text-xl font-black text-white">{selectedKeyData.label}</h3>
                  <div className="text-xs text-zinc-500 font-mono">
                    Matrix #{selectedKeyData.matrixIdx} • {selectedKeyData.code || 'Unpressed'}
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase ${
                  selectedKeyData.status === 'chattering'
                    ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
                    : selectedKeyData.status === 'warning'
                    ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                    : selectedKeyData.status === 'healthy'
                    ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                }`}>
                  {selectedKeyData.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#161616] rounded-lg p-3">
                  <div className="text-zinc-500 text-[10px] uppercase font-mono">Total Presses</div>
                  <div className="text-lg font-bold text-white mt-0.5">{selectedKeyData.pressCount}</div>
                </div>

                <div className="bg-[#161616] rounded-lg p-3">
                  <div className="text-zinc-500 text-[10px] uppercase font-mono">Chatter Count</div>
                  <div className={`text-lg font-bold mt-0.5 ${selectedKeyData.chatterCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedKeyData.chatterCount}
                  </div>
                </div>

                <div className="bg-[#161616] rounded-lg p-3">
                  <div className="text-zinc-500 text-[10px] uppercase font-mono">Fastest Bounce</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {selectedKeyData.minBounceTimeMs === Infinity ? '—' : `${selectedKeyData.minBounceTimeMs}ms`}
                  </div>
                </div>

                <div className="bg-[#161616] rounded-lg p-3">
                  <div className="text-zinc-500 text-[10px] uppercase font-mono">Last Hold Duration</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {selectedKeyData.lastDurationMs > 0 ? `${selectedKeyData.lastDurationMs}ms` : '—'}
                  </div>
                </div>
              </div>

              {selectedKeyData.chatterCount > 0 && (
                <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold">Switch Contact Chatter Detected</div>
                    <p className="text-[11px] text-rose-300 leading-relaxed">
                      This mechanical switch triggered multiple activations within &lt; {threshold}ms.
                      Recommended action: pull and blow out the switch socket with compressed air, swap the switch, or increase Hardware Debounce Stage in Hardware Settings.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center text-zinc-500 space-y-2">
              <Info className="w-6 h-6 text-zinc-600" />
              <p className="text-xs">Click any physical key on the keyboard above to inspect its bounce telemetry and contact health.</p>
            </div>
          )}
        </div>

        {/* Live Keystroke Stream Log */}
        <div className="lg:col-span-2 bg-[#111111] border border-[#222222] rounded-2xl p-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
              REAL-TIME EVENT LOG STREAM
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              {chatterLogs.length} events recorded
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[260px] space-y-1 font-mono text-xs pr-1">
            {chatterLogs.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-zinc-600 text-xs font-sans">
                Press any key on the keyboard to capture real-time contact bounce events.
              </div>
            ) : (
              chatterLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded-lg flex items-center justify-between border ${
                    log.isChatter
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                      : log.bounceMs > 0 && log.bounceMs < 40
                      ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                      : 'bg-[#151515] border-[#222222] text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                    <span className="font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded text-[11px]">
                      {log.label}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Bounce: <strong className={log.isChatter ? 'text-rose-400' : 'text-zinc-200'}>{log.bounceMs > 0 ? `${log.bounceMs}ms` : 'Init'}</strong>
                    </span>
                    {log.durationMs > 0 && (
                      <span className="text-[11px] text-zinc-500">
                        Hold: {log.durationMs}ms
                      </span>
                    )}
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    log.isChatter
                      ? 'bg-rose-600 text-white animate-pulse'
                      : log.bounceMs > 0 && log.bounceMs < 40
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {log.isChatter ? 'CHATTER' : log.bounceMs > 0 && log.bounceMs < 40 ? 'FAST BOUNCE' : 'CLEAN'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
