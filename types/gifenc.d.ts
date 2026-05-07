declare module "gifenc" {
  export type Palette = number[][];

  export type WriteFrameOptions = {
    palette?: Palette;
    delay?: number;
    transparent?: boolean;
    transparentIndex?: number;
    repeat?: number;
    dispose?: number;
    first?: boolean;
  };

  export interface GIFEncoderInstance {
    writeFrame(
      indexed: Uint8Array | Uint8ClampedArray,
      width: number,
      height: number,
      opts?: WriteFrameOptions
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    buffer: ArrayBuffer;
    bytesView(): Uint8Array;
    reset(): void;
  }

  export function GIFEncoder(): GIFEncoderInstance;

  export type QuantizeFormat = "rgb565" | "rgb444" | "rgba4444";

  export type QuantizeOptions = {
    format?: QuantizeFormat;
    oneBitAlpha?: boolean | number;
    clearAlpha?: boolean;
    clearAlphaThreshold?: number;
    clearAlphaColor?: number;
  };

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    opts?: QuantizeOptions
  ): Palette;

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: QuantizeFormat
  ): Uint8Array;

  export function nearestColorIndex(palette: Palette, pixel: number[]): number;
}
