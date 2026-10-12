function initCrmAboutSnake() {
  const root = document.querySelector('.crm-article__snake');
  const svg = root && root.querySelector('.crm-article__snake-wires');
  const layer = svg && svg.querySelector('.crm-article__snake-wires-g');
  if (!root || !svg || !layer) return;

  const NS = 'http://www.w3.org/2000/svg';
  const names = ['site', 'd1', 'd2', 'd3', 'd4', 'call', 'met', 'tg', 'job', 'bank', 'stat'];
  let frame = 0;

  function node(name) {
    return root.querySelector(`[data-snake="${name}"]`);
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
    p.setAttribute('marker-end', 'url(#crm-snake-ah)');
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

  function shoulder() {
    return root.clientWidth < 768 ? 22 : 36;
  }

  function intoTop(from, to) {
    const drop = shoulder();
    const y = clamp(Math.min(from.cy, to.t - drop), from.t + 8, from.b - 8);
    const rail = y < to.t - 10 ? y : Math.min(from.b - 8, to.t - drop);
    return path(`M${from.l} ${rail}L${to.cx} ${rail}L${to.cx} ${to.t}`);
  }

  function outBottom(from, to) {
    const drop = shoulder();
    const y = clamp(Math.max(from.b + drop, to.t + 10), to.t + 10, to.b - 10);
    return path(`M${from.cx} ${from.b}L${from.cx} ${y}L${to.l} ${y}`);
  }

  function placeTelegram() {
    const tg = node('tg');
    const d2 = node('d2');
    const d3 = node('d3');
    const site = node('site');
    const bank = node('bank');
    tg.style.translate = '0 0';
    const tb = tg.getBoundingClientRect();
    const a = d2.getBoundingClientRect();
    const b = d3.getBoundingClientRect();
    let dy = Math.round((a.bottom + b.top) / 2 - (tb.top + tb.bottom) / 2);
    const minDy = Math.ceil(site.getBoundingClientRect().bottom + 8 - tb.top);
    const maxDy = Math.floor(bank.getBoundingClientRect().top - 8 - tb.bottom);
    if (minDy <= maxDy) dy = Math.max(minDy, Math.min(maxDy, dy));
    else dy = 0;
    tg.style.translate = `0 ${dy}px`;
  }

  function downIntoTop(from, to) {
    const railY = clamp(to.t - 16, from.b + 2, to.t - 2);
    return path(`M${from.cx} ${from.b}L${from.cx} ${railY}L${to.cx} ${railY}L${to.cx} ${to.t}`);
  }

  function draw() {
    const els = {};
    for (const name of names) {
      els[name] = node(name);
      if (!els[name]) return;
    }

    placeTelegram();

    const w = root.clientWidth;
    const h = root.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const site = box(els.site);
    const d1 = box(els.d1);
    const d2 = box(els.d2);
    const d3 = box(els.d3);
    const d4 = box(els.d4);
    const call = box(els.call);
    const met = box(els.met);
    const tg = box(els.tg);
    const job = box(els.job);
    const bank = box(els.bank);
    const stat = box(els.stat);

    layer.replaceChildren(
      across(site, 'r', d1, 'l'),
      across(d1, 'r', call, 'l'),
      downIntoTop(call, d2),
      across(d2, 'r', met, 'l'),
      intoTop(d2, tg),
      outBottom(tg, d3),
      across(d3, 'r', job, 'l'),
      window.matchMedia('(max-width: 43rem)').matches
        ? across(job, 'l', d4, 'r')
        : downIntoTop(job, d4),
      across(d4, 'l', bank, 'r'),
      across(d4, 'r', stat, 'l')
    );
  }

  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  }

  const ro = new ResizeObserver(schedule);
  ro.observe(root);
  root.querySelectorAll('img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', schedule, { once: true });
  });
  window.addEventListener('resize', schedule);
  schedule();
}
