"use client";

import { runEncoderJob } from "./worker-client";
import { downloadResults, type DownloadItem } from "./download";
import { newId } from "./state";
import { stripExt } from "./validators";
import type { Area, Settings, TabKey } from "./types";

type ProgressMap = Record<string, { phase: string; current: number; total: number }>;

export type SaveFlowOptions = {
  tab: TabKey;
  areas: Area[];
  settings: Settings;
  onOverallProgress: (percent: number) => void;
};

const computeOverall = (map: ProgressMap, areaCount: number): number => {
  const segments = Object.values(map);
  const filled = segments.reduce((acc, s) => acc + (s.total > 0 ? s.current / s.total : 0), 0);
  return Math.min(100, Math.round((filled / Math.max(1, areaCount)) * 100));
};

const compressViaTinyPNG = async (bytes: Uint8Array): Promise<Uint8Array> => {
  // Browser Blob expects ArrayBuffer (not SharedArrayBuffer).
  const ab = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const res = await fetch("/api/tinypng", {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: new Blob([ab], { type: "image/png" }),
  });
  if (!res.ok) {
    let msg = `TinyPNG圧縮に失敗しました（HTTP ${res.status}）`;
    try {
      const j = (await res.json()) as { message?: string; error?: string };
      if (j?.message) msg = j.message;
      else if (j?.error) msg = j.error;
    } catch {
      // ignore
    }
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const ab2 = await res.arrayBuffer();
  return new Uint8Array(ab2);
};

const baseNameForArea = (tab: TabKey, area: Area): string => {
  if (area.items.length === 0) return "animation";
  const first = area.items[0].file.name;
  return stripExt(first);
};

export const runSaveFlow = async ({
  tab,
  areas,
  settings,
  onOverallProgress,
}: SaveFlowOptions): Promise<void> => {
  const targets = areas.filter((a) => a.items.length > 0);
  if (targets.length === 0) throw new Error("入力画像がありません");

  const progressMap: ProgressMap = {};
  for (const a of targets) progressMap[a.id] = { phase: "decode", current: 0, total: 1 };
  onOverallProgress(0);

  const items: DownloadItem[] = [];
  for (const area of targets) {
    const jobId = newId("job");
    const baseName = baseNameForArea(tab, area);
    const result = await runEncoderJob(
      {
        jobId,
        areaId: area.id,
        mode: tab,
        files: area.items.map((it) => it.file),
        settings,
        baseName,
      },
      (phase, current, total) => {
        // encode phase: cap at ~95% for the encode chunk before tinypng
        progressMap[area.id] = { phase, current, total };
        onOverallProgress(computeOverall(progressMap, targets.length));
      }
    );
    progressMap[area.id] = { phase: "encode", current: 1, total: 1 };
    onOverallProgress(computeOverall(progressMap, targets.length));

    let bytes = result.bytes;
    if (settings.format === "apng") {
      try {
        bytes = await compressViaTinyPNG(bytes);
      } catch (err) {
        // Quota exceeded → halt all processing (per spec)
        throw err;
      }
    }

    items.push({ bytes, format: settings.format, baseName: result.baseName });
  }

  onOverallProgress(99);
  await downloadResults(items);
  onOverallProgress(100);
};
