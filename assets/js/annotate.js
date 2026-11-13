// Bigfoot Truck Beds - live dimension annotations over a 3D bed.
// Specs are given in BED-LOCAL inches; the viewer projects them to screen
// pixels every frame, so the dimension lines ride the model as it turns.
// Shared by the home hero and the builder.
const SVGNS = 'http://www.w3.org/2000/svg';
const el = (t, a = {}) => { const n = document.createElementNS(SVGNS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };

export class Annotator {
  constructor(host, viewer) {
    this.viewer = viewer;
    this.svg = el('svg', { preserveAspectRatio: 'none' });
    host.appendChild(this.svg);
    this.specs = [];
    this.alive = true;
  }
  set(specs) {
    this.specs = specs;
    this.svg.replaceChildren();
    this.nodes = specs.map(s => {
      const g = el('g');
      const path = el('path', { class: 'dl' + (s.thin ? ' thin' : '') });
      const txt = el('text', { class: s.kind === 'dim' ? 'd' : '' });
      txt.textContent = s.label;
      g.appendChild(path);
      if (s.kind === 'dim') { g.appendChild(el('path', { class: 'dl thin' })); }
      g.appendChild(txt);
      this.svg.appendChild(g);
      return { g, path, txt, tick: g.querySelector('.dl.thin') };
    });
    this.draw();
  }
  draw() {
    if (!this.specs.length) return;
    const v = this.viewer, W = v.el.clientWidth, H = v.el.clientHeight;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.specs.forEach((s, i) => {
      const n = this.nodes[i]; if (!n) return;
      if (s.kind === 'dim') {
        const a = v.project(...s.a), b = v.project(...s.b);
        let dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        // perpendicular offset, flipped so the dimension sits outside the bed
        let nx = -dy / len, ny = dx / len;
        const o = s.off == null ? 42 : s.off;
        if (s.flip) { nx = -nx; ny = -ny; }
        const a2 = { x: a.x + nx * o, y: a.y + ny * o };
        const b2 = { x: b.x + nx * o, y: b.y + ny * o };
        n.path.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${a2.x.toFixed(1)} ${a2.y.toFixed(1)} M${b.x.toFixed(1)} ${b.y.toFixed(1)} L${b2.x.toFixed(1)} ${b2.y.toFixed(1)}`);
        // the dimension line itself, with arrow ticks
        const ax = (b2.x - a2.x) / len * 7, ay = (b2.y - a2.y) / len * 7;
        n.tick.setAttribute('d',
          `M${a2.x.toFixed(1)} ${a2.y.toFixed(1)} L${b2.x.toFixed(1)} ${b2.y.toFixed(1)}` +
          `M${(a2.x + ax - ay * 0.5).toFixed(1)} ${(a2.y + ay + ax * 0.5).toFixed(1)} L${a2.x.toFixed(1)} ${a2.y.toFixed(1)} L${(a2.x + ax + ay * 0.5).toFixed(1)} ${(a2.y + ay - ax * 0.5).toFixed(1)}` +
          `M${(b2.x - ax - ay * 0.5).toFixed(1)} ${(b2.y - ay + ax * 0.5).toFixed(1)} L${b2.x.toFixed(1)} ${b2.y.toFixed(1)} L${(b2.x - ax + ay * 0.5).toFixed(1)} ${(b2.y - ay - ax * 0.5).toFixed(1)}`);
        let ang = Math.atan2(b2.y - a2.y, b2.x - a2.x) * 180 / Math.PI;
        if (ang > 90 || ang < -90) ang += 180;
        // keep the figure on the glass: on a narrow phone stage a dimension
        // midpoint can land past the edge and the number disappears
        const half = ((s.label ? s.label.length : 0) * 3.2) + 6;
        const mx = Math.min(Math.max((a2.x + b2.x) / 2, half + 4), W - half - 4);
        const my = Math.min(Math.max((a2.y + b2.y) / 2, 14), H - 6);
        n.txt.setAttribute('transform', `translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${ang.toFixed(1)}) translate(0 -7)`);
        n.txt.setAttribute('text-anchor', 'middle');
      } else {
        // leader callout: point -> elbow -> rule -> label
        // 10/19/26: the label was placed with no regard for the edge of the
        // stage, so on a phone HEADACHE RACK and GOOSENECK BALL ran clean off
        // the right side of the glass. Flip the leader to the side with room,
        // then slide the whole elbow inward if the label still overhangs.
        const a = v.project(...s.a);
        let dx = s.dx || 90;
        const dy = s.dy || -60;
        const PAD = 6;
        const lw = (s.label ? s.label.length : 0) * 6.4 + 12;  // 10px mono, measured
        const endFor = d => {
          const e = a.x + d * 0.45, t = e + (d > 0 ? 52 : -52);
          return d > 0 ? t + 7 + lw : t - 7 - lw;
        };
        if (dx > 0 && endFor(dx) > W - PAD && endFor(-dx) > PAD) dx = -dx;
        else if (dx < 0 && endFor(dx) < PAD && endFor(-dx) < W - PAD) dx = -dx;
        let ex = a.x + dx * 0.45;
        let tx = ex + (dx > 0 ? 52 : -52);
        const labEnd = dx > 0 ? tx + 7 + lw : tx - 7 - lw;
        let shift = 0;
        if (labEnd > W - PAD) shift = (W - PAD) - labEnd;
        else if (labEnd < PAD) shift = PAD - labEnd;
        ex += shift; tx += shift;
        const ey = Math.min(Math.max(a.y + dy, PAD + 11), H - PAD - 4);
        n.path.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)} L${tx.toFixed(1)} ${ey.toFixed(1)}`);
        n.txt.setAttribute('x', (tx + (dx > 0 ? 7 : -7)).toFixed(1));
        n.txt.setAttribute('y', (ey - 5).toFixed(1));
        n.txt.setAttribute('text-anchor', dx > 0 ? 'start' : 'end');
      }
    });
  }
  clear() { this.specs = []; this.svg.replaceChildren(); }
}

