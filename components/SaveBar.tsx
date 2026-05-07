"use client";

import type { TabKey } from "@/lib/types";

type Props = {
  tab: TabKey;
  disabled: boolean;
  processing: boolean;
  progress: number; // 0..100
  onClick: () => void;
};

export default function SaveBar({ tab, disabled, processing, progress, onClick }: Props) {
  const baseColor =
    tab === "create" ? "bg-brand-create" : "bg-brand-convert";
  const fillColor =
    tab === "create" ? "bg-brand-create-strong" : "bg-brand-convert-strong";

  return (
    <div className="sticky bottom-0 left-0 right-0 mt-6 bg-white border-t border-border-soft pt-4 pb-6">
      <div className="mx-auto max-w-5xl px-6">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || processing}
          className={[
            "relative w-full overflow-hidden rounded-xl py-4 text-white font-semibold flex items-center justify-center gap-2 transition-opacity",
            disabled || processing ? "opacity-80 cursor-not-allowed" : "hover:opacity-95",
            baseColor,
          ].join(" ")}
        >
          {processing && (
            <div
              className={`absolute inset-y-0 left-0 ${fillColor} transition-[width] duration-200`}
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              aria-hidden
            />
          )}
          <span className="relative flex items-center gap-2">
            <span aria-hidden>⬇</span>
            {processing ? `処理中… ${Math.round(progress)}%` : "保存する"}
          </span>
        </button>
      </div>
    </div>
  );
}
