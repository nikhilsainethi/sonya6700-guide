/* a6700 Field Manual — interactions. No dependencies. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────── scene illustration (shared by all three viewfinders) ───────── */
  const pine = (x, y, h, c = '#2c4a48') => {
    const w = h * 0.42;
    return `<path fill="${c}" d="M${x} ${y - h}L${x + w * 0.5} ${y - h * 0.55}H${x + w * 0.22}L${x + w * 0.72} ${y - h * 0.22}H${x + w * 0.3}L${x + w} ${y}H${x - w}L${x - w * 0.3} ${y - h * 0.22}H${x - w * 0.72}L${x - w * 0.22} ${y - h * 0.55}H${x - w * 0.5}Z"/>`;
  };
  const row = (xs, y, h, c) => xs.map((x, i) => pine(x, y + (i % 3) * 3, h * (0.8 + ((i * 37) % 10) / 25), c)).join('');

  const sceneBack = (id) => `
    <defs><linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f97b8"/><stop offset="1" stop-color="#cfdfea"/></linearGradient></defs>
    <rect width="800" height="500" fill="url(#sky${id})"/>
    <circle cx="664" cy="78" r="30" fill="#fbf6e8"/>
    <path fill="#8ba7be" d="M0 318L92 196l64 62L262 128l92 116 74-62 96 92 88-118 92 98 96-52v170H0Z"/>
    <path fill="#eff4f8" d="M262 128l-34 44 22-8 12 16 18-18 16 14ZM612 156l-28 38 18-6 12 14 16-16 14 12ZM92 196l-22 29 16-6 10 12 14-10Z"/>
    <path fill="#a9bfd0" d="M0 340C120 304 250 322 370 306 510 288 650 262 800 280v130H0Z"/>
    ${row([22, 58, 96, 132, 168, 206], 336, 46, '#3d5c62')}
    ${row([402, 436, 470, 506], 314, 40, '#3d5c62')}
    ${row([716, 748, 782], 290, 44, '#3d5c62')}
    <path fill="#dbe6ee" d="M0 352C130 326 260 342 380 328 520 312 660 286 800 300v130H0Z"/>
    <g>
      <rect x="577" y="247" width="27" height="17" fill="#5a3b2c"/>
      <path fill="#3a2820" d="M573 248l17.500-14 17.500 14Z"/>
      <path fill="#f6f9fb" d="M571.500 247l19-15.500 19 15.500h-5l-14-11-14 11Z"/>
      <rect x="587.500" y="253.500" width="6" height="10.500" fill="#ff5a1f"/>
      <rect x="596.500" y="252" width="4.500" height="4.500" fill="#ffd27a"/>
      <rect x="598" y="236" width="3" height="6" fill="#3a2820"/>
      <circle cx="600.500" cy="231.500" r="1.800" fill="#eef3f6" opacity=".8"/><circle cx="603" cy="227" r="2.400" fill="#eef3f6" opacity=".6"/>
      <g transform="translate(-92 6)"><circle cx="622" cy="262.300" r="1.500" fill="#e9b994"/>
      <path stroke="#ff5a1f" stroke-width="2.200" stroke-linecap="round" d="M622 264.500v4.200"/>
      <path stroke="#0e1418" stroke-width="1.300" stroke-linecap="round" d="M621.300 269v3.600M622.800 269v3.600"/>
      <path stroke="#0e1418" stroke-width=".7" stroke-linecap="round" d="M618 273.400h8.500M624.500 265.500l2.600 6.500"/></g>
      ${pine(560, 266, 20, '#2c4a48')}${pine(548, 268, 14, '#2c4a48')}
    </g>
    <path fill="#f1f5f8" d="M0 384C150 356 300 392 462 374 606 358 704 380 800 366v134H0Z"/>
    <path fill="#c9d6e0" d="M420 420c70-14 170-12 260 2-90 6-180 8-260-2ZM500 470c80-10 180-8 300 0v8c-110 6-210 4-300-8ZM0 410c60-10 110-6 150 2-50 6-100 6-150-2Z"/>
    <g fill="#c9d6e0"><ellipse cx="392" cy="476" rx="7" ry="3"/><ellipse cx="368" cy="468" rx="6.500" ry="2.800"/><ellipse cx="350" cy="474" rx="6" ry="2.600"/><ellipse cx="328" cy="464" rx="5.500" ry="2.400"/><ellipse cx="312" cy="469" rx="5" ry="2.200"/></g>`;

  const sceneFront = () => `
    ${pine(74, 486, 300, '#1f3a39')}
    <path fill="#f1f5f8" d="M74 186l22 46-18-8-10 10ZM48 300l-26 40 30-12 14 12 18-14 34 18-30-48-14 10-12-12ZM30 396l-40 60 46-22 22 16 26-20 50 28-44-66-22 14-18-16Z"/>
    <path fill="#f1f5f8" d="M-10 470c60-18 150-18 220 0v40H-10Z"/>
    <ellipse cx="290" cy="459" rx="74" ry="8" fill="#c9d6e0"/>
    <rect x="232" y="372" width="17" height="80" rx="4" fill="#1a262f"/><rect x="254" y="372" width="17" height="80" rx="4" fill="#1a262f"/>
    <rect x="227" y="444" width="25" height="13" rx="4" fill="#0e1418"/><rect x="252" y="444" width="25" height="13" rx="4" fill="#0e1418"/>
    <rect x="214" y="290" width="18" height="74" rx="9" fill="#e04a14"/>
    <rect x="220" y="282" width="62" height="112" rx="19" fill="#ff5a1f"/>
    <rect x="270" y="290" width="18" height="74" rx="9" fill="#e04a14"/>
    <rect x="249.500" y="300" width="2" height="94" fill="#c63f0e"/>
    <circle cx="223" cy="366" r="8" fill="#0e1418"/><circle cx="279" cy="366" r="8" fill="#0e1418"/>
    <rect x="231" y="276" width="40" height="15" rx="7" fill="#0e1418"/>
    <circle cx="251" cy="258" r="20" fill="#e9b994"/>
    <path fill="#0e1418" d="M230 257a21 21 0 0 1 42 0v-2h-42Z"/>
    <rect x="229" y="251" width="44" height="8" rx="3" fill="#24323c"/>
    <circle cx="251" cy="232" r="6.500" fill="#f1f5f8"/>`;

  const svg = (inner) => `<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${inner.replace(/(\d)\.(\d)00\b/g, '$1.$2')}</svg>`;

  /* ───────── falling snow engine ───────── */
  class Snow {
    constructor(canvas, { density = 1, wind = 34 } = {}) {
      this.c = canvas; this.x = canvas.getContext('2d');
      this.density = density; this.wind = wind; this.t = 1 / 1000;
      this.flakes = []; this.running = false; this.visible = false; this.last = 0;
      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.visible ? this.start() : this.stop(); }).observe(canvas);
      this.resize();
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      if (!r.width) return;
      const d = Math.min(devicePixelRatio || 1, 2);
      this.w = r.width; this.h = r.height;
      this.c.width = Math.round(r.width * d); this.c.height = Math.round(r.height * d);
      this.x.setTransform(d, 0, 0, d, 0, 0);
      const n = Math.round(clamp((this.w * this.h) / 5200, 40, 300) * this.density);
      this.flakes = Array.from({ length: n }, () => this.make(true));
      this.draw();
    }
    make(anywhere) {
      const z = 0.25 + Math.random() ** 1.8 * 0.75;
      return { x: Math.random() * (this.w + 80) - 40, y: anywhere ? Math.random() * this.h : -10, z, wob: Math.random() * 6.28 };
    }
    set shutter(sec) { this.t = sec; if (!this.running) this.draw(); }
    start() { if (this.running || reduced) return; this.running = true; this.last = performance.now(); requestAnimationFrame((n) => this.tick(n)); }
    stop() { this.running = false; }
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      for (const f of this.flakes) {
        f.wob += dt * 1.4;
        f.y += f.z * 170 * dt;
        f.x += (this.wind * f.z + Math.sin(f.wob) * 10) * dt;
        if (f.y > this.h + 12 || f.x > this.w + 50) Object.assign(f, this.make(false), { x: Math.random() * (this.w + 80) - 60 });
      }
      this.draw();
      requestAnimationFrame((n) => this.tick(n));
    }
    draw() {
      const g = this.x; if (!this.w) return;
      g.clearRect(0, 0, this.w, this.h);
      g.lineCap = 'round';
      for (const f of this.flakes) {
        const vy = f.z * 170, vx = this.wind * f.z;
        const k = this.t * 7.5;                         // exaggerated so the idea reads at a glance
        const lx = vx * k, ly = vy * k, len = Math.hypot(lx, ly);
        g.lineWidth = Math.max(0.9, f.z * 3.4);
        g.strokeStyle = `rgba(255,255,255,${clamp(0.95 - len / 150, 0.22, 0.95) * (0.35 + f.z * 0.65)})`;
        g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x - lx, f.y - ly - 0.01); g.stroke();
      }
    }
  }

  /* ───────── nav: solid state, progress, current chapter ───────── */
  const nav = $('#nav'), prog = $('#progress');
  const navLinks = $$('.nav__links a');
  const chapters = navLinks.map((a) => $(a.getAttribute('href')));
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      prog.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      const hero = $('#top').getBoundingClientRect();
      const pocket = $('#pocket').getBoundingClientRect();
      const foot = $('.foot').getBoundingClientRect();
      const overDark = hero.bottom > 52 || foot.top < 26;
      nav.classList.toggle('is-solid', !overDark || (pocket.top < 26 && pocket.bottom > 26));
      let here = -1;
      chapters.forEach((c, i) => { if (c.getBoundingClientRect().top < innerHeight * 0.4) here = i; });
      navLinks.forEach((a, i) => a.classList.toggle('is-here', i === here));
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();

  /* ───────── reveal on scroll ───────── */
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });

  /* ───────── hero: shutter speed lesson ───────── */
  const HERO_SS = [2000, 1000, 500, 250, 125, 60, 30, 15, 8];
  const HERO_SAY = [
    'Faster still. Nothing changes that you can see, but the camera is now collecting half as much light. Speed always costs brightness.',
    'That number is <em>shutter speed</em>: how long the camera looks. At a thousandth of a second, every flake is frozen in mid-air.',
    'Still frozen. This is the speed for <em>crisp falling snow</em>, running children and dogs.',
    'The fastest flakes are starting to stretch. Around here is your floor for <em>people who are moving</em>.',
    'Short streaks. Fine for a landscape, too slow for anyone walking past.',
    'Now the snow reads as <em>motion</em>. Hold very still; your own hands start to matter at this speed.',
    'Long soft streaks. This is how photographers make a snowfall look like a storm.',
    'A fifteenth of a second. The flakes are lines, and only the camera\'s stabilisation is keeping the mountains sharp.',
    'An eighth of a second: a white curtain. Beautiful on purpose, a blurry mess by accident.',
  ];
  const heroSnow = new Snow($('#heroSnow'), { density: 1.1, wind: 46 });
  const heroR = $('#heroShutter');
  const heroUpd = () => {
    const i = +heroR.value;
    $('#heroShutterVal').textContent = `1/${HERO_SS[i]}`;
    $('#heroShutterSay').innerHTML = HERO_SAY[i];
    heroSnow.shutter = 1 / HERO_SS[i];
    heroR.setAttribute('aria-valuetext', `1/${HERO_SS[i]} second`);
  };
  heroR.addEventListener('input', heroUpd); heroUpd();
  $$('.range').forEach((r) => r.style.setProperty('--steps', r.max - r.min));

  /* ───────── 01 exposure simulator ───────── */
  const F = [2.8, 4, 5.6, 8, 11, 16, 22];
  const SS = [4000, 2000, 1000, 500, 250, 125, 60, 30, 15, 8];
  const ISO = [100, 200, 400, 800, 1600, 3200, 6400, 12800];
  const BASE = { f: 3, s: 3, i: 0 };
  const sim = { lens: 'sigma', minF: 0 };
  const el = { f: $('#simF'), s: $('#simS'), i: $('#simI') };

  $('#simBg').innerHTML = svg(sceneBack('a'));
  $('#simFg').innerHTML = svg(sceneFront());
  const simSnow = new Snow($('#simSnow'), { density: 0.5, wind: 30 });

  // grain tile
  (() => {
    const c = document.createElement('canvas'); c.width = c.height = 180;
    const g = c.getContext('2d'), d = g.createImageData(180, 180);
    for (let p = 0; p < d.data.length; p += 4) {
      const v = Math.random() * 255;
      d.data[p] = v + (Math.random() - 0.5) * 60; d.data[p + 1] = v; d.data[p + 2] = v + (Math.random() - 0.5) * 60; d.data[p + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    $('#simGrain').style.backgroundImage = `url(${c.toDataURL()})`;
  })();

  const fLabel = (n) => `f/${n}`;
  const F_SAY = ['Wide open. The mountains melt away and the person stands out. This is the portrait look.', 'Background clearly soft, subject crisp. A good everyday setting.', 'A little softness left behind the subject.', 'The landscape setting: sharp from the near tree to the far peaks.', 'Everything sharp. Only needed when something is very close to the lens.', 'A tiny hole. Everything sharp, but you are throwing away a lot of light.', 'The smallest hole. Rarely worth it: tiny apertures actually soften the whole image slightly.'];
  const S_SAY = ['Far faster than this scene needs. Frozen solid.', 'Frozen. Fast enough for ski racers.', 'Frozen. Fast enough for most sport.', 'Flakes are crisp dots. Safe for people in motion.', 'The slowest speed that still freezes a walking person.', 'Flakes begin to stretch. Fine for still subjects.', 'Visible streaks. Hold steady.', 'Long streaks. The person must stand still too.', 'A blur of white. Stabilisation is doing heroic work.', 'Curtains of snow. You would want a wall or tripod to lean on.'];
  const I_SAY = ['Cleanest possible picture. Use it whenever there is enough light.', 'Indistinguishable from 100 in real photos.', 'Still very clean.', 'A hint of grain if you zoom right in.', 'Fine grain, perfectly usable.', 'Visible grain in the shadows. Still a good photo.', 'Clearly grainy, colours a bit flatter. Your sensible ceiling.', 'Rough. For when the choice is this or no photo at all.'];

  const stops = () => 2 * Math.log2(8 / F[+el.f.value]) + Math.log2(500 / SS[+el.s.value]) + Math.log2(ISO[+el.i.value] / 100);
  const stage = $('#simStage');

  const simUpd = () => {
    if (+el.f.value < sim.minF) el.f.value = sim.minF;
    const fi = +el.f.value, si = +el.s.value, ii = +el.i.value, ev = stops();
    const scale = stage.clientWidth / 800;

    $('#simFVal').textContent = fLabel(F[fi]); $('#simSVal').textContent = `1/${SS[si]}`; $('#simIVal').textContent = ISO[ii];
    $('#simFSay').textContent = (sim.lens === 'sony' && fi === sim.minF) ? 'As wide as the 18–135 opens at this zoom. ' + F_SAY[fi] : F_SAY[fi];
    $('#simSSay').textContent = S_SAY[si]; $('#simISay').textContent = I_SAY[ii];
    el.f.setAttribute('aria-valuetext', fLabel(F[fi])); el.s.setAttribute('aria-valuetext', `1/${SS[si]} second`); el.i.setAttribute('aria-valuetext', `ISO ${ISO[ii]}`);

    const blur = (26 / F[fi] - 1.1) * scale;
    $('#simBg').style.filter = blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : 'none';
    simSnow.shutter = 1 / SS[si];
    $('#simGrain').style.opacity = (ii / 7) ** 1.5 * 0.85;
    const b = clamp(2 ** (ev * 0.62), 0.04, 5);
    $('#simScene').style.filter = `${ev > 1 ? `contrast(${clamp(1 - (ev - 1) * 0.14, 0.3, 1).toFixed(2)}) ` : ''}brightness(${b.toFixed(3)})`;

    $('#hudSs').textContent = `1/${SS[si]}`; $('#hudF').textContent = `F${F[fi].toFixed(1)}`; $('#hudIso').textContent = `ISO ${ISO[ii]}`;
    const needle = $('#hudNeedle');
    needle.style.left = `${50 + clamp(ev, -3, 3) / 6 * 100}%`;
    needle.classList.toggle('is-off', Math.abs(ev) > 3);

    const v = $('#simVerdict'), a = Math.abs(ev), n = Math.round(a);
    const word = n === 1 ? 'stop' : 'stops';
    v.classList.toggle('is-bad', a > 0.4);
    v.lastElementChild.textContent = a < 0.4 ? 'Correctly exposed. Now move one slider and see what it costs.' : ev > 0 ? `${n} ${word} too bright. Detail in the snow is burning away.` : `${n} ${word} too dark. The scene is sinking into murk.`;
    $('#simBalance').disabled = a < 0.4;
  };

  Object.values(el).forEach((r) => r.addEventListener('input', simUpd));
  $$('.seg__b').forEach((b) => b.addEventListener('click', () => {
    sim.lens = b.dataset.lens; sim.minF = sim.lens === 'sony' ? 1 : 0;
    $$('.seg__b').forEach((o) => { const on = o === b; o.classList.toggle('is-on', on); o.setAttribute('aria-pressed', on); });
    simUpd();
  }));
  $('#simBalance').addEventListener('click', () => {
    const want = +el.s.value - Math.round(stops());
    el.s.value = clamp(want, 0, SS.length - 1);
    if (Math.abs(stops()) > 0.4) el.i.value = clamp(+el.i.value - Math.round(stops()), 0, ISO.length - 1);
    simUpd();
  });
  $('#simReset').addEventListener('click', () => { el.f.value = BASE.f; el.s.value = BASE.s; el.i.value = BASE.i; simUpd(); });
  new ResizeObserver(simUpd).observe(stage);

  const cur = $('#simCursor');
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    cur.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`;
  });

  /* ───────── 02 focal length ───────── */
  $('#zoomScene').innerHTML = svg(sceneBack('b') + sceneFront());
  const zr = $('#zoomRange'), MARKS = [18, 24, 35, 50, 70, 100, 135], SPAN = Math.log(135 / 18);
  $('#fscaleMarks').innerHTML = MARKS.map((m) => `<span style="left:${(Math.log(m / 18) / SPAN * 100).toFixed(2)}%">${m}</span>`).join('');
  const sonyAp = (mm) => {
    const pts = [[18, 3.5], [24, 4], [35, 4.5], [50, 5], [70, 5.6], [135, 5.6]];
    for (let i = 1; i < pts.length; i++) if (mm <= pts[i][0]) return mm < (pts[i - 1][0] + pts[i][0]) / 2 ? pts[i - 1][1] : pts[i][1];
    return 5.6;
  };
  const ZOOM_SAY = [
    [22, 'Wide', 'As wide as either lens goes. The whole valley fits. This is the view for landscapes, rooms and group shots.'],
    [40, 'Standard', 'Roughly how your own eyes frame the world. Natural-looking and hard to get wrong. Good for everyday pictures.'],
    [52, 'Portrait', 'The top of the Sigma\'s range, and its sweet spot for people: flattering faces, and f/2.8 to blur what is behind them.'],
    [90, 'Telephoto', 'Past 50 mm the Sigma has run out. Only the 18–135 gets here. Distant things start to fill the frame.'],
    [136, 'Long telephoto', 'The far end. A cabin you could barely see is now the whole picture. Hold steady; long zoom magnifies every wobble.'],
  ];
  const zoomUpd = () => {
    const v = zr.value / 1000, mm = Math.round(18 * Math.exp(v * SPAN));
    $('#zoomScene').style.transform = `scale(${(mm / 18).toFixed(3)})`;
    $('#zoomVal').innerHTML = `${mm}<small>mm</small>`;
    $('#zoomMm').innerHTML = `${mm} mm<span class="ff"> · like ${Math.round(mm * 1.5)} mm full-frame</span>`;
    $('#fscaleIndex').style.left = `${v * 100}%`;
    const out = mm > 50;
    $('#barSigma').classList.toggle('is-out', out);
    $('#apSigma').textContent = out ? 'can\'t reach' : 'f/2.8';
    $('#apSony').textContent = `f/${sonyAp(mm)}`;
    const s = ZOOM_SAY.find((z) => mm < z[0]);
    $('#zoomKind').textContent = s[1]; $('#zoomSay').textContent = s[2];
    zr.setAttribute('aria-valuetext', `${mm} millimetres`);
  };
  zr.addEventListener('input', zoomUpd); zoomUpd();

  /* ───────── 03 exposure compensation on snow ───────── */
  $('#evScene').innerHTML = svg(sceneBack('c') + sceneFront());
  const evR = $('#evRange'), histo = $('#evHisto'), hg = histo.getContext('2d');
  const fmtEv = (ev) => (Math.abs(ev) < 0.05 ? '±0.0' : `${ev > 0 ? '+' : '−'}${Math.abs(ev).toFixed(1)}`);
  const EV_SAY = [
    [-0.4, 'Darker than the camera\'s guess', 'Now it is dusk at noon. Minus values are for dark scenes the camera tries to brighten too much, never for snow.', false],
    [0.5, 'What the camera chooses by itself', 'Grey, heavy snow and a gloomy sky. Nothing is broken. The camera is doing exactly what it was built to do.', false],
    [1.0, 'Getting there', 'Better, but the snow still looks like a cloudy day. Keep going.', false],
    [2.1, 'The sweet spot', 'White snow that still shows its shadows and footprints. The hump on the graph is near the right edge without touching it.', true],
    [9, 'Too far', 'The snow has blown out to blank white and the graph is piled against the right wall. That detail is gone for good, even in a RAW file.', false],
  ];
  const drawHisto = (ev) => {
    const W = histo.width, H = histo.height, N = 48, bins = new Array(N).fill(0);
    const add = (mu, sd, amp) => { for (let k = -60; k < N + 200; k++) { const x = k / N; const y = amp * Math.exp(-((x - mu) ** 2) / (2 * sd * sd)); bins[clamp(k, 0, N - 1)] += y; } };
    const sh = ev * 0.2;
    add(0.52 + sh, 0.085, 1); add(0.36 + sh, 0.06, 0.34); add(0.12 + sh, 0.07, 0.22);
    const peak = Math.max(...bins.slice(1, N - 1), 1);
    hg.clearRect(0, 0, W, H);
    hg.strokeStyle = 'rgba(255,255,255,.35)'; hg.lineWidth = 1; hg.strokeRect(0.5, 0.5, W - 1, H - 1);
    const bw = (W - 12) / N;
    bins.forEach((b, k) => {
      const edge = k === N - 1 || k === 0, h = Math.min(H - 12, (b / peak) * (H - 22));
      hg.fillStyle = k === N - 1 && b > peak * 0.25 ? '#ff5a1f' : '#fff';
      hg.fillRect(6 + k * bw, H - 6 - h, Math.max(1, bw - 1), edge ? Math.min(H - 12, h) : h);
    });
  };
  const evUpd = () => {
    const ev = evR.value / 3;
    const b = 2 ** ((ev - 1.5) * 0.45);
    $('#evScene').style.filter = `brightness(${b.toFixed(3)})`;
    $('#evVal').textContent = $('#evHud').textContent = fmtEv(ev);
    const s = EV_SAY.find((z) => ev < z[0]);
    $('#evHudWord').textContent = s[3] ? 'White with texture' : ev > 2 ? 'Blown out' : ev < -0.4 ? 'Too dark' : ev < 0.5 ? 'Camera\'s guess' : 'Still grey';
    const say = $('#evSay'); say.innerHTML = `<b>${s[1]}</b>${s[2]}`; say.classList.toggle('is-good', s[3]);
    evR.setAttribute('aria-valuetext', `${fmtEv(ev)} EV`);
    drawHisto(ev);
  };
  evR.addEventListener('input', evUpd); evUpd();

  /* ───────── 04 checklist ───────── */
  const boxes = $$('#checks input'), KEY = 'a6700-setup';
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { /* private mode */ }
  const countUpd = () => {
    const n = boxes.filter((b) => b.checked).length;
    $('#checkCount').textContent = n;
    $('.setup__count').classList.toggle('is-done', n === boxes.length);
    $('.setup__count .label').textContent = n === boxes.length ? 'all set. Go outside.' : `of ${boxes.length} set`;
  };
  boxes.forEach((b, i) => {
    b.checked = !!saved[i];
    b.addEventListener('change', () => {
      try { localStorage.setItem(KEY, JSON.stringify(boxes.map((x) => x.checked))); } catch (_) { /* ignore */ }
      countUpd();
    });
  });
  countUpd();

  /* ───────── 05 glossary ───────── */
  const G = [
    ['Exposure', 'Exposure', 'How bright or dark the photo comes out. Too much light is overexposed (washed out); too little is underexposed (murky).', 'The viewfinder shows you the exposure before you shoot. What you see is what you get.'],
    ['Aperture', 'Exposure', 'The adjustable hole inside the lens. A bigger hole means more light and a blurrier background.', 'Sigma opens to f/2.8. Sony opens to f/3.5–5.6 depending on zoom.'],
    ['f-number', 'Exposure', 'The label for aperture size, also called f-stop. It runs backwards: a small number is a big hole.', 'Turn the front dial in A mode to change it.'],
    ['Shutter speed', 'Exposure', 'How long the sensor collects light, written as a fraction of a second. Short freezes motion, long blurs it.', 'From 1/8000 of a second up to 30 full seconds.'],
    ['ISO', 'Exposure', 'How much the camera amplifies the light it collected. Higher is brighter but grainier.', 'Clean to about 3200. Set Auto ISO to top out at 6400.'],
    ['Stop', 'Exposure', 'One doubling or halving of light. 1/250 to 1/125 is one stop brighter; so is ISO 100 to 200, or f/4 to f/2.8.', 'Each dial click on the camera is a third of a stop.'],
    ['Exposure compensation', 'Exposure', 'The ± control. It tells the camera to make the picture brighter or darker than it thinks is right.', 'Works in P, A and S. Your most important control in snow.'],
    ['Metering', 'Exposure', 'How the camera measures the brightness of a scene. It assumes everything averages out to a medium grey.', 'Leave it on Multi. It is right most of the time, except with snow.'],
    ['Histogram', 'Exposure', 'A graph of the tones in the picture: shadows on the left, highlights on the right. A pile against either wall means lost detail.', 'Press DISP until it appears. Trust it over the screen.'],
    ['Blown highlights', 'Exposure', 'Areas so bright they recorded as pure blank white. Also called clipping. They cannot be recovered afterwards.', 'Watch for them in snow, skies and white clothing.'],
    ['Zebras', 'Exposure', 'Moving stripes the camera draws over the parts of the scene that are about to blow out.', 'Zebra Display, level 100+. A few stripes on sunlit snow is fine.'],
    ['Dynamic range', 'Exposure', 'The span between the darkest and brightest detail a camera can hold in one photo.', 'RAW files keep noticeably more of it than JPEGs.'],
    ['Noise', 'Exposure', 'The speckly grain that appears at high ISO, most visible in shadows.', 'A sharp noisy photo is always better than a clean blurry one.'],
    ['Focal length', 'Lens', 'How zoomed-in a lens is, in millimetres. Low numbers see wide, high numbers see far.', 'Between them your lenses cover 18 mm to 135 mm.'],
    ['APS-C', 'Lens', 'The size of your camera\'s sensor: a bit smaller than "full-frame". Multiply focal lengths by 1.5 to compare with full-frame numbers.', 'Your 18–135 frames like a 27–200 on full-frame.'],
    ['Zoom & prime', 'Lens', 'A zoom covers a range of focal lengths. A prime has just one, in exchange for being smaller, sharper or brighter.', 'Both of yours are zooms. A 30 mm f/1.4 prime is a classic next lens.'],
    ['Fast lens', 'Lens', 'A lens with a wide maximum aperture, f/2.8 or lower. "Fast" because it lets you use faster shutter speeds.', 'The Sigma is your fast lens.'],
    ['Constant aperture', 'Lens', 'A zoom that keeps the same widest aperture at every focal length. Variable-aperture zooms get dimmer as you zoom in.', 'Sigma: constant f/2.8. Sony: variable f/3.5–5.6.'],
    ['Depth of field', 'Lens', 'How much of the scene, front to back, is in focus. Shallow means only a thin slice is sharp.', 'For shallow: f/2.8, zoom in, get close, keep the background far away.'],
    ['Bokeh', 'Lens', 'The look of the out-of-focus parts of a picture. Said "boh-keh". Smooth and creamy is the goal.', 'Sigma at 50 mm and f/2.8 gives you the most of it.'],
    ['Stabilisation', 'Lens', 'A mechanism that cancels hand shake so slower shutter speeds stay sharp. It does nothing for moving subjects.', 'The body has it (SteadyShot). The Sony lens adds its own (OSS). The Sigma relies on the body.'],
    ['Minimum focus distance', 'Lens', 'The closest a lens can focus. Move nearer than this and nothing will come sharp.', 'Sigma: about 12 cm at the wide end. Sony: about 45 cm.'],
    ['Polariser', 'Lens', 'A rotating filter that cuts reflections and glare, darkening blue skies and taming shiny snow.', 'Buy one 55 mm polariser; it fits both lenses.'],
    ['AF-C', 'Focus', 'Continuous autofocus. The camera keeps adjusting focus for as long as you half-press the shutter button.', 'Use it for nearly everything. AF-S locks once; MF is manual.'],
    ['Focus area', 'Focus', 'Which part of the frame the camera is allowed to focus on: everything, a zone, or one small point.', 'Start with Tracking: Expand Spot.'],
    ['Subject recognition', 'Focus', 'The camera identifies what it is looking at and locks focus on the part that matters, usually the eye.', 'Recognises people, animals, birds, insects, cars, trains and planes.'],
    ['Half-press', 'Focus', 'Pressing the shutter button halfway to focus and meter, then the rest of the way to shoot.', 'You can also tap the screen to choose what to track.'],
    ['White balance', 'Colour & files', 'The correction for the colour of the light, so white things look white rather than orange or blue.', 'Auto is good. Snow in shade wants Cloudy or Shade.'],
    ['RAW', 'Colour & files', 'A file holding everything the sensor captured, unprocessed. Bigger, and needs editing software, but far more fixable.', 'Sony RAW files end in .ARW. Shoot RAW & JPEG together.'],
    ['JPEG', 'Colour & files', 'A finished, compressed picture, ready to share. Small and convenient, but most editing room is thrown away.', 'Fine for everyday. Keep the RAW for the ones you love.'],
    ['Creative Look', 'Colour & files', 'Sony\'s colour styles for JPEGs: more vivid, softer, black-and-white and so on.', 'Only affects JPEGs. ST is standard; VV is vivid.'],
    ['PASM', 'Camera', 'The four main shooting modes: Program, Aperture priority, Shutter priority and Manual.', 'On the top dial. Live in A.'],
    ['Auto ISO', 'Camera', 'Letting the camera choose the ISO, within limits you set, while you control the other settings.', 'Leave it on. Set the range to 100–6400.'],
    ['EVF', 'Camera', 'Electronic viewfinder: the small screen you hold to your eye. Easier to see than the rear screen in bright snow.', 'It switches on automatically when you raise the camera.'],
    ['Burst', 'Camera', 'Holding the shutter button down to take a rapid series of photos. Also called continuous shooting or drive mode.', 'Up to 11 frames a second on Hi+.'],
    ['Golden hour', 'Camera', 'The hour after sunrise and before sunset, when light is low, warm and flattering. Blue hour follows sunset.', 'Snow glows pink and gold. Bring the Sigma.'],
  ];
  const groups = ['All', ...new Set(G.map((g) => g[1]))];
  const list = $('#glossList'), tabs = $('#glossTabs'), q = $('#glossQ');
  list.innerHTML = G.map(([t, g, d, k], i) => `<div class="gloss__row" data-i="${i}"><dt>${t}<small>${g}</small></dt><dd>${d}</dd><dd class="kit">${k}</dd></div>`).join('');
  tabs.innerHTML = groups.map((g, i) => `<button type="button" class="${i ? '' : 'is-on'}" aria-pressed="${!i}" data-g="${g}">${g}</button>`).join('');
  const rows = $$('.gloss__row', list);
  let group = 'All';
  const glossUpd = () => {
    const s = q.value.trim().toLowerCase(); let shown = 0;
    rows.forEach((r, i) => {
      const [t, g, d, k] = G[i];
      const ok = (group === 'All' || g === group) && (!s || (t + ' ' + d + ' ' + k).toLowerCase().includes(s));
      r.hidden = !ok; shown += ok;
    });
    $('#glossEmpty').hidden = shown > 0;
    const box = $('.gloss').getBoundingClientRect();
    if (box.bottom < innerHeight * 0.5) scrollTo({ top: scrollY + box.top - 52, behavior: 'instant' });
  };
  q.addEventListener('input', glossUpd);
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    group = b.dataset.g;
    $$('button', tabs).forEach((o) => { o.classList.toggle('is-on', o === b); o.setAttribute('aria-pressed', o === b); });
    glossUpd();
  });
})();
