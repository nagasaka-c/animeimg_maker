import type { OutputFormat, Settings } from "./types";

export type JobMode = "create" | "convert";

export type WorkerJob = {
  type: "job";
  jobId: string;
  areaId: string;
  mode: JobMode;
  files: File[];
  settings: Settings;
  baseName: string;
};

export type WorkerProgress = {
  type: "progress";
  jobId: string;
  areaId: string;
  phase: "decode" | "resize" | "encode";
  current: number;
  total: number;
};

export type WorkerDone = {
  type: "done";
  jobId: string;
  areaId: string;
  format: OutputFormat;
  bytes: ArrayBuffer;
  width: number;
  height: number;
  baseName: string;
};

export type WorkerError = {
  type: "error";
  jobId: string;
  areaId: string;
  message: string;
};

export type FromWorker = WorkerProgress | WorkerDone | WorkerError;
export type ToWorker = WorkerJob;
