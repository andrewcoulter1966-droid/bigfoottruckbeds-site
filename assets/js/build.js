// Bigfoot Truck Beds - configurator. State lives in the URL hash so a build is shareable.
import { BedViewer, webglOK } from './bed3d.js';
import { Annotator } from './annotate.js';
const D = window.BF;
const $ = (s, r = document) => r.querySelector(s);

const state = { step: 1, make: '', model: '', body: '', series: '', color: 'black', opts: {}, contact: {} };

// ---------- URL state ----------
function encode() {
  const o = state.opts; const parts = [];
  if (state.make) parts.push('t=' + [state.make, state.model, state.body].join('.'));
  if (state.series) parts.push('s=' + state.series);
  parts.push('c=' + state.color);
  const ok = Object.keys(o); if (ok.length) parts.push('o=' + ok.map(k => k + ':' + (typeof o[k] === 'boolean' ? (o[k] ? 1 : 0) : o[k])).join(','));
  return parts.join('&');
}
function decode() {
  const h = location.hash.replace(/^#/, ''); if (!h) return;
  h.split('&').forEach(kv => {
    const [k, v] = kv.split('='); if (!v) return;
    if (k === 't') { const [a, b, c] = v.split('.'); if (D.findModel(a, b) && D.SIZES[c]) { state.make = a; state.model = b; state.body = c; } }
    if (k === 's' && D.seriesBySlug(v)) state.series = v;
    if (k === 'c' && D.OPTIONS.colors.find(x => x.key === v)) state.color = v;
    if (k === 'o') v.split(',').forEach(p => { const [ok, ov] = p.split(':'); if (!ok) return; state.opts[ok] = /^\d+$/.test(ov) && !['boxes', 'overside'].includes(ok) ? ov === '1' : (/^\d+$/.test(ov) ? +ov : ov); });
  });
  if (state.body && !state.series) state.step = 2; else if (state.series) state.step = 3;
}
function push() { history.replaceState(null, '', '#' + encode()); }

// ---------- derived ----------
const size = () => state.body ? D.SIZES[state.body] : null;
const series = () => state.series ? D.seriesBySlug(state.series) : null;
function params() {
  const s = series() || D.seriesBySlug('track'); const z = size() || D.SIZES.LB_SRW;
  const p = D.params(s, z, Object.assign({ color: state.color }, state.opts), D.findModel(state.make, state.model));
  // service body does not take a gooseneck unless asked; keep its boxes
  return p;
}

// ---------- 3D ----------
let viewer = null, ann = null, rev = 0;
function stage() {
  const el = $('#stage');
  if (!webglOK()) { el.classList.add('nogl'); return; }
  // 10/19/26: one fixed pull cropped the bed off both edges of a phone stage.
  // A narrow, short stage needs the camera further back for the same object.
  const pullFor = () => (window.innerWidth <= 900 ? 2.12 : 1.56);
  viewer = new BedViewer(el); viewer.heroPull = pullFor(); viewer.set(params()); viewer.view('hero');
  window.addEventListener('resize', () => {
    const p = pullFor();
    if (p !== viewer.heroPull) { viewer.heroPull = p; viewer.view('hero'); }
  });
  // live dimension annotations, same engine as the home hero
  const annHost = el.querySelector('.cfg-ann');
  if (annHost) {
    ann = new Annotator(annHost, viewer);
    let f = 0; viewer.onFrame = () => { if ((f++ & 1) === 0) ann.draw(); };
  }
  $$('[data-view]').forEach(b => b.addEventListener('click', () => { $$('[data-view]').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); viewer.view(b.dataset.view); }));
  const colors = $('#colors');
  colors.innerHTML = D.OPTIONS.colors.map(c => `<button type="button" data-color="${c.key}" aria-label="${c.label}" aria-pressed="${c.key === state.color}" title="${c.label}"><i style="background:${c.hex}"></i></button>`).join('');
  colors.addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (!b) return; state.color = b.dataset.color; $$('[data-color]', colors).forEach(x => x.setAttribute('aria-pressed', x === b)); refresh(); });
}
function $$(s, r = document) { return [...r.querySelectorAll(s)]; }
function refresh() {
  if (viewer) viewer.set(params());
  const z = size(); const s = series();
  $('#dims').innerHTML = z ? `<b>${z.label}</b> &middot; ${z.drw ? 'dual' : 'single'} rear wheel` : 'Pick your truck to size the bed';
  $('#stage-title').textContent = s ? `${s.name} ${s.kicker}` : 'Your bed';
  $('#stage-sub').textContent = s ? s.kicker : 'Start with your truck.';
  drawAnnotations(); renderCutSheet();
  push(); renderFoot();
}

