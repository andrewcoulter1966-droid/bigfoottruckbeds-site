// Bigfoot Truck Beds - shared page behaviour (header, reveal, mobile nav, fit widget)
(function () {
  const header = document.querySelector('.site-header');
  if (header) {
    const io = new IntersectionObserver(([e]) => header.classList.toggle('solid', !e.isIntersecting), { rootMargin: '-72px 0px 0px 0px', threshold: 0 });
    const sentinel = document.createElement('div'); sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
    document.body.prepend(sentinel); io.observe(sentinel);
    if (document.body.dataset.solidHeader === '1') header.classList.add('solid');
  }
  const tog = document.querySelector('.mobile-toggle'), mnav = document.querySelector('.mobile-nav');
  if (tog && mnav) tog.addEventListener('click', () => { const o = mnav.classList.toggle('open'); tog.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; });

  // active nav
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a, .mobile-nav a').forEach(a => { if (a.getAttribute('href').split('?')[0] === here) a.classList.add('active'); });

  // reveal on scroll
  const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal, [data-stagger]').forEach(el => rio.observe(el));

  // lazy videos: play only when visible (saves battery, avoids 9 decoders at once)
  const vio = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) { if (v.dataset.src && !v.src) { v.src = v.dataset.src; } v.play().catch(() => {}); } else { v.pause(); } }), { threshold: 0.15 });
  document.querySelectorAll('video[data-lazy]').forEach(v => vio.observe(v));

  // ---------- Fit finder widget (used on home + beds) ----------
  window.BF_fitWidget = function (root, onResult) {
    const D = window.BF; if (!root || !D) return;
    const mk = root.querySelector('[data-make]'), md = root.querySelector('[data-model]'), bd = root.querySelector('[data-body]'), out = root.querySelector('[data-out]'), go = root.querySelector('[data-go]');
    mk.innerHTML = '<option value="">Pick a make</option>' + D.MAKES.map(m => `<option value="${m.key}">${m.name}</option>`).join('');
    md.innerHTML = '<option value="">Model</option>'; md.disabled = true; bd.innerHTML = '<option value="">Rear wheels and bed</option>'; bd.disabled = true;
    function state() { return { make: mk.value, model: md.value, body: bd.value }; }
    mk.addEventListener('change', () => {
      const m = D.MAKES.find(x => x.key === mk.value);
      md.innerHTML = '<option value="">Model</option>' + (m ? m.models.map(x => `<option value="${x.key}">${x.name}</option>`).join('') : '');
      md.disabled = !m; bd.innerHTML = '<option value="">Rear wheels and bed</option>'; bd.disabled = true; render();
    });
    md.addEventListener('change', () => {
      const m = D.findModel(mk.value, md.value);
      bd.innerHTML = '<option value="">Rear wheels and bed</option>' + (m ? m.bodies.map(b => `<option value="${b}">${D.BODIES[b].label}</option>`).join('') : '');
      bd.disabled = !m; render();
    });
    bd.addEventListener('change', render);
    function render() {
      const s = state();
      if (!s.body) { out.innerHTML = '<span>Pick your truck and we will tell you the bed size that fits, then show you every bed we build in that size.</span>'; if (go) go.disabled = true; return; }
      const size = D.sizeFor(s.body); const n = D.seriesThatFit(s.body).length;
      out.innerHTML = `<strong>${size.label} bed</strong>${n} Bigfoot beds fit this truck. ${D.BODIES[s.body].help}`;
      if (go) { go.disabled = false; go.href = `build.html#t=${s.make}.${s.model}.${s.body}`; }
      if (onResult) onResult(s, size);
    }
    render();
    return { state, render };
  };

  // horizontal rail arrows
  document.querySelectorAll('.rail-wrap').forEach(w => {
    const rail = w.querySelector('.rail'); const [prev, next] = w.querySelectorAll('.rail-nav button');
    if (!rail || !prev) return;
    const step = () => Math.min(rail.clientWidth * 0.8, 440);
    prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
  });

  // simple toast
  window.BF_toast = function (msg) {
    let t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200);
  };
})();

/* ===== v2.1: continuous scroll state, fixed-notch chamfers, motion toggle ===== */
(function () {
  // header frost as a numeric var written every frame it changes (no class snap)
  const root = document.documentElement;
  let last = -1;
  const onScroll = () => {
    const f = Math.max(0, Math.min(1, window.scrollY / 180));
    if (Math.abs(f - last) > 0.01) { root.style.setProperty('--frost', f.toFixed(3)); last = f; }
    // the motion switch stays out of the hero, where it collided with the copy
    document.body.classList.toggle('past-hero', window.scrollY > window.innerHeight * 0.8);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // chamfered panels: keep the notch a FIXED 34px at any width
  const NOTCH = 34;
  const sizeChamfers = () => document.querySelectorAll('.chamfer').forEach(n => {
    n.style.setProperty('--notch-w', (n.offsetWidth - NOTCH) + 'px');
  });
  addEventListener('resize', sizeChamfers); sizeChamfers();
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(sizeChamfers);
    document.querySelectorAll('.chamfer').forEach(n => ro.observe(n));
  }

  // motion toggle, remembered per visitor
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let on = localStorage.getItem('bf_motion');
  on = on === null ? !reduce : on === '1';
  // the builder is a tool page: its corner belongs to the cut sheet, not a switch
  if (document.querySelector('main.cfg')) return;
  const btn = document.createElement('button');
  btn.className = 'motion-toggle'; btn.type = 'button'; btn.setAttribute('role', 'switch');
  const paint = () => {
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.innerHTML = '<i></i>Motion ' + (on ? 'on' : 'off');
    document.body.classList.toggle('no-motion', !on);
    document.querySelectorAll('video').forEach(v => { if (on) { v.play().catch(() => {}); } else { v.pause(); } });
  };
  btn.addEventListener('click', () => { on = !on; localStorage.setItem('bf_motion', on ? '1' : '0'); paint(); });
  document.body.appendChild(btn); paint();
})();

/* Reveal fallback. The IntersectionObserver in the block above misses when the
   root element carries overflow-x: clip, which leaves whole sections invisible.
   A cheap scroll check is the safety net - a hidden section is a dead page. */
(function () {
  const items = () => document.querySelectorAll('.reveal:not(.in), [data-stagger]:not(.in)');
  const check = () => {
    const h = window.innerHeight;
    items().forEach(el => { const t = el.getBoundingClientRect().top; if (t < h * 0.94) el.classList.add('in'); });
  };
  addEventListener('scroll', check, { passive: true });
  addEventListener('resize', check);
  check(); setTimeout(check, 250); setTimeout(check, 1200);
})();

/* Lazy-video fallback, same cause as the reveal fallback above: with
   overflow-x: clip on the root element the IntersectionObserver never fires,
   so the shop footage in the bento grid stayed black. Load and play any lazy
   video whose box is on screen, pause the ones that are not. */
(function () {
  const vids = () => document.querySelectorAll('video[data-lazy]');
  const check = () => {
    if (document.body.classList.contains('no-motion')) return;
    const h = window.innerHeight;
    vids().forEach(v => {
      const r = v.getBoundingClientRect();
      const visible = r.bottom > h * 0.06 && r.top < h * 0.94;
      if (visible) {
        if (v.dataset.src && !v.src) v.src = v.dataset.src;
        if (v.paused) v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  };
  addEventListener('scroll', check, { passive: true });
  addEventListener('resize', check);
  check(); setTimeout(check, 300); setTimeout(check, 1200);
})();
