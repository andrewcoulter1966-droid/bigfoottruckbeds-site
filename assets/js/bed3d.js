// Bigfoot Truck Beds - parametric 3D bed engine (three.js r170, ES module)
// One function, buildBed(params), returns a THREE.Group sized in INCHES.
// Every option in the configurator maps to real geometry here, so the
// model on screen is the bed the customer is actually speccing.
// Params: { length, width, skirted, rack ('none'|'tube'|'mesh'|'solid'),
//   gooseneck, receiver, boxes (0|1|2), overside (0|1|2), lights, rubRail,
//   deck ('tread'|'smooth'), drw, bale, truck (true: show ghost cab + tires),
//   color ('black'|'white'|'gray'|'yellow') }

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const COLORS = {
  black: 0x1a1b1d,
  white: 0xdfe3e6,
  gray: 0x5a6066,
  yellow: 0xd9b10b,
};

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({ color, metalness: 0.55, roughness: 0.42 }, opts));
}
function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  g.position.set(x, y, z); g.castShadow = true; g.receiveShadow = true; return g;
}
function cyl(r, h, m, x = 0, y = 0, z = 0, rotZ = 0, rotX = 0) {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), m);
  g.position.set(x, y, z); g.rotation.z = rotZ; g.rotation.x = rotX; g.castShadow = true; return g;
}

// Treadplate look: a procedural bump/roughness map so the deck reads as plate, not plastic.
let _treadTex = null;
function treadTexture() {
  if (_treadTex) return _treadTex;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8a8f94'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#c9ced2'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) {
    const o = ((y / 32) % 2) * 16;
    ctx.beginPath(); ctx.moveTo(x + o + 4, y + 8); ctx.lineTo(x + o + 20, y + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + o + 12, y + 20); ctx.lineTo(x + o + 12, y + 30); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  _treadTex = t; return t;
}