// ---------- panel ----------
function renderSteps() {
  $$('.cfg-steps button').forEach(b => {
    const n = +b.dataset.step;
    b.setAttribute('aria-current', n === state.step ? 'step' : 'false');
    b.classList.toggle('done', (n === 1 && !!state.body) || (n === 2 && !!state.series) || (n === 3 && !!state.series));
    b.disabled = (n >= 2 && !state.body) || (n >= 3 && !state.series);
  });
}
function go(n) { state.step = n; renderSteps(); renderBody(); renderFoot(); $('.cfg-body').scrollTop = 0; }

function renderBody() {
  const body = $('.cfg-body');
  if (state.step === 1) return renderTruck(body);
  if (state.step === 2) return renderSeries(body);
  if (state.step === 3) return renderOptions(body);
  return renderQuote(body);
}

function renderTruck(body) {
  const mk = D.MAKES.find(m => m.key === state.make); const md = D.findModel(state.make, state.model);
  body.innerHTML = `
    <h3>Your truck</h3><p class="hint">Three picks and we know the bed size, the width and where the wheels land.</p>
    <div class="group-title">Make</div>
    <div class="choice-grid">${D.MAKES.map(m => `<button type="button" class="choice" data-make="${m.key}" aria-pressed="${m.key === state.make}"><b>${m.name}</b></button>`).join('')}</div>
    ${mk ? `<div class="group-title">Model</div><div class="choice-grid one">${mk.models.map(m => `<button type="button" class="choice" data-model="${m.key}" aria-pressed="${m.key === state.model}"><b>${m.name}</b><span>${m.years}</span></button>`).join('')}</div>` : ''}
    ${md ? `<div class="group-title">Rear wheels and bed</div><div class="choice-grid one">${md.bodies.map(b => `<button type="button" class="choice" data-body="${b}" aria-pressed="${b === state.body}"><b>${D.BODIES[b].label}</b><span>${D.BODIES[b].help}</span></button>`).join('')}</div>` : ''}
    ${state.body ? `<div class="fit-callout">Bed size <b>${size().label}</b>. ${D.seriesThatFit(state.body).length} of our ${D.SERIES.length} beds come in this size.</div>` : ''}
    <details class="faq" style="margin-top:8px"><summary style="font-size:16px;padding:12px 0">Not sure about cab to axle?</summary><div class="a" style="font-size:14px">Stand at the back of the cab and run a tape straight back to the center of the rear wheel hub. Short beds measure 38 to 42 inches, long beds 56 to 58. A bare cab and chassis is usually 60 or 84. Send us a phone photo of the tape if you want us to call it.</div></details>`;
  body.onclick = e => {
    const b = e.target.closest('.choice'); if (!b) return;
    if (b.dataset.make) { state.make = b.dataset.make; state.model = ''; state.body = ''; }
    if (b.dataset.model) { state.model = b.dataset.model; state.body = ''; }
    if (b.dataset.body) { state.body = b.dataset.body; if (state.series && !series().fits.includes(state.body)) state.series = ''; }
    renderTruck(body); renderSteps(); refresh();
    if (b.dataset.body) setTimeout(() => go(2), 350);
  };
}

