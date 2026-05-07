/// <reference lib="webworker" />

// upng-js has no bundled types
// @ts-expect-error - no types
import UPNG from "upng-js";
import type { RGBAFrame } from "../canvas-utils";

export const encodeAPNG = (
  frames: RGBAFrame[],
  fps: number,
  loop: number
): Uint8Array => {
  if (frames.length === 0) throw new Error("フレームがありません");
  const w = frames[0].width;
  const h = frames[0].height;
  const buffers = frames.map((f) => f.data.buffer.slice(0)) as ArrayBuffer[];
  const delayMs = Math.max(1, Math.round(1000 / Math.max(1, fps)));
  const dels = new Array(frames.length).fill(delayMs);
  // UPNG.encode(imgs, w, h, cnum, dels)
  // cnum = 0 = lossless
  const ab: ArrayBuffer = UPNG.encode(buffers, w, h, 0, dels);

  // UPNG always sets num_plays = 0 (infinite). Patch acTL chunk if loop != 0.
  return loop === 0 ? new Uint8Array(ab) : patchApngLoop(new Uint8Array(ab), loop);
};

// Walks PNG chunks and rewrites the num_plays field of acTL to the desired loop count.
const patchApngLoop = (bytes: Uint8Array, loop: number): Uint8Array => {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // PNG signature is 8 bytes
  let p = 8;
  while (p + 8 <= bytes.byteLength) {
    const len = dv.getUint32(p);
    const typeStart = p + 4;
    const type = String.fromCharCode(
      bytes[typeStart],
      bytes[typeStart + 1],
      bytes[typeStart + 2],
      bytes[typeStart + 3]
    );
    const dataStart = p + 8;
    if (type === "acTL") {
      // acTL: num_frames (4) + num_plays (4)
      dv.setUint32(dataStart + 4, loop >>> 0);
      // recompute CRC over (type bytes + data)
      const crc = crc32(bytes.subarray(typeStart, dataStart + len));
      dv.setUint32(dataStart + len, crc);
      return bytes;
    }
    p = dataStart + len + 4;
  }
  return bytes;
};

let CRC_TABLE: Uint32Array | null = null;
const crcTable = (): Uint32Array => {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  CRC_TABLE = t;
  return t;
};

const crc32 = (buf: Uint8Array): number => {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
