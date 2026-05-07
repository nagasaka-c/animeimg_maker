"use client";

const guessMime = (file: File): string => {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".apng") || lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
};

export type InputMetadata = {
  width: number;
  height: number;
  frameCount: number;
  fps: number | null;
  loop: number | null;
};

type ImgDecoderTrack = {
  frameCount: number;
  repetitionCount?: number;
};

type ImgDecoderInstance = {
  tracks: { ready: Promise<void>; selectedTrack: ImgDecoderTrack | null };
  decode: (opts: { frameIndex: number }) => Promise<{ image: VideoFrame }>;
  close: () => void;
};

type ImgDecoderCtor = new (init: {
  data: ReadableStream<Uint8Array>;
  type: string;
}) => ImgDecoderInstance;

export const extractInputMetadata = async (
  file: File
): Promise<InputMetadata | null> => {
  const ID = (globalThis as unknown as { ImageDecoder?: ImgDecoderCtor })
    .ImageDecoder;
  if (!ID) return null;
  try {
    const decoder = new ID({ data: file.stream(), type: guessMime(file) });
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;
    if (!track) {
      decoder.close();
      return null;
    }
    const { image } = await decoder.decode({ frameIndex: 0 });
    const w = image.displayWidth || image.codedWidth;
    const h = image.displayHeight || image.codedHeight;
    const dur = image.duration ?? null;
    image.close();
    decoder.close();
    const fps =
      typeof dur === "number" && dur > 0
        ? Math.max(1, Math.round(1_000_000 / dur))
        : null;
    const rep = track.repetitionCount;
    const loop =
      rep === undefined
        ? null
        : rep === Infinity
        ? 0
        : Math.max(0, rep as number);
    return {
      width: w,
      height: h,
      frameCount: track.frameCount,
      fps,
      loop,
    };
  } catch {
    return null;
  }
};
