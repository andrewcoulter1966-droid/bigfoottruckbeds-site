// Bigfoot Truck Beds, home page v4: the bed in the centre of the hero.
// Five beds off the shared builder (bed3d.js buildBed), one at a time, picked on the rail (pick.js).
// A scan plane splits the model: solid steel on one side, gold x-ray lines on the other.
//   - a new bed is drawn as lines first, then the scan fills it in
//   - scrolling runs the scan back the other way to show the frame under the deck
// Still mode (reduced motion, motion toggle off): one static frame, no pin, nothing moves.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildBed } from '../js/bed3d.js';

const html = document.documentElement, BF = window.BF;
const story = document.querySelector('.v4-story');
const stage = document.querySelector('.v4-stage');
const host = document.getElementById('v4-canvas');
const svg = document.querySelector('.v4-dims');
const h1 = document.querySelector('.v4-h1');
const fades = [...document.querySelectorAll('.v4-card, .v4-media, .v4-hint')];
const rail = document.querySelector('.v4-rail');
const beats = [...document.querySelectorAll('.v4-beats li')];
const ghosts = [...document.querySelectorAll('.v4-ghost span')];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

// Inches. Deck top is y = 0, cab side is z = -L/2, rear is z = +L/2. The hero shows every bed at 8'6" x 97".
const L = 102, W = 97, AX = 1, GROUND = -40.5, Z0 = -186, Z1 = L / 2 + 72;
const D = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

// Keyframes. az 0 looks from the rear; positive az swings to the passenger side. n = phone overrides.
const KEYS = [
  { az: -36, el: 11, r: 108, tg: [0, -8, -26], sx: -0.1, sy: 0.19, cab: 0.6, n: { az: -30, el: 13, r: 78, tg: [0, -8, -8], sx: 0, sy: 0.035 } },
  { az: 30, el: 40, r: 102, tg: [0, -2, 0], sx: 0.24, sy: -0.02, cab: 0.2, n: { r: 74, sx: 0, sy: -0.08 } },
  { az: 90, el: 3, r: 116, tg: [0, -4, -60], sx: 0, sy: -0.08, cab: 1, n: { r: 88, tg: [0, -2, -16], sx: 0, sy: -0.08 } }
];
const LAST = KEYS.length - 1;

let renderer, scene, camera, grid, truck, scan, scanGlow, bed = null, live = false, narrow = false, w = 1, h = 1;
let t = 0, target = 0, dirty = true, raf = 0, spin = 0, spinV = 0, drag = null, drawT0 = -1, drawX = 0;
const beds = {};
const tmp = new THREE.Vector3();
const solidPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);    // keeps z >= scan
const wirePlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);    // keeps z <= scan
const wireMat = new THREE.LineBasicMaterial({ color: 0xEDC108, transparent: true, opacity: 0.92, depthWrite: false, clippingPlanes: [wirePlane] });
const edgeMat = new THREE.LineBasicMaterial({ color: 0xc7d0d8, transparent: true, opacity: 0.16, depthWrite: false, clippingPlanes: [solidPlane] });
const cabFill = new THREE.MeshBasicMaterial({ color: 0xaebccb, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide });
const cabLine = new THREE.LineBasicMaterial({ color: 0xcfd8e0, transparent: true, opacity: 0.34, depthWrite: false });

function key(i) { const k = KEYS[i]; return narrow && k.n ? Object.assign({}, k, k.n) : k; }
function mix(f) { const i = Math.min(LAST - 1, Math.floor(t)), k = clamp(t - i); return f(key(i), key(i + 1), k); }

// ---------- model prep -----------------------------------------------------
function prepMat(m) {
  if (m.userData.v4) return; m.userData.v4 = 1;
  m.clippingPlanes = [solidPlane]; m.clipShadows = true;
  m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1;
  if (!m.isMeshStandardMaterial) return;
  m.envMapIntensity = 1.35;
  if (m.color.getHex() === 0x1a1b1d) {
    // the builder's flat black reads as a hole on a dark page: lift the paint, and show the deck as plate
    const plate = !!m.bumpMap || m.roughness === 0.5;
    m.color.setHex(plate ? 0x41464c : 0x24272b); m.metalness = plate ? 0.72 : 0.64; m.roughness = plate ? 0.46 : 0.34;
  }
}
function edgesOf(root) {
  const pos = [], v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh) return;
    [].concat(o.material).forEach(prepMat);
    if (o.geometry.type === 'SphereGeometry' || o.userData.noEdge) return;
    const e = new THREE.EdgesGeometry(o.geometry, 30), a = e.attributes.position;
    for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); pos.push(v.x, v.y, v.z); }
    e.dispose();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return geo;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
