export type TrailRuntimeConfig = {
  lifetimeSec: number;
  axisScale: number;
  style: "arrow" | "axes";
  arrowColorHex: string;
  arrowAlpha: number;
};

type TrailRuntimeConfigInput = {
  lifetimeSec?: unknown;
  axisScale?: unknown;
  style?: unknown;
  arrowColorHex?: unknown;
  arrowAlpha?: unknown;
};

const DEFAULT_CONFIG: TrailRuntimeConfig = {
  lifetimeSec: 10,
  axisScale: 0.6,
  style: "arrow",
  arrowColorHex: "#19b3ff",
  arrowAlpha: 0.9,
};

let currentConfig: TrailRuntimeConfig = { ...DEFAULT_CONFIG };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function parseStyle(value: unknown, fallback: TrailRuntimeConfig["style"]): TrailRuntimeConfig["style"] {
  return value === "axes" || value === "arrow" ? value : fallback;
}

function parseColorHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : fallback;
}

export function normalizeTrailConfig(state: TrailRuntimeConfigInput | undefined): TrailRuntimeConfig {
  return {
    lifetimeSec: clamp(parseNumber(state?.lifetimeSec, DEFAULT_CONFIG.lifetimeSec), 0.1, 120),
    axisScale: clamp(parseNumber(state?.axisScale, DEFAULT_CONFIG.axisScale), 0.05, 10),
    style: parseStyle(state?.style, DEFAULT_CONFIG.style),
    arrowColorHex: parseColorHex(state?.arrowColorHex, DEFAULT_CONFIG.arrowColorHex),
    arrowAlpha: clamp(parseNumber(state?.arrowAlpha, DEFAULT_CONFIG.arrowAlpha), 0, 1),
  };
}

export function getTrailConfig(): TrailRuntimeConfig {
  return currentConfig;
}

export function setTrailConfig(partial: TrailRuntimeConfigInput | undefined): TrailRuntimeConfig {
  currentConfig = normalizeTrailConfig({ ...currentConfig, ...partial });
  return currentConfig;
}
