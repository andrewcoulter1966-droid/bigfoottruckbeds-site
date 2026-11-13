// Bigfoot Truck Beds, home page v3: scroll-driven exploded model of the bed.
// Still mode (reduced motion, motion toggle off): one static frame, no pin, no listeners that move anything.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildModel, L, W, GROUND } from './model.js';

const html = document.documentElement;
const story = document.querySelector('.v3-story');
const stage = document.querySelector('.v3-stage');
const host = document.getElementById('v3-canvas');
const svg = document.querySelector('.v3-dims');
const heroUI = document.querySelector('.v3-hero-ui');
const steps = [...document.querySelectorAll('.v3-steps li')];
const ghosts = [...document.querySelectorAll('.v3-ghost span')];
const ticks = [...document.querySelectorAll('.v3-ticks i')];
const note = document.querySelector('.v3-model-note');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

const D = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

// Keyframes. az 0 looks from the rear; positive az swings to the passenger side. n = phone overrides.
const KEYS = [
  { az: 36, el: 12, r: 104, tg: [0, -10, -34], sx: 0.14, sy: 0.05, cab: 0.55, n: { az: 30, el: 15, r: 84, tg: [0, -8, -8], sx: 0, sy: -0.02 } },
  { az: 24, el: 32, r: 82, tg: [0, 8, 2], sx: 0.1, sy: 0.02, cab: 0.25, ex: { deck: 1 }, glow: { deck: 1 }, n: { r: 76, sx: 0, sy: -0.06 } },
  { az: -28, el: 44, r: 78, tg: [0, 0, 0], sx: 0.1, sy: 0, cab: 0.15, ex: { deck: 1.3 }, glow: { frame: 1 }, op: { deck: 0.1 }, n: { r: 72, sx: 0, sy: -0.06 } },
  { az: -52, el: 14, r: 110, tg: [0, 0, -6], sx: 0.17, sy: -0.03, cab: 0.25, ex: { skirtL: 1, skirtR: 1, boxL: 1, boxR: 1, rack: 1 }, glow: { skirtL: 1, skirtR: 1, boxL: 1, boxR: 1, rack: 1 }, n: { r: 96, sx: 0, sy: -0.06 } },
  { az: -90, el: 3, r: 108, tg: [0, -4, -62], sx: 0.04, sy: 0.02, cab: 1, n: { r: 88, tg: [0, -2, -16], sx: 0, sy: -0.06 } }
];
const LAST = KEYS.length - 1;

let renderer, scene, camera, model, grid, live = false, narrow = false, w = 1, h = 1;
let t = 0, target = 0, intro = 1, dirty = true, px = 0, py = 0, pxs = 0, pys = 0, raf = 0;
const tmp = new THREE.Vector3(), baseEdge = new THREE.Color(0xbfc8d0), gold = new THREE.Color(0xEDC108);

function key(i) { const k = KEYS[i]; return narrow && k.n ? Object.assign({}, k, k.n) : k; }
function mix(f) {
  const i = Math.min(LAST - 1, Math.floor(t)), k = clamp(t - i), a = key(i), b = key(i + 1);
  return f(a, b, k);
}
function partVal(field, name, dflt) {
  return mix((a, b, k) => lerp((a[field] && a[field][name] != null) ? a[field][name] : dflt, (b[field] && b[field][name] != null) ? b[field][name] : dflt, k));
}