let glowTex = null;
function lamp(parent, x, y, z, color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85, clippingPlanes: [solidPlane] }));
  s.position.set(x, y, z); s.scale.set(size, size, 1); parent.add(s);
}

function getBed(slug) {
  if (beds[slug]) return beds[slug];
  const series = BF.seriesBySlug(slug) || BF.seriesBySlug('ridge');
  const p = BF.params(series, BF.SIZES.LB_DRW, { truck: false, axleZ: AX });
  const g = buildBed(p);
  g.position.set(0, 0, 0);    // buildBed's gooseneck line moves the whole group instead of the ball; undo it
  const geo = edgesOf(g);
  g.add(new THREE.LineSegments(geo, edgeMat));
  const wire = new THREE.LineSegments(geo, wireMat); wire.renderOrder = 4; g.add(wire);
  for (const s of [-1, 1]) lamp(g, s * (W / 2 - 9), -2.55, L / 2 + 2.4, 0xff2a1a, 17);
  if (p.rack && p.rack !== 'none' && p.lights !== false) for (const f of [-0.35, 0, 0.35]) lamp(g, f * (W - 10), 34.6, -L / 2 + 2.2, 0xffa21a, 7.5);
  beds[slug] = g; return g;
}

// Ghost cab, chassis rails and wheels. The cab is a drawing on purpose: the bed is the product.
function buildTruck() {
  const g = new THREE.Group();
  const zb = -55, a = Math.asin(4 / 21);
  const sh = new THREE.Shape();
  sh.moveTo(zb, -20); sh.lineTo(zb, 40); sh.lineTo(zb - 3, 43); sh.lineTo(zb - 40, 43); sh.lineTo(zb - 60, 18);
  sh.lineTo(-170, 13); sh.lineTo(-178, 8); sh.lineTo(-178, -20); sh.lineTo(-160.6, -20);
  sh.absarc(-140, -24, 21, Math.PI - a, a, true); sh.lineTo(zb, -20);
  const cabGeo = new THREE.ExtrudeGeometry(sh, { depth: 80, bevelEnabled: false, curveSegments: 18 });
  const cab = new THREE.Mesh(cabGeo, cabFill); cab.rotation.y = -Math.PI / 2; cab.position.x = 40; cab.renderOrder = 2; g.add(cab);
  const cabEdges = new THREE.LineSegments(new THREE.EdgesGeometry(cabGeo, 30), cabLine);
  cabEdges.rotation.y = -Math.PI / 2; cabEdges.position.x = 40; cabEdges.renderOrder = 3; g.add(cabEdges);
  for (const s of [-1, 1]) {
    const pts = [[-58, 20], [-58, 39], [-93, 39], [-110, 20]].map(q => new THREE.Vector3(40.2 * s, q[1], q[0]));
    const loop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), cabLine); loop.renderOrder = 3; g.add(loop);
  }
  const solid = new THREE.Group(); g.add(solid);
  const dark = new THREE.MeshStandardMaterial({ color: 0x17191c, metalness: 0.6, roughness: 0.5 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.85, metalness: 0 });
  const rim = new THREE.MeshStandardMaterial({ color: 0x9ea4aa, metalness: 0.9, roughness: 0.3 });
  function tb(geo, m, x, y, z) { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = true; k.receiveShadow = true; solid.add(k); return k; }
  for (const s of [-1, 1]) tb(new THREE.BoxGeometry(2.5, 6, 215), dark, 17 * s, -10.25, -67.5);
  tb(new THREE.BoxGeometry(84, 6, 4), rubber, 0, -14, -180);
  const prof = [[9.6, -4.2], [15.2, -4.5], [16.2, -3.6], [16.5, -2], [16.5, 2], [16.2, 3.6], [15.2, 4.5], [9.6, 4.2]].map(q => new THREE.Vector2(q[0], q[1]));
  const tireGeo = new THREE.LatheGeometry(prof, 40); tireGeo.rotateZ(Math.PI / 2);
  // dished rim, the same on both faces so one geometry serves every wheel
  const dish = [[0, 1.5], [2.6, 1.5], [3.1, 0.8], [7.9, 0.6], [9.0, 3.0], [9.7, 3.3], [9.7, -3.3], [9.0, -3.0], [7.9, -0.6], [3.1, -0.8], [2.6, -1.5], [0, -1.5]].map(q => new THREE.Vector2(q[0], q[1]));
  const rimGeo = new THREE.LatheGeometry(dish, 40); rimGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(1.7, 1.7, 3.6, 20); hubGeo.rotateZ(Math.PI / 2);
  function wheel(x, z) { tb(tireGeo, rubber, x, -24, z); tb(rimGeo, rim, x, -24, z); tb(hubGeo, dark, x, -24, z); }
  for (const s of [-1, 1]) { wheel(27.5 * s, AX); wheel(38 * s, AX); wheel(36 * s, -140); }
  const axGeo = new THREE.CylinderGeometry(2.2, 2.2, 76, 16); axGeo.rotateZ(Math.PI / 2);
  tb(axGeo, dark, 0, -24, AX); tb(new THREE.SphereGeometry(5.5, 20, 14), dark, 0, -24, AX);
  tb(axGeo, dark, 0, -24, -140);
  const wire = new THREE.LineSegments(edgesOf(solid), wireMat); wire.renderOrder = 4; g.add(wire);
  return g;
}

