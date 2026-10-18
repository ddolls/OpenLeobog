// Screen Sync RGB (Ambilight Mode) Service for LEOBOG Hi75c Pro
// Captures screen video via Web API and streams real-time LED matrix frames via WebHID direct command 0x08
import { LEOBOG_HI75C_LAYOUT, type RGBColor } from '../types/hid';
import { rgbService } from './rgbService';
import { webhid } from './webhid';

export type ScreenSyncMode = 'full-matrix' | 'ambient-zone' | 'average-glow';

export interface ScreenSyncState {
  isActive: boolean;
  fps: number;
  mode: ScreenSyncMode;
  brightness: number; // 0.2 to 1.0
  saturationBoost: number; // 1.0 to 2.5
  smoothing: number; // 0.1 to 1.0
  currentDominantColor: string; // #RRGGBB
  error: string | null;
}

class ScreenSyncService {
  private mediaStream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private timerId: any = null;

  private state: ScreenSyncState = {
    isActive: false,
    fps: 0,
    mode: 'full-matrix',
    brightness: 0.85,
    saturationBoost: 1.5,
    smoothing: 0.4,
    currentDominantColor: '#00e5ff',
    error: null,
  };

  private prevColors: Map<number, RGBColor> = new Map();
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private isProcessing = false;
  private listeners: ((state: ScreenSyncState) => void)[] = [];

  constructor() {
    // Setup offscreen canvas
    if (typeof document !== 'undefined') {
      this.canvasEl = document.createElement('canvas');
      this.canvasEl.width = 160;
      this.canvasEl.height = 90;
      this.ctx = this.canvasEl.getContext('2d', { willReadFrequently: true });
    }
  }

  public subscribe(fn: (state: ScreenSyncState) => void) {
    this.listeners.push(fn);
    fn({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(update: Partial<ScreenSyncState>) {
    this.state = { ...this.state, ...update };
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  public getState(): ScreenSyncState {
    return { ...this.state };
  }

  public setMode(mode: ScreenSyncMode) {
    this.notify({ mode });
  }

  public setBrightness(brightness: number) {
    this.notify({ brightness: Math.max(0.1, Math.min(1.0, brightness)) });
  }

  public setSaturationBoost(saturationBoost: number) {
    this.notify({ saturationBoost: Math.max(1.0, Math.min(3.0, saturationBoost)) });
  }

  public setSmoothing(smoothing: number) {
    this.notify({ smoothing: Math.max(0.1, Math.min(1.0, smoothing)) });
  }

  // Adjust color saturation and brightness
  private enhanceColor(r: number, g: number, b: number): RGBColor {
    // Convert RGB to HSL
    let rf = r / 255;
    let gf = g / 255;
    let bf = b / 255;

    const max = Math.max(rf, gf, bf);
    const min = Math.min(rf, gf, bf);
    let h = 0;
    let s = 0;
    let l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rf:
          h = (gf - bf) / d + (gf < bf ? 6 : 0);
          break;
        case gf:
          h = (bf - rf) / d + 2;
          break;
        case bf:
          h = (rf - gf) / d + 4;
          break;
      }
      h /= 6;
    }

    // Boost saturation for mechanical keyboard LED clarity
    s = Math.min(1.0, s * this.state.saturationBoost);
    // Apply brightness scaling
    l = Math.max(0.05, Math.min(0.9, l * this.state.brightness));

    // Convert back to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;

    let nr = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
    let ng = Math.round(hue2rgb(p, q, h) * 255);
    let nb = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

    return {
      r: Math.max(0, Math.min(255, nr)),
      g: Math.max(0, Math.min(255, ng)),
      b: Math.max(0, Math.min(255, nb)),
    };
  }

  // Smooth transition between frames to avoid aggressive LED flickering
  private interpolate(matrixIdx: number, target: RGBColor): RGBColor {
    const prev = this.prevColors.get(matrixIdx) || target;
    const alpha = this.state.smoothing;
    const r = Math.round(prev.r + (target.r - prev.r) * alpha);
    const g = Math.round(prev.g + (target.g - prev.g) * alpha);
    const b = Math.round(prev.b + (target.b - prev.b) * alpha);
    const smoothed = { r, g, b };
    this.prevColors.set(matrixIdx, smoothed);
    return smoothed;
  }

  public async start(): Promise<boolean> {
    if (this.state.isActive) return true;

    try {
      webhid.log('[ScreenSync] Requesting screen display media permission...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 24, max: 30 },
          width: { ideal: 320 },
          height: { ideal: 180 },
        },
        audio: false,
      });

      this.mediaStream = stream;

      // Handle user stopping screen share via browser stop sharing button
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stop();
        };
      }

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      this.videoEl = video;

      this.notify({ isActive: true, error: null });
      webhid.log('[ScreenSync] Display capture stream established. Starting Ambilight LED pipeline...');

      // Notify rgbService that software streaming is active
      await rgbService.prepareDirectStreaming('Screen Ambilight');