export function buildBed(p) {
  const g = new THREE.Group();
  const L = p.length, W = p.width;
  const frameM = mat(COLORS[p.color] || COLORS.black);
  const plateM = mat(COLORS[p.color] || COLORS.black, { roughness: 0.5 });
  if (p.deck !== 'smooth') {
    const t = treadTexture().clone(); t.needsUpdate = true; t.repeat.set(L / 24, W / 24);
    plateM.bumpMap = t; plateM.bumpScale = 0.35; plateM.roughnessMap = t;
  }
  const rubberM = mat(0x111214, { metalness: 0.1, roughness: 0.9 });
  const steelM = mat(0x9ea4aa, { metalness: 0.8, roughness: 0.3 });
  const ledR = mat(0x8c0e0e, { emissive: 0xff2a1a, emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.3 });
  const ledA = mat(0x7a4a00, { emissive: 0xffa21a, emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.3 });

  // Datum: deck top at y = 0, front of bed (cab side) at z = -L/2, rear at z = +L/2.
  const deckT = 0.25, sillH = 4, sillW = 2;
  // deck plate
  g.add(box(W, deckT, L, plateM, 0, -deckT / 2, 0));
  // long sills (two 4" channels) under deck
  const sillOff = Math.min(W / 2 - 8, 17);
  g.add(box(sillW, sillH, L - 2, frameM, -sillOff, -deckT - sillH / 2, 0));
  g.add(box(sillW, sillH, L - 2, frameM, sillOff, -deckT - sillH / 2, 0));
  // crossmembers, 12" on center
  const n = Math.floor(L / 12);
  for (let i = 0; i <= n; i++) {
    const z = -L / 2 + 1.5 + i * ((L - 3) / n);
    g.add(box(W - 2, 3, 1.5, frameM, 0, -deckT - 1.5, z));
  }
  // side rails (3" channel) + rub rail / stake pockets
  g.add(box(1.5, 3.5, L, frameM, -W / 2 + 0.75, -deckT - 1.5, 0));
  g.add(box(1.5, 3.5, L, frameM, W / 2 - 0.75, -deckT - 1.5, 0));
  if (p.rubRail !== false) {
    const pockets = Math.max(3, Math.round(L / 24));
    [-1, 1].forEach(s => {
      g.add(box(0.5, 2, L - 6, frameM, s * (W / 2 + 1.25), -deckT - 2.2, 0));
      for (let i = 0; i < pockets; i++) {
        const z = -L / 2 + 6 + i * ((L - 12) / (pockets - 1));
        g.add(box(2.2, 3.6, 3.2, frameM, s * (W / 2 + 0.6), -deckT - 1.9, z));
      }
    });
  }

  // wheel position (rear axle) - ~62% back from the front for a take-off, further for cab & chassis
  const axleZ = p.axleZ != null ? p.axleZ : (L > 110 ? L * 0.26 : L * 0.16);
  const tireR = 16.5, tireW = p.drw ? 9 : 11;
  const wellLen = 42, wellH = 14;

  // skirts (hang below the deck, split around the wheel well)
  if (p.skirted) {
    const skirtDrop = 11;
    const frontLen = Math.max(0, axleZ - wellLen / 2 - (-L / 2));
    const rearLen = Math.max(0, L / 2 - (axleZ + wellLen / 2));
    [-1, 1].forEach(s => {
      const x = s * (W / 2 - 0.5);
      if (frontLen > 2) g.add(box(1, skirtDrop, frontLen, frameM, x, -deckT - 3.5 - skirtDrop / 2, -L / 2 + frontLen / 2));
      if (rearLen > 2) g.add(box(1, skirtDrop, rearLen, frameM, x, -deckT - 3.5 - skirtDrop / 2, L / 2 - rearLen / 2));
      // skirt bottom lip
      if (frontLen > 2) g.add(box(2.5, 0.5, frontLen, frameM, x - s * 0.8, -deckT - 3.5 - skirtDrop, -L / 2 + frontLen / 2));
      if (rearLen > 2) g.add(box(2.5, 0.5, rearLen, frameM, x - s * 0.8, -deckT - 3.5 - skirtDrop, L / 2 - rearLen / 2));
    });
    // underbody toolboxes live in the front skirt bay, over-the-wheel boxes behind
    for (let i = 0; i < (p.boxes || 0); i++) {
      const s = i === 0 ? -1 : 1;
      const bl = Math.min(30, frontLen - 6);
      if (bl > 10) {
        const bz = -L / 2 + 4 + bl / 2;
        g.add(box(16, 15, bl, frameM, s * (W / 2 - 9), -deckT - 3.5 - 7.5, bz));
        // door seam + paddle latch
        g.add(box(0.3, 12, bl - 4, steelM, s * (W / 2 - 0.2), -deckT - 3.5 - 7.5, bz));
        g.add(box(0.6, 2.2, 4, steelM, s * (W / 2 + 0.3), -deckT - 3.5 - 7, bz));
      }
    }
  } else {
    // open (non-skirted) bed: boxes hang as under-body boxes under the deck edge
    for (let i = 0; i < (p.boxes || 0); i++) {
      const s = i === 0 ? -1 : 1;
      const bz = -L / 2 + 22;
      g.add(box(18, 18, 30, frameM, s * (W / 2 - 10), -deckT - 3.5 - 9, bz));
      g.add(box(0.3, 14, 26, steelM, s * (W / 2 - 0.4), -deckT - 3.5 - 9, bz));
    }
  }

  // over-the-side (top-mount) boxes: sit on the deck edge behind the rack
  for (let i = 0; i < (p.overside || 0); i++) {
    const s = i === 0 ? -1 : 1;
    const bl = 48;
    g.add(box(18, 18, bl, frameM, s * (W / 2 - 9), 9, -L / 2 + 8 + bl / 2));
    g.add(box(18.4, 1.2, bl + 0.4, frameM, s * (W / 2 - 9), 18.3, -L / 2 + 8 + bl / 2));
    g.add(box(0.6, 2, 5, steelM, s * (W / 2 + 0.3), 10, -L / 2 + 8 + bl / 2));
  }

  // headache rack
  if (p.rack && p.rack !== 'none') {
    const H = 34, z = -L / 2 + 1.5;
    const tube = 2;
    g.add(box(tube, H, tube, frameM, -W / 2 + 3, H / 2, z));
    g.add(box(tube, H, tube, frameM, W / 2 - 3, H / 2, z));
    g.add(box(W - 6, tube, tube, frameM, 0, H - 1, z));
    g.add(box(W - 6, tube, tube, frameM, 0, 17, z));
    if (p.rack === 'tube') {
      for (let i = 1; i <= 4; i++) g.add(box(1.2, H - 2, 1.2, frameM, -W / 2 + 3 + i * ((W - 6) / 5), H / 2, z));
    } else if (p.rack === 'mesh') {
      const meshM = mat(COLORS[p.color] || COLORS.black, { transparent: true, opacity: 0.55, roughness: 0.6 });
      g.add(box(W - 8, H - 4, 0.4, meshM, 0, H / 2, z));
      for (let i = 1; i <= 2; i++) g.add(box(1.2, H - 2, 1.2, frameM, -W / 2 + 3 + i * ((W - 6) / 3), H / 2, z));
    } else {
      // solid with a rear window cutout
      const winW = Math.min(44, W * 0.5), winH = 13;
      g.add(box((W - 6 - winW) / 2, H - 2, 1, frameM, -W / 2 + 3 + (W - 6 - winW) / 4, H / 2, z));
      g.add(box((W - 6 - winW) / 2, H - 2, 1, frameM, W / 2 - 3 - (W - 6 - winW) / 4, H / 2, z));
      g.add(box(winW, H - 2 - winH - 4, 1, frameM, 0, (H - 2 - winH - 4) / 2 + 1, z));
      g.add(box(winW, 4, 1, frameM, 0, H - 3, z));
    }
    if (p.lights !== false) {
      // cab lights on the rack top rail: 3 amber
      [-0.35, 0, 0.35].forEach(f => g.add(box(3, 1.2, 1.4, ledA, f * (W - 10), H + 0.2, z)));
      // work lights
      g.add(box(4, 3, 2.5, steelM, -W / 2 + 10, H - 4.5, z + 1.8));
      g.add(box(4, 3, 2.5, steelM, W / 2 - 10, H - 4.5, z + 1.8));
    }
  }

  // bale (arm) bed hardware
  if (p.bale) {
    const armM = mat(COLORS[p.color] || COLORS.black);
    [-1, 1].forEach(s => {
      const x = s * (W / 2 - 6);
      // pivot tower at rear, arm angled back
      g.add(box(6, 10, 8, armM, x, 5, L / 2 - 10));
      const arm = box(4, 4, 70, armM, x, 14, L / 2 + 12);
      arm.rotation.x = -0.55; g.add(arm);
      const spike = cyl(1.4, 40, steelM, x, 26, L / 2 + 24, 0, Math.PI / 2 + 0.2);
      g.add(spike);
      // hydraulic cylinder
      const hc = cyl(1.6, 26, steelM, x - s * 5, 4, L / 2 - 2, 0, -0.9);
      g.add(hc);
    });
    // hydraulic pump box under front of deck
    g.add(box(16, 10, 14, frameM, 0, -deckT - 3.5 - 5, -L / 2 + 14));
  }

  // gooseneck ball + round plate, over the axle
  if (p.gooseneck) {
    g.add(cyl(5, 0.5, steelM, 0, 0.25, axleZ - 2));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 16), steelM)).position.set(0, 1.9, axleZ - 2);
    // safety chain D-rings
    [-7, 7].forEach(x => g.add(cyl(1.4, 0.4, steelM, x, 0.2, axleZ - 2, 0, 0)));
  }

  // rear: bumper plate, receiver, lights, mud flaps
  const rz = L / 2;
  g.add(box(W, 5, 1, frameM, 0, -deckT - 2.5, rz + 0.5));
  if (p.receiver !== false) {
    g.add(box(3, 3, 14, frameM, 0, -deckT - 5.5, rz - 4));
    g.add(box(4.2, 4.2, 0.8, steelM, 0, -deckT - 5.5, rz + 2.6));
    // light bar safety chain loops
    [-6, 6].forEach(x => g.add(box(1.2, 2.5, 0.8, steelM, x, -deckT - 5.5, rz + 2.6)));
  }
  if (p.lights !== false) {
    [-1, 1].forEach(s => {
      g.add(box(6.2, 2.2, 0.8, ledR, s * (W / 2 - 9), -deckT - 2.3, rz + 1.3));   // stop/turn
      g.add(box(2.2, 2.2, 0.8, ledR, s * (W / 2 - 2.5), -deckT - 2.3, rz + 1.3)); // marker
      // side ambers mid-bed
      g.add(box(0.8, 1.6, 3.4, ledA, s * (W / 2 + 1.5), -deckT - 1.2, 0));
    });
    // center ID bar
    [-3.2, 0, 3.2].forEach(x => g.add(box(1.6, 1.2, 0.8, ledR, x, -deckT - 1.6, rz + 1.3)));
  }
  // mud flaps behind the tires
  [-1, 1].forEach(s => {
    const flap = box(p.drw ? 20 : 13, 14, 0.4, rubberM, s * (W / 2 - (p.drw ? 11 : 8)), -deckT - 3.5 - 7, axleZ + 24);
    g.add(flap);
  });

  // tires + ghost cab (truck context)
  if (p.truck !== false) {
    const tireM = mat(0x17181a, { metalness: 0.05, roughness: 0.95 });
    const rimM = mat(0xb9bec3, { metalness: 0.9, roughness: 0.25 });
    const trackHalf = (p.frameWidth || 34) / 2 + 12;
    [-1, 1].forEach(s => {
      const xs = p.drw ? [trackHalf - 4, trackHalf + 6.5] : [trackHalf];
      xs.forEach(x => {
        // tire top sits ~1.5" under the deck frame; deck ends up ~35" over the ground like a real 1-ton flatbed
        const ty = -(deckT + 1.5 + tireR);
        const t = cyl(tireR, tireW, tireM, s * x, ty, axleZ, Math.PI / 2);
        g.add(t);
        g.add(cyl(9.5, tireW + 0.3, rimM, s * x, ty, axleZ, Math.PI / 2));
      });
    });
    // axle tube
    g.add(cyl(2.2, (trackHalf + (p.drw ? 8 : 0)) * 2, rubberM, 0, -(deckT + 1.5 + tireR), axleZ, Math.PI / 2));
    // frame rails (truck chassis) peeking under
    const fw = p.frameWidth || 34;
    g.add(box(2.5, 6, L + 30, rubberM, -fw / 2, -deckT - 4.5 - 3, -8));
    g.add(box(2.5, 6, L + 30, rubberM, fw / 2, -deckT - 4.5 - 3, -8));
    // ghost cab
    const ghost = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, transparent: true, opacity: 0.11, roughness: 0.7, metalness: 0.1, depthWrite: false });
    const cabD = 62, cabH = 48, cabW = W - 2;
    const cab = new THREE.Group();
    cab.add(box(cabW, cabH * 0.55, cabD, ghost, 0, cabH * 0.275 - 2, -L / 2 - 4 - cabD / 2));
    cab.add(box(cabW - 8, cabH * 0.5, cabD - 14, ghost, 0, cabH * 0.55 + cabH * 0.25 - 2, -L / 2 - 4 - cabD / 2 - 4));
    cab.add(box(cabW - 6, cabH * 0.35, cabD + 50, ghost, 0, -deckT - 16, -L / 2 - 4 - cabD / 2 - 24)); // hood / front
    g.add(cab);
  }

  return g;
}