function renderSeries(body) {
  const z = size(); const fit = D.seriesThatFit(state.body);
  body.innerHTML = `
    <h3>Pick the bed</h3><p class="hint">${fit.length} beds fit a ${z.label}. The rest are shown greyed out so you know they exist.</p>
    <div class="choice-grid one">${D.SERIES.map(s => { const ok = s.fits.includes(state.body); return `<button type="button" class="choice ${ok ? '' : 'unfit'}" data-series="${s.slug}" aria-pressed="${s.slug === state.series}" ${ok ? '' : 'disabled'}><b>${s.name} <span style="font-weight:600;font-family:var(--body);font-size:13px;text-transform:none;letter-spacing:0">${s.kicker}</span></b><span>${ok ? s.forWho : 'Not built in this size.'}</span></button>`; }).join('')}</div>`;
  body.onclick = e => {
    const b = e.target.closest('.choice'); if (!b || b.disabled) return;
    state.series = b.dataset.series; state.opts = {}; renderSeries(body); renderSteps(); refresh(); setTimeout(() => go(3), 300);
  };
}

function cur(k) { const s = series(); return k in state.opts ? state.opts[k] : s.base[k]; }
function renderOptions(body) {
  const s = series(); const O = D.OPTIONS;
  const seg = (k, list) => `<div class="seg" data-seg="${k}">${list.map(o => `<button type="button" data-v="${o.key}" aria-pressed="${String(cur(k)) === String(o.key)}">${o.label}</button>`).join('')}</div>`;
  body.innerHTML = `
    <h3>${s.name} options</h3><p class="hint">Everything here changes the bed on screen. Standard items are already on.</p>
    <div class="group-title">Headache rack</div>
    <div class="choice-grid">${O.rack.map(o => `<button type="button" class="choice" data-opt="rack" data-v="${o.key}" aria-pressed="${cur('rack') === o.key}"><b>${o.label}</b><span>${o.help}</span></button>`).join('')}</div>
    <div class="group-title">Deck surface</div>
    <div class="choice-grid">${O.deck.map(o => `<button type="button" class="choice" data-opt="deck" data-v="${o.key}" aria-pressed="${cur('deck') === o.key}"><b>${o.label}</b><span>${o.help}</span></button>`).join('')}</div>
    <div class="group-title">Storage</div>
    <div class="opt-row"><div><b>${s.base.skirted ? 'Front skirt toolboxes' : 'Under-body toolboxes'}</b><span>Steel, stainless paddle latch, weather seal.</span></div>${seg('boxes', O.boxes)}</div>
    <div class="opt-row"><div><b>Over-the-side boxes</b><span>Top-mount on the deck edge, behind the rack.</span></div>${seg('overside', O.overside)}</div>
    <div class="group-title">Hitch, lights, rail</div>
    ${O.toggles.map(t => `<div class="opt-row"><div><b>${t.label}</b><span>${t.help}</span></div><button type="button" class="switch" role="switch" data-tog="${t.key}" aria-checked="${!!cur(t.key)}" aria-label="${t.label}"></button></div>`).join('')}
    <div class="group-title" style="margin-top:26px">Color</div>
    <p class="hint">Use the swatches on the 3D view. Black is standard.</p>`;
  body.onclick = e => {
    const c = e.target.closest('.choice[data-opt]'); const sb = e.target.closest('[data-seg] button'); const tg = e.target.closest('.switch');
    if (c) { state.opts[c.dataset.opt] = c.dataset.v; }
    else if (sb) { state.opts[sb.closest('[data-seg]').dataset.seg] = +sb.dataset.v; }
    else if (tg) { state.opts[tg.dataset.tog] = !cur(tg.dataset.tog); }
    else return;
    renderOptions(body); refresh();
  };
}

