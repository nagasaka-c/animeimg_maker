"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Area, OutputFormat, Settings, TabKey } from "./types";

type TabState = {
  areas: Area[];
  settings: Settings;
};

type AppState = {
  activeTab: TabKey;
  create: TabState;
  convert: TabState;
};

const defaultSettings: Settings = {
  resolution: 100,
  fps: 30,
  loop: 0,
  format: "apng",
  quality: 80,
};

const initialState: AppState = {
  activeTab: "create",
  create: { areas: [{ id: "area-1", items: [] }], settings: { ...defaultSettings } },
  convert: { areas: [{ id: "area-1", items: [] }], settings: { ...defaultSettings } },
};

type Toast = { id: string; message: string; tone: "error" | "info" };

type Ctx = {
  state: AppState;
  toasts: Toast[];
  pushToast: (message: string, tone?: "error" | "info") => void;
  dismissToast: (id: string) => void;
  setActiveTab: (tab: TabKey) => void;
  setAreas: (tab: TabKey, areas: Area[]) => void;
  setSettings: (tab: TabKey, settings: Settings) => void;
  patchSettings: (tab: TabKey, patch: Partial<Settings>) => void;
};

const AppCtx = createContext<Ctx | null>(null);

let _id = 0;
export const newId = (prefix = "id") => `${prefix}-${++_id}-${Date.now().toString(36)}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = toastTimers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete toastTimers.current[id];
    }
  }, []);

  const pushToast = useCallback(
    (message: string, tone: "error" | "info" = "error") => {
      const id = newId("toast");
      setToasts((prev) => [...prev, { id, message, tone }]);
      toastTimers.current[id] = setTimeout(() => {
        dismissToast(id);
      }, 5000);
    },
    [dismissToast]
  );

  const setActiveTab = useCallback((tab: TabKey) => {
    setState((s) => ({ ...s, activeTab: tab }));
  }, []);

  const setAreas = useCallback((tab: TabKey, areas: Area[]) => {
    setState((s) => ({ ...s, [tab]: { ...s[tab], areas } }));
  }, []);

  const setSettings = useCallback((tab: TabKey, settings: Settings) => {
    setState((s) => ({ ...s, [tab]: { ...s[tab], settings } }));
  }, []);

  const patchSettings = useCallback((tab: TabKey, patch: Partial<Settings>) => {
    setState((s) => ({
      ...s,
      [tab]: { ...s[tab], settings: { ...s[tab].settings, ...patch } },
    }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      toasts,
      pushToast,
      dismissToast,
      setActiveTab,
      setAreas,
      setSettings,
      patchSettings,
    }),
    [state, toasts, pushToast, dismissToast, setActiveTab, setAreas, setSettings, patchSettings]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const v = useContext(AppCtx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}

export const formatLabel = (f: OutputFormat): string => {
  if (f === "apng") return "APNG";
  if (f === "webp") return "WebP";
  return "GIF";
};
