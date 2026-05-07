"use client";

import { useApp } from "@/lib/state";
import type { OutputFormat, TabKey } from "@/lib/types";

const formats: { value: OutputFormat; label: string }[] = [
  { value: "apng", label: "APNG" },
  { value: "webp", label: "WebP" },
  { value: "gif", label: "GIF" },
];

const accentText = (tab: TabKey) =>
  tab === "create" ? "text-brand-create" : "text-brand-convert";

export default function SettingsPanel({ tab }: { tab: TabKey }) {
  const { state, patchSettings } = useApp();
  const settings = state[tab].settings;

  return (
    <div className="w-full rounded-2xl border border-border-soft bg-white p-5">
      <div className={["mb-4 text-sm font-semibold flex items-center gap-2", accentText(tab)].join(" ")}>
        <span aria-hidden>⚙</span>
        変換設定
      </div>

      <div className="divide-y divide-border-soft">
        <Row label="解像度" hint="（アスペクト比は入力画像に従います）">
          <NumberInput
            value={settings.resolution}
            onChange={(v) => patchSettings(tab, { resolution: clamp(v, 0, 100) })}
            suffix="%"
            hintRight="(0〜100%)"
            min={0}
            max={100}
          />
        </Row>

        <Row label="フレームレート">
          <NumberInput
            value={settings.fps}
            onChange={(v) => patchSettings(tab, { fps: Math.max(1, Math.min(240, v)) })}
            suffix="FPS"
            hintRight="(1〜240 FPS)"
            min={1}
            max={240}
          />
        </Row>

        <Row label="ループ回数">
          <NumberInput
            value={settings.loop}
            onChange={(v) => patchSettings(tab, { loop: Math.max(0, v) })}
            suffix="回"
            hintRight="0で無限ループ"
            min={0}
          />
        </Row>

        <Row label="出力形式">
          <select
            value={settings.format}
            onChange={(e) => patchSettings(tab, { format: e.target.value as OutputFormat })}
            className="rounded-md border border-border-soft px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-create/40"
          >
            {formats.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Row>

        {settings.format !== "apng" && (
          <Row label="品質レベル" hint="（Lossy圧縮）">
            <div className="flex items-center gap-3 w-full">
              <input
                type="range"
                min={0}
                max={100}
                value={settings.quality}
                onChange={(e) =>
                  patchSettings(tab, { quality: clamp(Number(e.target.value), 0, 100) })
                }
                className="flex-1 accent-brand-create"
              />
              <NumberInput
                value={settings.quality}
                onChange={(v) => patchSettings(tab, { quality: clamp(v, 0, 100) })}
                suffix="%"
                hintRight="(0〜100%)"
                min={0}
                max={100}
                width={80}
              />
            </div>
            <div className="text-xs text-muted mt-1">
              値が高いほど高品質・大きいファイルになります
            </div>
          </Row>
        )}
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3 grid grid-cols-12 gap-3 items-center">
      <div className="col-span-12 sm:col-span-5 text-sm">
        <div className="font-medium text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      <div className="col-span-12 sm:col-span-7">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  suffix,
  hintRight,
  min,
  max,
  width,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  hintRight?: string;
  min?: number;
  max?: number;
  width?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center rounded-md border border-border-soft bg-white px-2 focus-within:ring-2 focus-within:ring-brand-create/40"
        style={{ width: width ?? 120 }}
      >
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full py-2 text-sm text-right outline-none bg-transparent"
        />
        {suffix && <span className="ml-1 text-xs text-muted">{suffix}</span>}
      </div>
      {hintRight && <span className="text-xs text-muted">{hintRight}</span>}
    </div>
  );
}
