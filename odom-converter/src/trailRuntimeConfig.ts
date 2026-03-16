export type TrailRuntimeConfig = {
  lifetimeSec: number;
  axisScale: number;
};

type TrailRuntimeConfigInput = {
  lifetimeSec?: unknown;
  axisScale?: unknown;
};

const DEFAULT_CONFIG: TrailRuntimeConfig = {
  lifetimeSec: 10,
  axisScale: 0.6,
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

export function normalizeTrailConfig(state: TrailRuntimeConfigInput | undefined): TrailRuntimeConfig {
  return {
    lifetimeSec: clamp(parseNumber(state?.lifetimeSec, DEFAULT_CONFIG.lifetimeSec), 0.1, 120),
    axisScale: clamp(parseNumber(state?.axisScale, DEFAULT_CONFIG.axisScale), 0.05, 10),
  };
}

export function getTrailConfig(): TrailRuntimeConfig {
  return currentConfig;
}

export function setTrailConfig(partial: TrailRuntimeConfigInput | undefined): TrailRuntimeConfig {
  currentConfig = normalizeTrailConfig({ ...currentConfig, ...partial });
  return currentConfig;
}