// ---------- overlay drawing (leaders at the x-ray beat, one dimension at the fit beat) ----------
const NS = 'http://www.w3.org/2000/svg';
function el(tag, cls) { const e = document.createElementNS(NS, tag); if (cls) e.setAttribute('class', cls); return e; }
function makeDim(a, b, label, when, opt = {}) {
  const g = el('g', 'v4-dim'); const ln = el('line'), t1 = el('line'), t2 = el('line'), tx = el('text');
  tx.textContent = label; g.append(ln, t1, t2, tx);
  const ext = (opt.ext || []).map(() => { const e = el('line', 'v4-ext'); g.append(e); return e; });
  svg.append(g);
  return { g, ln, t1, t2, tx, ext, a, b, when, opt };
}
function makeLead(p, label, when, dx, dy) {
  const g = el('g', 'v4-lead'); const ln = el('line'), dot = el('circle'), tx = el('text');
  dot.setAttribute('r', 3); tx.textContent = label; g.append(ln, dot, tx); svg.append(g);
  return { g, ln, dot, tx, p, when, dx, dy };
}
let dims = [], leads = [];
function buildOverlay() {
  const near = (i) => () => clamp(1 - Math.abs(t - i) * 2.6);
  dims = [
    makeDim([W / 2 + 4, 56, -55], [W / 2 + 4, 56, AX], 'CAB TO AXLE 56"', near(2), { ext: [[[W / 2 + 4, 56, -55], [W / 2 + 4, -20, -55]], [[W / 2 + 4, 56, AX], [W / 2 + 4, -24, AX]]] })
  ];
  leads = [
    makeLead([26, 0, 32], '3/16" DECK PLATE', near(1), 76, -52),
    makeLead([-17, -4.5, 42], '4" CHANNEL SILLS', near(1), 64, 84),
    makeLead([24, -1.75, -24.75], '3" CROSSMEMBERS 12" OC', near(1), 86, -66)
  ];
}
function proj(p, out) {
  tmp.set(p[0], p[1], p[2]).project(camera);
  out.x = (tmp.x * 0.5 + 0.5) * w; out.y = (-tmp.y * 0.5 + 0.5) * h; return out;
}
const A = { x: 0, y: 0 }, B = { x: 0, y: 0 };
function setLine(e, x1, y1, x2, y2) { e.setAttribute('x1', x1.toFixed(1)); e.setAttribute('y1', y1.toFixed(1)); e.setAttribute('x2', x2.toFixed(1)); e.setAttribute('y2', y2.toFixed(1)); }
function drawOverlay() {
  for (const d of dims) {
    const o = live ? d.when() : 0; d.g.style.opacity = o; if (o < 0.01) { d.g.style.display = 'none'; continue; } d.g.style.display = '';
    proj(d.a, A); proj(d.b, B);
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len * 7, ny = dx / len * 7;
    setLine(d.ln, A.x, A.y, B.x, B.y); setLine(d.t1, A.x - nx, A.y - ny, A.x + nx, A.y + ny); setLine(d.t2, B.x - nx, B.y - ny, B.x + nx, B.y + ny);
    d.tx.setAttribute('x', ((A.x + B.x) / 2).toFixed(1)); d.tx.setAttribute('y', ((A.y + B.y) / 2 - 12).toFixed(1)); d.tx.setAttribute('text-anchor', 'middle');
    d.ext.forEach((e, i) => { const q = d.opt.ext[i]; proj(q[0], A); proj(q[1], B); setLine(e, A.x, A.y, B.x, B.y); });
  }
  const pad = narrow ? 12 : 28;
  for (const l of leads) {
    const o = live ? l.when() : 0; l.g.style.opacity = o; if (o < 0.01) { l.g.style.display = 'none'; continue; } l.g.style.display = '';
    proj(l.p, A);
    const s = narrow ? 0.6 : 1; let ex = A.x + l.dx * s, ey = A.y + l.dy * s;
    const tw = l.tx.getComputedTextLength ? l.tx.getComputedTextLength() : 120, right = l.dx >= 0;
    ex = right ? clamp(ex, pad, w - pad - tw - 8) : clamp(ex, pad + tw + 8, w - pad);
    setLine(l.ln, A.x, A.y, ex, ey); l.dot.setAttribute('cx', A.x.toFixed(1)); l.dot.setAttribute('cy', A.y.toFixed(1));
    l.tx.setAttribute('x', (ex + (right ? 8 : -8)).toFixed(1)); l.tx.setAttribute('y', (ey + 4).toFixed(1)); l.tx.setAttribute('text-anchor', right ? 'start' : 'end');
  }
}

