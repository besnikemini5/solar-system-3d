import * as THREE from "../vendor/three/three.module.js";

export function createLights(scene) {
  // faint ambient so the night side of planets isn't pitch black
  const ambient = new THREE.AmbientLight(0xffffff, 0.12);
  scene.add(ambient);

  // the Sun: point light at the origin, no falloff so outer planets stay visible
  const sunLight = new THREE.PointLight(0xfff4e0, 3, 0, 0);
  scene.add(sunLight);

  return sunLight;
}
