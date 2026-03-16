import { PanelExtensionContext } from "@foxglove/extension";

import { normalizeTrailConfig, setTrailConfig } from "./trailRuntimeConfig";

type TrailPanelState = {
  lifetimeSec: number;
  axisScale: number;
};

type TrailPanelStateInput = {
  lifetimeSec?: unknown;
  axisScale?: unknown;
};

const VAR_LIFETIME = "odomTrailLifetimeSec";
const VAR_AXIS_SCALE = "odomTrailAxisScale";

function normalizeState(state: TrailPanelStateInput | undefined): TrailPanelState {
  return normalizeTrailConfig(state);
}

function setSharedVariables(context: PanelExtensionContext, state: TrailPanelState): void {
  context.setVariable(VAR_LIFETIME, state.lifetimeSec);
  context.setVariable(VAR_AXIS_SCALE, state.axisScale);
}

export function initTrailControlPanel(context: PanelExtensionContext): () => void {
  const root = document.createElement("div");
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "12px";
  root.style.padding = "12px";
  root.style.fontFamily = "system-ui, sans-serif";

  const title = document.createElement("h2");
  title.textContent = "Odometry trail controls";
  title.style.margin = "0";
  title.style.fontSize = "14px";

  const help = document.createElement("div");
  help.textContent = "Adjust lifetime and scale for nav_msgs/msg/Odometry -> foxglove.SceneUpdate trail.";
  help.style.fontSize = "12px";
  help.style.opacity = "0.85";

  const lifetimeLabel = document.createElement("label");
  lifetimeLabel.textContent = "Trail lifetime (seconds)";
  lifetimeLabel.style.display = "flex";
  lifetimeLabel.style.flexDirection = "column";
  lifetimeLabel.style.gap = "6px";

  const lifetimeInput = document.createElement("input");
  lifetimeInput.type = "number";
  lifetimeInput.min = "0.1";
  lifetimeInput.max = "120";
  lifetimeInput.step = "0.1";

  const scaleLabel = document.createElement("label");
  scaleLabel.textContent = "Trail axis scale";
  scaleLabel.style.display = "flex";
  scaleLabel.style.flexDirection = "column";
  scaleLabel.style.gap = "6px";

  const scaleInput = document.createElement("input");
  scaleInput.type = "number";
  scaleInput.min = "0.05";
  scaleInput.max = "10";
  scaleInput.step = "0.05";

  const status = document.createElement("div");
  status.style.fontSize = "12px";
  status.style.opacity = "0.8";

  lifetimeLabel.appendChild(lifetimeInput);
  scaleLabel.appendChild(scaleInput);

  root.appendChild(title);
  root.appendChild(help);
  root.appendChild(lifetimeLabel);
  root.appendChild(scaleLabel);
  root.appendChild(status);
  context.panelElement.appendChild(root);

  let panelState = normalizeState(context.initialState as TrailPanelStateInput | undefined);

  function render(state: TrailPanelState): void {
    lifetimeInput.value = state.lifetimeSec.toString();
    scaleInput.value = state.axisScale.toString();
    status.textContent = `Current: lifetime=${state.lifetimeSec.toFixed(1)}s, scale=${state.axisScale.toFixed(2)} (variable names: ${VAR_LIFETIME}, ${VAR_AXIS_SCALE})`;
  }

  function updateFromInputs(): void {
    panelState = normalizeState({ lifetimeSec: lifetimeInput.value, axisScale: scaleInput.value });

    render(panelState);
    context.saveState(panelState);
    setTrailConfig(panelState);
    setSharedVariables(context, panelState);
  }

  lifetimeInput.addEventListener("change", updateFromInputs);
  scaleInput.addEventListener("change", updateFromInputs);

  render(panelState);
  context.saveState(panelState);
  setTrailConfig(panelState);
  setSharedVariables(context, panelState);

  context.onRender = (renderState, done: () => void) => {
    const nextState = normalizeState({
      lifetimeSec: renderState.variables?.get(VAR_LIFETIME),
      axisScale: renderState.variables?.get(VAR_AXIS_SCALE),
    });

    if (
      nextState.lifetimeSec !== panelState.lifetimeSec ||
      nextState.axisScale !== panelState.axisScale
    ) {
      panelState = nextState;
      render(panelState);
      context.saveState(panelState);
      setTrailConfig(panelState);
    }

    done();
  };

  context.watch("variables");

  return () => {
    lifetimeInput.removeEventListener("change", updateFromInputs);
    scaleInput.removeEventListener("change", updateFromInputs);
    root.remove();
  };
}
