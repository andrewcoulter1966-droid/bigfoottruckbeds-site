/* Bigfoot Truck Beds, simple home page (index-simple.html). Moved out of the page 11/23/26 so the page's
   Content-Security-Policy can refuse every inline script. No keys, no tokens: the form posts to a public endpoint. */

/* First-bed photos: shown only when add_bed_photos.py has written the list (assets/simple/first-bed.js). */
(function () {
  var list = window.BF_FIRST_BED || [];
  var grid = document.getElementById('bed-grid');
  if (!list.length || !grid) return;
  list.forEach(function (p) {
    var f = document.createElement('figure'), i = document.createElement('img');
    i.src = p.src; i.alt = p.alt || 'The first Bigfoot truck bed'; i.loading = 'lazy'; i.decoding = 'async'; i.width = p.w || 1200; i.height = p.h || 900;
    if (p.at) i.style.objectPosition = i.style.transformOrigin = p.at;                 // where to look in the photo
    if (p.zoom > 1 && p.zoom <= 4) i.style.transform = 'scale(' + (+p.zoom) + ')';   // zoom in on the subject
    var box = document.createElement('div'); box.className = 'ph'; box.appendChild(i);
    f.appendChild(box);
    if (p.caption) { var c = document.createElement('figcaption'); c.textContent = p.caption; f.appendChild(c); }
    grid.appendChild(f);
  });
  document.getElementById('first-bed').hidden = false;
})();

/* Visit counting + the ad pixel slots.
   1) First-party count, always on: one small note to our own server (portal /t) when the page opens, when the quote
      form is started, when it is sent, and when a call button is tapped. No cookie, no personal data, bots skipped.
      Drew reads the totals at the portal's /stats page.
   2) Meta Pixel and Google Analytics 4: OFF until an ID is put in assets/simple/config.js. Only ever on the real
      site (never the preview copy), and never for a browser that sends Do Not Track / Global Privacy Control.
      When on: PageView on open, Lead on form sent, Contact on call tap. */
(function () {
  'use strict';
  var BEACON = 'https://portal.bigfoottruckbeds.com/t';
  var cfg = window.BF_TRACK || {}, nav = navigator, loc = location;
  var bot = !!nav.webdriver || /bot|crawl|spider|headless|lighthouse|pagespeed/i.test(nav.userAgent || '');
  function param(k) {
    var m = new RegExp('[?&]' + k + '=([^&#]*)').exec(loc.search);
    try { return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')).slice(0, 60) : ''; } catch (e) { return ''; }
  }
  var ref = '';
  try { if (document.referrer) { ref = new URL(document.referrer).hostname; if (ref === loc.hostname) ref = ''; } } catch (e) {}
  function count(ev) {
    if (bot) return;
    var body = JSON.stringify({ e: ev, r: ref, s: param('utm_source'), m: param('utm_medium'), c: param('utm_campaign'), w: window.innerWidth || 0 });
    try { if (nav.sendBeacon && nav.sendBeacon(BEACON, body)) return; } catch (e) {}
    try { fetch(BEACON, { method: 'POST', body: body, keepalive: true, credentials: 'omit', mode: 'no-cors' }); } catch (e) {}
  }

  var real = loc.hostname === 'bigfoottruckbeds.com' || loc.hostname === 'www.bigfoottruckbeds.com';
  var optout = !!nav.globalPrivacyControl || nav.doNotTrack === '1' || window.doNotTrack === '1';
  var fbId = /^\d{10,20}$/.test(cfg.metaPixelId || '') ? cfg.metaPixelId : '';
  var gaId = /^G-[A-Z0-9]{6,14}$/.test(cfg.ga4Id || '') ? cfg.ga4Id : '';
  function load(src) { var s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }
  if (real && !bot && !optout && fbId) {
    var fbq = window.fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
    window._fbq = fbq; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
    load('https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', fbId); fbq('track', 'PageView');
  }
  if (real && !bot && !optout && gaId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', gaId);           // config sends the page view
    load('https://www.googletagmanager.com/gtag/js?id=' + gaId);
  }

  window.BF_track = function (ev) {
    count(ev);
    if (ev === 'form_send') { if (window.fbq) window.fbq('track', 'Lead'); if (window.gtag) window.gtag('event', 'generate_lead'); }
    if (ev === 'call') { if (window.fbq) window.fbq('track', 'Contact'); if (window.gtag) window.gtag('event', 'contact', { method: 'phone' }); }
  };
  count('view');
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
    if (a) window.BF_track('call');
  });
  var form = document.getElementById('qf'), started = false;
  if (form) form.addEventListener('focusin', function () { if (!started) { started = true; window.BF_track('form_start'); } });
})();

/* Quote form: same endpoint, fields and bot guards as assets/v4/quote.js (portal/app.py POST /quote).
   The server decides who gets the email; nothing here can change the recipient. */
(function () {
  'use strict';
  var ENDPOINT = 'https://portal.bigfoottruckbeds.com/quote';
  var SHOP = '(813) 295-1151';
  var doc = document, form = doc.getElementById('qf');
  if (!form) return;
  var t0 = Date.now();
  var errBox = doc.getElementById('qf-err'), send = doc.getElementById('qf-send'), done = doc.getElementById('qf-done');
  function field(n) { return form.querySelector('[data-f="' + n + '"]'); }
  function mark(n, bad) { var f = field(n); if (f) f.classList.toggle('invalid', !!bad); }
  function val(n) { return (form.elements[n].value || '').trim(); }
  function showErr(m) { errBox.textContent = m; errBox.hidden = !m; }
  ['name', 'phone', 'email'].forEach(function (n) { form.elements[n].addEventListener('input', function () { mark(n, false); }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault(); showErr('');
    var name = val('name'), phone = val('phone'), email = val('email');
    var digits = phone.replace(/\D/g, '').length;
    var bad = { name: !name, phone: digits < 7 || digits > 15, email: !!email && !/^[^@\s<>",;]+@[^@\s<>",;]+\.[A-Za-z]{2,}$/.test(email) };
    var first = null;
    Object.keys(bad).forEach(function (k) { mark(k, bad[k]); if (bad[k] && !first) first = k; });
    if (first) { form.elements[first].focus(); return; }
    var body = { name: name, phone: phone, email: email, truck: val('truck'), bed: form.elements.bed.value, place: val('place'),
      notes: form.elements.notes.value.trim(), page: location.href.split('#')[0].slice(0, 300), bf_extra: form.elements.bf_extra.value, t: Date.now() - t0 };
    send.disabled = true; send.textContent = 'Sending';
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined, credentials: 'omit' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, j: j }; }); })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw { server: String(res.j.error || '') };
        doc.getElementById('qf-done-h').textContent = 'Got it, ' + name.split(/\s+/)[0];
        doc.getElementById('qf-done-p').textContent = 'Someone from the shop will call you at ' + phone + '.' +
          (res.j.preview ? ' (Test copy of the site: this went to Drew only, marked PREVIEW.)' : '');   // the server says so, see portal/app.py
        form.hidden = true; done.hidden = false; done.focus({ preventScroll: true });
        done.scrollIntoView({ block: 'center', behavior: 'smooth' });
        if (window.BF_track && !body.bf_extra) window.BF_track('form_send');
      })
      .catch(function (err) {
        clearTimeout(timer);
        var m = err && err.server;
        showErr((m && m.length < 140 ? m + ' ' : "That didn't go through. ") + 'You can also call the shop at ' + SHOP + '.');
        send.disabled = false; send.textContent = 'Send my request';
      });
  });
})();
