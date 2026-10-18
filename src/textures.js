import * as THREE from "../vendor/three/three.module.js";

// Procedural textures. Everything is driven by a seeded PRNG, so the
// textures look exactly the same on every load (no Math.random here).

// Small fast seeded PRNG (mulberry32)
export function createRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 3D value noise. Sampling on the unit sphere avoids seams and pole pinching.
function createNoise3(seed) {
  const rand = createRandom(seed);
  const perm = new Uint8Array(512);
  const values = new Float32Array(256);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) values[i] = rand();

  const fade = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const v = (x, y, z) => values[perm[perm[perm[x & 255] + (y & 255)] + (z & 255)]];

  return function (x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = fade(xf), w = fade(yf), t = fade(zf);
    const x0 = lerp(v(xi, yi, zi), v(xi + 1, yi, zi), u);
    const x1 = lerp(v(xi, yi + 1, zi), v(xi + 1, yi + 1, zi), u);
    const x2 = lerp(v(xi, yi, zi + 1), v(xi + 1, yi, zi + 1), u);
    const x3 = lerp(v(xi, yi + 1, zi + 1), v(xi + 1, yi + 1, zi + 1), u);
    return lerp(lerp(x0, x1, w), lerp(x2, x3, w), t);
  };
}

// Fractal noise in [0, 1]
function fbm(noise, x, y, z, octaves = 5) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq, z * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

