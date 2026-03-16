import { PanelExtensionContext } from "@foxglove/extension";

import { normalizeTrailConfig, setTrailConfig } from "./trailRuntimeConfig";

type TrailPanelState = {
  lifetimeSec: number;
  axisScale: number;
  style: "arrow" | "axes";
  arrowColorHex: string;
  arrowAlpha: number;
};

type TrailPanelStateInput = {
  lifetimeSec?: unknown;
  axisScale?: unknown;
  style?: unknown;
  arrowColorHex?: unknown;
  arrowAlpha?: unknown;
};

const VAR_LIFETIME = "odomTrailLifetimeSec";
const VAR_AXIS_SCALE = "odomTrailAxisScale";
const VAR_STYLE = "odomTrailStyle";
const VAR_ARROW_COLOR = "odomTrailArrowColor";
const VAR_ARROW_ALPHA = "odomTrailArrowAlpha";

function normalizeState(state: TrailPanelStateInput | undefined): TrailPanelState {
  return normalizeTrailConfig(state);
}

function setSharedVariables(context: PanelExtensionContext, state: TrailPanelState): void {
  context.setVariable(VAR_LIFETIME, state.lifetimeSec);
  context.setVariable(VAR_AXIS_SCALE, state.axisScale);
  context.setVariable(VAR_STYLE, state.style);
  context.setVariable(VAR_ARROW_COLOR, state.arrowColorHex);
  context.setVariable(VAR_ARROW_ALPHA, state.arrowAlpha);
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
  help.textContent = "Adjust lifetime, style, and color for nav_msgs/msg/Odometry -> foxglove.SceneUpdate trail.";
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

  const styleLabel = document.createElement("label");
  styleLabel.textContent = "Trail style";
  styleLabel.style.display = "flex";
  styleLabel.style.flexDirection = "column";
  styleLabel.style.gap = "6px";

  const styleSelect = document.createElement("select");
  const arrowOption = document.createElement("option");
  arrowOption.value = "arrow";
  arrowOption.textContent = "Arrow";
  const axesOption = document.createElement("option");
  axesOption.value = "axes";
  axesOption.textContent = "Axes";
  styleSelect.appendChild(arrowOption);
  styleSelect.appendChild(axesOption);

  const colorLabel = document.createElement("label");
  colorLabel.textContent = "Arrow color";
  colorLabel.style.display = "flex";
  colorLabel.style.flexDirection = "column";
  colorLabel.style.gap = "6px";

  const colorInput = document.createElement("input");
  colorInput.type = "color";

  const alphaLabel = document.createElement("label");
  alphaLabel.textContent = "Arrow opacity (0..1)";
  alphaLabel.style.display = "flex";
  alphaLabel.style.flexDirection = "column";
  alphaLabel.style.gap = "6px";

  const alphaInput = document.createElement("input");
  alphaInput.type = "number";
  alphaInput.min = "0";
  alphaInput.max = "1";
  alphaInput.step = "0.05";

  const status = document.createElement("div");
  status.style.fontSize = "12px";
  status.style.opacity = "0.8";

  lifetimeLabel.appendChild(lifetimeInput);
  scaleLabel.appendChild(scaleInput);
  styleLabel.appendChild(styleSelect);
  colorLabel.appendChild(colorInput);
  alphaLabel.appendChild(alphaInput);

  root.appendChild(title);
  root.appendChild(help);
  root.appendChild(lifetimeLabel);
  root.appendChild(scaleLabel);
  root.appendChild(styleLabel);
  root.appendChild(colorLabel);
  root.appendChild(alphaLabel);
  root.appendChild(status);
  context.panelElement.appendChild(root);

  let panelState = normalizeState(context.initialState as TrailPanelStateInput | undefined);

  function render(state: TrailPanelState): void {
    lifetimeInput.value = state.lifetimeSec.toString();
    scaleInput.value = state.axisScale.toString();
    styleSelect.value = state.style;
    colorInput.value = state.arrowColorHex;
    alphaInput.value = state.arrowAlpha.toString();

    const arrowStyle = state.style === "arrow";
    colorInput.disabled = !arrowStyle;
    alphaInput.disabled = !arrowStyle;
    colorLabel.style.opacity = arrowStyle ? "1" : "0.5";
    alphaLabel.style.opacity = arrowStyle ? "1" : "0.5";

    status.textContent = `Current: style=${state.style}, lifetime=${state.lifetimeSec.toFixed(1)}s, scale=${state.axisScale.toFixed(2)}`;
  }

  function updateFromInputs(): void {
    panelState = normalizeState({
      lifetimeSec: lifetimeInput.value,
      axisScale: scaleInput.value,
      style: styleSelect.value,
      arrowColorHex: colorInput.value,
      arrowAlpha: alphaInput.value,
    });

    render(panelState);
    context.saveState(panelState);
    setTrailConfig(panelState);
    setSharedVariables(context, panelState);
  }

  lifetimeInput.addEventListener("change", updateFromInputs);
  scaleInput.addEventListener("change", updateFromInputs);
  styleSelect.addEventListener("change", updateFromInputs);
  colorInput.addEventListener("change", updateFromInputs);
  alphaInput.addEventListener("change", updateFromInputs);

  render(panelState);
  context.saveState(panelState);
  setTrailConfig(panelState);
  setSharedVariables(context, panelState);

  context.onRender = (renderState, done: () => void) => {
    const nextState = normalizeState({
      lifetimeSec: renderState.variables?.get(VAR_LIFETIME),
      axisScale: renderState.variables?.get(VAR_AXIS_SCALE),
      style: renderState.variables?.get(VAR_STYLE),
      arrowColorHex: renderState.variables?.get(VAR_ARROW_COLOR),
      arrowAlpha: renderState.variables?.get(VAR_ARROW_ALPHA),
    });

    if (
      nextState.lifetimeSec !== panelState.lifetimeSec ||
      nextState.axisScale !== panelState.axisScale ||
      nextState.style !== panelState.style ||
      nextState.arrowColorHex !== panelState.arrowColorHex ||
      nextState.arrowAlpha !== panelState.arrowAlpha
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
    styleSelect.removeEventListener("change", updateFromInputs);
    colorInput.removeEventListener("change", updateFromInputs);
    alphaInput.removeEventListener("change", updateFromInputs);
    root.remove();
  };
}
