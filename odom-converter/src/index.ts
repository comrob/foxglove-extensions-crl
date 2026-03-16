import { ExtensionContext } from "@foxglove/extension";

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

export function activate(extensionContext: ExtensionContext): void {
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
}
