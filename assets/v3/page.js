/* Bigfoot Truck Beds, home page v3. Plain script: everything on the page that is not the 3D model.
   The page reads fine with this file missing; it only adds the tab, size-picker and question behaviour. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, body = doc.body;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };

  /* the demo bar sits in the footer flow today. If it is ever made fixed, the hero keeps clear of it. */
  var demo = $('.demo-note');
  function setDemo() {
    var fixed = demo && getComputedStyle(demo).position === 'fixed';
    body.style.setProperty('--v3-demo', (fixed ? demo.offsetHeight : 0) + 'px');
  }
  setDemo();
  window.addEventListener('resize', setDemo);
  window.addEventListener('load', setDemo);

  /* lineup tabs */
  var tabs = $$('.v3-tabs [role="tab"]');
  function pick(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) t.removeAttribute('tabindex'); else t.setAttribute('tabindex', '-1');
      var panel = doc.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.classList.toggle('is-on', on);
    });
    if (focus) tab.focus();
    if (tab.scrollIntoView && window.innerWidth <= 760) {
      var row = tab.parentNode;
      row.scrollTo({ left: tab.offsetLeft - 20, behavior: 'smooth' });
    }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { pick(t, false); });
    t.addEventListener('keydown', function (e) {
      var n = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n < 0) return;
      e.preventDefault();
      pick(tabs[n], true);
    });
  });

  /* fit: size rows drive the plan drawing */
  var rows = $$('.v3-fit-rows button');
  var rects = $$('.v3-plan-sizes rect');
  var ticks = $$('.v3-plan-ticks text');
  var active = $('.v3-plan-active');
  var TICK = [0, 1, 1, 2, 3, 4, 5];
  function size(btn) {
    var i = btn.getAttribute('data-i');
    rows.forEach(function (b) {
      var on = b === btn;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    rects.forEach(function (r) { r.classList.toggle('on', r.getAttribute('data-i') === i); });
    ticks.forEach(function (t, k) { t.classList.toggle('on', k === TICK[+i]); });
    if (active) {
      active.textContent = btn.getAttribute('data-label');
      active.setAttribute('x', (+btn.getAttribute('data-len')) / 2);
    }
  }
  rows.forEach(function (b) {
    b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false');
    b.addEventListener('click', function () { size(b); });
    b.addEventListener('focus', function () { size(b); });
    b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') size(b); });
  });
  var first = rows.filter(function (b) { return b.classList.contains('on'); })[0];
  if (first) size(first);

  /* questions, from the shared catalog. Anything that mentions trailers is left out. */
  var list = doc.getElementById('v3-faq-list');
  var faq = window.BF && window.BF.FAQ;
  if (list && faq && faq.length) {
    var frag = doc.createDocumentFragment();
    faq.forEach(function (f) {
      if (!f || !f.q || /trailer/i.test(f.q + ' ' + f.a)) return;
      var d = doc.createElement('details'); d.className = 'v3-qa';
      var s = doc.createElement('summary'); s.textContent = f.q;
      var p = doc.createElement('p'); p.textContent = f.a;
      d.appendChild(s); d.appendChild(p); frag.appendChild(d);
    });
    if (frag.childNodes.length) { list.textContent = ''; list.appendChild(frag); }
  }

  /* in-view entrances. html { overflow-x: clip } stops IntersectionObserver on this site, so this checks scroll position. */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var watch = $$('.v3-plan, .v3-shop-h, .v3-cta-h');
  function motionOK() { return !reduce.matches && !body.classList.contains('no-motion'); }
  function check() {
    var h = window.innerHeight;
    watch = watch.filter(function (el) {
      if (el.getBoundingClientRect().top < h * 0.86) { el.classList.add('is-in'); return false; }
      return true;
    });
    if (!watch.length) window.removeEventListener('scroll', check);
  }
  if (motionOK() && watch.length) {
    root.classList.add('v3-anim');
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();
    /* safety net: never leave a headline hidden */
    window.addEventListener('load', function () { setTimeout(check, 400); });
  }
})();
