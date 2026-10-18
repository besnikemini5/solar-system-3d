import * as THREE from "../vendor/three/three.module.js";

export function createScene() {
  return new THREE.Scene();
}

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // cap pixel ratio so high-DPI phones stay smooth
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  return renderer;
}

export function setSceneBackground(scene) {
  scene.background = new THREE.Color(0x000008);
}
