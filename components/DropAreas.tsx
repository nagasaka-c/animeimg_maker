"use client";

import { useRef } from "react";
import DropArea from "@/components/DropArea";
import { useApp, newId } from "@/lib/state";
import { extractInputMetadata } from "@/lib/metadata";
import type { Area, TabKey } from "@/lib/types";

export default function DropAreas({ tab }: { tab: TabKey }) {
  const { state, setAreas, patchSettings, pushToast } = useApp();
  const areas = state[tab].areas;
  const metadataAppliedRef = useRef<Set<string>>(new Set());

  const update = (id: string, next: Area) => {
    setAreas(
      tab,
      areas.map((a) => (a.id === id ? next : a))
    );

    // Convert tab: when a fresh file is dropped into the FIRST area, auto-fill defaults
    // from input metadata (fps / loop). Resolution stays user-controlled.
    if (tab === "convert" && next.items.length === 1) {
      const isFirstArea = areas[0]?.id === id;
      if (!isFirstArea) return;
      const file = next.items[0].file;
      const key = `${id}:${file.name}:${file.size}`;
      if (metadataAppliedRef.current.has(key)) return;
      metadataAppliedRef.current.add(key);
      void (async () => {
        const meta = await extractInputMetadata(file);
        if (!meta) return;
        const patch: Partial<{ fps: number; loop: number }> = {};
        if (meta.fps !== null) patch.fps = meta.fps;
        if (meta.loop !== null) patch.loop = meta.loop;
        if (Object.keys(patch).length > 0) {
          patchSettings("convert", patch);
        }
      })();
    }
  };

  const add = () => {
    const next: Area = { id: newId("area"), items: [] };
    setAreas(tab, [...areas, next]);
  };

  const remove = (id: string) => {
    if (areas.length <= 1) return;
    const target = areas.find((a) => a.id === id);
    if (target) {
      for (const it of target.items) URL.revokeObjectURL(it.previewUrl);
    }
    setAreas(tab, areas.filter((a) => a.id !== id));
  };

  return (
    <div className="flex flex-col gap-4">
      {areas.map((area, i) => (
        <DropArea
          key={area.id}
          tab={tab}
          area={area}
          index={i}
          total={areas.length}
          onUpdate={(next) => update(area.id, next)}
          onShowError={(msg) => pushToast(msg, "error")}
          onAdd={add}
          onDelete={() => remove(area.id)}
        />
      ))}
    </div>
  );
}
