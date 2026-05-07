"use client";

import { useApp } from "@/lib/state";

export default function ToastStack() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={[
            "rounded-lg shadow-lg px-4 py-3 text-sm flex items-start gap-3",
            t.tone === "error" ? "bg-red-50 text-red-800 border border-red-200" : "bg-blue-50 text-blue-800 border border-blue-200",
          ].join(" ")}
        >
          <span className="flex-1 whitespace-pre-wrap break-words">{t.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="閉じる"
            className="text-current opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
