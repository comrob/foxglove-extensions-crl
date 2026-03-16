import { ExtensionContext, Immutable, MessageEvent } from "@foxglove/extension";

import { initTrailControlPanel } from "./TrailControlPanel";
import { getTrailConfigForTopic, TrailRuntimeConfig } from "./trailRuntimeConfig";

type Quaternion = { x: number; y: number; z: number; w: number };

type PoseSnapshot = {
  position: { x: number; y: number; z: number };
  orientation: Quaternion;
};

type TrailEntitySnapshot = {
  id: string;
  timestamp: { sec: number; nsec: number };
  frame_id: string;
  pose: {
    position: { x: number; y: number; z: number };
    orientation: Quaternion;
  };
};

const lastEmittedPoseByTopic = new Map<string, PoseSnapshot>();
const trailHistoryByTopic = new Map<string, TrailEntitySnapshot[]>();
const lastAppliedConfigByTopic = new Map<string, TrailRuntimeConfig>();

type Odometry = {
  header: {
    stamp: {
      sec: number;
      nsec: number;
    };
    frame_id: string;
  };
  child_frame_id?: string;
  pose: {
    pose: {
      position: {
        x: number;
        y: number;
        z: number;
      };
      orientation: {
        x: number;
        y: number;
        z: number;
        w: number;
      };
    };
  };
};

function makeTrailEntityId(msg: Odometry): string {
  const { frame_id, stamp } = msg.header;
  return `odom-trail:${frame_id}:${stamp.sec}:${stamp.nsec}`;
}

function makeTrailLifetime(lifetimeSec: number) {
  const sec = Math.floor(lifetimeSec);
  const nsec = Math.round((lifetimeSec - sec) * 1_000_000_000);

  return {
    sec,
    nsec,
  };
}

function hexToRgb(hexColor: string): { r: number; g: number; b: number } {
  const hex = hexColor.replace("#", "");
  const value = Number.parseInt(hex, 16);
  const r = ((value >> 16) & 0xff) / 255;
  const g = ((value >> 8) & 0xff) / 255;
  const b = (value & 0xff) / 255;
  return { r, g, b };
}

function makeTrailArrow(axisScale: number, arrowColorHex: string, arrowAlpha: number) {
  const shaftLength = axisScale;
  const rgb = hexToRgb(arrowColorHex);

  return {
    shaft_length: shaftLength,
    shaft_diameter: shaftLength * 0.1,
    head_length: shaftLength * (1 / 3),
    head_diameter: shaftLength * 0.2,
    color: {
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      a: arrowAlpha,
    },
  };
}

function configsEqual(a: TrailRuntimeConfig, b: TrailRuntimeConfig): boolean {
  return (
    a.lifetimeSec === b.lifetimeSec &&
    a.axisScale === b.axisScale &&
    a.style === b.style &&
    a.arrowColorHex === b.arrowColorHex &&
    a.arrowAlpha === b.arrowAlpha &&
    a.minPositionDelta === b.minPositionDelta &&
    a.minRotationDeltaDeg === b.minRotationDeltaDeg
  );
}

function stampToNanoseconds(stamp: { sec: number; nsec: number }): number {
  return stamp.sec * 1_000_000_000 + stamp.nsec;
}

function pruneHistory(
  history: TrailEntitySnapshot[],
  nowStamp: { sec: number; nsec: number },
  lifetimeSec: number,
): TrailEntitySnapshot[] {
  const nowNs = stampToNanoseconds(nowStamp);
  const keepWindowNs = Math.round(lifetimeSec * 1_000_000_000);
  return history.filter((entry) => nowNs - stampToNanoseconds(entry.timestamp) <= keepWindowNs);
}

function makeTrailEntityFromSnapshot(snapshot: TrailEntitySnapshot, config: TrailRuntimeConfig) {
  return {
    timestamp: snapshot.timestamp,
    frame_id: snapshot.frame_id,
    id: snapshot.id,
    lifetime: makeTrailLifetime(config.lifetimeSec),
    frame_locked: true,
    arrows:
      config.style === "axes"
        ? makeAxesArrows(
            {
              header: {
                stamp: snapshot.timestamp,
                frame_id: snapshot.frame_id,
              },
              pose: {
                pose: snapshot.pose,
              },
            },
            config.axisScale,
          )
        : [
            {
              pose: snapshot.pose,
              ...makeTrailArrow(config.axisScale, config.arrowColorHex, config.arrowAlpha),
            },
          ],
  };
}