// ---------- Viewer wrapper ----------
export class BedViewer {
  constructor(el, opts = {}) {
    this.el = el; this.opts = opts; this.params = null; this.group = null; this.auto = opts.autoRotate !== false;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(r.domElement); this.renderer = r;
    const s = new THREE.Scene(); this.scene = s;
    const pm = new THREE.PMREMGenerator(r);
    s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const cam = new THREE.PerspectiveCamera(32, 1, 1, 4000); this.camera = cam;
    cam.position.set(190, 95, 220);
    const ctl = new OrbitControls(cam, r.domElement); this.controls = ctl;
    ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.enablePan = false;
    ctl.minDistance = 120; ctl.maxDistance = 520; ctl.maxPolarAngle = Math.PI / 2 - 0.04; ctl.minPolarAngle = 0.35;
    ctl.target.set(0, -10, 0);
    ctl.addEventListener('start', () => { this.auto = false; });
    // lights
    s.add(new THREE.HemisphereLight(0xdfe6ee, 0x1a1c1f, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(160, 220, 120);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera; sc.left = sc.bottom = -220; sc.right = sc.top = 220; sc.near = 10; sc.far = 800; key.shadow.bias = -0.0005;
    s.add(key);
    const rim = new THREE.DirectionalLight(0xffe9a8, 0.9); rim.position.set(-180, 90, -160); s.add(rim);
    // ground shadow catcher + floor ring
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.ShadowMaterial({ opacity: 0.42 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -(0.25 + 1.5 + 16.5 * 2); ground.receiveShadow = true; s.add(ground);
    const ringM = new THREE.MeshBasicMaterial({ color: 0xedc108, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(118, 120, 96), ringM);
    ring.rotation.x = -Math.PI / 2; ring.position.y = ground.position.y + 0.3; s.add(ring); this.ring = ring;
    this.ground = ground;
    this._resize = () => this.resize(); window.addEventListener('resize', this._resize);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el);
    this.resize();
    this.clock = new THREE.Clock(); this._running = true; this._tick = this._tick.bind(this); this._tick();
    this._anim = [];
    this.onFrame = null;   // called after every render, for HTML/SVG overlays
    this._v = new THREE.Vector3();
  }
  // Project a point given in BED-LOCAL inches to CSS pixels inside this.el.
  // Follows the group's rotation, so annotations ride the spinning model.
  project(x, y, z) {
    const v = this._v.set(x, y, z);
    if (this.group) v.applyMatrix4(this.group.matrixWorld);
    v.project(this.camera);
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, z: v.z };
  }
  // Named anchor points on the current bed, in local inches.
  anchors() {
    const p = this.params || {}; const L = p.length || 102, W = p.width || 84;
    const deckT = 0.25, railH = 4.5;
    return {
      frontL: [-W / 2, 0, -L / 2], frontR: [W / 2, 0, -L / 2],
      rearL: [-W / 2, 0, L / 2], rearR: [W / 2, 0, L / 2],
      deckMid: [0, 0, 0],
      deckEdgeR: [W / 2, 0, L * 0.12],
      rackTop: [0, p.rack && p.rack !== 'none' ? 46 : 0, -L / 2 + 2],
      underside: [0, -(deckT + railH), 0],
      groundMid: [0, -(0.25 + 1.5 + 33), 0],
      boxFace: [-W / 2, -6, L * 0.05],
      tireR: [W / 2 - 6, -(0.25 + 1.5 + 16.5), L * 0.06],
    };
  }
  resize() {
    const w = this.el.clientWidth || 600, h = this.el.clientHeight || 450;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  set(params) {
    const old = this.group; const prev = this.params;
    this.params = Object.assign({}, params);
    const g = buildBed(this.params);
    this.scene.add(g); this.group = g;
    // settle the camera distance on size changes
    const L = params.length;
    const want = Math.max(150, L * 1.9) * (this.heroPull || 1);
    if (!prev || Math.abs(prev.length - L) > 1) {
      this.controls.minDistance = Math.max(110, L * 0.9) * (this.heroPull || 1); this.controls.maxDistance = Math.max(400, L * 4.2) * (this.heroPull || 1);
      const dir = this.camera.position.clone().sub(this.controls.target).normalize();
      this._animateCam(dir.multiplyScalar(want).add(this.controls.target));
    }
    this.ring.scale.setScalar(Math.max(1, L / 110));
    // pop-in: scale from 0.96 and fade
    if (old) { this.scene.remove(old); disposeGroup(old); }
    g.scale.setScalar(0.97); const t0 = performance.now();
    this._anim.push(() => { const k = Math.min(1, (performance.now() - t0) / 260); const e = 1 - Math.pow(1 - k, 3); g.scale.setScalar(0.97 + 0.03 * e); return k < 1; });
  }
  view(name) {
    const L = (this.params && this.params.length) || 100;
    const d = Math.max(150, L * 1.9) * (this.heroPull || 1);
    const T = this.controls.target.clone();
    const map = {
      hero: new THREE.Vector3(0.62, 0.34, 0.72), side: new THREE.Vector3(1, 0.18, 0.02), rear: new THREE.Vector3(0.08, 0.3, 1),
      top: new THREE.Vector3(0.02, 1, 0.12), front: new THREE.Vector3(-0.5, 0.35, -0.8),
    };
    const v = (map[name] || map.hero).clone().normalize().multiplyScalar(d).add(T);
    this.auto = false; this._animateCam(v);
  }
  _animateCam(to) {
    const from = this.camera.position.clone(); const t0 = performance.now();
    this._anim.push(() => { const k = Math.min(1, (performance.now() - t0) / 520); const e = 1 - Math.pow(1 - k, 3); this.camera.position.lerpVectors(from, to, e); return k < 1; });
  }
  _tick() {
    if (!this._running) return;
    requestAnimationFrame(this._tick);
    const dt = this.clock.getDelta();
    if (this.auto && this.group) this.group.rotation.y += dt * 0.12;
    if (this._anim && this._anim.length) this._anim = this._anim.filter(fn => fn());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.onFrame) this.onFrame(this);
  }
  snapshot(w = 800, h = 600) {
    // render a still at a fixed size without disturbing the live canvas size for long
    const el = this.renderer.domElement; const ow = el.width, oh = el.height;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera); const url = el.toDataURL('image/png');
    this.renderer.setSize(ow, oh, false); this.camera.aspect = ow / oh; this.camera.updateProjectionMatrix();
    return url;
  }
  dispose() {
    this._running = false; window.removeEventListener('resize', this._resize); this.ro.disconnect();
    if (this.group) disposeGroup(this.group); this.renderer.dispose();
  }
}

function disposeGroup(g) {
  g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.bumpMap) m.bumpMap.dispose(); m.dispose(); }); } });
}

// Offscreen thumbnail factory: one hidden renderer renders each bed once to a PNG data URL.
let _thumb = null;
export function thumbnail(params, w = 640, h = 480) {
  if (!_thumb) {
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-9999px;top:0;width:640px;height:480px;';
    document.body.appendChild(host); _thumb = new BedViewer(host, { autoRotate: false }); _thumb._running = false;
  }
  _thumb.set(params); _thumb.group.rotation.y = -0.55;
  const L = params.length, d = Math.max(150, L * 1.9);
  _thumb.camera.position.set(0.62 * d, 0.36 * d, 0.72 * d); _thumb.camera.lookAt(0, -12, 0);
  _thumb.renderer.setSize(w, h, false); _thumb.camera.aspect = w / h; _thumb.camera.updateProjectionMatrix();
  _thumb.renderer.render(_thumb.scene, _thumb.camera);
  return _thumb.renderer.domElement.toDataURL('image/png');
}

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
