import * as THREE from "../vendor/three/three.module.js";
import { getOverviewPosition } from "./camera.js";

// How quickly the camera catches up during a fly-to (higher = faster)
const FLY_RATE = 3.5;

export function setupInteraction(camera, controls, renderer, bodies, { onFocus, onExit }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const meshes = Object.values(bodies).map((b) => b.mesh);

  const state = { focused: null, mode: "free" }; // free | flyTo | follow | flyHome
  const bodyPos = new THREE.Vector3();
  const lastPos = new THREE.Vector3();
  const offset = new THREE.Vector3(); // camera position relative to the focused body
  const desired = new THREE.Vector3();
  const home = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const screen = new THREE.Vector3();

  function focusOn(body) {
    state.focused = body;
    state.mode = "flyTo";
    state.flyTime = 0;
    // world position, not object.position (which is local to the orbit group)
    body.mesh.getWorldPosition(lastPos);

    // view from slightly sunward and above, so the lit side faces the camera
    const dist = body.data.radius * 4.5 + 1.5;
    if (body.key === "sun") {
      offset.set(0, 0.35, 1);
    } else {
      const outward = lastPos.clone().setY(0).normalize();
      const side = new THREE.Vector3(-outward.z, 0, outward.x);
      offset.copy(outward).multiplyScalar(-0.6).addScaledVector(side, 0.8).setY(0.35);
    }
    offset.normalize().multiplyScalar(dist);
    controls.minDistance = body.data.radius * 1.3;
    onFocus(body);
  }

  function exitFocus() {
    if (!state.focused && state.mode !== "flyTo") return;
    state.focused = null;
    state.mode = "flyHome";
    controls.minDistance = 2;
    onExit();
  }

  // Called every frame from the animation loop
  function update(dt) {
    const t = 1 - Math.exp(-FLY_RATE * dt);

    if (state.focused) {
      const body = state.focused;
      body.mesh.getWorldPosition(bodyPos);

      // How far the body moved around the Sun since last frame
      const angle = body.key === "sun"
        ? 0
        : Math.atan2(bodyPos.z, bodyPos.x) - Math.atan2(lastPos.z, lastPos.x);

      // Carry the camera along with the body, keeping the same view angle
      // relative to the Sun. Works for any orbit speed, so no lag builds up.
      const rel = camera.position.clone().sub(controls.target);
      rel.applyAxisAngle(THREE.Object3D.DEFAULT_UP, -angle);
      controls.target.add(bodyPos).sub(lastPos);
      camera.position.copy(controls.target).add(rel);
      offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, -angle);

      if (state.mode === "flyTo") {
        // ease from wherever we are toward the framed view
        desired.copy(bodyPos).add(offset);
        camera.position.lerp(desired, t);
        controls.target.lerp(bodyPos, t);
        state.flyTime += dt;
        if (state.flyTime > 2.5 || camera.position.distanceTo(desired) < 0.02) state.mode = "follow";
      } else {
        controls.target.copy(bodyPos);
      }
      lastPos.copy(bodyPos);
    } else if (state.mode === "flyHome") {
      getOverviewPosition(camera.aspect, home);
      camera.position.lerp(home, t);
      controls.target.lerp(origin, t);
      if (camera.position.distanceTo(home) < 0.5) state.mode = "free";
    }
  }

  // Pick a body under the pointer. Falls back to the nearest body on screen,
  // which makes the small planets easy to tap on phones.
  function pick(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) return hits[0].object.userData.body;

    let best = null;
    let bestDist = 28; // px
    for (const body of Object.values(bodies)) {
      body.mesh.getWorldPosition(screen);
      screen.project(camera);
      if (screen.z > 1) continue; // behind the camera
      const sx = ((screen.x + 1) / 2) * rect.width;
      const sy = ((1 - screen.y) / 2) * rect.height;
      const d = Math.hypot(sx - (clientX - rect.left), sy - (clientY - rect.top));
      if (d < bestDist) {
        best = body;
        bestDist = d;
      }
    }
    return best;
  }

  // Treat it as a click only if the pointer barely moved (so dragging doesn't select)
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, time: performance.now() };
  });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.time < 600;
    down = null;
    if (moved > 6 || !quick) return;
    const body = pick(e.clientX, e.clientY);
    if (body) focusOn(body);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") exitFocus();
  });

  return { focusOn, exitFocus, update, state };
}
