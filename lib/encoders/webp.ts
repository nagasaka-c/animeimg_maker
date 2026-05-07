/// <reference lib="webworker" />

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import type { RGBAFrame } from "../canvas-utils";
import { rgbaToPNG } from "../canvas-utils";

const FFMPEG_VERSION = "0.12.6";
const FFMPEG_BASE = `https://unpkg.com/@ffmpeg/core@${FFMPEG_VERSION}/dist/umd`;

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;

const getFFmpeg = async (
  onProgress?: (msg: string) => void
): Promise<FFmpeg> => {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoading) return ffmpegLoading;
  ffmpegLoading = (async () => {
    const ffmpeg = new FFmpeg();
    onProgress?.("ffmpeg.wasm 読み込み中…");
    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();
  return ffmpegLoading;
};

export const encodeWebP = async (
  frames: RGBAFrame[],
  fps: number,
  loop: number,
  quality: number,
  onPhase?: (msg: string) => void
): Promise<Uint8Array> => {
  if (frames.length === 0) throw new Error("フレームがありません");
  const ffmpeg = await getFFmpeg(onPhase);

  const inputs: string[] = [];
  for (let i = 0; i < frames.length; i++) {
    const name = `f_${String(i).padStart(5, "0")}.png`;
    const png = await rgbaToPNG(frames[i]);
    await ffmpeg.writeFile(name, png);
    inputs.push(name);
  }

  const args = [
    "-framerate",
    String(Math.max(1, fps)),
    "-i",
    "f_%05d.png",
    "-c:v",
    "libwebp",
    "-lossless",
    "0",
    "-q:v",
    String(Math.max(0, Math.min(100, quality))),
    "-loop",
    String(Math.max(0, loop)),
    "-an",
    "-fps_mode",
    "passthrough",
    "-y",
    "out.webp",
  ];
  onPhase?.("WebP エンコード中…");
  await ffmpeg.exec(args);
  const data = await ffmpeg.readFile("out.webp");
  // cleanup
  for (const name of inputs) {
    try {
      await ffmpeg.deleteFile(name);
    } catch {
      // ignore
    }
  }
  try {
    await ffmpeg.deleteFile("out.webp");
  } catch {
    // ignore
  }
  if (typeof data === "string") {
    throw new Error("WebPエンコード結果の取得に失敗しました");
  }
  const bytes = new Uint8Array(data as Uint8Array);
  // Force every ANMF frame's disposal=1 (background) so that transparent pixels
  // do not accumulate the previous frame. ffmpeg/libwebp leaves the default at 0.
  patchAnmfDispose(bytes);
  return bytes;
};

const tagAt = (bytes: Uint8Array, p: number): string =>
  String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]);

const patchAnmfDispose = (bytes: Uint8Array): void => {
  if (bytes.length < 12) return;
  if (tagAt(bytes, 0) !== "RIFF" || tagAt(bytes, 8) !== "WEBP") return;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 12;
  while (p + 8 <= bytes.length) {
    const t = tagAt(bytes, p);
    const size = dv.getUint32(p + 4, true);
    const dataStart = p + 8;
    if (dataStart + size > bytes.length) return;
    if (t === "ANMF") {
      // ANMF header layout (16 bytes): X(3) Y(3) W-1(3) H-1(3) Duration(3) Flags(1)
      const flagsOffset = dataStart + 15;
      // bit0 = Disposal (0=none, 1=background)
      // bit1 = Blending (0=alpha blend, 1=do-not-blend)
      // We want disposal=1, blending=0 → 0b00000001
      bytes[flagsOffset] = (bytes[flagsOffset] & 0xfc) | 0x01;
    }
    const padded = size + (size & 1);
    p = dataStart + padded;
  }
};
