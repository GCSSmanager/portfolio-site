function initCrmProcess() {
  const root = document.querySelector('[data-crm-process]');
  const svg = root?.querySelector('.crm-process__wires');
  const layer = svg?.querySelector('.crm-process__wires-g');
  if (!root || !svg || !layer) return;

  const NS = 'http://www.w3.org/2000/svg';
  const steps = ['s1', 's2', 's3', 's4', 's5', 's6'];
  let frame = 0;

  function node(id) {
    return root.querySelector(`[data-process="${id}"]`);
  }

  function box(el) {
    const a = el.getBoundingClientRect();
    const s = root.getBoundingClientRect();
    return {
      l: a.left - s.left,
      r: a.right - s.left,
      t: a.top - s.top,
      b: a.bottom - s.top,
      cx: (a.left + a.right) / 2 - s.left,
      cy: (a.top + a.bottom) / 2 - s.top,
    };
  }

  function path(d) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('marker-end', 'url(#crm-process-ah)');
    return p;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function across(from, fromSide, to, toSide) {
    const x1 = fromSide === 'r' ? from.r : from.l;
    const x2 = toSide === 'l' ? to.l : to.r;
    const overlapTop = Math.max(from.t, to.t);
    const overlapBot = Math.min(from.b, to.b);

    if (overlapBot - overlapTop >= 10) {
      const y = (overlapTop + overlapBot) / 2;
      return path(`M${x1} ${y}L${x2} ${y}`);
    }

    const y1 = clamp(from.cy, from.t + 6, from.b - 6);
    const y2 = clamp(y1, to.t + 6, to.b - 6);
    const yFrom = clamp(y2, from.t + 6, from.b - 6);

    if (Math.abs(yFrom - y2) < 1.5) {
      return path(`M${x1} ${yFrom}L${x2} ${y2}`);
    }

    const xMid = (x1 + x2) / 2;
    return path(`M${x1} ${yFrom}L${xMid} ${yFrom}L${xMid} ${y2}L${x2} ${y2}`);
  }

  function downIntoTop(from, to) {
    const railY = clamp(to.t - 12, from.b + 4, to.t - 2);
    const yStart = clamp(Math.min(from.b, railY - 2), from.t + 8, from.b - 4);
    return path(`M${from.cx} ${yStart}L${from.cx} ${railY}L${to.cx} ${railY}L${to.cx} ${to.t}`);
  }

  function draw() {
    const els = {};
    for (const id of steps) {
      els[id] = node(id);
      if (!els[id]) return;
    }

    const w = root.clientWidth;
    const h = root.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const b = {};
    for (const id of steps) {
      b[id] = box(els[id]);
    }

    const mobile = window.matchMedia('(max-width: 48rem)').matches;
    const desktop = window.matchMedia('(min-width: 62rem)').matches;

    let wires;
    if (mobile) {
      wires = [
        downIntoTop(b.s1, b.s2),
        downIntoTop(b.s2, b.s3),
        downIntoTop(b.s3, b.s4),
        downIntoTop(b.s4, b.s5),
        downIntoTop(b.s5, b.s6),
      ];
    } else if (desktop) {
      wires = [
        across(b.s1, 'r', b.s2, 'l'),
        across(b.s2, 'r', b.s3, 'l'),
        downIntoTop(b.s3, b.s4),
        across(b.s4, 'r', b.s5, 'l'),
        across(b.s5, 'r', b.s6, 'l'),
      ];
    } else {
      wires = [
        across(b.s1, 'r', b.s2, 'l'),
        downIntoTop(b.s2, b.s3),
        across(b.s3, 'r', b.s4, 'l'),
        downIntoTop(b.s4, b.s5),
        across(b.s5, 'r', b.s6, 'l'),
      ];
    }

    layer.replaceChildren(...wires);
  }

  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  }

  const ro = new ResizeObserver(schedule);
  ro.observe(root);
  window.addEventListener('resize', schedule);
  schedule();
}
