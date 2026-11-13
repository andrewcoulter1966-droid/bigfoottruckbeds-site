// Bigfoot Truck Beds - home page engine (10/19/26)
// Three things nobody in the truck-bed market has:
//   1. a live 3D bed in the hero with REAL dimension annotations drawn on it,
//      projected from the 3D model every frame so they ride the rotation
//   2. one shared WebGL viewer that moves into whichever lineup card is active
//   3. a cab-to-axle teaching drawing that redraws to the truck you picked
import { BedViewer, thumbnail, webglOK } from './bed3d.js';
import { Annotator } from './annotate.js';

const D = window.BF;
const SVGNS = 'http://www.w3.org/2000/svg';
const el = (t, a = {}) => { const n = document.createElementNS(SVGNS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };

/* ============================ hero ============================ */
const FT = n => {
  const f = Math.floor(n / 12), i = Math.round(n % 12);
  return i ? `${f}' ${i}"` : `${f}' 0"`;
};

function heroInit() {
  const scene = document.querySelector('.hero-scene');
  if (!scene || !D) return;
  const stage = scene.querySelector('.hero-stage');
  const annHost = scene.querySelector('.hero-ann');
  if (!webglOK()) { scene.classList.add('nogl-mode'); return; }

  const base = D.seriesBySlug('track');
  let params = D.params(base, D.SIZES.LB_SRW, { color: 'gray', rack: 'tube', lights: true, rubRail: true, truck: true, boxes: 1 });
  const viewer = new BedViewer(stage, { autoRotate: true });
  const narrow = window.innerWidth < 1100;
  viewer.heroPull = narrow ? 1.52 : 1.24;              // close enough that the bed fills the frame, not floats in it
  viewer.renderer.toneMappingExposure = 1.34;          // the hero bed has to read on a near-black ground
  viewer.controls.enableZoom = false;
  viewer.controls.target.set(0, narrow ? -2 : -14, 0);
  viewer.set(params);
  const ann = new Annotator(annHost, viewer);
  let frame = 0;
  viewer.onFrame = () => { if ((frame++ & 1) === 0) ann.draw(); };
  scene.addEventListener('pointerdown', () => scene.classList.add('touched'), { once: true });

  // four named camera steps, each with its own annotation set and its own line of copy
  const L = params.length, W = params.width;
  const STEPS = [
    {
      key: 'hero', view: 'hero', title: 'Measured off your truck, not off a shelf.',
      anns: [
        { kind: 'dim', a: [-W / 2, 0, -L / 2], b: [-W / 2, 0, L / 2], label: `DECK ${FT(L)}`, off: 46 },
        { kind: 'lead', a: [0, 0, L * 0.18], label: '3/16" TREADPLATE', dx: 120, dy: -84 },
      ],
    },
    {
      key: 'side', view: 'side', title: 'Long sills over the frame. Nothing hung off the back.',
      anns: [
        { kind: 'dim', a: [-W / 2, 0, -L / 2], b: [-W / 2, 0, L / 2], label: `OVERALL ${FT(L)}`, off: 54 },
        { kind: 'dim', a: [-W / 2, 0, L / 2], b: [-W / 2, -6.5, L / 2], label: 'SILL 4"', off: 30, flip: true },
        { kind: 'lead', a: [-W / 2, -4, -L * 0.3], label: 'CROSSMEMBERS 12" O.C.', dx: -110, dy: 72 },
      ],
    },
    {
      key: 'rear', view: 'rear', title: 'Full-width deck. Lights recessed where they cannot get hit.',
      anns: [
        { kind: 'dim', a: [-W / 2, 0, L / 2], b: [W / 2, 0, L / 2], label: `WIDTH ${W}"`, off: 44 },
        { kind: 'lead', a: [W / 2 - 4, -5, L / 2], label: 'LED CLUSTER', dx: 110, dy: -70 },
      ],
    },
    {
      key: 'top', view: 'top', title: 'Tie-downs where the load actually sits.',
      anns: [
        { kind: 'dim', a: [-W / 2, 0, -L / 2], b: [W / 2, 0, -L / 2], label: `${W}"`, off: 38 },
        { kind: 'dim', a: [W / 2, 0, -L / 2], b: [W / 2, 0, L / 2], label: FT(L), off: 38, flip: true },
      ],
    },
  ];

  const titleEl = scene.querySelector('[data-step-title]');
  const rail = scene.querySelector('.viewrail');
  let cur = -1;
  function go(i, userDriven) {
    i = Math.max(0, Math.min(STEPS.length - 1, i));
    if (i === cur) return;
    cur = i; const s = STEPS[i];
    viewer.view(s.view);
    // a phone has no room for leader callouts; keep the one dimension that matters
    ann.set(narrow ? s.anns.filter(x => x.kind === 'dim').slice(0, 1) : s.anns);
    if (titleEl) {
      titleEl.style.clipPath = 'inset(0 0 100% 0)';
      setTimeout(() => { titleEl.textContent = s.title; titleEl.style.clipPath = 'inset(0 0 0 0)'; }, 160);
    }
    if (rail) rail.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', j === i ? 'true' : 'false'));
    if (userDriven) viewer.auto = false;
  }
  if (rail) rail.querySelectorAll('button').forEach((b, j) => b.addEventListener('click', () => go(j, true)));

  // scroll drives the camera through the steps while the hero is on screen.
  // DESKTOP ONLY (10/19/26). On a phone the hero does not pin - it is a plain
  // stacked block - so the "track" is barely taller than the screen and the
  // four camera steps fired within ~200px of scrolling. That is what reads as
  // a double scroll: the page moves and the thing you are looking at lurches
  // through four views at once. The phone gets one view and a slow auto-turn.
  const track = narrow ? null : document.querySelector('.hero-track');
  if (track) {
    const onScroll = () => {
      const r = track.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      if (span <= 0) return;
      const p = Math.max(0, Math.min(0.999, -r.top / span));
      go(Math.floor(p * STEPS.length));
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  go(0);
  window.BF_hero = { viewer, ann, go };
}

/* ============================ lineup: one live viewer, moved ============================ */
function lineupInit() {
  const track = document.querySelector('.lineup-track');
  if (!track || !D) return;
  const gl = webglOK();
  const items = D.SERIES.map((s, i) => {
    const size = D.sizeFor(s.fits[Math.min(1, s.fits.length - 1)]);
    const p = D.params(s, size, { color: i % 2 ? 'gray' : 'black', truck: false });
    const node = document.createElement('article');
    node.className = 'lineup-item' + (i === 0 ? ' on' : '');
    node.innerHTML = `
      <div class="lineup-shot tick"><span class="lineup-no">0${i + 1} / 0${D.SERIES.length}</span></div>
      <div class="lineup-meta">
        <span class="kick">${s.kicker}</span>
        <h3>${s.name}</h3>
        <p>${s.blurb}</p>
        <div class="lineup-dims">
          <div><b>${FT(p.length)}</b><span>Deck</span></div>
          <div><b>${p.width}"</b><span>Wide</span></div>
          <div><b>${s.fits.length}</b><span>Sizes</span></div>
        </div>
        <a class="lineup-go" href="bed.html?s=${s.slug}">Open the drawing <span>&rarr;</span></a>
      </div>`;
    const shot = node.querySelector('.lineup-shot');
    if (gl) {
      const img = document.createElement('img');
      img.alt = s.name; img.src = thumbnail(p, 1180, 700);
      shot.appendChild(img);
    } else {
      shot.innerHTML += '<div class="nogl">3D preview needs WebGL</div>';
    }
    track.appendChild(node);
    return { node, shot, p, s };
  });

  // ONE shared live viewer, moved into whichever card is active. Five WebGL
  // contexts would choke a phone; one that follows the user does not.
  let viewer = null, host = null;
  function activate(i) {
    items.forEach((it, j) => it.node.classList.toggle('on', j === i));
    const it = items[i]; if (!it || !gl) return;
    if (!viewer) {
      host = document.createElement('div');
      host.style.cssText = 'position:absolute;inset:0;z-index:2';
      viewer = new BedViewer(host, { autoRotate: true });
      viewer.heroPull = 1.3;                 // frame the whole bed inside a card
      viewer.controls.enableZoom = false;
      viewer.controls.enableRotate = false;  // the rail scrolls; dragging a card should not fight it
      viewer.renderer.toneMappingExposure = 1.18;
    }
    it.shot.appendChild(host);
    viewer.set(it.p);
    viewer.resize();
    bar(i);
  }
  const prog = document.querySelector('.lineup-bar .prog i');
  function bar(i) { if (prog) { prog.style.width = (100 / items.length) + '%'; prog.style.left = (i * 100 / items.length) + '%'; } }

  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting && e.intersectionRatio > 0.62) activate(items.findIndex(it => it.node === e.target)); });
  }, { root: track, threshold: [0.62] });
  items.forEach(it => io.observe(it.node));
  items.forEach((it, i) => it.node.addEventListener('mouseenter', () => activate(i)));
  activate(0);

  const [prev, next] = document.querySelectorAll('.lineup-bar button');
  const step = () => Math.min(track.clientWidth * 0.9, 560);
  if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
}