// ---------- overlay drawing (dimension lines and leaders) -----------------
const NS = 'http://www.w3.org/2000/svg';
function el(tag, cls) { const e = document.createElementNS(NS, tag); if (cls) e.setAttribute('class', cls); return e; }
function makeDim(a, b, label, when, opt = {}) {
  const g = el('g', 'v3-dim'); const ln = el('line'), t1 = el('line'), t2 = el('line'), tx = el('text');
  tx.textContent = label; g.append(ln, t1, t2, tx);
  const ext = (opt.ext || []).map(() => { const e = el('line', 'v3-ext'); g.append(e); return e; });
  svg.append(g);
  return { g, ln, t1, t2, tx, ext, a, b, when, opt };
}
function makeLead(partName, p, label, when, dx, dy) {
  const g = el('g', 'v3-lead'); const ln = el('line'), dot = el('circle'), tx = el('text');
  dot.setAttribute('r', 3); tx.textContent = label; g.append(ln, dot, tx); svg.append(g);
  return { g, ln, dot, tx, partName, p, when, dx, dy };
}
let dims = [], leads = [];
function buildOverlay() {
  const near = (i) => () => clamp(1 - Math.abs(t - i) * 2.6);
  dims = [
    makeDim([W / 2 + 10, 0, -51], [W / 2 + 10, 0, 51], '8\'6"', near(0)),
    makeDim([-48.5, 0, L / 2 + 13], [48.5, 0, L / 2 + 13], '97"', () => narrow ? 0 : near(0)()),
    makeDim([-W / 2 - 4, 56, -55], [-W / 2 - 4, 56, 1], 'CAB TO AXLE 56"', near(4), { ext: [[[-W / 2 - 4, 56, -55], [-W / 2 - 4, -20, -55]], [[-W / 2 - 4, 56, 1], [-W / 2 - 4, -24, 1]]], up: true })
  ];
  leads = [
    makeLead('deck', [30, 0, 30], '3/16" TREADPLATE', near(1), 70, -46),
    makeLead('frame', [-17, -5, 40], '4" CHANNEL SILLS', near(2), -60, 70),
    makeLead('frame', [20, -1.5, -26], '3" CROSSMEMBERS 12" OC', near(2), 80, -60),
    makeLead('skirtL', [-48.6, -11, 36], 'FORMED SKIRT', near(3), 40, 74),
    makeLead('boxL', [-47, -6, -34], 'BUILT-IN BOX', near(3), -30, 86),
    makeLead('rack', [-30, 33, -49.5], 'HEADACHE RACK', near(3), -40, -44)
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
    const o = d.when(); d.g.style.opacity = o; if (o < 0.01) { d.g.style.display = 'none'; continue; } d.g.style.display = '';
    proj(d.a, A); proj(d.b, B);
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len * 7, ny = dx / len * 7;
    setLine(d.ln, A.x, A.y, B.x, B.y); setLine(d.t1, A.x - nx, A.y - ny, A.x + nx, A.y + ny); setLine(d.t2, B.x - nx, B.y - ny, B.x + nx, B.y + ny);
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    if (d.opt.up) { d.tx.setAttribute('x', mx.toFixed(1)); d.tx.setAttribute('y', (my - 12).toFixed(1)); d.tx.setAttribute('text-anchor', 'middle'); }
    else { const s = mx > w * 0.5 ? 1 : -1; d.tx.setAttribute('x', (mx + s * 14).toFixed(1)); d.tx.setAttribute('y', (my + 16).toFixed(1)); d.tx.setAttribute('text-anchor', s > 0 ? 'start' : 'end'); }
    d.ext.forEach((e, i) => { const q = d.opt.ext[i]; proj(q[0], A); proj(q[1], B); setLine(e, A.x, A.y, B.x, B.y); });
  }
  const pad = narrow ? 12 : 28;
  for (const l of leads) {
    const o = l.when(); l.g.style.opacity = o; if (o < 0.01) { l.g.style.display = 'none'; continue; } l.g.style.display = '';
    const g = model.parts[l.partName].group.position;
    proj([l.p[0] + g.x, l.p[1] + g.y, l.p[2] + g.z], A);
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
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  camera = new THREE.PerspectiveCamera(32, 1, 5, 4000);
  scene.add(new THREE.HemisphereLight(0xdfe6ee, 0x1a1c1f, 0.5));
  const keyL = new THREE.DirectionalLight(0xffffff, 2.4); keyL.position.set(140, 220, 160); keyL.castShadow = true;
  const sm = window.innerWidth < 760 ? 1024 : 2048; keyL.shadow.mapSize.set(sm, sm);
  const sc = keyL.shadow.camera; sc.left = -200; sc.right = 200; sc.top = 200; sc.bottom = -200; sc.near = 10; sc.far = 800; keyL.shadow.bias = -0.0004;
  scene.add(keyL);
  const rimL = new THREE.DirectionalLight(0xffe2a0, 1.7); rimL.position.set(-200, 90, -120); scene.add(rimL);
  const fill = new THREE.DirectionalLight(0x9fc4ff, 0.55); fill.position.set(-80, 60, 220); scene.add(fill);

  model = buildModel(); scene.add(model.root);

  // floor: one-foot grid that fades out, soft light pool, shadow catcher
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  g.strokeStyle = 'rgba(205,218,232,.55)'; g.lineWidth = 1;
  for (let i = 0; i <= 64; i++) { const q = i * 16 + 0.5; g.beginPath(); g.moveTo(q, 0); g.lineTo(q, 1024); g.moveTo(0, q); g.lineTo(1024, q); g.stroke(); }
  g.globalCompositeOperation = 'destination-in';
  const rg = g.createRadialGradient(512, 512, 60, 512, 512, 512); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 1024, 1024);
  const gt = new THREE.CanvasTexture(c); gt.anisotropy = 8;
  grid = new THREE.Mesh(new THREE.PlaneGeometry(768, 768), new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0.34, depthWrite: false }));
  grid.rotation.x = -Math.PI / 2; grid.position.set(0, GROUND, -40); scene.add(grid);
  const pc = document.createElement('canvas'); pc.width = pc.height = 256; const pg = pc.getContext('2d');
  const pr = pg.createRadialGradient(128, 128, 0, 128, 128, 128); pr.addColorStop(0, 'rgba(150,170,190,.9)'); pr.addColorStop(1, 'rgba(150,170,190,0)');
  pg.fillStyle = pr; pg.fillRect(0, 0, 256, 256);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc), transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, GROUND + 0.05, -30); scene.add(pool);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShadowMaterial({ opacity: 0.55 }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(0, GROUND + 0.1, -40); sh.receiveShadow = true; scene.add(sh);

  buildOverlay();
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

function frame(now) {
  raf = 0;
  const visible = story.getBoundingClientRect().bottom > 0 && !document.hidden;
  if (visible) {
    target = progress();
    const dt = target - t; if (Math.abs(dt) > 0.0005) { t += dt * 0.13; dirty = true; } else if (t !== target) { t = target; dirty = true; }
    if (intro > 0) { intro = Math.max(0, intro - 0.022); dirty = true; }
    const hero = clamp(1 - t * 1.5);
    let sway = 0;
    if (live && !narrow) { pxs += (px - pxs) * 0.06; pys += (py - pys) * 0.06; sway = Math.sin(now * 0.00025) * 2.5 * hero; if (hero > 0.01 || Math.abs(px - pxs) > 0.001) dirty = true; }
    if (dirty) { draw(sway); dirty = false; }
  }
  if (live) raf = requestAnimationFrame(frame);
}

function draw(sway) {
  const az = (mix((a, b, k) => lerp(a.az, b.az, k)) + sway + pxs * 4) * D, elv = (mix((a, b, k) => lerp(a.el, b.el, k)) - pys * 2) * D;
  const r = mix((a, b, k) => lerp(a.r, b.r, k)), sx = mix((a, b, k) => lerp(a.sx, b.sx, k)), sy = mix((a, b, k) => lerp(a.sy, b.sy, k));
  const tx = mix((a, b, k) => lerp(a.tg[0], b.tg[0], k)), ty = mix((a, b, k) => lerp(a.tg[1], b.tg[1], k)), tz = mix((a, b, k) => lerp(a.tg[2], b.tg[2], k));
  const cab = mix((a, b, k) => lerp(a.cab, b.cab, k));
  const vf = camera.fov * D, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect), d = r / Math.sin(Math.min(vf, hf) / 2);
  camera.position.set(tx + d * Math.sin(az) * Math.cos(elv), ty + d * Math.sin(elv), tz + d * Math.cos(az) * Math.cos(elv));
  camera.lookAt(tx, ty, tz);
  camera.setViewOffset(w, h, -sx * w, -sy * h, w, h);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();

  const settle = live ? intro * intro * 0.55 : 0;
  // the floor grid reads as noise when the camera looks down on it, so it fades as elevation rises
  grid.material.opacity = lerp(0.34, 0.1, clamp((elv / D - 12) / 28));
  for (const name in model.parts) {
    const p = model.parts[name], k = partVal('ex', name, 0) + settle, gl = partVal('glow', name, 0), op = partVal('op', name, 1);
    p.group.position.copy(p.explode).multiplyScalar(k);
    p.edge.material.color.copy(baseEdge).lerp(gold, gl); p.edge.material.opacity = lerp(0.18, 0.95, gl) * Math.max(op, 0.35);
    for (const m of p.mats) { const o = op * (m.userData.base || 1); m.opacity = o; m.transparent = o < 0.999 || m.isSpriteMaterial; m.depthWrite = op > 0.6 && !m.isSpriteMaterial; }
    for (const mesh of p.meshes) mesh.castShadow = op > 0.5;
  }
  model.cabFill.opacity = 0.03 + 0.07 * cab; model.cabLine.opacity = 0.14 + 0.5 * cab;
  renderer.render(scene, camera);
  drawOverlay();

  if (live) {
    const hw = clamp(1 - t * 2.6);
    heroUI.style.opacity = hw; heroUI.style.pointerEvents = hw < 0.5 ? 'none' : ''; heroUI.style.transform = 'translate3d(0,' + (-(1 - hw) * 18).toFixed(1) + 'px,0)';
    steps.forEach((s, i) => { const o = clamp(1 - Math.abs(t - (i + 1)) * 2.4); s.style.opacity = o; s.style.visibility = o < 0.01 ? 'hidden' : 'visible'; s.style.transform = 'translate3d(0,' + ((t - (i + 1)) * -26).toFixed(1) + 'px,0)'; });
    ghosts.forEach((s, i) => { const o = clamp(1 - Math.abs(t - (i + 1)) * 1.7); s.style.opacity = o; s.style.transform = 'translate3d(' + ((i + 1 - t) * 14).toFixed(2) + 'vw,0,0)'; });
    const act = Math.round(t); ticks.forEach((s, i) => s.classList.toggle('on', i === act));
  }
}

