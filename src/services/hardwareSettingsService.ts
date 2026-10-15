import { webhid } from './webhid';

export interface HardwareGlobalSettings {
  tapEnabled: boolean;
  tapSensitivityMs: number; // 50ms - 500ms
  sleepEnabled: boolean;
  sleepTimeoutSeconds: number; // in seconds: 60, 120, 300, 600, 1800, etc.
  debounceStage: number; // 1 - 5 (Stage 1 = 2ms, Stage 2 = 5ms, Stage 3 = 8ms, Stage 4 = 10ms, Stage 5 = 15ms)
}

const DEFAULT_SETTINGS: HardwareGlobalSettings = {
  tapEnabled: false,
  tapSensitivityMs: 200,
  sleepEnabled: true,
  sleepTimeoutSeconds: 120, // 2 Min
  debounceStage: 3, // 3 Stage (Default factory)
};

const STORAGE_KEY = 'leobog_hi75c_hardware_settings';

class HardwareSettingsService {
  private settings: HardwareGlobalSettings;
  private listeners: ((s: HardwareGlobalSettings) => void)[] = [];
  private isApplying: boolean = false;

  constructor() {
    this.settings = this.loadFromStorage();
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

  public getSettings(): HardwareGlobalSettings {
    return { ...this.settings };
  }

  public subscribe(fn: (s: HardwareGlobalSettings) => void) {
    this.listeners.push(fn);
    fn(this.settings);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    this.saveToStorage(this.settings);
    this.listeners.forEach(fn => fn({ ...this.settings }));
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

  // Apply Tap, Sleep, and Debounce to hardware via WebHID Report 6
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
      webhid.log(`[Hardware Settings] Applying settings: Sleep=${this.settings.sleepEnabled ? `${this.settings.sleepTimeoutSeconds}s` : 'OFF'}, Debounce=Stage ${this.settings.debounceStage}, Tap=${this.settings.tapEnabled ? `${this.settings.tapSensitivityMs}ms` : 'OFF'}`);

      // SinoWealth hardware parameters payload:
      // Command 0x05 / 0x85 or setting packet on Report ID 6
      const payload = new Uint8Array(519);
      payload[0] = 0x05; // CMD Hardware Options
      payload[1] = this.settings.sleepEnabled ? 0x01 : 0x00;
      payload[2] = (this.settings.sleepTimeoutSeconds & 0xff);
      payload[3] = ((this.settings.sleepTimeoutSeconds >> 8) & 0xff);
      payload[4] = this.settings.debounceStage; // 1 - 5
      payload[5] = this.settings.tapEnabled ? 0x01 : 0x00;
      payload[6] = (this.settings.tapSensitivityMs & 0xff);
      payload[7] = ((this.settings.tapSensitivityMs >> 8) & 0xff);

      await dev.sendFeatureReport(6, payload);
      await new Promise(r => setTimeout(r, 40));

      webhid.log(`[Hardware Settings] Successfully written hardware parameters to Leobog Hi75c Pro EEPROM.`);
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
        message: `Failed to write to hardware: ${err.message}. Please verify the keyboard is in Wired USB mode.`,
      };
    }
  }
}

export const hardwareSettingsService = new HardwareSettingsService();
