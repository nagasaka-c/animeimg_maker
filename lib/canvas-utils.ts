/// <reference lib="webworker" />

export type RGBAFrame = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

const getOffscreenCtx = (width: number, height: number) => {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("OffscreenCanvas 2D コンテキストを取得できませんでした");
  return { canvas, ctx };
};

export const drawableToRGBA = (
  source: ImageBitmap | VideoFrame,
  outWidth: number,
  outHeight: number
): RGBAFrame => {
  const { ctx } = getOffscreenCtx(outWidth, outHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, outWidth, outHeight);
  // drawImage accepts ImageBitmap or VideoFrame
  ctx.drawImage(source as CanvasImageSource, 0, 0, outWidth, outHeight);
  const img = ctx.getImageData(0, 0, outWidth, outHeight);
  return { data: img.data, width: outWidth, height: outHeight };
};

export const rgbaToPNG = async (frame: RGBAFrame): Promise<Uint8Array> => {
  const { canvas, ctx } = getOffscreenCtx(frame.width, frame.height);
  const owned = new Uint8ClampedArray(frame.data); // copy into ArrayBuffer-backed array
  const img = new ImageData(owned, frame.width, frame.height);
  ctx.putImageData(img, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
};

export const computeOutSize = (
  width: number,
  height: number,
  resolutionPercent: number
): { width: number; height: number } => {
  const ratio = Math.max(0.01, Math.min(1, resolutionPercent / 100));
  const w = Math.max(1, Math.round(width * ratio));
  const h = Math.max(1, Math.round(height * ratio));
  return { width: w, height: h };
};
