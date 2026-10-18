import * as THREE from "../vendor/three/three.module.js";

// sim.speed: slider value, sim.paused: pause button state.
// hooks.update(dt) runs after the bodies move (camera follow),
// hooks.afterControls() once the camera is final for this frame (labels).
export function animate(renderer, scene, camera, controls, bodies, sim, hooks) {
  const clock = new THREE.Clock();
  const list = Object.values(bodies);

  function loop() {
    requestAnimationFrame(loop);

    // clamp so a background tab doesn't make everything jump on return
    const dt = Math.min(clock.getDelta(), 0.1);
    const simDt = sim.paused ? 0 : dt * sim.speed;

    for (const body of list) {
      // spin on own axis
      body.mesh.rotation.y += body.spinSpeed * simDt;
      // orbit around the parent via the orbit group
      if (body.orbit) body.orbit.rotation.y += body.orbitSpeed * simDt;
    }

    scene.updateMatrixWorld();
    hooks.update(dt);
    controls.update();
    hooks.afterControls();
    renderer.render(scene, camera);
  }

  loop();
}
