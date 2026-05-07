"use client";

import type { FromWorker, ToWorker } from "./worker-types";

type JobCallbacks = {
  onProgress: (phase: "decode" | "resize" | "encode", current: number, total: number) => void;
  resolve: (result: { bytes: Uint8Array; width: number; height: number; baseName: string }) => void;
  reject: (err: Error) => void;
};

let worker: Worker | null = null;
const callbacks = new Map<string, JobCallbacks>();

const ensureWorker = (): Worker => {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/encoder.worker.ts", import.meta.url), {
    type: "module",
    name: "animation-encoder",
  });
  worker.onmessage = (e: MessageEvent<FromWorker>) => {
    const msg = e.data;
    const cb = callbacks.get(msg.jobId);
    if (!cb) return;
    if (msg.type === "progress") {
      cb.onProgress(msg.phase, msg.current, msg.total);
    } else if (msg.type === "done") {
      callbacks.delete(msg.jobId);
      cb.resolve({
        bytes: new Uint8Array(msg.bytes),
        width: msg.width,
        height: msg.height,
        baseName: msg.baseName,
      });
    } else if (msg.type === "error") {
      callbacks.delete(msg.jobId);
      cb.reject(new Error(msg.message));
    }
  };
  worker.onerror = (e) => {
    // Reject all pending callbacks
    const err = new Error(e.message || "ワーカーでエラーが発生しました");
    for (const [, cb] of callbacks) cb.reject(err);
    callbacks.clear();
  };
  return worker;
};

export const runEncoderJob = (
  job: Omit<ToWorker, "type">,
  onProgress: (phase: "decode" | "resize" | "encode", current: number, total: number) => void
): Promise<{ bytes: Uint8Array; width: number; height: number; baseName: string }> => {
  return new Promise((resolve, reject) => {
    callbacks.set(job.jobId, { onProgress, resolve, reject });
    const w = ensureWorker();
    const message: ToWorker = { type: "job", ...job };
    w.postMessage(message);
  });
};
