// Profile Manager for Leobog Hi75c Pro
// Handles Export, Import, Schema Validation, and Local Storage Safety Snapshots
import { webhid } from './webhid';
import { rgbService } from './rgbService';
import { hardwareSettingsService } from './hardwareSettingsService';
import { LEOBOG_HI75C_LAYOUT, parseKeyRecordUsage } from '../types/hid';

export const PROFILE_SCHEMA_VERSION = 1;
export const PROFILE_DEVICE_NAME = 'LEOBOG Hi75C Pro';
export const LAST_BACKUP_STORAGE_KEY = 'leobog_hi75c_last_profile_backup';

export interface ProfileLightingSettings {
  effectId: number;
  brightness: number;
  speed: number;
  colorHex: string;
  winLock: boolean;
  sleepSeconds: number;
  perKeyColors?: Record<number, string>;
}

export interface Hi75cProfile {
  schemaVersion: number;
  device: string;
  name: string;
  exportedAt: string;
  keymap: {
    base: Record<string, [number, number, number, number] | number>;
    fn: Record<string, [number, number, number, number] | number>;
  };
  lighting?: ProfileLightingSettings;
}

// Convert 32-bit uint32 to 4-byte tuple
export function uint32ToBytes(val: number): [number, number, number, number] {
  return [
    (val >>> 24) & 0xff,
    (val >>> 16) & 0xff,
    (val >>> 8) & 0xff,
    val & 0xff,
  ];
}

// Convert 4-byte tuple to uint32
export function bytesToUint32(bytes: [number, number, number, number]): number {
  return (
    (((bytes[0] & 0xff) << 24) |
      ((bytes[1] & 0xff) << 16) |
      ((bytes[2] & 0xff) << 8) |
      (bytes[3] & 0xff)) >>>
    0
  );
}

// Mapping from ckieking's K-ids to physical matrix indices
const KID_TO_MATRIX: Record<string, number> = {
  K1: 0, K2: 12, K3: 18, K4: 24, K5: 30, K6: 36, K7: 42, K8: 48, K9: 54, K10: 60, K11: 66, K12: 72, K13: 78, K82: 84,
  K15: 1, K16: 7, K17: 13, K18: 19, K19: 25, K20: 31, K21: 37, K22: 43, K23: 49, K24: 55, K25: 61, K26: 67, K27: 73, K28: 79, K29: 85,
  K30: 2, K31: 8, K32: 14, K33: 20, K34: 26, K35: 32, K36: 38, K37: 44, K38: 50, K39: 56, K40: 62, K41: 68, K42: 74, K43: 80, K44: 86,
  K45: 3, K46: 9, K47: 15, K48: 21, K49: 27, K50: 33, K51: 39, K52: 45, K53: 51, K54: 57, K55: 63, K56: 69, K57: 81, K81: 87,
  K58: 4, K59: 10, K60: 16, K61: 22, K62: 28, K63: 34, K64: 40, K65: 46, K66: 52, K67: 58, K68: 64, K69: 70, K70: 82, K14: 88,
  K71: 5, K72: 11, K73: 17, K74: 35, K75: 53, K76: 59, K77: 65, K78: 77, K79: 83, K80: 89,
};

class ProfileManager {
  // Generate current profile object
  public getCurrentProfile(name: string = 'Custom Layout'): Hi75cProfile {
    const baseKeymap: Record<string, [number, number, number, number]> = {};
    const fnKeymap: Record<string, [number, number, number, number]> = {};

    for (const key of LEOBOG_HI75C_LAYOUT) {
      const idx = key.matrixIdx;
      const baseRec = webhid.records.get(idx);
      if (baseRec) {
        baseKeymap[`Matrix_${idx}`] = [...baseRec.bytes];
      }
      const fnRec = webhid.fnRecords.get(idx);
      if (fnRec) {
        fnKeymap[`Matrix_${idx}`] = [...fnRec.bytes];
      }
    }

    const rgbState = rgbService.getState();
    const hwSettings = hardwareSettingsService.getSettings();

    return {
      schemaVersion: PROFILE_SCHEMA_VERSION,
      device: PROFILE_DEVICE_NAME,
      name,
      exportedAt: new Date().toISOString(),
      keymap: {
        base: baseKeymap,
        fn: fnKeymap,
      },
      lighting: {
        effectId: rgbState.effectId,
        brightness: rgbState.brightness,
        speed: rgbState.speed,
        colorHex: rgbState.staticColor,
        winLock: hwSettings.tapEnabled,
        sleepSeconds: hwSettings.sleepTimeoutSeconds,
        perKeyColors: { ...rgbState.perKeyColors },
      },
    };
  }

