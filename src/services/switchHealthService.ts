// Switch Health & Contact Chatter Diagnostics Service for Mechanical Keyboards
import { LEOBOG_HI75C_LAYOUT } from '../types/hid';
import { hardwareSettingsService } from './hardwareSettingsService';

export interface KeyHealthState {
  matrixIdx: number;
  label: string;
  code: string;
  pressCount: number;
  lastPressTime: number;
  lastReleaseTime: number;
  lastDurationMs: number;
  minBounceTimeMs: number;
  chatterCount: number;
  status: 'untested' | 'healthy' | 'warning' | 'chattering';
}

export interface ChatterLogEntry {
  id: string;
  timestamp: string;
  label: string;
  code: string;
  matrixIdx: number;
  durationMs: number;
  bounceMs: number;
  isChatter: boolean;
}

export interface SwitchTesterSummary {
  totalKeystrokes: number;
  testedKeysCount: number;
  totalKeys: number;
  chatterEventsCount: number;
  chatteringKeysCount: number;
  fastestBounceMs: number | null;
  currentDebounceStage: number;
  currentDebounceMs: number;
  chatterThresholdMs: number;
}

class SwitchHealthService {
  private keyStates: Map<number, KeyHealthState> = new Map();
  private chatterLogs: ChatterLogEntry[] = [];
  private chatterThresholdMs: number = 25; // Milliseconds threshold for chatter detection (default 25ms)
  private soundEnabled: boolean = true;
  private audioCtx: AudioContext | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.resetAll();
  }

  public resetAll() {
    this.keyStates.clear();
    this.chatterLogs = [];

    // Initialize all 81 physical keys from layout
    LEOBOG_HI75C_LAYOUT.forEach((k) => {
      this.keyStates.set(k.matrixIdx, {
        matrixIdx: k.matrixIdx,
        label: k.label,
        code: '',
        pressCount: 0,
        lastPressTime: 0,
        lastReleaseTime: 0,
        lastDurationMs: 0,
        minBounceTimeMs: Infinity,
        chatterCount: 0,
        status: 'untested',
      });
    });

    this.notify();
  }

  public subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public setChatterThreshold(ms: number) {
    this.chatterThresholdMs = Math.max(10, Math.min(80, ms));
    this.notify();
  }

  public getChatterThreshold(): number {
    return this.chatterThresholdMs;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    this.notify();
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  private playTone(isChatter: boolean) {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (isChatter) {
        // Discordant low buzzer for chatter warning
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else {
        // High crisp tactile blip for clean keystroke
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch {
      // Audio playback failed or blocked
    }
  }

  public recordKeyDown(matrixIdx: number, code: string, label?: string) {
    const now = performance.now();
    let state = this.keyStates.get(matrixIdx);

    if (!state) {
      state = {
        matrixIdx,
        label: label || code || `Key ${matrixIdx}`,
        code,
        pressCount: 0,
        lastPressTime: 0,
        lastReleaseTime: 0,
        lastDurationMs: 0,
        minBounceTimeMs: Infinity,
        chatterCount: 0,
        status: 'untested',
      };
      this.keyStates.set(matrixIdx, state);
    }

    state.code = code;
    state.pressCount++;

    let bounceMs = 0;
    let isChatter = false;

    if (state.lastReleaseTime > 0) {
      bounceMs = Math.round(now - state.lastReleaseTime);
      if (bounceMs >= 0) {
        if (bounceMs < state.minBounceTimeMs) {
          state.minBounceTimeMs = bounceMs;
        }

        if (bounceMs < this.chatterThresholdMs) {
          isChatter = true;
          state.chatterCount++;
          state.status = 'chattering';
        } else if (bounceMs < 40 && state.status !== 'chattering') {
          state.status = 'warning';
        } else if (state.status !== 'chattering' && state.status !== 'warning') {
          state.status = 'healthy';
        }
      }
    } else {
      if (state.status === 'untested') {
        state.status = 'healthy';
      }
    }

    state.lastPressTime = now;
    this.playTone(isChatter);

    const logEntry: ChatterLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      label: state.label,
      code,
      matrixIdx,
      durationMs: 0,
      bounceMs,
      isChatter,
    };

    this.chatterLogs.unshift(logEntry);
    if (this.chatterLogs.length > 80) {
      this.chatterLogs.pop();
    }

    this.notify();
  }

  public recordKeyUp(matrixIdx: number) {
    const now = performance.now();
    const state = this.keyStates.get(matrixIdx);
    if (state && state.lastPressTime > 0) {
      state.lastDurationMs = Math.round(now - state.lastPressTime);
      state.lastReleaseTime = now;

      // Update the most recent log entry with the duration
      if (this.chatterLogs.length > 0 && this.chatterLogs[0].matrixIdx === matrixIdx) {
        this.chatterLogs[0].durationMs = state.lastDurationMs;
      }

      this.notify();
    }
  }

  public getKeyStates(): Map<number, KeyHealthState> {
    return this.keyStates;
  }

  public getChatterLogs(): ChatterLogEntry[] {
    return this.chatterLogs;
  }

  public getSummary(): SwitchTesterSummary {
    let totalKeystrokes = 0;
    let testedKeysCount = 0;
    let chatterEventsCount = 0;
    let chatteringKeysCount = 0;
    let fastestBounceMs: number | null = null;

    this.keyStates.forEach((state) => {
      totalKeystrokes += state.pressCount;
      if (state.pressCount > 0) testedKeysCount++;
      if (state.chatterCount > 0) {
        chatterEventsCount += state.chatterCount;
        chatteringKeysCount++;
      }
      if (state.minBounceTimeMs !== Infinity) {
        if (fastestBounceMs === null || state.minBounceTimeMs < fastestBounceMs) {
          fastestBounceMs = state.minBounceTimeMs;
        }
      }
    });

    const hwSettings = hardwareSettingsService.getSettings();
    const debounceMap: Record<number, number> = { 1: 2, 2: 5, 3: 8, 4: 10, 5: 15 };
    const currentDebounceMs = debounceMap[hwSettings.debounceStage] || 8;

    return {
      totalKeystrokes,
      testedKeysCount,
      totalKeys: LEOBOG_HI75C_LAYOUT.length,
      chatterEventsCount,
      chatteringKeysCount,
      fastestBounceMs,
      currentDebounceStage: hwSettings.debounceStage,
      currentDebounceMs,
      chatterThresholdMs: this.chatterThresholdMs,
    };
  }

  public exportReport(): string {
    const summary = this.getSummary();
    const rows = [
      `LEOBOG Hi75c Pro Switch Health & Chatter Report`,
      `Generated: ${new Date().toLocaleString()}`,
      `Hardware Debounce: Stage ${summary.currentDebounceStage} (${summary.currentDebounceMs}ms)`,
      `Chatter Threshold: ${summary.chatterThresholdMs}ms`,
      `Total Keystrokes: ${summary.totalKeystrokes}`,
      `Keys Tested: ${summary.testedKeysCount} / ${summary.totalKeys}`,
      `Chattering Switches: ${summary.chatteringKeysCount}`,
      `----------------------------------------------------`,
      `Matrix ID, Key Label, Code, Presses, Min Bounce (ms), Chatter Count, Health Status`,
    ];

    this.keyStates.forEach((state) => {
      if (state.pressCount > 0) {
        const minBounce = state.minBounceTimeMs === Infinity ? 'N/A' : `${state.minBounceTimeMs}ms`;
        rows.push(
          `${state.matrixIdx},"${state.label}","${state.code}",${state.pressCount},${minBounce},${state.chatterCount},${state.status.toUpperCase()}`
        );
      }
    });

    return rows.join('\n');
  }
}

export const switchHealthService = new SwitchHealthService();
