/// <reference lib="webworker" />

import type { FromWorker, ToWorker, WorkerProgress } from "@/lib/worker-types";
import { computeOutSize, drawableToRGBA, type RGBAFrame } from "@/lib/canvas-utils";
import { decodeAnimation } from "@/lib/decoders/decode";
import { encodeAPNG } from "@/lib/encoders/apng";
import { encodeGIF } from "@/lib/encoders/gif";
import { encodeWebP } from "@/lib/encoders/webp";

declare const self: DedicatedWorkerGlobalScope;

const post = (msg: FromWorker, transfer?: Transferable[]) => {
  if (transfer && transfer.length > 0) self.postMessage(msg, transfer);
  else self.postMessage(msg);
};

const progress = (
  jobId: string,
  areaId: string,
  phase: WorkerProgress["phase"],
  current: number,
  total: number
) => post({ type: "progress", jobId, areaId, phase, current, total });

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const job = e.data;
  if (!job || job.type !== "job") return;
  try {
    const { frames, width, height } = await prepareFrames(job, (cur, total, phase) =>
      progress(job.jobId, job.areaId, phase, cur, total)
    );

    progress(job.jobId, job.areaId, "encode", 0, 1);
    let bytes: Uint8Array;
    if (job.settings.format === "apng") {
      bytes = encodeAPNG(frames, job.settings.fps, job.settings.loop);
    } else if (job.settings.format === "gif") {
      bytes = encodeGIF(frames, job.settings.fps, job.settings.loop, job.settings.quality);
    } else {
      bytes = await encodeWebP(
        frames,
        job.settings.fps,
        job.settings.loop,
        job.settings.quality
      );
    }
    progress(job.jobId, job.areaId, "encode", 1, 1);

    const buf = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    post(
      {
        type: "done",
        jobId: job.jobId,
        areaId: job.areaId,
        format: job.settings.format,
        bytes: buf,
        width,
        height,
        baseName: job.baseName,
      },
      [buf]
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({ type: "error", jobId: job.jobId, areaId: job.areaId, message });
  }
};

const prepareFrames = async (
  job: ToWorker,
  onProgress: (current: number, total: number, phase: WorkerProgress["phase"]) => void
): Promise<{ frames: RGBAFrame[]; width: number; height: number }> => {
  if (job.mode === "create") {
    if (job.files.length === 0) throw new Error("画像が1枚もありません");
    // Determine source size from first file
    const firstBitmap = await createImageBitmap(job.files[0]);
    const out = computeOutSize(firstBitmap.width, firstBitmap.height, job.settings.resolution);
    const frames: RGBAFrame[] = [];
    onProgress(0, job.files.length, "decode");
    for (let i = 0; i < job.files.length; i++) {
      const bmp = i === 0 ? firstBitmap : await createImageBitmap(job.files[i]);
      const f = drawableToRGBA(bmp, out.width, out.height);
      bmp.close();
      frames.push(f);
      onProgress(i + 1, job.files.length, "decode");
    }
    return { frames, width: out.width, height: out.height };
  }

  // convert mode: single file
  if (job.files.length !== 1) throw new Error("変換モードでは1ファイルのみ受付です");
  const decoded = await decodeAnimation(job.files[0], (c, t) =>
    onProgress(c, t, "decode")
  );
  const out = computeOutSize(decoded.width, decoded.height, job.settings.resolution);
  if (out.width === decoded.width && out.height === decoded.height) {
    return { frames: decoded.frames, width: out.width, height: out.height };
  }
  // Resize each frame
  const resized: RGBAFrame[] = [];
  onProgress(0, decoded.frames.length, "resize");
  for (let i = 0; i < decoded.frames.length; i++) {
    const f = decoded.frames[i];
    const owned = new Uint8ClampedArray(f.data);
    const data = new ImageData(owned, f.width, f.height);
    const src = await createImageBitmap(data);
    const out2 = drawableToRGBA(src, out.width, out.height);
    src.close();
    resized.push(out2);
    onProgress(i + 1, decoded.frames.length, "resize");
  }
  return { frames: resized, width: out.width, height: out.height };
};

// Mark as module
export {};