  // Export profile as JSON file download
  public exportProfile(name: string = 'Hi75c-Pro-Profile') {
    const profile = this.getCurrentProfile(name);
    const jsonStr = JSON.stringify(profile, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.href = url;
    a.download = `Leobog_Hi75c_Pro_${safeName}_${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    webhid.log(`[Profile] Profile "${name}" exported successfully.`);
  }

  // Parse and validate imported JSON string (supports our format and ckieking's schema)
  public parseProfileJson(jsonStr: string): Hi75cProfile {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error('Invalid JSON file format.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Profile file content must be a JSON object.');
    }

    if (!parsed.keymap || typeof parsed.keymap !== 'object') {
      throw new Error('Missing "keymap" object in profile.');
    }

    const normalizedBase: Record<string, [number, number, number, number]> = {};
    const normalizedFn: Record<string, [number, number, number, number]> = {};

    const rawBase = parsed.keymap.base || {};
    for (const [key, val] of Object.entries(rawBase)) {
      const bytes = this.normalizeKeyVal(val);
      if (bytes) {
        const matrixIdx = this.resolveMatrixIdx(key);
        if (matrixIdx !== null) {
          normalizedBase[`Matrix_${matrixIdx}`] = bytes;
        }
      }
    }

    const rawFn = parsed.keymap.fn || parsed.keymap.fn1 || {};
    for (const [key, val] of Object.entries(rawFn)) {
      const bytes = this.normalizeKeyVal(val);
      if (bytes) {
        const matrixIdx = this.resolveMatrixIdx(key);
        if (matrixIdx !== null) {
          normalizedFn[`Matrix_${matrixIdx}`] = bytes;
        }
      }
    }

    return {
      schemaVersion: parsed.schemaVersion || 1,
      device: parsed.device || PROFILE_DEVICE_NAME,
      name: parsed.name || 'Imported Profile',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      keymap: {
        base: normalizedBase,
        fn: normalizedFn,
      },
      lighting: parsed.lighting,
    };
  }

  private normalizeKeyVal(val: any): [number, number, number, number] | null {
    if (Array.isArray(val) && val.length === 4) {
      return [val[0] & 0xff, val[1] & 0xff, val[2] & 0xff, val[3] & 0xff];
    }
    if (typeof val === 'number') {
      return uint32ToBytes(val >>> 0);
    }
    return null;
  }

  private resolveMatrixIdx(key: string): number | null {
    if (key.startsWith('Matrix_')) {
      const num = parseInt(key.replace('Matrix_', ''), 10);
      return isNaN(num) ? null : num;
    }
    if (KID_TO_MATRIX[key] !== undefined) {
      return KID_TO_MATRIX[key];
    }
    const directNum = parseInt(key, 10);
    return isNaN(directNum) ? null : directNum;
  }

  // Backup current state to localStorage before applying imported changes
  public saveSafetyBackup() {
    try {
      const current = this.getCurrentProfile('Pre-Import Backup');
      localStorage.setItem(LAST_BACKUP_STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Storage quota or disabled
    }
  }

  public hasSafetyBackup(): boolean {
    return !!localStorage.getItem(LAST_BACKUP_STORAGE_KEY);
  }

  // Apply profile to keyboard
  public async applyProfile(profile: Hi75cProfile): Promise<{ success: boolean; message: string }> {
    this.saveSafetyBackup();
    webhid.log(`[Profile] Applying profile "${profile.name}" to keyboard...`);

    try {
      // Read current base and FN tables
      const currentBase = await webhid.readBaseTable();
      const currentFn = await webhid.readFnTable();

      const newBase = new Uint8Array(currentBase);
      const newFn = new Uint8Array(currentFn);

      // Apply base layer
      for (const [key, bytes] of Object.entries(profile.keymap.base)) {
        const matrixIdx = this.resolveMatrixIdx(key);
        if (matrixIdx !== null && matrixIdx >= 0 && matrixIdx < 128) {
          const offset = matrixIdx * 4;
          const byteArr = Array.isArray(bytes) ? bytes : uint32ToBytes(bytes as number);
          newBase[offset] = byteArr[0];
          newBase[offset + 1] = byteArr[1];
          newBase[offset + 2] = byteArr[2];
          newBase[offset + 3] = byteArr[3];

          const usage = parseKeyRecordUsage(byteArr);
          webhid.records.set(matrixIdx, {
            matrixIdx,
            hidUsage: usage,
            originalUsage: usage,
            bytes: byteArr,
          });
        }
      }

      // Apply fn layer
      for (const [key, bytes] of Object.entries(profile.keymap.fn)) {
        const matrixIdx = this.resolveMatrixIdx(key);
        if (matrixIdx !== null && matrixIdx >= 0 && matrixIdx < 128) {
          const offset = matrixIdx * 4;
          const byteArr = Array.isArray(bytes) ? bytes : uint32ToBytes(bytes as number);
          newFn[offset] = byteArr[0];
          newFn[offset + 1] = byteArr[1];
          newFn[offset + 2] = byteArr[2];
          newFn[offset + 3] = byteArr[3];

          const usage = parseKeyRecordUsage(byteArr);
          webhid.fnRecords.set(matrixIdx, {
            matrixIdx,
            hidUsage: usage,
            originalUsage: usage,
            bytes: byteArr,
          });
        }
      }

      // Write to hardware
      await webhid.writeBaseTable(newBase);
      await webhid.writeFnTable(newFn);
      await webhid.readMatrixData();

      // Apply lighting & global settings if available
      if (profile.lighting) {
        const rgbState = rgbService.getState();
        const effectId = profile.lighting.effectId ?? rgbState.effectId;
        const brightness = profile.lighting.brightness ?? rgbState.brightness;
        const speed = profile.lighting.speed ?? rgbState.speed;
        const colorHex = profile.lighting.colorHex ?? rgbState.staticColor;
        await rgbService.setHardwareEffect(effectId, brightness, speed, false, colorHex);

        if (profile.lighting.perKeyColors && Object.keys(profile.lighting.perKeyColors).length > 0) {
          await rgbService.applyPerKeyPlanar(profile.lighting.perKeyColors);
        }

        if (profile.lighting.sleepSeconds !== undefined) {
          hardwareSettingsService.updateSettings({
            sleepTimeoutSeconds: profile.lighting.sleepSeconds,
            sleepEnabled: profile.lighting.sleepSeconds > 0,
          });
        }
      }

      webhid.log(`[Profile] Profile "${profile.name}" applied and verified successfully!`);
      return { success: true, message: `Profile "${profile.name}" applied successfully!` };
    } catch (err: any) {
      webhid.log(`[Profile] Error applying profile: ${err.message}`);
      return { success: false, message: `Failed to apply profile: ${err.message}` };
    }
  }

  // Restore safety backup from localStorage
  public async restoreLastBackup(): Promise<{ success: boolean; message: string }> {
    const backupStr = localStorage.getItem(LAST_BACKUP_STORAGE_KEY);
    if (!backupStr) {
      return { success: false, message: 'No previous backup found.' };
    }
    const profile = this.parseProfileJson(backupStr);
    return await this.applyProfile(profile);
  }
}

export const profileManager = new ProfileManager();
