"use client";

import { useCallback, useRef, useState } from "react";
import type { Area, InputItem, TabKey } from "@/lib/types";
import {
  isAcceptedForConvert,
  isAcceptedForCreate,
  naturalCompare,
} from "@/lib/validators";
import { newId } from "@/lib/state";

type Props = {
  tab: TabKey;
  area: Area;
  index: number;
  total: number;
  onUpdate: (next: Area) => void;
  onShowError: (message: string) => void;
  onAdd: () => void;
  onDelete: () => void;
};

const accentBorder = (tab: TabKey, active: boolean) => {
  if (tab === "create") return active ? "border-brand-create-strong" : "border-brand-create";
  return active ? "border-brand-convert-strong" : "border-brand-convert";
};

const accentText = (tab: TabKey) =>
  tab === "create" ? "text-brand-create" : "text-brand-convert";
const accentBg = (tab: TabKey) =>
  tab === "create" ? "bg-brand-create" : "bg-brand-convert";

export default function DropArea({
  tab,
  area,
  index,
  total,
  onUpdate,
  onShowError,
  onAdd,
  onDelete,
}: Props) {
  const [hover, setHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCreate = tab === "create";
  const hasItems = area.items.length > 0;
  const showAddButton = hasItems && index === total - 1;
  const canDelete = total > 1;

  const acceptList = useCallback(
    (files: File[]): { ok: File[]; rejected: File[] } => {
      const ok: File[] = [];
      const rejected: File[] = [];
      for (const f of files) {
        const accepted = isCreate ? isAcceptedForCreate(f) : isAcceptedForConvert(f);
        if (accepted) ok.push(f);
        else rejected.push(f);
      }
      return { ok, rejected };
    },
    [isCreate]
  );

  const ingestFiles = useCallback(
    (incoming: File[]) => {
      if (incoming.length === 0) return;
      const { ok, rejected } = acceptList(incoming);
      if (rejected.length > 0) {
        const accepted = isCreate
          ? "PNG / JPEG"
          : "APNG / WebP / GIF";
        onShowError(`${rejected.length}件のファイルは無視されました（${accepted}のみ受付）`);
      }
      if (ok.length === 0) return;

      let nextItems: InputItem[];
      if (isCreate) {
        const merged = [
          ...area.items,
          ...ok.map<InputItem>((f) => ({
            id: newId("item"),
            file: f,
            previewUrl: URL.createObjectURL(f),
          })),
        ];
        merged.sort((a, b) => naturalCompare(a.file.name, b.file.name));
        nextItems = merged;
      } else {
        if (ok.length > 1) {
          onShowError("変換タブは1ファイルのみ受付（先頭のみ採用しました）");
        }
        for (const it of area.items) URL.revokeObjectURL(it.previewUrl);
        nextItems = [
          {
            id: newId("item"),
            file: ok[0],
            previewUrl: URL.createObjectURL(ok[0]),
          },
        ];
      }
      onUpdate({ ...area, items: nextItems, error: undefined });
    },
    [acceptList, area, isCreate, onShowError, onUpdate]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setHover(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      ingestFiles(files);
    },
    [ingestFiles]
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      ingestFiles(files);
      e.target.value = "";
    },
    [ingestFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
      className={[
        "relative rounded-2xl border-2 bg-white p-4 transition-colors",
        accentBorder(tab, hover),
        hover ? "bg-bg-soft" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-3 pr-10">
        <div className={["text-sm font-semibold flex items-center gap-2", accentText(tab)].join(" ")}>
          <span aria-hidden>📁</span>
          画像を追加
          <span className="text-xs font-normal text-muted">
            （
            {isCreate
              ? "連番画像をドラッグ＆ドロップ"
              : "アニメーション画像を1ファイルだけドラッグ＆ドロップ"}
            ）
          </span>
        </div>
        {total > 1 && (
          <span className="text-xs text-muted whitespace-nowrap">エリア {index + 1} / {total}</span>
        )}
      </div>

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="このエリアを削除"
          className="absolute top-3 right-3 w-7 h-7 rounded-full text-muted hover:bg-bg-soft hover:text-foreground transition-colors flex items-center justify-center text-base"
        >
          ×
        </button>
      )}

      {hasItems ? (
        <div className="flex flex-wrap gap-3">
          {area.items.map((it, i) => (
            <Thumb
              key={it.id}
              it={it}
              index={i + 1}
              showIndex={isCreate}
              tab={tab}
            />
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={[
            "w-full min-h-[180px] flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-white/70 transition-colors",
            accentBorder(tab, false),
            "hover:bg-white",
            accentText(tab),
          ].join(" ")}
        >
          <span className="text-3xl" aria-hidden>⬆</span>
          <span className="text-sm font-medium">
            クリック または ドラッグ＆ドロップ
          </span>
          <span className="text-xs text-muted">
            {isCreate ? "PNG / JPEG（複数可）" : "APNG / WebP / GIF（1ファイル）"}
          </span>
        </button>
      )}

      {showAddButton && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onAdd}
            className={[
              "px-5 py-2 rounded-full text-sm font-semibold border transition-colors",
              tab === "create"
                ? "border-brand-create text-brand-create hover:bg-brand-create hover:text-white"
                : "border-brand-convert text-brand-convert hover:bg-brand-convert hover:text-white",
            ].join(" ")}
          >
            ＋ さらに追加
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple={isCreate}
        accept={
          isCreate
            ? ".png,.jpg,.jpeg,image/png,image/jpeg"
            : ".png,.apng,.webp,.gif,image/png,image/webp,image/gif"
        }
        onChange={onPick}
        className="hidden"
      />

      <span className={`hidden ${accentBg(tab)}`} aria-hidden />
    </div>
  );
}

function Thumb({
  it,
  index,
  showIndex,
  tab,
}: {
  it: InputItem;
  index: number;
  showIndex: boolean;
  tab: TabKey;
}) {
  return (
    <div className="w-28">
      <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-border-soft bg-bg-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={it.previewUrl}
          alt={it.file.name}
          className="w-full h-full object-cover"
        />
        {showIndex && (
          <span
            className={[
              "absolute top-1 right-1 text-[10px] text-white px-1.5 py-0.5 rounded",
              tab === "create" ? "bg-brand-create" : "bg-brand-convert",
            ].join(" ")}
          >
            {index}
          </span>
        )}
      </div>
      <div className="mt-1 text-[11px] text-muted truncate" title={it.file.name}>
        {it.file.name}
      </div>
    </div>
  );
}
