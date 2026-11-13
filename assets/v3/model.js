// Bigfoot Truck Beds, home page v3.
// Code-built model of a skirted flatbed (8'6" x 97") on a ghosted cab and chassis.
// Units are inches. Deck top is y = 0, cab side is z = -L/2, rear is z = +L/2.
// This is a drawing aid, not a photo and not the production CAD.
import * as THREE from 'three';

export const L = 102, W = 97, GROUND = -40.5;

function treadTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#7d8388'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#c9ced2'; g.lineWidth = 6; g.lineCap = 'round';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const cx = x * 32 + 16, cy = y * 32 + 16, d = (x + y) % 2 ? 1 : -1;
    g.beginPath(); g.moveTo(cx - 9, cy - 9 * d); g.lineTo(cx + 9, cy + 9 * d); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / 24, L / 24);
  t.anisotropy = 4;
  return t;
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function buildModel() {
  const root = new THREE.Group();
  const parts = {};
  const glowTex = glowTexture();

  function part(name, ex) {
    const group = new THREE.Group(); group.name = name; root.add(group);
    const p = { name, group, explode: new THREE.Vector3(ex[0], ex[1], ex[2]), mats: [], meshes: [], edge: null };
    parts[name] = p; return p;
  }
  function mat(p, o) {
    const m = new THREE.MeshStandardMaterial(Object.assign({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }, o));
    m.userData.base = 1; p.mats.push(m); return m;
  }
  const paint = (p, c) => mat(p, { color: c || 0x23262a, metalness: 0.62, roughness: 0.36, envMapIntensity: 1.3 });
  const steel = (p) => mat(p, { color: 0x9ea4aa, metalness: 0.85, roughness: 0.28, envMapIntensity: 1.2 });
  const lamp = (p, c, e, i) => mat(p, { color: c, emissive: e, emissiveIntensity: i || 1.1, roughness: 0.4 });

  function add(p, geo, m, x, y, z, noEdge) {
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.noEdge = !!noEdge;
    p.group.add(mesh); p.meshes.push(mesh); return mesh;
  }
  const box = (p, w, h, d, x, y, z, m, noEdge) => add(p, new THREE.BoxGeometry(w, h, d), m, x, y, z, noEdge);
  function glow(p, x, y, z, color, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
    s.position.set(x, y, z); s.scale.set(size, size, 1); p.group.add(s); p.mats.push(s.material); s.material.userData.base = 0.85;
  }
  function finish(p) {
    const pos = [], v = new THREE.Vector3();
    for (const m of p.meshes) {
      if (m.userData.noEdge) continue;
      m.updateMatrix();
      const e = new THREE.EdgesGeometry(m.geometry, 30), a = e.attributes.position;
      for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(m.matrix); pos.push(v.x, v.y, v.z); }
      e.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    p.edge = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xbfc8d0, transparent: true, opacity: 0.18, depthWrite: false }));
    p.group.add(p.edge);
  }

  // ---- deck -------------------------------------------------------------
  const deck = part('deck', [0, 30, 0]);
  const tread = treadTexture();
  const dPaint = paint(deck, 0x2a2d31);
  const dTop = mat(deck, { color: 0x4a4f55, metalness: 0.7, roughness: 0.5, map: tread, bumpMap: tread, bumpScale: 0.6, envMapIntensity: 1.1 });
  box(deck, W, 0.25, L, 0, -0.125, 0, [dPaint, dPaint, dTop, dPaint, dPaint, dPaint]);
  add(deck, new THREE.CylinderGeometry(5.5, 5.5, 0.2, 40), mat(deck, { color: 0x101113, metalness: 0.6, roughness: 0.5 }), 0, 0.08, -1);
  add(deck, new THREE.SphereGeometry(1.4, 20, 14), steel(deck), 0, 1.1, -1, true);
  finish(deck);

  // ---- frame: crossmembers, long sills, side rails, rub rail, pockets -----
  const frame = part('frame', [0, 0, 0]);
  const fPaint = paint(frame, 0x202327);
  const n = Math.floor(L / 12);
  for (let i = 0; i <= n; i++) box(frame, W - 2, 3, 1.5, 0, -1.75, -L / 2 + 1.5 + i * ((L - 3) / n), fPaint);
  for (const s of [-1, 1]) {
    box(frame, 2, 4, L - 2, 17 * s, -5.25, 0, fPaint);
    box(frame, 1.5, 3.5, L, (W / 2 - 0.75) * s, -2, 0, fPaint);
    box(frame, 0.5, 2, L - 6, (W / 2 + 1.25) * s, -1.5, 0, fPaint);
    const pk = Math.max(3, Math.round(L / 24));
    for (let i = 0; i < pk; i++) box(frame, 1.1, 3.6, 3.2, (W / 2 + 0.5) * s, -2, -L / 2 + 12 + i * ((L - 24) / (pk - 1)), fPaint);
  }
  finish(frame);

  // ---- skirts and built-in boxes ------------------------------------------
  for (const s of [-1, 1]) {
    const sk = part(s < 0 ? 'skirtL' : 'skirtR', [40 * s, 0, 0]);
    const sp = paint(sk, 0x24272b);
    box(sk, 1, 15, 31, 48 * s, -11.25, -35.5, sp);
    box(sk, 1, 15, 29, 48 * s, -11.25, 36.5, sp);
    box(sk, 1, 3, 42, 48 * s, -5.25, 1, sp);
    box(sk, 0.4, 11, 22, 48.6 * s, -11.25, -35.5, paint(sk, 0x2b2f34));
    box(sk, 0.5, 1.2, 4, 48.95 * s, -11.25, -27, steel(sk), true);
    finish(sk);
    const bx = part(s < 0 ? 'boxL' : 'boxR', [18 * s, 0, 0]);
    box(bx, 16, 14, 26, 39 * s, -11.25, -34, paint(bx, 0x1c1e21));
    finish(bx);
  }

  // ---- headache rack --------------------------------------------------------
  const rack = part('rack', [0, 26, -10]);
  const rp = paint(rack, 0x25282c);
  for (const s of [-1, 1]) box(rack, 2, 34, 2, 45.5 * s, 17, -49.5, rp);
  box(rack, 93, 2, 2, 0, 33, -49.5, rp);
  box(rack, 89, 1.5, 1.5, 0, 17, -49.5, rp);
  box(rack, 89, 2, 2, 0, 1, -49.5, rp);
  for (const x of [-30, -12, 12, 30]) box(rack, 1.2, 32, 1.2, x, 17, -49.5, rp);
  const amber = lamp(rack, 0x7a4a00, 0xffa21a, 1.2);
  for (const x of [-8, 0, 8]) { box(rack, 3, 1.2, 1.4, x, 34.6, -49.5, amber, true); glow(rack, x, 34.8, -49.2, 0xffa21a, 7); }
  finish(rack);

  // ---- rear apron, lights, receiver -----------------------------------------
  const rear = part('rear', [0, 0, 26]);
  const ap = paint(rear, 0x23262a);
  box(rear, W, 12, 1, 0, -6.25, 51.5, ap);
  const red = lamp(rear, 0x8c0e0e, 0xff2a1a, 1.3), white = lamp(rear, 0x9a9a9a, 0xffffff, 0.35);
  for (const s of [-1, 1]) {
    box(rear, 6.2, 2.2, 0.8, 39.5 * s, -6.5, 52.2, red, true); glow(rear, 39.5 * s, -6.5, 52.9, 0xff2a1a, 16);
    box(rear, 6.2, 2.2, 0.8, 31.5 * s, -6.5, 52.2, white, true);
    box(rear, 14, 20, 0.4, 32.75 * s, -20, 49, mat(rear, { color: 0x0e0f10, roughness: 0.9, metalness: 0 }), true);
  }
  for (const x of [-8, 0, 8]) box(rear, 1.8, 1, 0.6, x, -2.5, 52.2, red, true);
  box(rear, 40, 3, 3, 0, -15, 49.5, ap);
  box(rear, 3.4, 3.4, 10, 0, -15, 48.5, mat(rear, { color: 0x121315, metalness: 0.7, roughness: 0.45 }));
  finish(rear);

  // ---- truck: ghost cab, chassis, wheels -------------------------------------
  const truck = new THREE.Group(); truck.name = 'truck'; root.add(truck);
  const zb = -55, a = Math.asin(4 / 21);
  const sh = new THREE.Shape();
  sh.moveTo(zb, -20); sh.lineTo(zb, 40); sh.lineTo(zb - 3, 43); sh.lineTo(zb - 40, 43); sh.lineTo(zb - 60, 18);
  sh.lineTo(-170, 13); sh.lineTo(-178, 8); sh.lineTo(-178, -20); sh.lineTo(-160.6, -20);
  sh.absarc(-140, -24, 21, Math.PI - a, a, true); sh.lineTo(zb, -20);
  const cabGeo = new THREE.ExtrudeGeometry(sh, { depth: 80, bevelEnabled: false, curveSegments: 18 });
  const cabFill = new THREE.MeshBasicMaterial({ color: 0xaebccb, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const cab = new THREE.Mesh(cabGeo, cabFill); cab.rotation.y = -Math.PI / 2; cab.position.x = 40; cab.renderOrder = 2; truck.add(cab);
  const cabLine = new THREE.LineBasicMaterial({ color: 0xcfd8e0, transparent: true, opacity: 0.3, depthWrite: false });
  const cabEdges = new THREE.LineSegments(new THREE.EdgesGeometry(cabGeo, 30), cabLine);
  cabEdges.rotation.y = -Math.PI / 2; cabEdges.position.x = 40; cabEdges.renderOrder = 3; truck.add(cabEdges);
  for (const s of [-1, 1]) {
    const pts = [[-58, 20], [-58, 39], [-93, 39], [-110, 20]].map(q => new THREE.Vector3(40.2 * s, q[1], q[0]));
    const loop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), cabLine); loop.renderOrder = 3; truck.add(loop);
  }
  const dark = new THREE.MeshStandardMaterial({ color: 0x17191c, metalness: 0.6, roughness: 0.5 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.85, metalness: 0 });
  const rim = new THREE.MeshStandardMaterial({ color: 0x9ea4aa, metalness: 0.9, roughness: 0.3 });
  function tb(geo, m, x, y, z) { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = true; k.receiveShadow = true; truck.add(k); return k; }
  for (const s of [-1, 1]) tb(new THREE.BoxGeometry(2.5, 6, 215), dark, 17 * s, -10.25, -67.5);
  tb(new THREE.BoxGeometry(84, 6, 4), dark, 0, -14, -180);
  const prof = [[9.6, -4.2], [15.2, -4.5], [16.2, -3.6], [16.5, -2], [16.5, 2], [16.2, 3.6], [15.2, 4.5], [9.6, 4.2]].map(q => new THREE.Vector2(q[0], q[1]));
  const tireGeo = new THREE.LatheGeometry(prof, 40); tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(9.6, 9.6, 6.5, 32); rimGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(3, 3, 9.2, 20); hubGeo.rotateZ(Math.PI / 2);
  function wheel(x, z) { tb(tireGeo, rubber, x, -24, z); tb(rimGeo, rim, x, -24, z); tb(hubGeo, dark, x, -24, z); }
  for (const s of [-1, 1]) { wheel(27.5 * s, 1); wheel(38 * s, 1); wheel(36 * s, -140); }
  const axGeo = new THREE.CylinderGeometry(2.2, 2.2, 76, 16); axGeo.rotateZ(Math.PI / 2);
  tb(axGeo, dark, 0, -24, 1); tb(new THREE.SphereGeometry(5.5, 20, 14), dark, 0, -24, 1);
  tb(axGeo, dark, 0, -24, -140);

  return { root, parts, truck, cabFill, cabLine };
}
