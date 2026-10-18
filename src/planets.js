import * as THREE from "../vendor/three/three.module.js";
import { BODIES, EARTH_YEAR_SECONDS } from "./planetData.js";
import {
  createRandom,
  createBodyTexture,
  createRingTexture,
  createGlowTexture
} from "./textures.js";

const SEED = 20240611;
const DEG = Math.PI / 180;

// Seeded starfield on a large shell around the scene
function createStarfield() {
  const rand = createRandom(SEED);
  const count = 4000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const z = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    const dist = 600 + rand() * 300;
    positions.set([r * Math.cos(a) * dist, z * dist, r * Math.sin(a) * dist], i * 3);
    const b = 0.5 + rand() * 0.5;
    const warm = rand() < 0.2 ? 0.15 : 0;
    colors.set([b, b - warm * 0.5, b - warm], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 1.6,
    sizeAttenuation: true,
    vertexColors: true,
    depthWrite: false
  });
  return new THREE.Points(geometry, material);
}

// Create orbital path line
function createOrbitLine(radius) {
  const points = [];
  const segments = 256;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x6f8fb8,
    transparent: true,
    opacity: 0.25
  });
  return new THREE.Line(geometry, material);
}

// Ring geometry with radial UVs (u goes from inner to outer edge)
function createRings(inner, outer, seed) {
  const geometry = new THREE.RingGeometry(inner, outer, 128, 1);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
  }
  const material = new THREE.MeshStandardMaterial({
    map: createRingTexture(seed),
    side: THREE.DoubleSide,
    transparent: true,
    roughness: 1,
    metalness: 0,
    depthWrite: false
  });
  const rings = new THREE.Mesh(geometry, material);
  rings.rotation.x = -Math.PI / 2;
  return rings;
}

function createSun(data, seed) {
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(data.radius, 64, 64),
    new THREE.MeshBasicMaterial({ map: createBodyTexture("sun", seed) })
  );
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    })
  );
  glow.scale.setScalar(data.radius * 5);
  glow.raycast = () => {}; // don't block clicks
  sun.add(glow);
  return sun;
}

function createPlanetMesh(data, seed) {
  const material = new THREE.MeshStandardMaterial({
    map: createBodyTexture(data.key, seed),
    roughness: 1,
    metalness: 0
  });
  return new THREE.Mesh(new THREE.SphereGeometry(data.radius, 64, 64), material);
}

/*
  Hierarchy for each body:
    orbit  (rotates around the parent → orbital motion)
      anchor (offset by distance, not rotated → used for focus/labels)
        tilt (axial tilt)
          mesh (spins on its own axis)
*/
export function createSolarSystem(scene) {
  scene.add(createStarfield());

  const rand = createRandom(SEED + 1);
  const bodies = {};
  const yearRate = (Math.PI * 2) / EARTH_YEAR_SECONDS; // rad per second at 1×

  BODIES.forEach((data, i) => {
    const seed = SEED + i * 101;
    const body = { key: data.key, data };

    if (data.key === "sun") {
      body.mesh = createSun(data, seed);
      body.tilt = new THREE.Object3D();
      body.tilt.rotation.z = data.tilt * DEG;
      body.tilt.add(body.mesh);
      body.anchor = body.tilt;
      scene.add(body.tilt);
    } else {
      body.mesh = createPlanetMesh(data, seed);
      body.orbit = new THREE.Object3D();
      body.anchor = new THREE.Object3D();
      body.anchor.position.x = data.distance;
      body.orbit.add(body.anchor);
      body.orbit.rotation.y = rand() * Math.PI * 2; // fixed, seeded start position
      body.orbitSpeed = yearRate * (365.25 / data.periodDays);

      if (data.parent) {
        // moon: orbit around the parent's anchor, slightly inclined.
        // No own spin: it rotates with its orbit, so it's tidally locked.
        const parent = bodies[data.parent];
        const incline = new THREE.Object3D();
        incline.rotation.z = (data.inclination || 0) * DEG;
        incline.add(body.orbit);
        parent.anchor.add(incline);
        body.anchor.add(body.mesh);
      } else {
        body.tilt = new THREE.Object3D();
        body.tilt.rotation.z = data.tilt * DEG;
        body.tilt.add(body.mesh);
        body.anchor.add(body.tilt);
        scene.add(body.orbit);
        scene.add(createOrbitLine(data.distance));
      }

      if (data.rings) {
        body.tilt.add(createRings(data.rings.inner, data.rings.outer, seed + 5));
      }
    }

    // Spin is visual only: real rotation ratios, slowed down
    body.spinSpeed = data.rotationHours ? 0.6 * (24 / data.rotationHours) : 0;
    body.mesh.userData.body = body;
    bodies[data.key] = body;
  });

  return bodies;
}
