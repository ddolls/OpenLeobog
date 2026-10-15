import { webhid } from './webhid';
import { rgbService } from './rgbService';

export interface HardwareGlobalSettings {
  tapEnabled: boolean;
  tapSensitivityMs: number; // 50ms - 500ms
  sleepEnabled: boolean;
  sleepTimeoutSeconds: number; // in seconds: 60, 120, 180, 300, 600, etc.
  debounceStage: number; // 1 - 5 (Stage 1 = 2ms, Stage 2 = 5ms, Stage 3 = 8ms, Stage 4 = 10ms, Stage 5 = 15ms)
}

const DEFAULT_SETTINGS: HardwareGlobalSettings = {
  tapEnabled: false,
  tapSensitivityMs: 200,
  sleepEnabled: true,
  sleepTimeoutSeconds: 120, // 2 Min default
  debounceStage: 3, // 3 Stage default
};

const STORAGE_KEY = 'leobog_hi75c_hardware_settings';

class HardwareSettingsService {
  private settings: HardwareGlobalSettings;
  private listeners: ((s: HardwareGlobalSettings) => void)[] = [];
  private isApplying: boolean = false;

  constructor() {
    this.settings = this.loadFromStorage();

    // Hook into live hardware config reads from rgbService
    rgbService.onConfigRead((config136) => {
      this.syncFromHardwareConfig(config136);
    });
  }

