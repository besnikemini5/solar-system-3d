import * as THREE from "../vendor/three/three.module.js";

// HTML name labels that follow each body on screen. They are buttons,
// so clicking a label focuses the body too.
export function createLabels(container, bodies, onSelect) {
  const items = Object.values(bodies).map((body) => {
    const el = document.createElement("button");
    el.className = "label";
    el.type = "button";
    el.textContent = body.data.name;
    el.addEventListener("click", () => onSelect(body));
    container.appendChild(el);
    return { body, el };
  });

  const pos = new THREE.Vector3();
  const up = new THREE.Vector3();

  function update(camera) {
    if (container.hidden) return;
    camera.updateMatrixWorld();
    const w = window.innerWidth;
    const h = window.innerHeight;
    // camera's up direction, so labels sit "above" bodies on screen
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    for (const { body, el } of items) {
      body.mesh.getWorldPosition(pos);
      // moons only get a label up close, otherwise it overlaps the planet's
      if (body.data.parent && camera.position.distanceTo(pos) > 45) {
        el.style.display = "none";
        continue;
      }
      pos.addScaledVector(up, body.data.radius * 1.15);
      pos.project(camera);
      const visible = pos.z < 1 && Math.abs(pos.x) < 1.2 && Math.abs(pos.y) < 1.2;
      el.style.display = visible ? "" : "none";
      if (!visible) continue;
      const x = ((pos.x + 1) / 2) * w;
      const y = ((1 - pos.y) / 2) * h;
      el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    }
  }

  function setVisible(visible) {
    container.hidden = !visible;
  }

  return { update, setVisible };
}
