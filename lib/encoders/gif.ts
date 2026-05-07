/// <reference lib="webworker" />

import { GIFEncoder, quantize, applyPalette } from "gifenc";
import type { RGBAFrame } from "../canvas-utils";

export const encodeGIF = (
  frames: RGBAFrame[],
  fps: number,
  loop: number,
  quality: number
): Uint8Array => {
  if (frames.length === 0) throw new Error("フレームがありません");
  const w = frames[0].width;
  const h = frames[0].height;
  const delay = Math.max(10, Math.round(1000 / Math.max(1, fps)));

  // Map quality (0-100) to palette size. Reserve 1 entry for the transparent color.
  const colors = Math.max(8, Math.min(256, Math.round(8 + (256 - 8) * (quality / 100))));

  const enc = GIFEncoder();
  for (let i = 0; i < frames.length; i++) {
    const rgba = frames[i].data;
    // oneBitAlpha: pixels with alpha < threshold collapse to a single transparent palette entry.
    const palette = quantize(rgba, colors, {
      format: "rgba4444",
      oneBitAlpha: true,
      clearAlpha: true,
      clearAlphaThreshold: 1,
    });
    const transparentIndex = palette.findIndex((c) => (c[3] ?? 255) === 0);
    const indexed = applyPalette(rgba, palette, "rgba4444");

    enc.writeFrame(indexed, w, h, {
      palette,
      delay,
      transparent: transparentIndex >= 0,
      transparentIndex: transparentIndex >= 0 ? transparentIndex : undefined,
      // Disposal=2 (Restore to background): clears the frame canvas before drawing the next frame,
      // so transparent pixels stay transparent instead of accumulating prior frame content.
      dispose: 2,
      repeat: i === 0 ? (loop === 0 ? 0 : Math.max(1, loop)) : undefined,
    });
  }
  enc.finish();
  return enc.bytes();
};
