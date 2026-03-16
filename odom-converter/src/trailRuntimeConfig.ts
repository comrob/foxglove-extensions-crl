export type TrailRuntimeConfig = {
  lifetimeSec: number;
  axisScale: number;
  style: "arrow" | "axes";
  arrowColorHex: string;
  arrowAlpha: number;
  minPositionDelta: number;
  minRotationDeltaDeg: number;
};

export type TrailRuntimeConfigMap = Record<string, TrailRuntimeConfig>;

type TrailRuntimeConfigInput = {
  lifetimeSec?: unknown;
  axisScale?: unknown;
  style?: unknown;
  arrowColorHex?: unknown;
  arrowAlpha?: unknown;
  minPositionDelta?: unknown;
  minRotationDeltaDeg?: unknown;
};

const DEFAULT_CONFIG: TrailRuntimeConfig = {
  lifetimeSec: 10,
  axisScale: 0.6,
  style: "arrow",
  arrowColorHex: "#19b3ff",
  arrowAlpha: 0.9,
  minPositionDelta: 0.03,
  minRotationDeltaDeg: 1,
};

const STORAGE_KEY = "odom-converter.trail-configs.v1";

let currentConfigs: TrailRuntimeConfigMap = {};
let didHydrateFromStorage = false;

function getStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function writeStoredConfigs(configs: TrailRuntimeConfigMap): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch {
  }
}

function hydrateFromStorage(): void {
  if (didHydrateFromStorage) {
    return;
  }

  didHydrateFromStorage = true;

  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    const rawValue = storage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    const parsed = JSON.parse(rawValue) as Record<string, TrailRuntimeConfigInput>;
    const next: TrailRuntimeConfigMap = {};
    for (const [topicName, config] of Object.entries(parsed ?? {})) {
      next[topicName] = normalizeTrailConfig(config);
    }
    currentConfigs = next;
  } catch {
  }
}

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
  const lifetime = parseNumber(state?.lifetimeSec, DEFAULT_CONFIG.lifetimeSec);

  return {
    lifetimeSec: Number.isFinite(lifetime) ? Math.max(0, lifetime) : DEFAULT_CONFIG.lifetimeSec,
    axisScale: clamp(parseNumber(state?.axisScale, DEFAULT_CONFIG.axisScale), 0.05, 10),
    style: parseStyle(state?.style, DEFAULT_CONFIG.style),
    arrowColorHex: parseColorHex(state?.arrowColorHex, DEFAULT_CONFIG.arrowColorHex),
    arrowAlpha: clamp(parseNumber(state?.arrowAlpha, DEFAULT_CONFIG.arrowAlpha), 0, 1),
    minPositionDelta: clamp(parseNumber(state?.minPositionDelta, DEFAULT_CONFIG.minPositionDelta), 0, 10),
    minRotationDeltaDeg: clamp(
      parseNumber(state?.minRotationDeltaDeg, DEFAULT_CONFIG.minRotationDeltaDeg),
      0,
      180,
    ),
  };
}

export function getTrailConfig(): TrailRuntimeConfig {
  return { ...DEFAULT_CONFIG };
}

export function getTrailConfigForTopic(topicName: string): TrailRuntimeConfig {
  hydrateFromStorage();
  return currentConfigs[topicName] ?? { ...DEFAULT_CONFIG };
}

export function setTrailConfigForTopic(
  topicName: string,
  partial: TrailRuntimeConfigInput | undefined,
): TrailRuntimeConfig {
  hydrateFromStorage();
  const current = getTrailConfigForTopic(topicName);
  const next = normalizeTrailConfig({ ...current, ...partial });
  currentConfigs = { ...currentConfigs, [topicName]: next };
  writeStoredConfigs(currentConfigs);
  return next;
}

export function replaceAllTrailConfigs(configs: Record<string, TrailRuntimeConfigInput> | undefined): void {
  hydrateFromStorage();

  if (configs == undefined) {
    return;
  }

  const next: TrailRuntimeConfigMap = {};

  for (const [topicName, config] of Object.entries(configs ?? {})) {
    next[topicName] = normalizeTrailConfig(config);
  }

  currentConfigs = next;
  writeStoredConfigs(currentConfigs);
}

export function getAllTrailConfigs(): TrailRuntimeConfigMap {
  hydrateFromStorage();
  return { ...currentConfigs };
}