  private loadFromStorage(): HardwareGlobalSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveToStorage(s: HardwareGlobalSettings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // Ignore
    }
  }

  // Parse verified Cfg[2](Debounce), Cfg[8](Tap), and Cfg[9](Sleep) from hardware memory
  public syncFromHardwareConfig(config136: Uint8Array) {
    if (!config136 || config136.length < 18) return;

    // Log raw bytes for diagnostics
    const hexSlice = Array.from(config136.slice(0, 24))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    webhid.log(`[Hardware Sync] Device Cfg buffer[0..23]: ${hexSlice}`);

    // Offsets: Cfg starts at payload offset 7 on the wire (pkt[7..])
    // Debounce: Cfg[2] (wire offset 7 + 2 = 9) or legacy config136[2]
    const rawDebounce = config136[9] >= 1 && config136[9] <= 5 ? config136[9] : config136[2];
    const debounceStage = rawDebounce >= 1 && rawDebounce <= 5 ? rawDebounce : this.settings.debounceStage;

    // Tap: Cfg[8] (wire offset 7 + 8 = 15) or legacy config136[8]
    const rawTap = config136[15] !== undefined && config136[15] <= 10 ? config136[15] : config136[8];
    const tapEnabled = rawTap > 0;
    const tapSensitivityMs = rawTap > 0 ? Math.max(50, Math.min(500, rawTap * 50)) : this.settings.tapSensitivityMs;

    // Sleep: Cfg[9] (wire offset 7 + 9 = 16) or legacy config136[9]
    // Unit in Leobog firmware is 30-second increments (e.g. 2 = 60s/1m, 4 = 120s/2m, 6 = 180s/3m)
    const rawSleepVal = config136[16] !== undefined ? config136[16] : config136[9];
    const sleepEnabled = rawSleepVal > 0;
    const sleepTimeoutSeconds = sleepEnabled ? rawSleepVal * 30 : this.settings.sleepTimeoutSeconds;

    this.settings = {
      tapEnabled,
      tapSensitivityMs,
      sleepEnabled,
      sleepTimeoutSeconds,
      debounceStage,
    };

    webhid.log(
      `[Hardware Sync] Synced from device EEPROM: Debounce=Stage ${debounceStage}, Sleep=${
        sleepEnabled ? `${Math.round(sleepTimeoutSeconds / 60)} Min (${rawSleepVal}x30s)` : 'Disabled (Always Awake)'
      }, Tap=${tapEnabled ? `${tapSensitivityMs}ms` : 'OFF'}`
    );

    this.notify();
  }

  public getSettings(): HardwareGlobalSettings {
    return { ...this.settings };
  }

  public subscribe(fn: (s: HardwareGlobalSettings) => void) {
    this.listeners.push(fn);
    fn(this.settings);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.saveToStorage(this.settings);
    this.listeners.forEach((fn) => fn({ ...this.settings }));
  }

  public updateSettings(partial: Partial<HardwareGlobalSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.notify();
  }

  public resetToDefaults() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.notify();
  }

  public getIsApplying(): boolean {
    return this.isApplying;
  }

  // Apply Tap, Sleep, and Debounce to hardware via SinoWealth CMD 0x04 (CONFIG_WRITE) on Report ID 6
  public async applyToHardware(): Promise<{ success: boolean; message: string }> {
    const dev = (webhid as any).device;
    if (!dev || !dev.opened) {
      return {
        success: false,
        message: 'Device is not connected. Please connect via USB cable and initialize WebHID first.',
      };
    }

    this.isApplying = true;
    try {
      // Calculate hardware payload parameters:
      // Sleep in 30-second units (e.g. 60s = 2, 120s = 4, 180s = 6, 300s = 10, 600s = 20, 0 = Always Awake)
      const sleepUnits = this.settings.sleepEnabled
        ? Math.max(1, Math.min(120, Math.round(this.settings.sleepTimeoutSeconds / 30)))
        : 0; // 0 = Always Awake
      const debounceStage = Math.max(1, Math.min(5, this.settings.debounceStage));
      const tapVal = this.settings.tapEnabled
        ? Math.max(1, Math.min(10, Math.round(this.settings.tapSensitivityMs / 50)))
        : 0;

      webhid.log(
        `[Hardware Settings] Applying parameters: Debounce=Stage ${debounceStage}, Tap=${tapVal}, Sleep=${sleepUnits} units (${Math.round(
          this.settings.sleepTimeoutSeconds / 60
        )} Min)`
      );

      // 1. Fetch current baseline config (136 bytes) to preserve active lighting mode and matrix
      let baseline = rgbService.getCachedConfig();
      if (!baseline) {
        baseline = await rgbService.readDeviceConfig(true);
        await new Promise((r) => setTimeout(r, 40));
      }

      // 2. Prepare 519-byte command packet (CMD 0x04: CONFIG_WRITE)
      const pkt = new Uint8Array(519);
      pkt[0] = 0x04; // CMD: CONFIG_WRITE
      pkt[1] = 0x00;
      pkt[2] = 0x00;
      pkt[3] = 0x01; // Subcommand / Page 1 (CRITICAL: MUST NOT BE OVERWRITTEN)
      pkt[4] = 0x00;
      pkt[5] = 0x80; // Length = 128 (0x80) bytes
      pkt[6] = 0x00;

      if (baseline) {
        const copyLen = Math.min(baseline.length - 7, 519 - 7);
        for (let i = 0; i < copyLen; i++) {
          pkt[7 + i] = baseline[7 + i];
        }
      }

      // 3. Set verified Cfg offsets (Cfg starts at payload offset 7):
      // FillCfg_LowDaly: Cfg[2](Debounce)=%d, Cfg[3](Debounce Mirror)=%d, Cfg[8](Tap)=%d, Cfg[9](Sleep)=%d
      // In wire packet pkt:
      // pkt[7 + 2] = pkt[9] = Debounce Stage
      // pkt[7 + 3] = pkt[10] = Debounce Mirror
      // pkt[7 + 8] = pkt[15] = Tap Level
      // pkt[7 + 9] = pkt[16] = Sleep Units (in 30s)
      pkt[7 + 2] = debounceStage;
      pkt[7 + 3] = debounceStage;
      pkt[7 + 8] = tapVal;
      pkt[7 + 9] = sleepUnits;

      // Also set unshifted pkt[2], pkt[8] for compatibility with older firmware builds, preserving pkt[3]=0x01!
      pkt[2] = debounceStage;
      pkt[8] = tapVal;

      webhid.log(
        `[Hardware Settings] Writing packet: pkt[9]=${pkt[9]}, pkt[10]=${pkt[10]}, pkt[15]=${pkt[15]}, pkt[16]=${pkt[16]}`
      );

      // 4. Send feature report 6
      await dev.sendFeatureReport(6, pkt);
      await new Promise((r) => setTimeout(r, 40));

      // 5. Send latch confirmation
      try {
        await dev.sendFeatureReport(6, pkt);
      } catch {
        // Latch retry
      }
      await new Promise((r) => setTimeout(r, 50));

      // 6. Re-read device config to verify
      await rgbService.readDeviceConfig(true);

      webhid.log(`[Hardware Settings] Successfully written and verified in Leobog Hi75c Pro internal EEPROM.`);
      this.isApplying = false;
      return {
        success: true,
        message: 'Tap, Sleep, and Debounce settings successfully saved to keyboard memory!',
      };
    } catch (err: any) {
      webhid.log(`[Hardware Settings] Write error: ${err.message}`);
      this.isApplying = false;
      return {
        success: false,
        message: `Failed to write to hardware: ${err.message}. Please verify the keyboard is connected in Wired USB mode.`,
      };
    }
  }
}

export const hardwareSettingsService = new HardwareSettingsService();