/* ============================ cab-to-axle drawing ============================ */
// A side-view shop drawing that redraws to the truck the visitor picked.
// Research says not one truck-bed site teaches this, and it is the single
// number that decides which bed fits.
function caInit() {
  const host = document.querySelector('#ca-sheet');
  if (!host || !D) return;
  const W = 900, H = 330;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}` });
  host.prepend(svg);
  const g = el('g'); svg.appendChild(g);

  function draw(ca, deckLen, label) {
    g.replaceChildren();
    const sc = 760 / 260;                      // inches -> units, 260" of truck
    const groundY = 236, x0 = 70;
    const cabBack = x0 + 150;                  // back of cab
    const axleX = cabBack + ca * sc;
    const bedEnd = cabBack + deckLen * sc;

    const add = (t, a, cls) => { const n = el(t, a); if (cls) n.setAttribute('class', cls); g.appendChild(n); return n; };
    const line = (x1, y1, x2, y2, cls) => add('line', { x1, y1, x2, y2 }, cls);
    const txt = (x, y, s, cls, anchor) => { const n = add('text', { x, y, 'text-anchor': anchor || 'middle' }, cls); n.textContent = s; return n; };

    // ground
    line(20, groundY, W - 20, groundY, 'g-line');
    // cab: nose, windshield, roof, back panel - geometric, not a clipart truck
    add('path', { d: `M${x0} ${groundY - 16} L${x0 + 6} ${groundY - 62} L${x0 + 40} ${groundY - 70} L${x0 + 62} ${groundY - 112} L${cabBack - 6} ${groundY - 116} L${cabBack} ${groundY - 20} Z` }, 'g-cab');
    // frame rail running back from the cab
    add('rect', { x: cabBack - 6, y: groundY - 30, width: Math.max(40, bedEnd - cabBack + 24), height: 7 }, 'g-rail');
    // the bed sitting on the rail
    add('rect', { x: cabBack, y: groundY - 46, width: Math.max(30, bedEnd - cabBack), height: 15 }, 'g-bed');
    // headache rack
    add('rect', { x: cabBack + 2, y: groundY - 92, width: 7, height: 46 }, 'g-bed');
    // wheels
    [x0 + 34, axleX].forEach((cx, i) => {
      add('circle', { cx, cy: groundY - 22, r: 22 }, 'g-wheel');
      add('circle', { cx, cy: groundY - 22, r: 9 }, 'g-hub');
      if (i === 1) line(cx, groundY - 22, cx, 86, 'g-ext');
    });
    line(cabBack, groundY - 20, cabBack, 86, 'g-ext');
    // the CA dimension itself
    line(cabBack, 100, axleX, 100, 'g-dim');
    [[cabBack, 1], [axleX, -1]].forEach(([x, s]) => add('path', { d: `M${x + 8 * s} 95 L${x} 100 L${x + 8 * s} 105` }, 'g-dim'));
    txt((cabBack + axleX) / 2, 90, `CAB TO AXLE   ${ca}"`, 'g-txt d');
    // deck length dimension under the bed
    line(cabBack, groundY + 34, bedEnd, groundY + 34, 'g-dim thin');
    [[cabBack, 1], [bedEnd, -1]].forEach(([x, s]) => add('path', { d: `M${x + 8 * s} ${groundY + 29} L${x} ${groundY + 34} L${x + 8 * s} ${groundY + 39}` }, 'g-dim thin'));
    line(cabBack, groundY - 46, cabBack, groundY + 40, 'g-ext');
    line(bedEnd, groundY - 46, bedEnd, groundY + 40, 'g-ext');
    txt((cabBack + bedEnd) / 2, groundY + 52, `BED ${FT(deckLen)}`, 'g-txt');
    txt(x0 - 44, 34, label, 'g-txt l', 'start');   // truck name up in the sheet corner, clear of the CA dimension
  }

  const out = document.querySelector('#ca-readout');
  window.BF_ca = (make, model, body) => {
    const m = D.findModel(make, model);
    const size = (body && D.sizeFor(body)) || D.SIZES.LB_SRW;
    const ca = D.caInches(make, body);
    draw(ca, size.length, m ? `${D.MAKES.find(x => x.key === make).name} ${m.name}`.toUpperCase() : 'TYPICAL ONE-TON');
    if (out) {
      out.innerHTML = m
        ? `<b>${ca}"</b> cab to axle, <b>${FT(size.length)}</b> of deck, <b>${size.width}"</b> wide. ${D.BODIES[body] ? D.BODIES[body].help : ''}`
        : 'Pick your truck above and this drawing redraws to it.';
    }
  };
  window.BF_ca(null, null, null);
}

/* ============================ odometers ============================ */
function odoInit() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const n = e.target, to = parseFloat(n.dataset.to || n.textContent) || 0, t0 = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / 900);
      n.firstChild.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  document.querySelectorAll('.odo').forEach(n => io.observe(n));
}

heroInit(); lineupInit(); caInit(); odoInit();