function multiplyQuat(a: Quaternion, b: Quaternion): Quaternion {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

function makeAxesArrows(msg: Odometry, axisScale: number) {
  const base = msg.pose.pose.orientation;
  const s = Math.SQRT1_2;

  const rotZPlus90: Quaternion = { x: 0, y: 0, z: s, w: s };
  const rotYMinus90: Quaternion = { x: 0, y: -s, z: 0, w: s };

  const qx = base;
  const qy = multiplyQuat(base, rotZPlus90);
  const qz = multiplyQuat(base, rotYMinus90);

  const thickness = axisScale * 0.08;
  const headLength = axisScale * 0.28;
  const headDiameter = axisScale * 0.18;

  return [
    {
      pose: { position: msg.pose.pose.position, orientation: qx },
      shaft_length: axisScale,
      shaft_diameter: thickness,
      head_length: headLength,
      head_diameter: headDiameter,
      color: { r: 1, g: 0.2, b: 0.2, a: 1 },
    },
    {
      pose: { position: msg.pose.pose.position, orientation: qy },
      shaft_length: axisScale,
      shaft_diameter: thickness,
      head_length: headLength,
      head_diameter: headDiameter,
      color: { r: 0.2, g: 1, b: 0.2, a: 1 },
    },
    {
      pose: { position: msg.pose.pose.position, orientation: qz },
      shaft_length: axisScale,
      shaft_diameter: thickness,
      head_length: headLength,
      head_diameter: headDiameter,
      color: { r: 0.2, g: 0.4, b: 1, a: 1 },
    },
  ];
}

function positionDistance(a: PoseSnapshot["position"], b: PoseSnapshot["position"]): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function rotationDistanceDeg(a: Quaternion, b: Quaternion): number {
  const dot = Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w);
  const clamped = Math.max(-1, Math.min(1, dot));
  const angleRad = 2 * Math.acos(clamped);
  return (angleRad * 180) / Math.PI;
}

function shouldEmitForTopic(topicName: string, msg: Odometry, minPositionDelta: number, minRotationDeltaDeg: number): boolean {
  const current: PoseSnapshot = {
    position: msg.pose.pose.position,
    orientation: msg.pose.pose.orientation,
  };

  const previous = lastEmittedPoseByTopic.get(topicName);
  if (!previous) {
    lastEmittedPoseByTopic.set(topicName, current);
    return true;
  }

  const movedEnough = positionDistance(current.position, previous.position) >= minPositionDelta;
  const rotatedEnough = rotationDistanceDeg(current.orientation, previous.orientation) >= minRotationDeltaDeg;

  const shouldEmit = movedEnough || rotatedEnough;
  if (shouldEmit) {
    lastEmittedPoseByTopic.set(topicName, current);
  }

  return shouldEmit;
}

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "🧭 Odometry Trail Settings",
    initPanel: initTrailControlPanel,
  });

  extensionContext.registerMessageConverter({
    type: "schema",
    fromSchemaName: "nav_msgs/msg/Odometry",
    toSchemaName: "geometry_msgs/msg/PoseStamped",
    converter: (msg: Odometry) => {
      return {
        header: msg.header,
        pose: msg.pose.pose,
      };
    },
  });

  extensionContext.registerMessageConverter({
    type: "schema",
    fromSchemaName: "nav_msgs/msg/Odometry",
    toSchemaName: "foxglove.SceneUpdate",
    converter: (msg: Odometry, event: Immutable<MessageEvent<Odometry>>) => {
      const config = getTrailConfigForTopic(event.topic);

      const previousConfig = lastAppliedConfigByTopic.get(event.topic);
      const configChanged = previousConfig != undefined && !configsEqual(previousConfig, config);
      lastAppliedConfigByTopic.set(event.topic, { ...config });

      let history = trailHistoryByTopic.get(event.topic) ?? [];
      history = pruneHistory(history, msg.header.stamp, config.lifetimeSec);
      trailHistoryByTopic.set(event.topic, history);

      const shouldEmit = shouldEmitForTopic(
        event.topic,
        msg,
        config.minPositionDelta,
        config.minRotationDeltaDeg,
      );

      if (shouldEmit) {
        const snapshot: TrailEntitySnapshot = {
          id: makeTrailEntityId(msg),
          timestamp: msg.header.stamp,
          frame_id: msg.header.frame_id,
          pose: msg.pose.pose,
        };
        history.push(snapshot);
        trailHistoryByTopic.set(event.topic, history);
      }

      if (history.length === 0) {
        return undefined;
      }

      const entities = history.map((entry) => makeTrailEntityFromSnapshot(entry, config));

      return {
        deletions: configChanged
          ? [
              {
                timestamp: msg.header.stamp,
                type: 1,
                id: "",
              },
            ]
          : [],
        entities,
      };
    },
  });
}
