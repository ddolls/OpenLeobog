// 2.4GHz Wireless Receiver Protocol Client for Leobog Hi75c Pro
// Hardware Dongle: VID 0x3554, PID 0xFA09, UsagePage 0xFF02, Usage 0x0002
// Full frame length: 20 bytes (Report ID 0x13 + 19 bytes payload)

export const WIRELESS_VENDOR_ID = 0x3554;
export const WIRELESS_PRODUCT_ID = 0xfa09;
export const WIRELESS_USAGE_PAGE = 0xff02;
export const WIRELESS_USAGE = 0x0002;
export const WIRELESS_REPORT_ID = 0x13;

export const BODY_LENGTH = 19;
export const FULL_FRAME_LENGTH = 20;
export const PACKET_PAYLOAD_SIZE = 14;
export const CHECKSUM_INDEX = 18;
export const ERROR_BIT = 0x80;

export const WIRELESS_CMD = {
  PSD: 0x05,
  WRITE_KEYMAP: 0x01,
  READ_KEYMAP: 0x41,
  WRITE_RGB: 0x02,
  READ_RGB: 0x42,
  WRITE_CFG: 0x04,
  READ_CFG: 0x44,
  WRITE_PALETTE: 0x09,
  READ_PALETTE: 0x49,
  BATTERY_ALT: 0xca,
  BATTERY: 0x4a,
} as const;

export const KEYMAP_KEY_COUNT = 126;
export const KEYMAP_ENTRY_SIZE = 4;
export const KEYMAP_SIZE = KEYMAP_KEY_COUNT * KEYMAP_ENTRY_SIZE; // 504 bytes
export const CFG_SIZE = 128;
export const RGB_SIZE = KEYMAP_KEY_COUNT * 3; // 378 bytes
export const PALETTE_SIZE = 490;

export const WRITE_INTER_PACKET_GAP_MS = 15;
export const POST_WRITE_SETTLE_MS = 400;
export const READ_TIMEOUT_MS = 350;
export const READ_MAX_ATTEMPTS = 3;

export class DeviceAsleepError extends Error {
  constructor(message = 'Keyboard did not respond (device may be asleep)') {
    super(message);
    this.name = 'DeviceAsleepError';
  }
}

export class WirelessProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WirelessProtocolError';
  }
}

export interface ParsedPacket {
  cmd: number;
  packetCount: number;
  sub: number;
  hasError: boolean;
  pktIdx: number;
  len: number;
  payload: Uint8Array;
  checksum: number;
  rawBody: Uint8Array;
}

export function computeChecksum(body19: Uint8Array): number {
  let sum = WIRELESS_REPORT_ID;
  const limit = Math.min(CHECKSUM_INDEX, body19.length);
  for (let i = 0; i < limit; i++) {
    sum += body19[i];
  }
  return sum & 0xff;
}

export function verifyChecksum(body19: Uint8Array): boolean {
  if (body19.length !== BODY_LENGTH) {
    return false;
  }
  return body19[CHECKSUM_INDEX] === computeChecksum(body19);
}

export function encodePacket(
  cmd: number,
  sub: number,
  pktIdx: number,
  payload?: Uint8Array,
  packetCount = 1
): Uint8Array {
  const body = new Uint8Array(BODY_LENGTH);
  const len = payload ? Math.min(PACKET_PAYLOAD_SIZE, payload.length) : 0;
  body[0] = cmd & 0xff;
  body[1] = packetCount & 0xff;
  body[2] = pktIdx & 0xff;
  body[3] = ((sub & 0x0f) << 4) | (len & 0x0f);
  if (payload && len > 0) {
    body.set(payload.subarray(0, len), 4);
  }
  body[CHECKSUM_INDEX] = computeChecksum(body);
  return body;
}

export function encodePackets(cmd: number, sub: number, data: Uint8Array): Uint8Array[] {
  if (data.length === 0) {
    return [encodePacket(cmd, sub, 0, undefined, 1)];
  }
  const packetCount = Math.ceil(data.length / PACKET_PAYLOAD_SIZE);
  const packets: Uint8Array[] = [];
  for (let i = 0; i < packetCount; i++) {
    const start = i * PACKET_PAYLOAD_SIZE;
    const end = Math.min(start + PACKET_PAYLOAD_SIZE, data.length);
    packets.push(encodePacket(cmd, sub, i, data.subarray(start, end), packetCount));
  }
  return packets;
}

