import { ExtensionContext } from "@foxglove/extension";

import { initTrailControlPanel } from "./TrailControlPanel";
import { getTrailConfig } from "./trailRuntimeConfig";

const TRAIL_CONFIG = {
  color: {
    r: 0.1,
    g: 0.7,
    b: 1.0,
    a: 0.9,
  },
} as const;

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

function makeTrailArrow(axisScale: number) {
  const shaftLength = axisScale;

  return {
    shaft_length: shaftLength,
    shaft_diameter: shaftLength * 0.1,
    head_length: shaftLength * (1 / 3),
    head_diameter: shaftLength * 0.2,
    color: TRAIL_CONFIG.color,
  };
}

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Odometry trail controls",
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
    converter: (msg: Odometry) => {
      const { lifetimeSec, axisScale } = getTrailConfig();

      return {
        deletions: [],
        entities: [
          {
            timestamp: msg.header.stamp,
            frame_id: msg.header.frame_id,
            id: makeTrailEntityId(msg),
            lifetime: makeTrailLifetime(lifetimeSec),
            frame_locked: true,
            arrows: [
              {
                pose: msg.pose.pose,
                ...makeTrailArrow(axisScale),
              },
            ],
          },
        ],
      };
    },
  });
}
