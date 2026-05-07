"use client";

import JSZip from "jszip";
import { extOf } from "./validators";
import type { OutputFormat } from "./types";

const mimeOf = (format: OutputFormat): string => {
  if (format === "apng") return "image/apng";
  if (format === "webp") return "image/webp";
  return "image/gif";
};

export type DownloadItem = {
  bytes: Uint8Array;
  format: OutputFormat;
  baseName: string;
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export const downloadResults = async (items: DownloadItem[]): Promise<void> => {
  if (items.length === 0) return;
  if (items.length === 1) {
    const it = items[0];
    const filename = `${sanitize(it.baseName)}${extOf(it.format)}`;
    const ab = it.bytes.buffer.slice(
      it.bytes.byteOffset,
      it.bytes.byteOffset + it.bytes.byteLength
    ) as ArrayBuffer;
    triggerDownload(new Blob([ab], { type: mimeOf(it.format) }), filename);
    return;
  }
  const zip = new JSZip();
  const usedNames = new Set<string>();
  for (const it of items) {
    let name = `${sanitize(it.baseName)}${extOf(it.format)}`;
    let n = 2;
    while (usedNames.has(name)) {
      name = `${sanitize(it.baseName)}_${n}${extOf(it.format)}`;
      n += 1;
    }
    usedNames.add(name);
    const ab = it.bytes.buffer.slice(
      it.bytes.byteOffset,
      it.bytes.byteOffset + it.bytes.byteLength
    ) as ArrayBuffer;
    zip.file(name, ab);
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  const stamp = timestamp();
  triggerDownload(blob, `animation-tool_${stamp}.zip`);
};

const sanitize = (s: string): string =>
  (s || "animation").replace(/[\\/:*?"<>|]/g, "_").trim() || "animation";

const timestamp = (): string => {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
};
