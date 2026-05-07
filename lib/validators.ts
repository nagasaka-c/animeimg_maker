export const CREATE_ACCEPTED_MIMES = ["image/png", "image/jpeg"] as const;
export const CREATE_ACCEPTED_EXTS = [".png", ".jpg", ".jpeg"] as const;

export const CONVERT_ACCEPTED_EXTS = [".png", ".apng", ".webp", ".gif"] as const;

const lowerExt = (name: string): string => {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
};

export const isAcceptedForCreate = (file: File): boolean => {
  if (CREATE_ACCEPTED_MIMES.includes(file.type as (typeof CREATE_ACCEPTED_MIMES)[number])) return true;
  return CREATE_ACCEPTED_EXTS.includes(lowerExt(file.name) as (typeof CREATE_ACCEPTED_EXTS)[number]);
};

export const isAcceptedForConvert = (file: File): boolean => {
  return CONVERT_ACCEPTED_EXTS.includes(lowerExt(file.name) as (typeof CONVERT_ACCEPTED_EXTS)[number]);
};

export const naturalCompare = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export const stripExt = (name: string): string => {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(0, idx) : name;
};

export const extOf = (format: "apng" | "webp" | "gif"): string => {
  if (format === "apng") return ".png";
  if (format === "webp") return ".webp";
  return ".gif";
};