function summaryRows() {
  const s = series(), z = size(), md = D.findModel(state.make, state.model), mk = D.MAKES.find(m => m.key === state.make);
  const rows = [
    ['Truck', `${mk.name} ${md.name}`], ['Configuration', D.BODIES[state.body].label], ['Bed size', z.label],
    ['Series', `${s.name} ${s.kicker}`], ['Headache rack', D.OPTIONS.rack.find(o => o.key === cur('rack')).label], ['Deck', D.OPTIONS.deck.find(o => o.key === cur('deck')).label],
    ['Toolboxes', D.OPTIONS.boxes.find(o => o.key === cur('boxes')).label], ['Over-the-side boxes', D.OPTIONS.overside.find(o => o.key === cur('overside')).label],
    ['Gooseneck ball', cur('gooseneck') ? 'Yes' : 'No'], ['Rear receiver', cur('receiver') ? 'Yes' : 'No'], ['LED package', cur('lights') ? 'Yes' : 'No'], ['Rub rail', cur('rubRail') ? 'Yes' : 'No'],
    ['Color', D.OPTIONS.colors.find(c => c.key === state.color).label],
  ];
  return rows;
}
function renderQuote(body) {
  const rows = summaryRows();
  body.innerHTML = `
    <h3>Send it to the shop</h3><p class="hint">We call back with a price and a build date. The link below is your build, share it with anyone.</p>
    <ul class="summary-list">${rows.map(r => `<li><span>${r[0]}</span><span>${r[1]}</span></li>`).join('')}</ul>
    <div class="share"><input id="share-url" readonly value="${location.href}" aria-label="Build link" /><button type="button" class="btn btn-dark btn-sm" id="copy">Copy</button></div>
    <form id="qf" style="margin-top:22px" novalidate>
      <div class="field"><label for="q-name">Name</label><input id="q-name" name="name" required autocomplete="name" /><span class="err">Need a name to call you by.</span></div>
      <div class="field"><label for="q-phone">Phone</label><input id="q-phone" name="phone" type="tel" required autocomplete="tel" inputmode="tel" /><span class="err">Need a number to call.</span></div>
      <div class="field"><label for="q-email">Email</label><input id="q-email" name="email" type="email" autocomplete="email" /></div>
      <div class="field"><label for="q-zip">Zip code</label><input id="q-zip" name="zip" inputmode="numeric" autocomplete="postal-code" /></div>
      <div class="field"><label for="q-when">When do you need it?</label><select id="q-when" name="when"><option>Ready now</option><option>Within 30 days</option><option>1 to 3 months</option><option>Still researching</option></select></div>
      <div class="field"><label for="q-notes">Anything else</label><textarea id="q-notes" name="notes" placeholder=""></textarea></div>
      <button class="btn btn-primary" style="width:100%" type="submit">Send My Build</button>
      <p class="hint" style="margin-top:10px">No spam. A person from Mulberry calls or texts you back.</p>
    </form>
    <div id="sent" style="display:none" class="fit-callout"><b>Got it.</b> Your build is in the shop's queue. We will call during business hours. Save your build link in case you want to change anything.</div>`;
  $('#copy').onclick = () => { navigator.clipboard.writeText(location.href).then(() => BF_toast('Build link copied')); };
  $('#qf').onsubmit = e => {
    e.preventDefault(); let ok = true;
    ['q-name', 'q-phone'].forEach(id => { const f = $('#' + id); const bad = !f.value.trim(); f.closest('.field').classList.toggle('invalid', bad); if (bad) ok = false; });
    if (!ok) return;
    const payload = { build: encode(), link: location.href, summary: Object.fromEntries(rows), contact: Object.fromEntries(new FormData(e.target)) };
    // DEMO: no CRM wired yet. The real site posts this to the Bigfoot CRM web hook.
    try { localStorage.setItem('bf_last_build', JSON.stringify(payload)); } catch (err) {}
    console.log('BUILD SUBMITTED (demo)', payload);
    e.target.style.display = 'none'; $('#sent').style.display = 'block'; BF_toast('Build sent to the shop');
  };
}

function renderFoot() {
  const f = $('.cfg-foot'); const s = series(); const z = size();
  f.querySelector('.sum').innerHTML = `<b>${s ? s.name : 'No bed yet'}</b>${z ? z.label : 'Pick your truck'}${s ? ' &middot; ' + D.OPTIONS.colors.find(c => c.key === state.color).label : ''}`;
  const back = $('#back'), next = $('#next');
  back.disabled = state.step === 1;
  next.disabled = (state.step === 1 && !state.body) || (state.step === 2 && !state.series) || state.step === 4;
  next.textContent = state.step === 3 ? 'Review and Send' : 'Next';
}


