"use client";

import { useApp } from "@/lib/state";
import type { TabKey } from "@/lib/types";

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: "create", label: "制作", icon: "🎬" },
  { key: "convert", label: "変換", icon: "↻" },
];

export default function Tabs() {
  const { state, setActiveTab } = useApp();
  const active = state.activeTab;

  return (
    <div className="mx-auto mt-6 flex w-full max-w-2xl rounded-xl border border-border-soft overflow-hidden">
      {tabs.map((t) => {
        const isActive = active === t.key;
        const isCreate = t.key === "create";
        const activeBg = isCreate ? "bg-brand-create" : "bg-brand-convert";
        const inactiveText = isCreate ? "text-brand-create" : "text-brand-convert";
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            aria-pressed={isActive}
            className={[
              "flex-1 py-3 text-base font-semibold flex items-center justify-center gap-2 transition-colors",
              isActive
                ? `${activeBg} text-white`
                : `bg-white ${inactiveText} hover:bg-bg-soft`,
            ].join(" ")}
          >
            <span aria-hidden className="text-lg">
              {t.icon}
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