export function decodePacket(body19: Uint8Array): ParsedPacket | null {
  if (!verifyChecksum(body19)) {
    return null;
  }
  const rawCount = body19[1];
  const hasError = (rawCount & ERROR_BIT) !== 0;
  const packetCount = rawCount & ~ERROR_BIT;
  const sub = (body19[3] >> 4) & 0x0f;
  const len = body19[3] & 0x0f;
  if (len > PACKET_PAYLOAD_SIZE) {
    return null;
  }
  return {
    cmd: body19[0],
    packetCount,
    sub,
    hasError,
    pktIdx: body19[2],
    len,
    payload: body19.slice(4, 4 + len),
    checksum: body19[CHECKSUM_INDEX],
    rawBody: body19.slice(),
  };
}

export function reassemblePackets(
  packets: readonly ParsedPacket[],
  expectedCmd: number,
  expectedLength?: number
): Uint8Array | null {
  const byIndex = new Map<number, ParsedPacket>();
  let maxIdx = -1;

  for (const pkt of packets) {
    if (pkt.cmd !== expectedCmd || pkt.hasError) {
      continue;
    }
    if (!byIndex.has(pkt.pktIdx)) {
      byIndex.set(pkt.pktIdx, pkt);
      if (pkt.pktIdx > maxIdx) {
        maxIdx = pkt.pktIdx;
      }
    }
  }

  const requiredCount =
    expectedLength !== undefined
      ? Math.max(1, Math.ceil(expectedLength / PACKET_PAYLOAD_SIZE))
      : maxIdx + 1;

  if (requiredCount <= 0 || byIndex.size < requiredCount) {
    return null;
  }

  let totalBytes = 0;
  for (let idx = 0; idx < requiredCount; idx++) {
    const pkt = byIndex.get(idx);
    if (!pkt) {
      return null;
    }
    totalBytes += pkt.len;
  }

  if (expectedLength !== undefined && totalBytes < expectedLength) {
    return null;
  }

  const out = new Uint8Array(totalBytes);
  let offset = 0;
  for (let idx = 0; idx < requiredCount; idx++) {
    const pkt = byIndex.get(idx)!;
    out.set(pkt.payload, offset);
    offset += pkt.len;
  }

  return expectedLength !== undefined ? out.subarray(0, expectedLength) : out;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dataViewToUint8Array(view: DataView): Uint8Array {
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

export class WirelessProtocolClient {
  private readonly device: HIDDevice;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(device: HIDDevice) {
    this.device = device;
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  private async ensureOpen(): Promise<void> {
    if (!this.device.opened) {
      await this.device.open();
    }
  }

  private waitForReport(
    predicate: (pkt: ParsedPacket) => boolean,
    timeoutMs: number
  ): Promise<ParsedPacket | null> {
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.device.removeEventListener('inputreport', onReport);
          resolve(null);
        }
      }, timeoutMs);

      const onReport = (ev: HIDInputReportEvent) => {
        if (settled || ev.reportId !== WIRELESS_REPORT_ID) {
          return;
        }
        const parsed = decodePacket(dataViewToUint8Array(ev.data));
        if (!parsed || parsed.hasError || !predicate(parsed)) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        this.device.removeEventListener('inputreport', onReport);
        resolve(parsed);
      };

      this.device.addEventListener('inputreport', onReport);
    });
  }

  private collectReadAttempt(
    cmd: number,
    sub: number,
    expectedLength: number | undefined,
    collected: ParsedPacket[]
  ): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      let settled = false;

      const finish = (result: Uint8Array | null) => {
        if (!settled) {
          settled = true;
          clearTimeout(idleTimer);
          this.device.removeEventListener('inputreport', onReport);
          resolve(result);
        }
      };

      let idleTimer = setTimeout(() => {
        finish(reassemblePackets(collected, cmd, expectedLength));
      }, READ_TIMEOUT_MS);

      const resetIdle = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          finish(reassemblePackets(collected, cmd, expectedLength));
        }, READ_TIMEOUT_MS);
      };

      const onReport = (ev: HIDInputReportEvent) => {
        if (settled || ev.reportId !== WIRELESS_REPORT_ID) {
          return;
        }
        const parsed = decodePacket(dataViewToUint8Array(ev.data));
        if (!parsed || parsed.hasError || parsed.cmd !== cmd || parsed.sub !== sub) {
          return;
        }
        collected.push(parsed);
        const assembled = reassemblePackets(collected, cmd, expectedLength);
        if (assembled) {
          finish(assembled);
          return;
        }
        resetIdle();
      };

      this.device.addEventListener('inputreport', onReport);
      const req = encodePacket(cmd, sub, 0);
      this.device.sendReport(WIRELESS_REPORT_ID, req as unknown as BufferSource).catch(() => {
        finish(null);
      });
    });
  }

  public async readRaw(cmd: number, sub = 0, expectedLength?: number): Promise<Uint8Array> {
    return this.enqueue(async () => {
      await this.ensureOpen();
      const collected: ParsedPacket[] = [];

      for (let attempt = 0; attempt < READ_MAX_ATTEMPTS; attempt++) {
        const result = await this.collectReadAttempt(cmd, sub, expectedLength, collected);
        if (result) {
          return result;
        }
      }

      if (collected.length === 0) {
        throw new DeviceAsleepError();
      }
      throw new WirelessProtocolError(
        `Incomplete response for cmd 0x${cmd.toString(16)} (${collected.length} packets received)`
      );
    });
  }

  public async writeRaw(cmd: number, sub: number, data: Uint8Array): Promise<void> {
    return this.enqueue(async () => {
      await this.ensureOpen();
      const packets = encodePackets(cmd, sub, data);

      for (let i = 0; i < packets.length; i++) {
        const packet = packets[i];
        let acked = false;

        for (let attempt = 0; attempt < READ_MAX_ATTEMPTS; attempt++) {
          const ackPromise = this.waitForReport(
            (pkt) => pkt.cmd === cmd && pkt.pktIdx === i,
            READ_TIMEOUT_MS
          );
          await this.device.sendReport(WIRELESS_REPORT_ID, packet as unknown as BufferSource);
          const ack = await ackPromise;
          if (ack) {
            acked = true;
            break;
          }
        }

        if (!acked) {
          throw new DeviceAsleepError(
            `No ACK for write cmd 0x${cmd.toString(16)} packet ${i}`
          );
        }

        if (i < packets.length - 1) {
          await delay(WRITE_INTER_PACKET_GAP_MS);
        }
      }

      await delay(POST_WRITE_SETTLE_MS);
    });
  }

  // --- High-level 2.4G API ---

  public async readBattery(): Promise<{ percent: number; charging: boolean }> {
    const payload = await this.readRaw(WIRELESS_CMD.BATTERY, 0, 2);
    const percent = Math.max(0, Math.min(100, payload[0] ?? 0));
    const flags = payload[1] ?? 0;
    const charging = (flags & 0x10) !== 0;
    return { percent, charging };
  }

  public async readConfig(): Promise<Uint8Array> {
    return await this.readRaw(WIRELESS_CMD.READ_CFG, 0, CFG_SIZE);
  }

  public async writeConfig(config128: Uint8Array): Promise<void> {
    await this.writeRaw(WIRELESS_CMD.WRITE_CFG, 0, config128);
  }

  public async readKeymap(layer: 0 | 1): Promise<Uint8Array> {
    return await this.readRaw(WIRELESS_CMD.READ_KEYMAP, layer, KEYMAP_SIZE);
  }

  public async writeKeymap(layer: 0 | 1, keymap504: Uint8Array): Promise<void> {
    await this.writeRaw(WIRELESS_CMD.WRITE_KEYMAP, layer, keymap504);
  }

  public async readRgbMap(): Promise<Uint8Array> {
    return await this.readRaw(WIRELESS_CMD.READ_RGB, 0, RGB_SIZE);
  }

  public async writeRgbMap(rgb378: Uint8Array): Promise<void> {
    await this.writeRaw(WIRELESS_CMD.WRITE_RGB, 0, rgb378);
  }

  public async readPalette(): Promise<Uint8Array> {
    return await this.readRaw(WIRELESS_CMD.READ_PALETTE, 0, PALETTE_SIZE);
  }

  public async writePalette(palette490: Uint8Array): Promise<void> {
    await this.writeRaw(WIRELESS_CMD.WRITE_PALETTE, 0, palette490);
  }
}
