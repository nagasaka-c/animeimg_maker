export type TabKey = "create" | "convert";

export type OutputFormat = "apng" | "webp" | "gif";

export type InputItem = {
  id: string;
  file: File;
  previewUrl: string;
};

export type Area = {
  id: string;
  items: InputItem[];
  meta?: {
    frameCount?: number;
    fps?: number;
    loop?: number;
    width?: number;
    height?: number;
  };
  error?: string;
};

export type Settings = {
  resolution: number;
  fps: number;
  loop: number;
  format: OutputFormat;
  quality: number;
};

export type ProgressMessage = {
  areaId: string;
  phase: "decode" | "resize" | "encode" | "compress" | "done";
  current: number;
  total: number;
};