      this.startLoop();
      return true;
    } catch (err: any) {
      const msg = err.message || 'Permission denied or browser error';
      webhid.log(`[ScreenSync Error] ${msg}`);
      this.notify({ isActive: false, error: msg });
      return false;
    }
  }

  public stop() {
    if (!this.state.isActive) return;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }

    this.prevColors.clear();
    this.notify({ isActive: false, fps: 0 });
    webhid.log('[ScreenSync] Ambilight screen sync stopped.');

    // Stop streaming in rgbService
    rgbService.stopSoftwareAnimation();
  }

  private startLoop() {
    const loopIntervalMs = 90; // ~11 FPS: optimal stability for USB HID Control Pipe throughput
    this.timerId = setInterval(() => {
      this.processFrame();
    }, loopIntervalMs);
  }

  private async processFrame() {
    if (!this.state.isActive || !this.videoEl || !this.ctx || !this.canvasEl || this.isProcessing) {
      return;
    }

    if (this.videoEl.readyState < 2) return;

    this.isProcessing = true;
    try {
      const cw = this.canvasEl.width;
      const ch = this.canvasEl.height;

      this.ctx.drawImage(this.videoEl, 0, 0, cw, ch);
      const imgData = this.ctx.getImageData(0, 0, cw, ch);
      const pixels = imgData.data;

      const colors: (RGBColor | null)[] = new Array(122).fill(null);

      if (this.state.mode === 'full-matrix') {
        // Map 75% physical matrix (Rows 0-5, Cols 0-16) across the screen
        LEOBOG_HI75C_LAYOUT.forEach((k) => {
          const normX = Math.min(0.98, Math.max(0.02, k.col / 16.0));
          const normY = Math.min(0.96, Math.max(0.04, k.row / 5.5));

          const px = Math.floor(normX * cw);
          const py = Math.floor(normY * ch);
          const idx = (py * cw + px) * 4;

          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];

          const enhanced = this.enhanceColor(r, g, b);
          colors[k.matrixIdx] = this.interpolate(k.matrixIdx, enhanced);
        });
      } else if (this.state.mode === 'ambient-zone') {
        // Sample Left, Center, Right zones
        const getZoneColor = (startX: number, endX: number): RGBColor => {
          let sr = 0,
            sg = 0,
            sb = 0,
            count = 0;
          for (let y = 0; y < ch; y += 4) {
            for (let x = startX; x < endX; x += 4) {
              const i = (y * cw + x) * 4;
              sr += pixels[i];
              sg += pixels[i + 1];
              sb += pixels[i + 2];
              count++;
            }
          }
          return count > 0
            ? { r: Math.round(sr / count), g: Math.round(sg / count), b: Math.round(sb / count) }
            : { r: 0, g: 229, b: 255 };
        };

        const leftCol = this.enhanceColor(
          getZoneColor(0, Math.floor(cw * 0.33)).r,
          getZoneColor(0, Math.floor(cw * 0.33)).g,
          getZoneColor(0, Math.floor(cw * 0.33)).b
        );
        const midCol = this.enhanceColor(
          getZoneColor(Math.floor(cw * 0.33), Math.floor(cw * 0.66)).r,
          getZoneColor(Math.floor(cw * 0.33), Math.floor(cw * 0.66)).g,
          getZoneColor(Math.floor(cw * 0.33), Math.floor(cw * 0.66)).b
        );
        const rightCol = this.enhanceColor(
          getZoneColor(Math.floor(cw * 0.66), cw).r,
          getZoneColor(Math.floor(cw * 0.66), cw).g,
          getZoneColor(Math.floor(cw * 0.66), cw).b
        );

        LEOBOG_HI75C_LAYOUT.forEach((k) => {
          const ratio = k.col / 16.0;
          let target: RGBColor;
          if (ratio < 0.5) {
            const factor = ratio * 2;
            target = {
              r: Math.round(leftCol.r * (1 - factor) + midCol.r * factor),
              g: Math.round(leftCol.g * (1 - factor) + midCol.g * factor),
              b: Math.round(leftCol.b * (1 - factor) + midCol.b * factor),
            };
          } else {
            const factor = (ratio - 0.5) * 2;
            target = {
              r: Math.round(midCol.r * (1 - factor) + rightCol.r * factor),
              g: Math.round(midCol.g * (1 - factor) + rightCol.g * factor),
              b: Math.round(midCol.b * (1 - factor) + rightCol.b * factor),
            };
          }
          colors[k.matrixIdx] = this.interpolate(k.matrixIdx, target);
        });
      } else {
        // Average glow: dominant full screen color
        let sr = 0,
          sg = 0,
          sb = 0,
          count = 0;
        for (let i = 0; i < pixels.length; i += 16) {
          sr += pixels[i];
          sg += pixels[i + 1];
          sb += pixels[i + 2];
          count++;
        }
        const avg = this.enhanceColor(
          Math.round(sr / count),
          Math.round(sg / count),
          Math.round(sb / count)
        );

        LEOBOG_HI75C_LAYOUT.forEach((k) => {
          colors[k.matrixIdx] = this.interpolate(k.matrixIdx, avg);
        });
      }

      // Transmit to keyboard LEDs via WebHID direct command
      await rgbService.sendDirectFrame(colors);

      // Track FPS
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsTime >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
        this.frameCount = 0;
        this.lastFpsTime = now;

        const centerSample = colors[20] || { r: 0, g: 229, b: 255 };
        const hex = `#${centerSample.r.toString(16).padStart(2, '0')}${centerSample.g
          .toString(16)
          .padStart(2, '0')}${centerSample.b.toString(16).padStart(2, '0')}`;

        this.notify({ fps, currentDominantColor: hex });
      }
    } catch {
      // Stream drop or frame skip
    } finally {
      this.isProcessing = false;
    }
  }
}

export const screenSyncService = new ScreenSyncService();
