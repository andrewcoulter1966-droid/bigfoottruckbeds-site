/* Bigfoot Truck Beds, home page v4. Plain script: the five-bed rail and the card it drives.
   Works with no WebGL: the card text and the line drawing still change. stage.js listens for "v4:bed". */
(function () {
  'use strict';
  var doc = document, BF = window.BF;
  var tabs = Array.prototype.slice.call(doc.querySelectorAll('.v4-rail [role="tab"]'));
  if (!BF || !tabs.length) return;
  var card = doc.querySelector('.v4-card');
  var el = function (id) { return doc.getElementById(id); };
  var LABEL = { deck: 'Deck plate', sills: 'Long sills', cross: 'Crossmembers', gn: 'Gooseneck', boxes: 'Toolboxes', recv: 'Receiver', rack: 'Headache rack', arms: 'Bale arms', spikes: 'Spikes' };
  var narrow = window.matchMedia('(max-width: 760px)');

  function setOrientation() { tabs[0].parentNode.setAttribute('aria-orientation', narrow.matches ? 'horizontal' : 'vertical'); }
  setOrientation();
  if (narrow.addEventListener) narrow.addEventListener('change', setOrientation);

  function show(tab, user, focus) {
    var slug = tab.getAttribute('data-slug'), s = BF.seriesBySlug(slug);
    if (!s) return;
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) t.removeAttribute('tabindex'); else t.setAttribute('tabindex', '-1');
    });
    if (focus) tab.focus();
    var n = tabs.indexOf(tab) + 1;
    el('v4-n').textContent = (n < 10 ? '0' : '') + n;
    el('v4-kicker').textContent = s.kicker;
    el('v4-name').textContent = s.name;
    el('v4-for').textContent = s.forWho;
    var dl = el('v4-specs'); dl.textContent = '';
    Object.keys(s.specs).forEach(function (k) {
      var row = doc.createElement('div'), dt = doc.createElement('dt'), dd = doc.createElement('dd');
      dt.textContent = LABEL[k] || k; dd.textContent = s.specs[k];
      row.appendChild(dt); row.appendChild(dd); dl.appendChild(row);
    });
    el('v4-build').setAttribute('href', 'build.html#s=' + slug);
    el('v4-more').setAttribute('href', 'bed.html?s=' + slug);
    var fb = el('v4-fallback');
    if (fb) { fb.setAttribute('src', 'assets/img/beds/' + slug + '.webp'); fb.setAttribute('alt', 'Line drawing of the ' + s.name + ' ' + s.kicker.toLowerCase()); }
    if (user && card) { card.classList.remove('is-swap'); void card.offsetWidth; card.classList.add('is-swap'); }
    window.V4 = { slug: slug };
    doc.dispatchEvent(new CustomEvent('v4:bed', { detail: { slug: slug, user: !!user } }));
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(t, true, false); });
    t.addEventListener('keydown', function (e) {
      var n = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n < 0) return;
      e.preventDefault();
      show(tabs[n], true, true);
    });
  });
  var first = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
  window.V4 = { slug: first.getAttribute('data-slug') };
})();
