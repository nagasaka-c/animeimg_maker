"use client";

import { useState } from "react";
import { AppProvider, useApp } from "@/lib/state";
import Header from "@/components/Header";
import Tabs from "@/components/Tabs";
import ResizableSplit from "@/components/ResizableSplit";
import DropAreas from "@/components/DropAreas";
import SettingsPanel from "@/components/SettingsPanel";
import SaveBar from "@/components/SaveBar";
import ToastStack from "@/components/ToastStack";
import { runSaveFlow } from "@/lib/save-flow";

export default function Home() {
  return (
    <AppProvider>
      <Shell />
      <ToastStack />
    </AppProvider>
  );
}

function Shell() {
  const { state, pushToast } = useApp();
  const tab = state.activeTab;
  const tabState = state[tab];

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const hasAnyInput = tabState.areas.some((a) => a.items.length > 0);

  const onSave = async () => {
    if (!hasAnyInput || processing) return;
    setProcessing(true);
    setProgress(0);
    try {
      await runSaveFlow({
        tab,
        areas: tabState.areas,
        settings: tabState.settings,
        onOverallProgress: setProgress,
      });
      pushToast("ダウンロードを開始しました", "info");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      pushToast(msg || "処理に失敗しました", "error");
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-white">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-5xl px-6 pb-6">
        <Tabs />
        <div className="mt-6">
          <ResizableSplit
            top={
              <div
                className={[
                  "min-h-full rounded-2xl p-4",
                  tab === "create" ? "bg-[#d3d6e6]" : "bg-[#fae1e1]",
                ].join(" ")}
              >
                <DropAreas tab={tab} />
              </div>
            }
            bottom={<SettingsPanel tab={tab} />}
          />
        </div>
      </main>
      <SaveBar
        tab={tab}
        disabled={!hasAnyInput}
        processing={processing}
        progress={progress}
        onClick={onSave}
      />
    </div>
  );
}