// ---------- scene ------------------------------------------------------------
function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  camera = new THREE.PerspectiveCamera(27, 1, 5, 5000);
  scene.add(new THREE.HemisphereLight(0xdfe6ee, 0x1a1c1f, 0.45));
  const keyL = new THREE.DirectionalLight(0xffffff, 2.5); keyL.position.set(150, 230, 170); keyL.castShadow = true;
  const sm = window.innerWidth < 760 ? 1024 : 2048; keyL.shadow.mapSize.set(sm, sm);
  const sc = keyL.shadow.camera; sc.left = -220; sc.right = 220; sc.top = 220; sc.bottom = -220; sc.near = 10; sc.far = 900; keyL.shadow.bias = -0.0004;
  scene.add(keyL);
  const rimL = new THREE.DirectionalLight(0xffe6b0, 1.7); rimL.position.set(-210, 80, -130); scene.add(rimL);
  const fill = new THREE.DirectionalLight(0x9fc4ff, 0.6); fill.position.set(-90, 60, 230); scene.add(fill);

  glowTex = glowTexture();
  truck = buildTruck(); scene.add(truck);

  // the scan plane: a gold frame riding the cut, with a faint sheet of light inside it
  const hw = W / 2 + 12, y0 = GROUND + 1, y1 = 50;
  scan = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-hw, y0, 0), new THREE.Vector3(hw, y0, 0), new THREE.Vector3(hw, y1, 0), new THREE.Vector3(-hw, y1, 0)]),
    new THREE.LineBasicMaterial({ color: 0xFFD93B, transparent: true, opacity: 0, depthWrite: false }));
  scan.renderOrder = 6; scene.add(scan);
  scanGlow = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, y1 - y0), new THREE.MeshBasicMaterial({ color: 0xEDC108, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  scanGlow.position.y = (y0 + y1) / 2; scanGlow.renderOrder = 5; scene.add(scanGlow);

  // floor: one-foot grid that fades out, soft light pool, shadow catcher
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  g.strokeStyle = 'rgba(205,218,232,.55)'; g.lineWidth = 1;
  for (let i = 0; i <= 64; i++) { const q = i * 16 + 0.5; g.beginPath(); g.moveTo(q, 0); g.lineTo(q, 1024); g.moveTo(0, q); g.lineTo(1024, q); g.stroke(); }
  g.globalCompositeOperation = 'destination-in';
  const rg = g.createRadialGradient(512, 512, 60, 512, 512, 512); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 1024, 1024);
  const gt = new THREE.CanvasTexture(c); gt.anisotropy = 8;
  grid = new THREE.Mesh(new THREE.PlaneGeometry(768, 768), new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0.1, depthWrite: false }));
  grid.rotation.x = -Math.PI / 2; grid.position.set(0, GROUND, -40); scene.add(grid);
  const pc = document.createElement('canvas'); pc.width = pc.height = 256; const pg = pc.getContext('2d');
  const pr = pg.createRadialGradient(128, 128, 0, 128, 128, 128); pr.addColorStop(0, 'rgba(160,178,198,.9)'); pr.addColorStop(1, 'rgba(160,178,198,0)');
  pg.fillStyle = pr; pg.fillRect(0, 0, 256, 256);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc), transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, GROUND + 0.05, -30); scene.add(pool);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShadowMaterial({ opacity: 0.6 }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(0, GROUND + 0.1, -40); sh.receiveShadow = true; scene.add(sh);

  buildOverlay();
  setBed((window.V4 && window.V4.slug) || 'ridge', true);
}

