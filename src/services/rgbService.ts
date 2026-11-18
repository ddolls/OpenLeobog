import {
  LEOBOG_HI75C_LAYOUT,
  DEFAULT_RGB_STATE,
  LEOBOG_RGB_EFFECTS,
  type RGBColor,
  type RgbConfigState,
} from '../types/hid';
import { webhid } from './webhid';

// Helper: Convert hex string '#RRGGBB' to RGB object
export function hexToRgb(hex: string): RGBColor {
  const clean = hex.replace(/^#+/, '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }
  const bigint = parseInt(clean, 16);
  if (isNaN(bigint)) {
    return { r: 0, g: 229, b: 255 };
  }
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

// Helper: Convert RGB object to hex string '#RRGGBB'
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Modes that support custom single-color in firmware
const COLOR_CAPABLE_MODES = [1, 2, 4, 5, 7, 8, 10, 11, 12, 13];

// Hardware preset palette colors in Leobog Hi75c Pro keyboard MCU ROM slots (Dual-mode: 2.4G & Wired USB)
// Reverse-engineered from official LEOBOG ONE OemDrv.exe at 0x927B8-0x92890:
// Slot 0: Red (#FF0000 / #FF2B2B)
// Slot 1: Green (#00FF00 / #2EE65C)
// Slot 2: Blue (#0000FF / #2E6BFF)
// Slot 3: Yellow (#FFFF00 / #FFE11A)
// Slot 4: Purple (#FF00FF / #B833FF)
// Slot 5: Cyan (#00FFFF / #1AE5FF)
// Slot 6: White (#FFFFFF)
// Slot 7: Multicolor / Rainbow
export const HW_COLOR_PRESETS = [
  { index: 0, slot: 0, label: 'Red', hex: '#FF2B2B', r: 255, g: 43, b: 43 },
  { index: 1, slot: 1, label: 'Green', hex: '#2EE65C', r: 46, g: 230, b: 92 },
  { index: 2, slot: 2, label: 'Blue', hex: '#2E6BFF', r: 46, g: 107, b: 255 },
  { index: 3, slot: 3, label: 'Yellow', hex: '#FFE11A', r: 255, g: 225, b: 26 },
  { index: 4, slot: 4, label: 'Purple', hex: '#B833FF', r: 184, g: 51, b: 255 },
  { index: 5, slot: 5, label: 'Cyan', hex: '#1AE5FF', r: 26, g: 229, b: 255 },
  { index: 6, slot: 6, label: 'White', hex: '#FFFFFF', r: 255, g: 255, b: 255 },
];

export const WIRED_HW_COLOR_PRESETS = HW_COLOR_PRESETS;

export const PALETTE_EFFECT_COUNT = 23;
export const PALETTE_COLORS_PER_EFFECT = 7;
export const PALETTE_TAIL_SIZE = 7;
export const PALETTE_SIZE = PALETTE_EFFECT_COUNT * PALETTE_COLORS_PER_EFFECT * 3 + PALETTE_TAIL_SIZE; // 490 bytes

export interface PaletteData {
  effects: RGBColor[][];
  tail: Uint8Array;
  raw: Uint8Array;
}

export function decodePalette(raw: Uint8Array): PaletteData {
  if (raw.length !== PALETTE_SIZE) {
    throw new Error(`Invalid palette length: expected ${PALETTE_SIZE}, got ${raw.length}`);
  }
  const effects: RGBColor[][] = [];
  let offset = 0;
  for (let e = 0; e < PALETTE_EFFECT_COUNT; e++) {
    const row: RGBColor[] = [];
    for (let c = 0; c < PALETTE_COLORS_PER_EFFECT; c++) {
      row.push({
        r: raw[offset],
        g: raw[offset + 1],
        b: raw[offset + 2],
      });
      offset += 3;
    }
    effects.push(row);
  }
  const tail = raw.slice(PALETTE_SIZE - PALETTE_TAIL_SIZE, PALETTE_SIZE);
  return {
    effects,
    tail,
    raw: raw.slice(),
  };
}

export function encodePalette(palette: PaletteData): Uint8Array {
  const out =
    palette.raw.length === PALETTE_SIZE ? palette.raw.slice() : new Uint8Array(PALETTE_SIZE);
  let offset = 0;
  const effectCount = Math.min(PALETTE_EFFECT_COUNT, palette.effects.length);
  for (let e = 0; e < effectCount; e++) {
    const row = palette.effects[e];
    const colorCount = Math.min(PALETTE_COLORS_PER_EFFECT, row.length);
    for (let c = 0; c < colorCount; c++) {
      const rgb = row[c];
      out[offset + c * 3] = Math.max(0, Math.min(255, Math.round(rgb.r)));
      out[offset + c * 3 + 1] = Math.max(0, Math.min(255, Math.round(rgb.g)));
      out[offset + c * 3 + 2] = Math.max(0, Math.min(255, Math.round(rgb.b)));
    }
    offset += PALETTE_COLORS_PER_EFFECT * 3;
  }
  if (palette.tail.length === PALETTE_TAIL_SIZE) {
    out.set(palette.tail, PALETTE_SIZE - PALETTE_TAIL_SIZE);
  }
  return out;
}

export function createDefaultPalette(): PaletteData {
  const effects: RGBColor[][] = Array.from({ length: PALETTE_EFFECT_COUNT }, () =>
    HW_COLOR_PRESETS.map((p) => ({ r: p.r, g: p.g, b: p.b }))
  );
  const tail = new Uint8Array(PALETTE_TAIL_SIZE);
  const palette: PaletteData = {
    effects,
    tail,
    raw: new Uint8Array(PALETTE_SIZE),
  };
  palette.raw = encodePalette(palette);
  return palette;
}

export function findHwColorSlot(hex: string): number {
  const clean = hex.startsWith('#') ? hex.toUpperCase() : ('#' + hex).toUpperCase();
  const exact = HW_COLOR_PRESETS.find((p) => p.hex.toUpperCase() === clean);
  if (exact) {
    return exact.slot;
  }
  if (clean === '#FF0000') return 0; // Red
  if (clean === '#00FF00') return 1; // Green
  if (clean === '#0000FF') return 2; // Blue
  if (clean === '#FFFF00') return 3; // Yellow
  if (clean === '#FF00FF') return 4; // Purple
  if (clean === '#00FFFF') return 5; // Cyan
  if (clean === '#FFFFFF') return 6; // White

  const { r, g, b } = hexToRgb(hex);
  let bestSlot = 5; // Default to Cyan
  let bestDist = Infinity;
  for (const p of HW_COLOR_PRESETS) {
    const dr = r - p.r;
    const dg = g - p.g;
    const db = b - p.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      bestSlot = p.slot;
    }
  }
  return bestSlot;
}

export const findClosestHwColorIndex = findHwColorSlot;
export const findWiredHwColorSlot = findHwColorSlot;

class RgbControllerService {
  private device: any = null;
  private state: RgbConfigState = { ...DEFAULT_RGB_STATE };
  private listeners: ((state: RgbConfigState) => void)[] = [];
  private cachedConfig: Uint8Array | null = null;
  private keepaliveTimer: any = null;
  private animInterval: any = null;
  private isSendingFrame = false;
  private detectedModel: string = 'Leobog Hi75 C Pro';
  private palette: PaletteData = createDefaultPalette();
  private paletteSynced: boolean = false;

  // Mutual exclusion queue routed through unified WebHID queue to prevent USB transaction collisions
  private async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    return webhid.runExclusive(fn);
  }

  constructor() {
    // Listen to WebHID controller to auto-attach device when connected
    webhid.subscribe((hidUpdate) => {
      if (hidUpdate.isConnected && (webhid as any).device) {
        this.attachDevice((webhid as any).device);
      } else if (hidUpdate.isConnected === false) {
        this.detachDevice();
      }
    });
  }

  // Bind WebHID device handle
  public setDevice(device: any) {
    this.device = device;
    if (device) {
      this.syncDeviceConfig();
    } else {
      this.detachDevice();
    }
  }

  public async syncDeviceConfig() {
    await this.queryModel();
    await new Promise((r) => setTimeout(r, 60));
    await this.readDeviceConfig();
  }

  // Subscribe to reactive RGB state changes
  public subscribe(fn: (state: RgbConfigState) => void): () => void {
    this.listeners.push(fn);
    fn({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  public getState(): RgbConfigState {
    return { ...this.state };
  }

  private notify(partial: Partial<RgbConfigState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener({ ...this.state });
      } catch (err) {
        console.error('[RGB] Listener error:', err);
      }
    }
  }

  public attachDevice(device: any) {
    this.device = device;
    webhid.log('[RGB] WebHID device attached to RGB controller service.');
    // Probe model and read config
    this.queryModel().then(() => this.readDeviceConfig());
  }

  private configListeners: ((config136: Uint8Array) => void)[] = [];

  public onConfigRead(fn: (config136: Uint8Array) => void) {
    this.configListeners.push(fn);
    if (this.cachedConfig) {
      fn(this.cachedConfig);
    }
    return () => {
      this.configListeners = this.configListeners.filter((l) => l !== fn);
    };
  }

  public getCachedConfig(): Uint8Array | null {
    return this.cachedConfig;
  }

  public detachDevice() {
    this.stopSoftwareAnimation();
    this.stopKeepalive();
    this.device = null;
    this.cachedConfig = null;
    this.paletteSynced = false;
    this.notify({ isDirectStreaming: false });
    webhid.log('[RGB] Device detached from RGB controller.');
  }

  // Model Query (CMD 0x82): sends query twice per protocol specs
  public async queryModel(): Promise<string> {
    if (!this.device || !this.device.opened) {
      return 'Leobog Hi75 C Pro (Simulated)';
    }

    if (webhid.getWirelessClient()) {
      this.detectedModel = 'LEOBOG Hi75c Pro (2.4G)';
      return this.detectedModel;
    }

    try {
      const pkt = new Uint8Array(519);
      pkt[0] = 0x82;
      pkt[1] = 0x01;
      pkt[3] = 0x01;
      pkt[5] = 0x06;

      for (let i = 0; i < 2; i++) {
        await this.device.sendFeatureReport(6, pkt);
        await new Promise((r) => setTimeout(r, 20));
      }

      const res = await this.device.receiveFeatureReport(6);
      const data = new Uint8Array(res.buffer, res.byteOffset, res.byteLength);

      const base = data[0] === 6 ? 1 : 0;
      const modelId = data[base + 12];
      webhid.log(`[RGB] Model query response: byte[12]=0x${modelId?.toString(16) || '??'}`);

      this.detectedModel = this.device.productName || 'Leobog Hi75 C Pro';
      webhid.log(`[RGB] Model detected: ${this.detectedModel}`);
      return this.detectedModel;
    } catch (err: any) {
      webhid.log(`[RGB] Model query failed: ${err.message}`);
      return 'Leobog Hi75 C Pro';
    }
  }

  // Hardware palette in wired mode: wired firmware uses built-in ROM slots, so CMD 0x09 is unsupported.
  public async writeWiredPalette(_palette490: Uint8Array): Promise<boolean> {
    return true;
  }

  public async readWiredPalette(): Promise<Uint8Array | null> {
    return null;
  }

  // Read current lighting configuration via CMD 0x84 (returns 136 bytes) - Dual-mode (USB & 2.4G)
  public async readDeviceConfig(silent = false): Promise<Uint8Array | null> {
    if (!this.device || !this.device.opened) {
      return null;
    }

    const wirelessClient = webhid.getWirelessClient();
    if (wirelessClient) {
      try {
        const cfg128 = await wirelessClient.readConfig();
        const config136 = new Uint8Array(136);
        config136[0] = 0x84;
        config136.set(cfg128, 7);
        this.cachedConfig = config136;
        this.configListeners.forEach((fn) => {
          try {
            fn(this.cachedConfig!);
          } catch {
            // Ignore listener error
          }
        });

        if (!this.paletteSynced) {
          try {
            const rawPal = await wirelessClient.readPalette();
            const decoded = decodePalette(rawPal);
            const isAllZero = decoded.effects.every((row) =>
              row.every((c) => c.r === 0 && c.g === 0 && c.b === 0)
            );
            if (isAllZero) {
              webhid.log('[RGB 2.4G] Detected wiped hardware palette (all zeros). Auto-restoring default Leobog palette...');
              this.palette = createDefaultPalette();
              await wirelessClient.writePalette(encodePalette(this.palette));
            } else {
              this.palette = decoded;
            }
            this.paletteSynced = true;
          } catch (palErr: any) {
            webhid.log(`[RGB 2.4G Palette Sync] Initializing default palette (${palErr.message})`);
            this.palette = createDefaultPalette();
            try {
              await wirelessClient.writePalette(encodePalette(this.palette));
              this.paletteSynced = true;
            } catch {
              // Retry later
            }
          }
        }

        if (!silent) {
          const rawEffectId = cfg128[10];
          const customFlag = cfg128[9] === 1 || rawEffectId === 18 || rawEffectId === 32;
          const effectId = (rawEffectId === 18 || rawEffectId === 32) ? 18 : rawEffectId;
          const sideLightMode = cfg128[18];

          const slotIdx = effectId >= 1 && effectId <= 24 ? effectId - 1 : 0;
          const base = 58 + slotIdx * 2;
          const rawBright = cfg128[base] ?? 7;
          // Map 0..9 hardware brightness scale to UI 1..4 scale
          const brightness = rawBright >= 8 ? 4 : rawBright >= 6 ? 3 : rawBright >= 3 ? 2 : 1;
          const speedByte = cfg128[base + 1] ?? 0x27;
          const speed = Math.min(4, Math.max(0, (speedByte >> 4) & 0x0f));
          const colorNibble = speedByte & 0x0f;
          const colorful = colorNibble === 0x07;

          let staticColor = this.state.staticColor;
          if (!colorful && colorNibble < 7) {
            const hwPreset = HW_COLOR_PRESETS.find((p) => p.slot === colorNibble);
            if (hwPreset) staticColor = hwPreset.hex;
          }

          const isKnownEffect = LEOBOG_RGB_EFFECTS.some((e) => e.id === effectId);
          const validEffectId =
            typeof effectId === 'number' && (isKnownEffect || (effectId >= 0 && effectId <= 32))
              ? effectId
              : this.state.effectId;
          const validSideLight =
            typeof sideLightMode === 'number' && sideLightMode <= 4 ? sideLightMode : this.state.sideLightMode;

          this.notify({
            effectId: validEffectId,
            customMode: customFlag,
            sideLightMode: validSideLight,
            brightness,
            speed,
            colorful,
            staticColor,
          });

          webhid.log(
            `[RGB 2.4G Sync] Effect: #${validEffectId}, Bright: ${brightness}, Speed: ${speed}, Colorful: ${colorful}, Color: ${staticColor}, Side: ${validSideLight}`
          );
        }
        return this.cachedConfig;
      } catch (err: any) {
        webhid.log(`[RGB 2.4G] Config read error: ${err.message}`);
        return null;
      }
    }

    try {
      const pkt = new Uint8Array(519);
      pkt[0] = 0x84;
      pkt[3] = 0x01;
      pkt[5] = 0x80;

      await this.device.sendFeatureReport(6, pkt);
      await new Promise((r) => setTimeout(r, 30));

      const res = await this.device.receiveFeatureReport(6);
      const data = new Uint8Array(res.buffer, res.byteOffset, res.byteLength);

      // Determine offset: if data[0] === 6, report ID is included, so command 0x84 is at index 1
      const base = data[0] === 6 ? 1 : 0;
      const config136 = data.slice(base, base + 136);

      // A valid config payload is at least 134 bytes. Packets around 13-14 bytes are query model echos.
      if (config136.length < 134) {
        webhid.log(`[RGB] Ignored non-config packet (${config136.length} bytes)`);
        return null;
      }

      this.cachedConfig = new Uint8Array(config136);
      this.configListeners.forEach((fn) => {
        try {
          fn(this.cachedConfig!);
        } catch {
          // Ignore listener error
        }
      });

      if (!this.paletteSynced) {
        this.palette = createDefaultPalette();
        this.paletteSynced = true;
      }

      // Only notify listeners if not in silent/internal sync mode
      if (!silent) {
        // Wire offsets (relative to command byte at index 0):
        // Index 16: Custom mode flag (0 = hw effect, 1 = custom per-key)
        // Index 17: Effect ID
        // Index 25: Side light effect ID (0-4)
        const rawEffectId = config136[17];
        const customFlag = config136[16] === 1 || rawEffectId === 18 || rawEffectId === 32;
        const effectId = (rawEffectId === 18 || rawEffectId === 32) ? 18 : rawEffectId;
        const sideLightMode = config136[25];

        // Per-effect brightness & speed: offset = 63 + 2 * effectId
        const paramOffset = 63 + 2 * effectId;
        let brightness = 4;
        let speed = 2;
        let colorful = true;
        let staticColor = this.state.staticColor;

        if (typeof effectId === 'number' && paramOffset + 1 < config136.length) {
          brightness = Math.min(4, Math.max(1, config136[paramOffset]));
          const speedByte = config136[paramOffset + 1];
          speed = Math.min(4, Math.max(0, (speedByte >> 4) & 0x0f));
          const colorNibble = speedByte & 0x0f;
          colorful = colorNibble === 0x07;

          if (!colorful && colorNibble < 7) {
            const hwPreset = HW_COLOR_PRESETS.find((p) => p.slot === colorNibble);
            if (hwPreset) staticColor = hwPreset.hex;
          }
        }

        const isKnownEffect = LEOBOG_RGB_EFFECTS.some((e) => e.id === effectId);
        const validEffectId = typeof effectId === 'number' && (isKnownEffect || (effectId >= 0 && effectId <= 32)) ? effectId : this.state.effectId;
        const validSideLight = typeof sideLightMode === 'number' && sideLightMode <= 4 ? sideLightMode : this.state.sideLightMode;

        this.notify({
          effectId: validEffectId,
          customMode: customFlag,
          sideLightMode: validSideLight,
          brightness,
          speed,
          colorful,
          staticColor,
        });

        webhid.log(
          `[RGB Sync] Effect: #${validEffectId}, Bright: ${brightness}, Speed: ${speed}, Colorful: ${colorful}, Color: ${staticColor}, Side: ${validSideLight}`
        );
      }
      return this.cachedConfig;
    } catch (err: any) {
      webhid.log(`[RGB] Config read error: ${err.message}`);
      return null;
    }
  }

  // Set hardware lighting effect using the verified 4-step sequence
  public async setHardwareEffect(
    effectId: number,
    brightness: number = this.state.brightness,
    speed: number = this.state.speed,
    colorful: boolean = this.state.colorful,
    colorHex: string = this.state.staticColor
  ): Promise<boolean> {
    this.stopSoftwareAnimation();
    this.stopKeepalive();

    const normalizedColor = colorHex.startsWith('#') ? colorHex.toUpperCase() : ('#' + colorHex).toUpperCase();
    const isCustomMode = effectId === 18 || effectId === 32;
    const normalizedEffectId = isCustomMode ? 18 : effectId;

    // Immediately update local state for fast UI responsiveness
    this.notify({
      effectId: normalizedEffectId,
      brightness,
      speed,
      colorful,
      staticColor: normalizedColor,
      customMode: isCustomMode,
      isDirectStreaming: false,
      activeSoftwareAnim: null,
    });

    if (!this.device || !this.device.opened) {
      webhid.log(`[RGB Offline] Hardware effect set to #${normalizedEffectId} (Color: ${normalizedColor}, Colorful: ${colorful})`);
      return true;
    }

    const wirelessClient = webhid.getWirelessClient();
    if (wirelessClient) {
      return this.runExclusive(async () => {
        try {
          webhid.log(
            `[RGB 2.4G] Applying Effect #${normalizedEffectId} (Bright: ${brightness}, Speed: ${speed}, Colorful: ${colorful}, Color: ${normalizedColor})...`
          );

          let cfg128: Uint8Array;
          try {
            cfg128 = await wirelessClient.readConfig();
          } catch {
            cfg128 = new Uint8Array(128);
          }

          const newCfg = new Uint8Array(128);
          newCfg.set(cfg128);
          newCfg[126] = 0x5a;
          newCfg[127] = 0xa5;

          // custom_flag, effectId, global control byte (0x20 per OemDrv.exe)
          newCfg[9] = isCustomMode ? 0x01 : 0x00;
          newCfg[10] = normalizedEffectId;
          newCfg[11] = 0x20;
          if (!newCfg[24]) newCfg[24] = 10;
          newCfg[56] = 0xff;
          newCfg[57] = 0xff;

          const colorIdx = colorful ? 0x07 : findClosestHwColorIndex(normalizedColor);

          // Slot indexing: matches ckieking (effect 1..24 -> slot 0..23)
          const slotIdx = normalizedEffectId >= 1 && normalizedEffectId <= 24 ? normalizedEffectId - 1 : 0;
          const base = 58 + slotIdx * 2;

          // Map UI brightness (1..4) to hardware brightness (0..9)
          const hwBrightness = brightness <= 4
            ? [0, 2, 5, 7, 9][Math.max(1, Math.min(4, brightness))] || 7
            : Math.min(9, Math.max(0, brightness));

          if (normalizedEffectId > 0 && normalizedEffectId <= 32) {
            newCfg[base] = hwBrightness;
            const upper = (Math.max(0, Math.min(4, speed)) & 0x0f) << 4;
            const lower = colorIdx & 0x0f;
            newCfg[base + 1] = upper | lower;

            // Ensure other slots have active brightness, but never overwrite the active slot
            for (let i = 0; i < 24; i++) {
              const b = 58 + i * 2;
              if (!newCfg[b]) {
                newCfg[b] = hwBrightness;
              }
              if (b !== base && !newCfg[b + 1]) {
                newCfg[b + 1] = 0x27;
              }
            }
          } else if (normalizedEffectId === 0) {
            newCfg[10] = 0x00;
          }

          // If in single-color Static Mode (#1), also update planar RGB solid map
          if (normalizedEffectId === 1 && !colorful) {
            try {
              const rgb = hexToRgb(normalizedColor);
              const rgb378 = new Uint8Array(378);
              for (let i = 0; i < 126; i++) {
                rgb378[i] = rgb.r;
                rgb378[126 + i] = rgb.g;
                rgb378[252 + i] = rgb.b;
              }
              await wirelessClient.writeRgbMap(rgb378);
            } catch {
              // Ignore planar write retry
            }
          }

          await wirelessClient.writeConfig(newCfg);

          const config136 = new Uint8Array(136);
          config136[0] = 0x84;
          config136.set(newCfg, 7);
          this.cachedConfig = config136;

          this.notify({
            effectId: normalizedEffectId,
            brightness,
            speed,
            colorful,
            staticColor: normalizedColor,
            customMode: isCustomMode,
            isDirectStreaming: false,
            activeSoftwareAnim: null,
          });

          webhid.log(`[RGB 2.4G] Effect #${normalizedEffectId} successfully committed to keyboard memory!`);
          return true;
        } catch (err: any) {
          webhid.log(`[RGB 2.4G Error] Failed to write effect: ${err.message}`);
          return false;
        }
      });
    }

    return this.runExclusive(async () => {
      try {
        webhid.log(
          `[RGB] Applying Effect #${effectId} (Bright: ${brightness}, Speed: ${speed}, Colorful: ${colorful}, Color: ${normalizedColor})...`
        );

        // STEP 1: For Static mode (ID 1), send full solid planar RGB map
        if (normalizedEffectId === 1 && !colorful) {
          try {
            const rgb = hexToRgb(normalizedColor);
            const pktPlanar = new Uint8Array(519);
            pktPlanar[0] = 0x06; // CMD: LED_PLANAR
            pktPlanar[3] = 0x01;
            pktPlanar[5] = 0x7e;
            pktPlanar[6] = 0x01;
            for (let i = 0; i < 126; i++) {
              pktPlanar[7 + i] = rgb.r;
              pktPlanar[7 + 126 + i] = rgb.g;
              pktPlanar[7 + 252 + i] = rgb.b;
            }
            await this.device.sendFeatureReport(6, pktPlanar);
          } catch (err: any) {
            webhid.log(`[RGB Wired Solid Planar] ${err.message}`);
          }
        }

        // STEP 2: Use cached baseline config or read once if missing
        let baseline = this.cachedConfig;
        if (!baseline) {
          baseline = await this.readDeviceConfig(true);
          await new Promise((r) => setTimeout(r, 30));
        }

        // STEP 3: Map color to SinoWealth ROM hardware color slot in wired mode
        // Slot 0: Red, 1: Green, 2: Blue, 3: Yellow, 4: Purple, 5: Cyan, 6: White, 7: Rainbow
        const colorIdx = colorful ? 0x07 : findWiredHwColorSlot(normalizedColor);

        // STEP 4: Write modified config back (CMD 0x04)
        const pkt = new Uint8Array(519);
        pkt[0] = 0x04; // CMD: CONFIG_WRITE
        pkt[3] = 0x01;
        pkt[5] = 0x80;

        if (baseline) {
          const copyLen = Math.min(baseline.length - 7, 519 - 7);
          for (let i = 0; i < copyLen; i++) {
            pkt[7 + i] = baseline[7 + i];
          }
        }

        // Set effect mode (custom_flag = 0 for hardware effect, 1 for custom)
        pkt[16] = isCustomMode ? 0x01 : 0x00;
        pkt[17] = normalizedEffectId;
        pkt[18] = 0x20; // StartGp global control byte per OemDrv.exe

        // Force secondary light channels (byte 26 & byte 36) to 0x00 (OFF)
        // This stops ghost red hue (modes 3 & 4 in firmware are Static Red / Breathing Red)
        pkt[25] = 0x00;
        pkt[35] = 0x00;
        pkt[63] = 0xff; // offset 56 in config
        pkt[64] = 0xff; // offset 57 in config

        // Patch brightness, speed, and color at offset 63 + 2 * effectId
        const hwBrightWired = Math.max(1, Math.min(9, [0, 2, 5, 7, 9][brightness] || 7));

        if (normalizedEffectId > 0 && normalizedEffectId <= 32) {
          const paramOff = 63 + 2 * normalizedEffectId;
          if (paramOff + 1 < 519) {
            pkt[paramOff] = hwBrightWired;
            const upper = (Math.max(0, Math.min(4, speed)) & 0x0f) << 4;
            const lower = (colorful ? 0x07 : colorIdx) & 0x0f;
            pkt[paramOff + 1] = upper | lower;
          }
          // Ensure all 24 slots have active brightness, without overwriting active slot
          for (let i = 0; i < 24; i++) {
            const b = 65 + i * 2;
            if (!pkt[b]) {
              pkt[b] = hwBrightWired;
            }
            if (b !== paramOff && !pkt[b + 1]) {
              pkt[b + 1] = 0x27;
            }
          }
        } else if (normalizedEffectId === 0) {
          pkt[17] = 0x00;
        }

        pkt[513] = 0x5a;
        pkt[514] = 0xa5;

        // Send feature report with retry if needed
        let writeOk = false;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            await this.device.sendFeatureReport(6, pkt);
            writeOk = true;
            break;
          } catch {
            await new Promise((r) => setTimeout(r, 40));
          }
        }

        if (!writeOk) {
          throw new Error('Failed to send config write packet');
        }

        // Send latch confirmation after 30ms to guarantee MCU switches to effect
        await new Promise((r) => setTimeout(r, 30));
        try {
          await this.device.sendFeatureReport(6, pkt);
        } catch {
          // Latching retry silently handled
        }

        // Update cached configuration memory
        if (this.cachedConfig) {
          this.cachedConfig[16] = isCustomMode ? 0x01 : 0x00;
          this.cachedConfig[17] = normalizedEffectId;
          this.cachedConfig[18] = 0x20;
          this.cachedConfig[25] = 0x00;
          this.cachedConfig[35] = 0x00;
          const pOff = 63 + 2 * normalizedEffectId;
          if (pOff + 1 < this.cachedConfig.length) {
            this.cachedConfig[pOff] = hwBrightWired;
            this.cachedConfig[pOff + 1] =
              ((Math.max(0, Math.min(4, speed)) & 0x0f) << 4) | (colorful ? 0x07 : colorIdx);
          }
        }

        // Broadcast confirmed state
        this.notify({
          effectId: normalizedEffectId,
          brightness,
          speed,
          colorful,
          staticColor: normalizedColor,
          customMode: isCustomMode,
          isDirectStreaming: false,
          activeSoftwareAnim: null,
        });

        webhid.log(`[RGB] Effect #${normalizedEffectId} successfully committed to keyboard memory!`);
        return true;
      } catch (err: any) {
        webhid.log(`[RGB Error] Failed to write effect: ${err.message}`);
        return false;
      }
    });
  }

  // Atomically set color for current active effect
  public async setEffectColor(hex: string): Promise<boolean> {
    const normalizedHex = hex.startsWith('#') ? hex.toUpperCase() : ('#' + hex).toUpperCase();
    const currentId = this.state.effectId;
    let targetId = currentId;

    // If LEDs are off (ID 0) or on fixed-rainbow mode (no single color in firmware, e.g. Rainbow Wave #3), switch to Static #1
    if (targetId === 0 || !COLOR_CAPABLE_MODES.includes(targetId)) {
      targetId = 1;
      webhid.log(`[RGB] Effect #${currentId} is fixed-rainbow or off. Switching to Static (#1) with ${normalizedHex}.`);
    }

    return await this.setHardwareEffect(
      targetId,
      this.state.brightness,
      this.state.speed,
      false, // Single color mode
      normalizedHex
    );
  }

  // Set universal static color (CMD 0x0A + Effect #1)
  public async setStaticColor(hex: string): Promise<boolean> {
    const normalizedHex = hex.startsWith('#') ? hex.toUpperCase() : ('#' + hex).toUpperCase();
    return await this.setHardwareEffect(1, this.state.brightness, 0, false, normalizedHex);
  }

  // Low-level helper: write custom color profile (CMD 0x0A)
  // Respects exact 14-group hardware layout (98 LEDs) with 21-byte hardware gaps:
  // - Wire 0x1D (idx 28): 5 groups (35 LEDs, 105 bytes)
  // - Gap 1 (idx 133-153): 21 bytes zero padding (protects matrix registers)
  // - Group 6-7 (idx 154-195): 2 groups (14 LEDs, 42 bytes)
  // - Gap 2 (idx 196-216): 21 bytes zero padding
  // - Group 8-11 (idx 217-300): 4 groups (28 LEDs, 84 bytes)
  // - Gap 3 (idx 301-321): 21 bytes zero padding
  // - Group 12-14 (idx 322-384): 3 groups (21 LEDs, 63 bytes)
  // - Padding (idx 385-512): 128 bytes zero padding
  // - Terminator (idx 513-514): 0x5A, 0xA5
  public async writeStaticColorProfile(hex: string): Promise<boolean> {
    if (!this.device || !this.device.opened) return true;

    const wirelessClient = webhid.getWirelessClient();
    if (wirelessClient) {
      try {
        const rgb = hexToRgb(hex);
        const rgb378 = new Uint8Array(378);
        for (let i = 0; i < 126; i++) {
          rgb378[i] = rgb.r;
          rgb378[126 + i] = rgb.g;
          rgb378[252 + i] = rgb.b;
        }
        await wirelessClient.writeRgbMap(rgb378);
        webhid.log(`[RGB 2.4G] Static solid color ${hex} sent via planar RGB map.`);
        return true;
      } catch (err: any) {
        webhid.log(`[RGB 2.4G] Static color profile error: ${err.message}`);
        return false;
      }
    }

    try {
      const rgb = hexToRgb(hex);
      const pkt = new Uint8Array(519); // Initialized to all zeros

      pkt[0] = 0x0a; // CMD: CUSTOM_COLOR_PROFILE
      pkt[3] = 0x01;
      pkt[6] = 0x02;

      // Hardware group definitions from reverse-engineered captures:
      // 5 groups, 21-byte gap, 2 groups, 21-byte gap, 4 groups, 21-byte gap, 3 groups
      const groupChunks = [
        { start: 28, numGroups: 5 },  // Group 1-5: index 28 to 132 (105 bytes) -> LEDs 0..34
        { start: 154, numGroups: 2 }, // Group 6-7: index 154 to 195 (42 bytes) -> LEDs 35..48
        { start: 217, numGroups: 4 }, // Group 8-11: index 217 to 300 (84 bytes) -> LEDs 49..76
        { start: 322, numGroups: 3 }, // Group 12-14: index 322 to 384 (63 bytes) -> LEDs 77..97
      ];

      for (const chunk of groupChunks) {
        const totalBytes = chunk.numGroups * 21;
        for (let i = chunk.start; i + 2 < chunk.start + totalBytes; i += 3) {
          pkt[i] = rgb.r;
          pkt[i + 1] = rgb.g;
          pkt[i + 2] = rgb.b;
        }
      }

      // Terminator 0x5A, 0xA5 at 513-514 (wire 514-515)
      pkt[513] = 0x5a;
      pkt[514] = 0xa5;

      await this.device.sendFeatureReport(6, pkt);
      return true;
    } catch (err: any) {
      webhid.log(`[RGB] Static profile error: ${err.message}`);
      return false;
    }
  }

  // Restore factory default 490-byte palette across all 23 effects (Dual-mode: 2.4G & Wired USB)
  public async restoreDefaultPalette(): Promise<boolean> {
    this.palette = createDefaultPalette();
    const wirelessClient = webhid.getWirelessClient();
    if (wirelessClient) {
      return this.runExclusive(async () => {
        try {
          await wirelessClient.writePalette(encodePalette(this.palette));
          this.paletteSynced = true;
          webhid.log('[RGB 2.4G] Factory default palette successfully restored to keyboard memory!');
          await this.setHardwareEffect(
            this.state.effectId,
            this.state.brightness,
            this.state.speed,
            this.state.colorful,
            this.state.staticColor
          );
          return true;
        } catch (err: any) {
          webhid.log(`[RGB 2.4G] Palette restore failed: ${err.message}`);
          return false;
        }
      });
    }

    return this.runExclusive(async () => {
      try {
        this.palette = createDefaultPalette();
        this.paletteSynced = true;
        webhid.log('[RGB Wired] Factory default effect settings restored to keyboard memory!');
        await this.setHardwareEffect(
          this.state.effectId,
          this.state.brightness,
          this.state.speed,
          this.state.colorful,
          this.state.staticColor
        );
        return true;
      } catch (err: any) {
        webhid.log(`[RGB Wired] Palette restore failed: ${err.message}`);
        return false;
      }
    });
  }

  // Set side-light strip effect mode (0=off, 1=rainbow, 2=breathing mixed, 3=static red, 4=breathing red)
  public async setSideLightMode(mode: number): Promise<boolean> {
    this.notify({ sideLightMode: mode });

    if (!this.device || !this.device.opened) {
      webhid.log(`[RGB Offline] Side light set to mode ${mode}`);
      return true;
    }

    const wirelessClient = webhid.getWirelessClient();
    if (wirelessClient) {
      try {
        let cfg = await wirelessClient.readConfig();
        const newCfg = new Uint8Array(cfg);
        newCfg[18] = Math.max(0, Math.min(4, mode));
        await wirelessClient.writeConfig(newCfg);
        webhid.log(`[RGB 2.4G] Side-light mode ${mode} applied.`);
        return true;
      } catch (err: any) {
        webhid.log(`[RGB 2.4G] Side-light error: ${err.message}`);
        return false;
      }
    }

    try {
      const freshConfig = await this.readDeviceConfig(true);
      await new Promise((r) => setTimeout(r, 20));

      const pkt = new Uint8Array(519);
      pkt[0] = 0x04;
      pkt[3] = 0x01;
      pkt[5] = 0x80;

      const baseline = freshConfig || this.cachedConfig;
      if (baseline) {
        const copyLen = Math.min(baseline.length - 7, 519 - 7);
        for (let i = 0; i < copyLen; i++) {
          pkt[7 + i] = baseline[7 + i];
        }
      }

      pkt[25] = Math.max(0, Math.min(4, mode)); // Side light mode offset

      await this.device.sendFeatureReport(6, pkt);
      webhid.log(`[RGB] Side-light mode ${mode} applied.`);
      return true;
    } catch (err: any) {
      webhid.log(`[RGB] Side-light error: ${err.message}`);
      return false;
    }
  }

  // Apply Planar Per-Key RGB (CMD 0x02) + Save Custom Profile (CMD 0x04)
  public async applyPerKeyPlanar(perKeyColors: Record<number, string>): Promise<boolean> {
    this.stopSoftwareAnimation();
    this.stopKeepalive();

    this.notify({
      perKeyColors,
      customMode: true,
      effectId: 18, // Mode 18 (GaoshouIndex = 18 in KB.ini / OemDrv.exe for Hi75C Pro)
      isDirectStreaming: false,
      activeSoftwareAnim: null,
      colorful: true,
    });

    if (!this.device || !this.device.opened) {
      webhid.log(`[RGB Offline] Per-key colors saved (${Object.keys(perKeyColors).length} keys).`);
      return true;
    }

    const wirelessClient = webhid.getWirelessClient();
    if (wirelessClient) {
      return this.runExclusive(async () => {
        try {
          webhid.log(`[RGB 2.4G] Applying Per-Key Custom RGB (${Object.keys(perKeyColors).length} keys mapped)...`);

          // 1. Build 378-byte planar RGB map: R[0..125], G[126..251], B[252..377]
          // Matches OemDrv.exe 0x493bb8 layout exactly.
          // Unpainted keys (or keys set to #000000) are strictly turned off (r=0, g=0, b=0).
          const rgb378 = new Uint8Array(378);

          for (let i = 0; i < 126; i++) {
            const hex = perKeyColors[i];
            if (hex && hex !== '#000000') {
              const c = hexToRgb(hex);
              rgb378[i] = c.r;
              rgb378[126 + i] = c.g;
              rgb378[252 + i] = c.b;
            } else {
              rgb378[i] = 0;
              rgb378[126 + i] = 0;
              rgb378[252 + i] = 0;
            }
          }

          // 2. Prepare 128-byte configuration
          let cfg: Uint8Array;
          try {
            cfg = await wirelessClient.readConfig();
          } catch {
            cfg = this.cachedConfig ? this.cachedConfig.slice(7, 135) : new Uint8Array(128);
          }
          const newCfg = new Uint8Array(128);
          if (cfg && cfg.length >= 128) {
            newCfg.set(cfg.subarray(0, 128));
          }

          // Enable Per-Key Custom Mode: customFlag = 1, effectId = 18 (GaoshouIndex from KB.ini / OemDrv.exe)
          newCfg[9] = 0x01;  // customFlag = 1
          newCfg[10] = 18;   // effectId = 18 (GaoshouIndex from KB.ini / OemDrv.exe)
          newCfg[11] = 0x20; // StartGp global brightness/control byte from OemDrv.exe line 0x49321f
          if (!newCfg[24]) newCfg[24] = 10; // sleepStep = 10 (5 min default)
          newCfg[56] = 0xff;
          newCfg[57] = 0xff;

          // Hardware brightness scale (0..9, default 7..9)
          const currentBrightness = this.state.brightness > 0 ? this.state.brightness : 4;
          const hwBrightness = currentBrightness <= 4
            ? [0, 2, 5, 7, 9][Math.max(1, Math.min(4, currentBrightness))] || 7
            : Math.min(9, Math.max(0, currentBrightness));

          // Ensure all 24 slots (including slot 0, slot 17 for Effect 18, and slot 28) have active brightness
          for (let i = 0; i < 24; i++) {
            const base = 58 + i * 2;
            newCfg[base] = hwBrightness;
            newCfg[base + 1] = 0x27; // speed 2, color 7 (multicolor/custom flag)
          }

          // Magic trailer bytes (0x5A, 0xA5)
          newCfg[126] = 0x5a;
          newCfg[127] = 0xa5;

          // Step 1: Write planar RGB map first (matches OemDrv.exe 0x493c4c execution order)
          await wirelessClient.writeRgbMap(rgb378);
          await new Promise((r) => setTimeout(r, 40));

          // Step 2: Write configuration (switches microcontroller to Effect #18 Custom Mode)
          await wirelessClient.writeConfig(newCfg);
          await new Promise((r) => setTimeout(r, 40));

          // Step 3: Write planar RGB map again to guarantee SRAM latching
          try {
            await wirelessClient.writeRgbMap(rgb378);
            webhid.log('[RGB 2.4G] Per-key planar RGB successfully applied to keyboard memory!');
          } catch (rgbErr: any) {
            webhid.log(`[RGB 2.4G writeRgbMap notice] ${rgbErr.message}`);
          }

          const config136 = new Uint8Array(136);
          config136[0] = 0x84;
          config136.set(newCfg, 7);
          this.cachedConfig = config136;

          this.notify({
            perKeyColors,
            customMode: true,
            effectId: 18,
            brightness: currentBrightness,
            speed: 2,
            colorful: true,
          });

          return true;
        } catch (err: any) {
          webhid.log(`[RGB 2.4G Error] Failed to write custom RGB: ${err.message}`);
          return false;
        }
      });
    }

    return this.runExclusive(async () => {
      try {
        webhid.log(`[RGB] Uploading planar RGB packets...`);

        // Matches official OemDrv.exe 0x48d580 method (Feature Report 8 with 0x0A, 0x7A, 0x01)
        try {
          const report8 = new Uint8Array(382);
          report8[0] = 0x08;
          report8[1] = 0x0a;
          report8[2] = 0x7a;
          report8[3] = 0x01;
          for (let i = 0; i < 126; i++) {
            const hex = perKeyColors[i];
            const rgb = hex && hex !== '#000000' ? hexToRgb(hex) : { r: 0, g: 0, b: 0 };
            report8[4 + i] = rgb.r;
            report8[4 + 126 + i] = rgb.g;
            report8[4 + 252 + i] = rgb.b;
          }
          await this.device.sendFeatureReport(8, report8);
        } catch (err8: any) {
          webhid.log(`[RGB Report 8 info] ${err8.message}`);
        }

        // Feature Report 6 (CMD 0x06: LED_PLANAR)
        const pkt = new Uint8Array(519);
        pkt[0] = 0x06; // CMD: LED_PLANAR
        pkt[1] = 0x00;
        pkt[2] = 0x00;
        pkt[3] = 0x01;
        pkt[4] = 0x00;
        pkt[5] = 0x7e; // 126 keys
        pkt[6] = 0x01;

        // Planar layout (channel stride 126 bytes):
        // R plane: offset 7 to 132
        // G plane: offset 133 to 258
        // B plane: offset 259 to 384
        const planeR = 7;
        const planeG = 7 + 126;
        const planeB = 7 + 126 * 2;

        for (let i = 0; i < 126; i++) {
          const hex = perKeyColors[i];
          const rgb = hex && hex !== '#000000' ? hexToRgb(hex) : { r: 0, g: 0, b: 0 };
          pkt[planeR + i] = rgb.r;
          pkt[planeG + i] = rgb.g;
          pkt[planeB + i] = rgb.b;
        }

        await this.device.sendFeatureReport(6, pkt);
        await new Promise((r) => setTimeout(r, 40));

        // Trigger config read (silent)
        const freshConfig = await this.readDeviceConfig(true);
        await new Promise((r) => setTimeout(r, 25));

        // Trigger config write for Effect 18 (Per-Key Custom) with brightness
        const cfgPkt = new Uint8Array(519);
        cfgPkt[0] = 0x04;
        cfgPkt[3] = 0x01;
        cfgPkt[5] = 0x80;

        const baseline = freshConfig || this.cachedConfig;
        if (baseline) {
          const copyLen = Math.min(baseline.length - 7, 519 - 7);
          for (let i = 0; i < copyLen; i++) {
            cfgPkt[7 + i] = baseline[7 + i];
          }
        }

        cfgPkt[16] = 0x01; // custom_flag = 1 (enables custom per-key)
        cfgPkt[17] = 18;   // effect 18 (Per-Key Custom RGB from KB.ini / OemDrv.exe)
        cfgPkt[18] = 0x20; // StartGp = 0x20 per OemDrv.exe
        cfgPkt[25] = 0x00;
        cfgPkt[35] = 0x00;
        cfgPkt[63] = 0xff; // offset 56 in config
        cfgPkt[64] = 0xff; // offset 57 in config

        const currentBrightness = this.state.brightness > 0 ? this.state.brightness : 4;
        const hwBrightness = Math.max(1, Math.min(9, [0, 2, 5, 7, 9][currentBrightness] || 7));

        for (let i = 0; i < 24; i++) {
          const b = 65 + i * 2;
          cfgPkt[b] = hwBrightness;
          cfgPkt[b + 1] = 0x27;
        }

        cfgPkt[513] = 0x5a;
        cfgPkt[514] = 0xa5;

        await this.device.sendFeatureReport(6, cfgPkt);
        webhid.log(`[RGB] Per-key planar layout saved to keyboard flash.`);

        this.notify({
          perKeyColors,
          customMode: true,
          effectId: 18,
          brightness: currentBrightness,
          speed: 2,
          colorful: true,
        });

        return true;
      } catch (err: any) {
        webhid.log(`[RGB] Per-key write error: ${err.message}`);
        return false;
      }
    });
  }

  // Send Direct Mode LED Frame (transmits both Planar CMD 0x06 and Direct CMD 0x08 for 122 keys)
  public async sendDirectFrame(colors: (RGBColor | null)[]): Promise<boolean> {
    if (!this.device || !this.device.opened || this.isSendingFrame || webhid.getWirelessClient()) {
      return false;
    }

    this.isSendingFrame = true;
    try {
      // 1. Send Planar Frame (CMD 0x06) - native hardware per-key command supported across all LEOBOG firmwares
      const planarPkt = new Uint8Array(519);
      planarPkt[0] = 0x06; // CMD: LED_PLANAR
      planarPkt[1] = 0x00;
      planarPkt[2] = 0x00;
      planarPkt[3] = 0x01;
      planarPkt[4] = 0x00;
      planarPkt[5] = 0x7a; // 122 keys
      planarPkt[6] = 0x01;

      const planeR = 7;
      const planeG = 7 + 126;
      const planeB = 7 + 126 * 2;

      for (let i = 0; i < 122; i++) {
        const c = colors[i] || { r: 0, g: 0, b: 0 };
        planarPkt[planeR + i] = c.r;
        planarPkt[planeG + i] = c.g;
        planarPkt[planeB + i] = c.b;
      }

      await this.device.sendFeatureReport(6, planarPkt);

      // 2. Also send Direct Frame (CMD 0x08) - OpenRGB direct mode interleaved format
      const directPkt = new Uint8Array(519);
      directPkt[0] = 0x08; // CMD: SET_LEDS_DIRECT
      directPkt[1] = 0x00;
      directPkt[2] = 0x00;
      directPkt[3] = 0x01;
      directPkt[4] = 0x00;
      directPkt[5] = 0x7a; // 122 keys
      directPkt[6] = 0x01;

      for (let i = 0; i < 122; i++) {
        const c = colors[i] || { r: 0, g: 0, b: 0 };
        directPkt[7 + i * 3] = c.r;
        directPkt[7 + i * 3 + 1] = c.g;
        directPkt[7 + i * 3 + 2] = c.b;
      }

      await this.device.sendFeatureReport(6, directPkt);
      return true;
    } catch (err: any) {
      webhid.log(`[RGB Frame Error] ${err.message}`);
      return false;
    } finally {
      this.isSendingFrame = false;
    }
  }

  // Start keepalive heartbeat (every 600ms) to maintain Direct Mode
  private startKeepalive() {
    this.stopKeepalive();
    this.keepaliveTimer = setInterval(async () => {
      if (this.state.isDirectStreaming && this.device?.opened && !this.isSendingFrame) {
        const frame = new Array(122).fill(null).map((_, idx) => {
          const hex = this.state.perKeyColors[idx] || this.state.staticColor;
          return hexToRgb(hex);
        });
        await this.sendDirectFrame(frame);
      }
    }, 600);
  }

  private stopKeepalive() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  // Start built-in software animation stream
  public async startSoftwareAnimation(animType: 'matrix' | 'rainbow' | 'pulse' | 'fire') {
    await this.stopSoftwareAnimation();
    this.notify({
      activeSoftwareAnim: animType,
      isDirectStreaming: true,
      customMode: false,
    });

    webhid.log(`[RGB] Initializing software streaming for '${animType}'...`);

    // Prepare hardware: switch keyboard into Custom Streaming Mode (0x12) so internal hardware shaders pause
    if (this.device && this.device.opened) {
      try {
        // Attempt Report 0x39 / 0x3C direct mode unlock sequence (if supported by device descriptor)
        try {
          await this.device.sendFeatureReport(0x39, new Uint8Array([0x20, 0x06, 0x00, 0x01, 0x00]));
        } catch {}
        try {
          await this.device.sendFeatureReport(0x3c, new Uint8Array([0x20, 0x01, 0x00]));
        } catch {}

        // Set custom_flag = 1, effect_id = 18 (0x12) via CMD 0x04 to pause internal MCU hardware animations
        const freshConfig = await this.readDeviceConfig(true);
        const cfgPkt = new Uint8Array(519);
        cfgPkt[0] = 0x04;
        cfgPkt[3] = 0x01;
        cfgPkt[5] = 0x80;

        const baseline = freshConfig || this.cachedConfig;
        if (baseline) {
          const copyLen = Math.min(baseline.length - 7, 519 - 7);
          for (let i = 0; i < copyLen; i++) {
            cfgPkt[7 + i] = baseline[7 + i];
          }
        }

        cfgPkt[16] = 0x01; // custom_flag = 1 (enables external custom / streaming frames)
        cfgPkt[17] = 0x12; // effect 18 (custom render mode)

        await this.device.sendFeatureReport(6, cfgPkt);
        await new Promise((r) => setTimeout(r, 25));
        webhid.log(`[RGB] Keyboard MCU switched to Custom Streaming Mode.`);
      } catch (err: any) {
        webhid.log(`[RGB Warning] Could not set custom streaming mode: ${err.message}`);
      }
    }

    let tick = 0;
    const intervalMs = 45; // ~22 FPS

    this.animInterval = setInterval(async () => {
      tick++;
      const frameColors: (RGBColor | null)[] = new Array(122).fill(null);
      const activePerKey: Record<number, string> = {};

      for (const key of LEOBOG_HI75C_LAYOUT) {
        const idx = key.matrixIdx;
        if (idx >= 122) continue;

        let rgb: RGBColor;

        if (animType === 'matrix') {
          // Matrix digital rain
          const rowOffset = (key.row + tick * 0.3) % 6;
          const brightness = Math.max(0, 1 - Math.abs(rowOffset - 3) / 3);
          const isGreen = Math.sin(key.col * 2 + tick * 0.2) > 0;
          if (brightness > 0.4 && isGreen) {
            rgb = { r: Math.round(40 * brightness), g: Math.round(255 * brightness), b: Math.round(80 * brightness) };
          } else {
            rgb = { r: 0, g: 20, b: 5 };
          }
        } else if (animType === 'rainbow') {
          // Rainbow horizontal wave
          const hue = ((key.col * 22 + tick * 6) % 360 + 360) % 360;
          rgb = hslToRgb(hue, 1, 0.5);
        } else if (animType === 'pulse') {
          // Smooth breathing pulse of chosen static color
          const baseRgb = hexToRgb(this.state.staticColor);
          const intensity = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(tick * 0.1));
          rgb = {
            r: Math.round(baseRgb.r * intensity),
            g: Math.round(baseRgb.g * intensity),
            b: Math.round(baseRgb.b * intensity),
          };
        } else {
          // Fire flame effect
          const distFromBottom = 5 - key.row;
          const flicker = Math.sin(key.col * 3 + tick * 0.4) * 0.25;
          const heat = Math.max(0, Math.min(1, 1 - distFromBottom / 5 + flicker));
          rgb = {
            r: Math.round(255 * heat),
            g: Math.round(140 * heat * heat),
            b: Math.round(15 * heat * heat * heat),
          };
        }

        frameColors[idx] = rgb;
        activePerKey[idx] = rgbToHex(rgb.r, rgb.g, rgb.b);
      }

      // Update state for UI preview
      this.notify({ perKeyColors: activePerKey });

      // Send direct mode frame to physical hardware if connected
      if (this.device?.opened && !this.isSendingFrame) {
        await this.sendDirectFrame(frameColors);
      }
    }, intervalMs);

    this.startKeepalive();
    webhid.log(`[RGB] Software animation '${animType}' streaming active.`);
  }

  public async stopSoftwareAnimation() {
    if (this.animInterval) {
      clearInterval(this.animInterval);
      this.animInterval = null;
    }
    this.stopKeepalive();
    if (this.state.activeSoftwareAnim) {
      this.notify({ activeSoftwareAnim: null, isDirectStreaming: false });
      webhid.log('[RGB] Software animation stopped, restoring hardware lighting.');
      // Restore the stored hardware effect
      await this.setHardwareEffect(this.state.effectId);
    }
  }
}

// Convert HSL (h: 0-360, s: 0-1, l: 0-1) to RGB (0-255)
function hslToRgb(h: number, s: number, l: number): RGBColor {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0,
    g1 = 0,
    b1 = 0;

  if (h < 60) {
    r1 = c;
    g1 = x;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
  } else if (h < 180) {
    g1 = c;
    b1 = x;
  } else if (h < 240) {
    g1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export const rgbService = new RgbControllerService();
