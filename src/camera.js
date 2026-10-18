import * as THREE from "../vendor/three/three.module.js";
import { OrbitControls } from "../vendor/three/controls/OrbitControls.js";

// Overview position that fits the system. On portrait screens the view is
// more top-down and further back, so the orbits use the tall screen better.
export function getOverviewPosition(aspect, target = new THREE.Vector3()) {
  if (aspect >= 1) return target.set(0, 70, 120);
  const scale = Math.min(1.8, 1 / aspect);
  return target.set(0, 120, 60).multiplyScalar(scale);
}

export function createCamera(renderer) {
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(55, aspect, 0.05, 3000);
  getOverviewPosition(aspect, camera.position);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2;
  controls.maxDistance = 500;
  controls.autoRotate = false;

  return { camera, controls };
}