function setBed(slug, animate) {
  const g = getBed(slug);
  if (bed && bed !== g) scene.remove(bed);
  if (bed !== g) { scene.add(g); bed = g; }
  if (animate && live) { drawT0 = 0; drawX = 1; } else { drawT0 = -1; drawX = 0; }
  dirty = true; kick();
}

function resize() {
  const r = stage.getBoundingClientRect(); w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
  narrow = w < 760;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2));
  renderer.setSize(w, h, false);
  svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  camera.aspect = w / h; dirty = true;
}

function progress() {
  if (!live) return 0;
  const r = story.getBoundingClientRect(), span = r.height - window.innerHeight;
  const p = span > 0 ? clamp(-r.top / span) : 0, seg = p * LAST, i = Math.min(LAST - 1, Math.floor(seg));
  return i + smooth(0.14, 0.86, seg - i);
}

function kick() { if (!raf) raf = requestAnimationFrame(frame); }

function frame(now) {
  raf = 0;
  const visible = story.getBoundingClientRect().bottom > 0 && !document.hidden;
  let busy = false;
  if (visible) {
    target = progress();
    const dt = target - t; if (Math.abs(dt) > 0.0005) { t += dt * 0.13; dirty = true; } else if (t !== target) { t = target; dirty = true; }
    if (drawT0 === 0) drawT0 = now;
    if (drawT0 > 0) {
      const k = clamp((now - drawT0 - 180) / 1150), e = k * k * (3 - 2 * k);
      drawX = 1 - e; dirty = true; busy = true;
      if (k >= 1) { drawT0 = -1; drawX = 0; }
    }
    const hero = clamp(1 - t * 1.6);
    if (!drag) {
      if (Math.abs(spinV) > 0.01) { spin += spinV; spinV *= 0.93; dirty = true; busy = true; }
      if (t > 0.02 && Math.abs(spin) > 0.02) { spin = ((spin + 180) % 360 + 360) % 360 - 180; spin *= 1 - clamp(t) * 0.14; dirty = true; busy = true; }
    } else busy = true;
    let sway = 0;
    if (live && hero > 0.01) { sway = Math.sin(now * 0.00022) * 5 * hero; dirty = true; busy = true; }
    if (dirty) { draw(sway); dirty = false; }
  }
  if (live && (busy || Math.abs(target - t) > 0.0005)) raf = requestAnimationFrame(frame);
}

function draw(sway) {
  const az = (mix((a, b, k) => lerp(a.az, b.az, k)) + sway + spin) * D, elv = mix((a, b, k) => lerp(a.el, b.el, k)) * D;
  const r = mix((a, b, k) => lerp(a.r, b.r, k)), sx = mix((a, b, k) => lerp(a.sx, b.sx, k)), sy = mix((a, b, k) => lerp(a.sy, b.sy, k));
  const tx = mix((a, b, k) => lerp(a.tg[0], b.tg[0], k)), ty = mix((a, b, k) => lerp(a.tg[1], b.tg[1], k)), tz = mix((a, b, k) => lerp(a.tg[2], b.tg[2], k));
  const cab = mix((a, b, k) => lerp(a.cab, b.cab, k));
  const vf = camera.fov * D, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect), d = r / Math.sin(Math.min(vf, hf) / 2);
  camera.position.set(tx + d * Math.sin(az) * Math.cos(elv), ty + d * Math.sin(elv), tz + d * Math.cos(az) * Math.cos(elv));
  camera.lookAt(tx, ty, tz);
  camera.setViewOffset(w, h, -sx * w, -sy * h, w, h);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();

  // x-ray amount: 0 = all steel, 1 = all lines. Scroll drives it, and a freshly picked bed is drawn in from lines.
  const xs = t <= 1 ? smooth(0.12, 0.8, t) : 1 - smooth(1.2, 1.8, t);
  const xr = Math.max(xs, drawX), z = lerp(Z0, Z1, xr);
  solidPlane.constant = -z; wirePlane.constant = z;
  const edge = Math.sin(Math.PI * clamp((z + L / 2 + 6) / (L + 12)));     // the frame only shows while it is crossing the bed
  scan.position.z = z; scan.material.opacity = 0.9 * edge; scan.visible = edge > 0.01;
  scanGlow.position.z = z; scanGlow.material.opacity = 0.1 * edge; scanGlow.visible = scan.visible;
  grid.material.opacity = lerp(0.08, 0.3, xr) * lerp(1, 0.4, clamp((elv / D - 12) / 28));
  cabFill.opacity = 0.03 + 0.06 * cab; cabLine.opacity = 0.16 + 0.42 * cab;
  renderer.render(scene, camera);
  drawOverlay();

  if (live) {
    const hw = clamp(1 - t * 2.4);
    for (const f of fades) { f.style.opacity = hw; f.style.pointerEvents = hw < 0.5 ? 'none' : ''; f.style.visibility = hw < 0.01 ? 'hidden' : ''; }
    if (rail) { rail.style.opacity = narrow ? hw : ''; rail.style.pointerEvents = narrow && hw < 0.5 ? 'none' : ''; }
    const ho = clamp(1 - t * 1.9);
    h1.style.opacity = ho; h1.style.transform = 'translate3d(0,' + (-t * 9).toFixed(2) + 'vh,0)'; h1.style.visibility = ho < 0.01 ? 'hidden' : '';
    host.style.cursor = t > 0.3 ? 'default' : '';
    beats.forEach((s, i) => { const o = clamp(1 - Math.abs(t - (i + 1)) * 2.4); s.style.opacity = o; s.style.visibility = o < 0.01 ? 'hidden' : 'visible'; s.style.transform = 'translate3d(0,' + ((t - (i + 1)) * -26).toFixed(1) + 'px,0)'; });
    ghosts.forEach((s, i) => { const o = clamp(1 - Math.abs(t - (i + 1)) * 1.7); s.style.opacity = o; s.style.transform = 'translate3d(' + ((i + 1 - t) * 14).toFixed(2) + 'vw,0,0)'; });
  }
}