function clearInline() {
  heroUI.removeAttribute('style'); steps.forEach(s => s.removeAttribute('style')); ghosts.forEach(s => s.removeAttribute('style'));
}
function setMode() {
  const want = !reduce.matches && !document.body.classList.contains('no-motion');
  if (want !== live || !html.classList.contains('v3-gl')) {
    live = want; html.classList.toggle('v3-live', live); html.classList.add('v3-gl');
    if (!live) { t = target = 0; intro = 0; clearInline(); }
  }
  resize(); dirty = true;
  if (!raf) raf = requestAnimationFrame(frame);
}

try {
  if (!story || !host) throw new Error('v3 story markup missing');
  init();
  if (note) note.textContent = '3D model off the builder. Not a photo. Photos of the first bed go here.';
  setMode();
  window.addEventListener('resize', setMode);
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!raf) raf = requestAnimationFrame(frame); });
  new MutationObserver(setMode).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  reduce.addEventListener('change', setMode);
  if (fine.matches) stage.addEventListener('pointermove', (ev) => { px = ev.clientX / w - 0.5; py = ev.clientY / h - 0.5; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { dirty = true; if (!raf) raf = requestAnimationFrame(frame); });
} catch (err) {
  console.warn('[v3] 3D model unavailable, showing the drawing instead.', err);
  html.classList.remove('v3-live', 'v3-gl');
}