// Fill an equirectangular canvas. shade(x, y, z, lat, lon) returns [r, g, b].
function paintSphere(width, height, shade) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(width, height);
  const data = img.data;

  for (let py = 0; py < height; py++) {
    const lat = (0.5 - (py + 0.5) / height) * Math.PI;
    const cosLat = Math.cos(lat), sinLat = Math.sin(lat);
    for (let px = 0; px < width; px++) {
      const lon = ((px + 0.5) / width) * Math.PI * 2;
      const c = shade(cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon), lat, lon);
      const i = (py * width + px) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Craters as spherical caps: returns a function giving a brightness multiplier
function createCraters(seed, count, minSize, maxSize) {
  const rand = createRandom(seed);
  const craters = [];
  for (let i = 0; i < count; i++) {
    const z = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    // small craters are more common than large ones
    const size = minSize + (maxSize - minSize) * Math.pow(rand(), 3);
    craters.push({ x: r * Math.cos(a), y: z, z: r * Math.sin(a), size, cos: Math.cos(size) });
  }
  return function (x, y, z) {
    let m = 1;
    for (const c of craters) {
      const d = x * c.x + y * c.y + z * c.z;
      if (d < c.cos) continue;
      const t = Math.acos(Math.min(1, d)) / c.size; // 0 at center, 1 at rim
      m *= t < 0.8 ? 0.82 + 0.1 * t : 1 + 0.25 * Math.sin(((t - 0.8) / 0.2) * Math.PI);
    }
    return m;
  };
}

// Banded gas/ice giant
function bandedPlanet(seed, palette, opts) {
  const noise = createNoise3(seed);
  return (x, y, z, lat, lon) => {
    const turb = fbm(noise, x * opts.turbScale, y * opts.turbScale * 3, z * opts.turbScale, 4);
    const v = lat + opts.warp * (turb - 0.5);
    const band = 0.5 + 0.5 * Math.sin(v * opts.bands);
    const band2 = 0.5 + 0.5 * Math.sin(v * opts.bands * 0.37 + 1.3);
    let c = mix(palette[0], palette[1], band);
    c = mix(c, palette[2], band2 * opts.secondary);
    const g = opts.grain ?? 0.12;
    const grain = 1 - g / 2 + g * fbm(noise, x * 12, y * 12, z * 12, 2);
    c = [c[0] * grain, c[1] * grain, c[2] * grain];

    if (opts.spot) {
      const s = opts.spot;
      let dLon = Math.abs(lon - s.lon);
      if (dLon > Math.PI) dLon = Math.PI * 2 - dLon;
      const e = ((lat - s.lat) / s.h) ** 2 + (dLon / s.w) ** 2;
      if (e < 1) c = mix(c, s.color, smooth(1, 0.35, e) * s.strength);
    }
    return c;
  };
}

const SHADERS = {
  sun(seed) {
    const noise = createNoise3(seed);
    return (x, y, z) => {
      const n = fbm(noise, x * 6, y * 6, z * 6, 5);
      const g = fbm(noise, x * 22 + 5, y * 22, z * 22, 2);
      const t = clamp01(n * 0.8 + g * 0.45 - 0.15);
      return mix([235, 90, 10], [255, 236, 150], t);
    };
  },

  mercury(seed) {
    const noise = createNoise3(seed);
    const craters = createCraters(seed + 1, 160, 0.02, 0.22);
    return (x, y, z) => {
      const n = fbm(noise, x * 4, y * 4, z * 4, 5);
      const c = mix([95, 90, 86], [172, 166, 158], n);
      const m = craters(x, y, z);
      return [c[0] * m, c[1] * m, c[2] * m];
    };
  },

  venus(seed) {
    const noise = createNoise3(seed);
    return (x, y, z, lat) => {
      // domain-warped clouds, stretched along latitude
      const w = fbm(noise, x * 2, y * 2, z * 2, 3);
      const n = fbm(noise, x * 3 + w * 2, y * 7 + w * 2, z * 3 + w * 2, 5);
      const c = mix([176, 128, 64], [238, 214, 160], n);
      return mix(c, [250, 235, 200], smooth(1.0, 1.5, Math.abs(lat)) * 0.4);
    };
  },

  earth(seed) {
    const noise = createNoise3(seed);
    const clouds = createNoise3(seed + 7);
    return (x, y, z, lat) => {
      const h = fbm(noise, x * 1.7 + 3.1, y * 1.7, z * 1.7, 6);
      const absLat = Math.abs(lat);
      let c;
      if (h < 0.5) {
        c = mix([10, 32, 82], [28, 92, 150], smooth(0.36, 0.5, h)); // ocean, shallower near coasts
      } else {
        const dry = fbm(noise, x * 4, y * 4 + 9, z * 4, 3);
        const desert = smooth(0.55, 0.15, Math.abs(absLat - 0.42)) * smooth(0.45, 0.6, dry);
        c = mix([48, 104, 46], [92, 120, 58], smooth(0.5, 0.65, h));
        c = mix(c, [190, 160, 108], desert);
        c = mix(c, [120, 110, 96], smooth(0.66, 0.75, h)); // mountains
      }
      // polar ice
      const ice = smooth(1.15, 1.25, absLat + (h - 0.5) * 0.4);
      c = mix(c, [235, 240, 245], ice);
      // clouds
      const cl = fbm(clouds, x * 3, y * 6, z * 3, 5);
      return mix(c, [245, 245, 245], smooth(0.55, 0.75, cl) * 0.85);
    };
  },

  moon(seed) {
    const noise = createNoise3(seed);
    const craters = createCraters(seed + 1, 140, 0.02, 0.2);
    return (x, y, z) => {
      const maria = smooth(0.52, 0.6, fbm(noise, x * 1.6, y * 1.6, z * 1.6, 4));
      const n = fbm(noise, x * 8, y * 8, z * 8, 4);
      let c = mix([150, 150, 148], [196, 194, 190], n);
      c = mix(c, [88, 88, 90], maria * 0.75);
      const m = craters(x, y, z);
      return [c[0] * m, c[1] * m, c[2] * m];
    };
  },

  mars(seed) {
    const noise = createNoise3(seed);
    const craters = createCraters(seed + 1, 50, 0.02, 0.1);
    return (x, y, z, lat) => {
      const n = fbm(noise, x * 3, y * 3, z * 3, 6);
      const dark = smooth(0.5, 0.62, fbm(noise, x * 1.5 + 4, y * 1.5, z * 1.5, 4));
      let c = mix([150, 66, 32], [214, 120, 70], n);
      c = mix(c, [96, 50, 34], dark * 0.6);
      const cap = smooth(1.3, 1.38, Math.abs(lat) + (n - 0.5) * 0.2);
      c = mix(c, [240, 236, 230], cap);
      const m = craters(x, y, z);
      return [c[0] * m, c[1] * m, c[2] * m];
    };
  },

  jupiter: (seed) =>
    bandedPlanet(seed, [[226, 214, 190], [176, 126, 86], [140, 96, 70]], {
      bands: 22, warp: 0.09, turbScale: 4, secondary: 0.35,
      spot: { lat: -0.38, lon: 2.2, h: 0.09, w: 0.2, color: [190, 90, 60], strength: 0.85 }
    }),

  saturn: (seed) =>
    bandedPlanet(seed, [[232, 214, 168], [196, 168, 112], [170, 140, 96]], {
      bands: 20, warp: 0.025, turbScale: 3, secondary: 0.3, grain: 0.05
    }),

  uranus: (seed) =>
    bandedPlanet(seed, [[176, 226, 230], [150, 208, 218], [130, 196, 210]], {
      bands: 10, warp: 0.03, turbScale: 2, secondary: 0.2
    }),

  neptune: (seed) =>
    bandedPlanet(seed, [[70, 110, 220], [48, 82, 190], [90, 140, 230]], {
      bands: 12, warp: 0.06, turbScale: 3, secondary: 0.3,
      spot: { lat: -0.35, lon: 4.0, h: 0.07, w: 0.15, color: [24, 40, 120], strength: 0.8 }
    })
};

const SIZES = { sun: 512, earth: 1024, jupiter: 1024, saturn: 1024 };

export function createBodyTexture(key, seed) {
  const width = SIZES[key] || 512;
  const canvas = paintSphere(width, width / 2, SHADERS[key](seed));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Saturn's rings: 1D radial strip (u = inner → outer), color + alpha
export function createRingTexture(seed) {
  const rand = createRandom(seed);
  const width = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 4;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(width, 4);

  let fine = 0;
  for (let x = 0; x < width; x++) {
    const t = x / (width - 1);
    fine = fine * 0.7 + rand() * 0.3; // smoothed random striations
    let density;
    if (t < 0.18) density = 0.18 + 0.15 * t / 0.18;      // faint C ring
    else if (t < 0.55) density = 0.85;                    // bright B ring
    else if (t < 0.6) density = 0.05;                     // Cassini division
    else if (t < 0.9) density = 0.6;                      // A ring
    else density = 0.6 * (1 - (t - 0.9) / 0.1);           // fade out
    if (Math.abs(t - 0.84) < 0.006) density *= 0.2;       // Encke gap
    density *= 0.75 + 0.5 * fine;

    const c = mix([150, 130, 100], [230, 212, 175], clamp01(density));
    for (let y = 0; y < 4; y++) {
      const i = (y * width + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = Math.round(clamp01(density) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Soft radial glow used behind the Sun
export function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255, 220, 140, 0.9)");
  g.addColorStop(0.25, "rgba(255, 160, 60, 0.35)");
  g.addColorStop(1, "rgba(255, 120, 20, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