function clearInline() {
  fades.forEach(f => f.removeAttribute('style')); h1.removeAttribute('style'); host.style.cursor = ''; if (rail) rail.removeAttribute('style');
  beats.forEach(s => s.removeAttribute('style')); ghosts.forEach(s => s.removeAttribute('style'));
}
function setMode() {
  const want = !reduce.matches && !document.body.classList.contains('no-motion');
  if (want !== live || !html.classList.contains('v4-gl')) {
    live = want; html.classList.toggle('v4-live', live); html.classList.add('v4-gl');
    if (!live) { t = target = 0; spin = spinV = 0; drawT0 = -1; drawX = 0; clearInline(); }
  }
  resize(); dirty = true; kick();
}

try {
  if (!story || !host || !BF) throw new Error('v4 story markup or catalog missing');
  init();
  setMode();
  if (live) { drawT0 = 0; drawX = 1; }
  html.classList.add('v4-ready');
  window.addEventListener('resize', setMode);
  window.addEventListener('scroll', kick, { passive: true });
  document.addEventListener('visibilitychange', kick);
  document.addEventListener('v4:bed', (ev) => setBed(ev.detail.slug, ev.detail.user));
  new MutationObserver(setMode).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  reduce.addEventListener('change', setMode);
  // drag sideways to turn the bed. Up and down still scrolls the page (touch-action: pan-y).
  host.addEventListener('pointerdown', (ev) => {
    if (!live || t > 0.3 || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    drag = { x: ev.clientX, id: ev.pointerId }; spinV = 0; stage.classList.add('is-drag');
    try { host.setPointerCapture(ev.pointerId); } catch (e) {}
    kick();
  });
  host.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const dx = ev.clientX - drag.x; drag.x = ev.clientX;
    spin -= dx * 0.32; spinV = -dx * 0.32; dirty = true; kick();
  });
  const drop = (ev) => { if (drag && ev.pointerId === drag.id) { drag = null; stage.classList.remove('is-drag'); kick(); } };
  host.addEventListener('pointerup', drop); host.addEventListener('pointercancel', drop);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { dirty = true; kick(); });
  const rest = ['track', 'hauler', 'range', 'crew', 'ridge'];
  const warm = () => { const sl = rest.shift(); if (!sl) return; getBed(sl); (window.requestIdleCallback || setTimeout)(warm, { timeout: 1500 }); };
  setTimeout(warm, 2200);
  window.__v4 = { get t() { return t; }, get slug() { return window.V4 && window.V4.slug; }, beds };
} catch (err) {
  console.warn('[v4] 3D model unavailable, showing the drawing instead.', err);
  html.classList.remove('v4-live', 'v4-gl');
  html.classList.add('v4-ready');
}