// ---------- live dimensions on the model ----------
const FT = n => { const f = Math.floor(n / 12), i = Math.round(n % 12); return i ? `${f}' ${i}"` : `${f}' 0"`; };
function drawAnnotations() {
  if (!ann || !viewer || !viewer.params) return;
  const p = viewer.params, L = p.length, W = p.width;
  const a = [
    { kind: 'dim', a: [-W / 2, 0, -L / 2], b: [-W / 2, 0, L / 2], label: `${FT(L)}`, off: 40 },
    { kind: 'dim', a: [-W / 2, 0, L / 2], b: [W / 2, 0, L / 2], label: `${W}"`, off: 34, flip: true },
  ];
  // Leader callouts need horizontal room to land. On a phone stage (390px wide)
  // three of them pile onto each other and onto the floating stage cards, which
  // is most of the "tightness" Drew saw on 10/19. The two dimensions are the
  // part that earns its place at that size; the callouts are desktop only.
  if (window.innerWidth > 900) {
    if (p.rack && p.rack !== 'none') a.push({ kind: 'lead', a: [0, 44, -L / 2 + 2], label: 'HEADACHE RACK', dx: 120, dy: 34 });
    if (p.boxes) a.push({ kind: 'lead', a: [-W / 2, -7, L * 0.04], label: `${p.boxes > 1 ? '2' : '1'} UNDERDECK BOX`, dx: -100, dy: 56 });
    if (p.gooseneck) a.push({ kind: 'lead', a: [0, 0, -L * 0.06], label: 'GOOSENECK BALL', dx: 90, dy: 64 });
  }
  ann.set(a);
}

// ---------- the cut sheet: a shop drawing that updates with every click ----------
function buildNo() {
  // a stable short number off the build hash, so two identical builds read the same
  const h = encode(); let n = 0;
  for (let i = 0; i < h.length; i++) n = (n * 31 + h.charCodeAt(i)) >>> 0;
  return String(n % 10000).padStart(4, '0');
}
function renderCutSheet() {
  const t = $('#cs-table'); if (!t) return;
  const s = series(), z = size(), p = params();
  const md = D.findModel(state.make, state.model), mk = D.MAKES.find(m => m.key === state.make);
  const rows = [];
  if (mk && md) rows.push(['Chassis', `${mk.name} ${md.name}`.toUpperCase()]);
  if (state.body) rows.push(['Cab to axle', `${D.caInches(state.make, state.body)}"`]);
  if (z) rows.push(['Deck', `${FT(z.length)} x ${z.width}"`], ['Rear wheels', z.drw ? 'Dual' : 'Single']);
  if (mk && md) rows.push(['Frame rail', `${md.frame}" outside`]);
  if (s) rows.push(['Series', s.name.toUpperCase()]);
  if (p.rack) rows.push(['Rack', String(p.rack).toUpperCase()]);
  rows.push(['Deck plate', String(p.deck || 'tread').toUpperCase()]);
  if (p.boxes) rows.push(['Underdeck boxes', String(p.boxes)]);
  if (p.overside) rows.push(['Over-side boxes', String(p.overside)]);
  rows.push(['Gooseneck', p.gooseneck ? 'YES' : 'NO'], ['Receiver', p.receiver ? 'YES' : 'NO'],
            ['LED package', p.lights ? 'YES' : 'NO'], ['Rub rail', p.rubRail ? 'YES' : 'NO'],
            ['Finish', String(state.color).toUpperCase()]);
  t.querySelector('tbody').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
  const r = $('#cs-rev');
  if (r) r.textContent = `DWG BF-TB-${buildNo()} / REV ${String.fromCharCode(65 + (rev++ % 26))}`;
}

// ---------- boot ----------
decode();
stage();
$$('.cfg-steps button').forEach(b => b.addEventListener('click', () => { if (!b.disabled) go(+b.dataset.step); }));
$('#back').addEventListener('click', () => go(Math.max(1, state.step - 1)));
$('#next').addEventListener('click', () => go(Math.min(4, state.step + 1)));
renderSteps(); renderBody(); refresh();
const csp = $('#cs-print'); if (csp) csp.addEventListener('click', () => window.print());
