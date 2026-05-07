/// <reference lib="webworker" />

import { drawableToRGBA, type RGBAFrame } from "../canvas-utils";

export type DecodedAnimation = {
  frames: RGBAFrame[];
  width: number;
  height: number;
  fps: number;
  loop: number;
};

const guessMime = (file: File): string => {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".apng") || lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
};

type ImageDecoderCtor = typeof globalThis extends { ImageDecoder: infer T } ? T : never;

export const decodeAnimation = async (
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<DecodedAnimation> => {
  const ID: ImageDecoderCtor | undefined = (globalThis as unknown as {
    ImageDecoder?: ImageDecoderCtor;
  }).ImageDecoder;
  if (!ID) {
    throw new Error("このブラウザは ImageDecoder API に未対応です（最新の Chrome / Edge / Safari / Firefox を使用してください）");
  }
  const type = guessMime(file);
  const decoder = new (ID as unknown as new (init: { data: ReadableStream<Uint8Array>; type: string }) => {
    tracks: { ready: Promise<void>; selectedTrack: { frameCount: number; repetitionCount?: number } | null };
    decode: (opts: { frameIndex: number }) => Promise<{ image: VideoFrame }>;
    close: () => void;
  })({
    data: file.stream(),
    type,
  });

  await decoder.tracks.ready;
  const track = decoder.tracks.selectedTrack;
  if (!track) throw new Error("入力画像のトラック情報を取得できませんでした");
  const total = Math.max(1, track.frameCount);

  const frames: RGBAFrame[] = [];
  const delays: number[] = [];
  let width = 0;
  let height = 0;

  for (let i = 0; i < total; i++) {
    onProgress?.(i, total);
    const { image } = await decoder.decode({ frameIndex: i });
    width = image.displayWidth || image.codedWidth;
    height = image.displayHeight || image.codedHeight;
    const durUs = image.duration ?? 100000;
    delays.push(Math.max(10, durUs / 1000));
    const bitmap = await createImageBitmap(image);
    image.close();
    const rgba = drawableToRGBA(bitmap, width, height);
    bitmap.close();
    frames.push(rgba);
  }
  decoder.close();

  const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
  const fps = Math.max(1, Math.round(1000 / Math.max(10, avg)));
  const rep = track.repetitionCount;
  const loop = rep === undefined || rep === Infinity ? 0 : Math.max(0, rep);

  return { frames, width, height, fps, loop };
};
