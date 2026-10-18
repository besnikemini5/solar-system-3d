import { createScene, createRenderer, setSceneBackground } from "./scene.js";
import { createCamera } from "./camera.js";
import { createLights } from "./lights.js";
import { createSolarSystem } from "./planets.js";
import { animate } from "./animate.js";
import { setupInteraction } from "./interaction.js";
import { createLabels } from "./labels.js";

const $ = (id) => document.getElementById(id);

// Let the loading text paint before the (synchronous) texture generation starts
requestAnimationFrame(() => setTimeout(init, 0));

function init() {
  const scene = createScene();
  setSceneBackground(scene);
  const renderer = createRenderer();
  const { camera, controls } = createCamera(renderer);
  createLights(scene);
  const bodies = createSolarSystem(scene);

  // ===== SIMULATION CONTROLS =====
  const sim = { speed: 1, paused: false };
  const speed = $("speed");
  const speedValue = $("speedValue");
  const pauseBtn = $("pause");

  speed.addEventListener("input", () => {
    sim.speed = Number(speed.value);
    speedValue.textContent = `${sim.speed.toFixed(1)}×`;
  });

  function togglePause() {
    sim.paused = !sim.paused;
    pauseBtn.textContent = sim.paused ? "Play" : "Pause";
    pauseBtn.setAttribute("aria-pressed", String(sim.paused));
  }
  pauseBtn.addEventListener("click", togglePause);
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault();
      togglePause();
    }
  });

  // ===== INFO PANEL =====
  const panel = $("panel");
  function showInfo(body) {
    const { name, type, info } = body.data;
    $("panelName").textContent = name;
    $("panelType").textContent = type;
    $("panelDiameter").textContent = info.diameter;
    $("panelDistance").textContent = info.distance;
    $("panelPeriod").textContent = info.period;
    $("panelFact").textContent = info.fact;
    panel.hidden = false;
  }

  // On phones the panel is a bottom sheet, so shift the view to keep
  // the focused planet in the visible upper part of the screen.
  function updateViewOffset() {
    const w = window.innerWidth, h = window.innerHeight;
    if (!panel.hidden && w <= 640) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    else camera.clearViewOffset();
  }

  const focus = setupInteraction(camera, controls, renderer, bodies, {
    onFocus: (body) => { showInfo(body); updateViewOffset(); },
    onExit: () => { panel.hidden = true; updateViewOffset(); }
  });
  $("exitFocus").addEventListener("click", focus.exitFocus);

  // ===== LABELS =====
  const labelsEl = $("labels");
  const labels = createLabels(labelsEl, bodies, focus.focusOn);
  const labelsBtn = $("toggleLabels");
  labelsBtn.addEventListener("click", () => {
    const on = labelsEl.hidden;
    labels.setVisible(on);
    labelsBtn.textContent = on ? "Labels: on" : "Labels: off";
    labelsBtn.setAttribute("aria-pressed", String(on));
  });

  animate(renderer, scene, camera, controls, bodies, sim, {
    update: (dt) => focus.update(dt),
    afterControls: () => labels.update(camera)
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateViewOffset();
  });

  $("loading").remove();

  // handy for debugging / automated checks
  window.solarSystem = { bodies, camera, controls, focus, sim };
}
