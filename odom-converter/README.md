# odom-converter

Foxglove extension that converts:

- `nav_msgs/msg/Odometry` -> `geometry_msgs/msg/PoseStamped`

This makes odometry topics usable in Foxglove panels that support pose schemas (for example, the 3D panel).

## Repository layout (recommended)

Keep this extension in:

- `foxglove_extensions/odom-converter/`

Keep the prebuilt distributable artifact in:

- `foxglove_extensions/odom-converter/releases/local.odom-converter-0.0.1.foxe`

## Activate on Ubuntu (from source)

1. Open a terminal and go to this project directory (`odom-converter`).
2. Install dependencies:
   - `npm install`
3. Build the extension:
   - `npm run build`
4. Install into your local Foxglove extensions folder:
   - `npm run local-install`
5. Restart Foxglove Desktop.
6. Open your layout and add/select your odometry topic in a panel that supports poses (for example 3D or Raw Messages), using the converted schema `geometry_msgs/msg/PoseStamped`.

Installed extension location on Ubuntu:

- `~/.foxglove-studio/extensions/local.odom-converter-0.0.1/`

## Verify it is active

1. In Foxglove Desktop, open **Settings** -> **Extensions**.
2. Confirm `Odometry to Pose Converter` is listed and enabled.
3. Load data containing `nav_msgs/msg/Odometry`.
4. In a panel schema picker, choose/confirm the converted output `geometry_msgs/msg/PoseStamped`.

## Can this work without installing npm?

Yes, but only if you install a **prebuilt extension artifact**.

### Option A: Install a prebuilt `.foxe` package (recommended)

Use the committed artifact from this repo:

- `odom-converter/releases/local.odom-converter-0.0.1.foxe`

In Foxglove Desktop, install it through:

1. Click your **user icon** (top right).
2. Open **Extensions**.
3. Click **Install Local Extension...**.
4. Select the `.foxe` file.
5. Restart Foxglove Desktop.

### Option B: Copy a prebuilt unpacked extension directory

If someone provides an already-built folder containing at least:

- `package.json`
- `README.md`
- `CHANGELOG.md`
- `dist/extension.js`

copy it to:

- `~/.foxglove-studio/extensions/<publisher>.<name>-<version>/`

then restart Foxglove Desktop.

### Important limitation

If you only have TypeScript source code (this repository) and no prebuilt files, you need Node.js tooling to build it at least once.

## Converter behavior

The converter maps fields directly:

- `header = odom.header`
- `pose = odom.pose.pose`

No frame transforms are created by this extension. Your TF tree and timestamps must still be valid for 3D visualization.
