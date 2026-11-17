/* a6700 Field Manual — Chapter 00: the camera's "brain" and its rear screen.
   A small exposure model (so the dials do something) and a canvas renderer for the monitor.
   The screens are simplified drawings, not copies of Sony's menus. */

export const F_STOPS = [2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22];
export const SHUTTERS = [4000, 3200, 2500, 2000, 1600, 1250, 1000, 800, 640, 500, 400, 320, 250, 200, 160, 125, 100, 80, 60, 50, 40, 30, 25, 20, 15, 13, 10, 8, 6, 5, 4];
export const ISOS = ['AUTO', 100, 200, 400, 800, 1600, 3200, 6400, 12800];
export const DRIVES = ['Single Shooting', 'Cont. Shooting: Hi', 'Cont. Shooting: Lo', 'Self-timer: 10 sec', 'Self-timer: 2 sec'];
export const MODES = ['AUTO', 'P', 'A', 'S', 'M', '1', '2', '3'];
export const ZOOMS = [18, 24, 28, 35, 50];
export const SMS = ['still', 'movie', 'sq'];
const MENU = ['File Format', 'Focus Mode', 'Focus Area', 'Zebra Display', 'Grid Line Display', 'Custom Key/Dial Set.'];
const FN = [
  ['Drive', null], ['Focus Mode', ['AF-S', 'AF-A', 'AF-C', 'DMF', 'MF']], ['Focus Area', ['Wide', 'Zone', 'Center Fix', 'Spot', 'Tracking']],
  ['ISO', null], ['Metering', ['Multi', 'Center', 'Spot', 'Highlight']], ['White Bal.', ['AWB', 'Daylight', 'Shade', 'Cloudy']],
  ['Creative Look', ['ST', 'PT', 'NT', 'VV', 'FL', 'IN', 'SH', 'BW']], ['File Format', ['RAW', 'RAW & JPEG', 'JPEG']], ['SteadyShot', ['On', 'Off']],
  ['Zebra', ['Off', 'On']], ['Grid Line', ['Off', 'On']], ['Subject', ['Human', 'Animal/Bird', 'Insect', 'Car/Train', 'Airplane']],
];
export const FN_COUNT = FN.length, MENU_COUNT = MENU.length;
export const fnOptions = (i) => (i === 0 ? DRIVES.length : i === 3 ? ISOS.length : FN[i][1].length);

const photo = (i) => ({ mm: ZOOMS[(i * 2) % 5], N: [8, 2.8, 5.6, 11][i % 4], den: [500, 1000, 60, 250][i % 4], iso: [100, 100, 400, 100][i % 4], stops: [0, 0.4, -0.5, 0.2][i % 4] });

export const defaults = () => ({
  power: true, sms: 'still', mode: 'A', fi: 9, si: 9, iso: 1, ev: 0, drive: 0, mm: 18, lens: true,
  screen: 'live', disp: 0, sel: 0, half: false, rec: false, recT: 0, play: 11, zoomed: false,
  fn: [0, 2, 4, 1, 0, 0, 0, 1, 0, 0, 0, 0], photos: Array.from({ length: 12 }, (_, i) => photo(i)), msg: '',
});

export const fmtF = (N) => `F${N < 10 ? N.toFixed(1) : N}`;
export const fmtSS = (den) => `1/${den}`;
export const fmtEV = (thirds) => (thirds === 0 ? '±0.0' : `${thirds > 0 ? '+' : '−'}${(Math.abs(thirds) / 3).toFixed(1)}`);
const stopsOf = (N, den, iso) => 2 * Math.log2(8 / N) + Math.log2(500 / den) + Math.log2(iso / 100);
const nearest = (list, want, from = 0) => { let b = from, bd = Infinity; for (let i = from; i < list.length; i++) { const d = Math.abs(Math.log2(list[i] / want)); if (d < bd) { bd = d; b = i; } } return b; };

/* What the camera would set, given what the photographer has set. The scene is sunlit snow:
   f/8 at 1/500 and ISO 100 is "correct" (0 stops). */
export function expose(S) {
  const m = S.mode, auto = S.iso === 0, target = m === 'AUTO' ? 0 : S.ev / 3;
  let N = m === 'AUTO' ? 8 : F_STOPS[S.fi], den = SHUTTERS[S.si], iso = auto ? 100 : ISOS[S.iso];
  if (m === 'S') {
    let want = 8 / 2 ** ((target - Math.log2(500 / den) - Math.log2(iso / 100)) / 2);
    if (auto && want < 2.8) { iso = ISOS[Math.min(7, nearest(ISOS, 100 * (2.8 / want) ** 2, 1))]; want = 8 / 2 ** ((target - Math.log2(500 / den) - Math.log2(iso / 100)) / 2); }
    N = F_STOPS[nearest(F_STOPS, want)];
  } else if (m === 'M') {
    if (auto) iso = ISOS[Math.min(7, nearest(ISOS, 100 * 2 ** (target - 2 * Math.log2(8 / N) - Math.log2(500 / den)), 1))];
  } else {
    let want = 500 / 2 ** (target - 2 * Math.log2(8 / N) - Math.log2(iso / 100));
    if (auto && want < 125) { iso = ISOS[Math.min(7, nearest(ISOS, 100 * 125 / want, 1))]; want = 500 / 2 ** (target - 2 * Math.log2(8 / N) - Math.log2(iso / 100)); }
    den = SHUTTERS[nearest(SHUTTERS, want)];
  }
  return { N, den, iso, auto, target, stops: stopsOf(N, den, iso), mine: { f: m === 'A' || m === 'M', ss: m === 'S' || m === 'M' } };
}

/* ───────── renderer ───────── */
export function createLCD(canvas) {
  const W = canvas.width, H = canvas.height, g = canvas.getContext('2d');
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const buf = mk(), b = buf.getContext('2d'), bgC = mk(), q = bgC.getContext('2d'), prev = mk(), pv = prev.getContext('2d');
  const canBlur = typeof b.filter === 'string';
  const noise = document.createElement('canvas'); noise.width = 220; noise.height = 147;
  { const n = noise.getContext('2d'), d = n.createImageData(220, 147); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } n.putImageData(d, 0, 0); }
  const flakes = Array.from({ length: 64 }, (_, i) => { const r = (k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); }; return { x: r(1) * (W + 60) - 30, y: r(2) * (H - 40), z: 0.4 + r(3) * 0.6 }; });
  const ORANGE = '#ff5a1f', INK = '#0e1418';
  const F = (c, px, w = 600) => { c.font = `${w} ${px}px Archivo, Arial, sans-serif`; };
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  let fade = null, blackUntil = 0, dirty = true;

  /* the view through the lens */
  function scene(c, o) {
    const z = o.mm / 18, cx = 470, cy = 236, tf = (k) => { k.translate(cx, cy); k.scale(z, z); k.translate(-cx, -cy); };
    c.save();
    if (o.punch) { c.translate(212, 236); c.scale(o.punch, o.punch); c.translate(-212, -236); }
    q.setTransform(1, 0, 0, 1, 0, 0); q.save(); tf(q);
    const sky = q.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#6f97b8'); sky.addColorStop(1, '#cfdfea'); q.fillStyle = sky; q.fillRect(0, 0, W, H);
    q.fillStyle = '#fbf6e8'; q.beginPath(); q.arc(560, 70, 24, 0, 7); q.fill();
    q.fillStyle = '#8ba7be'; q.beginPath(); q.moveTo(0, 280); [[90, 170], [150, 225], [250, 110], [340, 215], [410, 160], [500, 240], [585, 135], [660, 215], [660, 330], [0, 330]].forEach(([x, y]) => q.lineTo(x, y)); q.fill();
    q.fillStyle = '#eff4f8'; q.beginPath(); q.moveTo(250, 110); [[220, 150], [240, 142], [252, 158], [268, 140], [284, 152]].forEach(([x, y]) => q.lineTo(x, y)); q.fill();
    q.beginPath(); q.moveTo(585, 135); [[560, 168], [577, 162], [588, 175], [602, 160], [616, 172]].forEach(([x, y]) => q.lineTo(x, y)); q.fill();
    q.fillStyle = '#a9bfd0'; q.beginPath(); q.moveTo(0, 296); q.bezierCurveTo(180, 262, 380, 280, 660, 244); q.lineTo(660, 360); q.lineTo(0, 360); q.fill();
    q.fillStyle = '#3d5c62'; [[30, 292, 34], [62, 288, 40], [98, 290, 32], [330, 276, 30], [362, 272, 36], [610, 250, 34], [640, 246, 40]].forEach(([x, y, h]) => { q.beginPath(); q.moveTo(x, y - h); q.lineTo(x + h * 0.36, y); q.lineTo(x - h * 0.36, y); q.fill(); });
    q.fillStyle = '#5a3b2c'; q.fillRect(456, 222, 26, 17); q.fillStyle = '#f6f9fb'; q.beginPath(); q.moveTo(450, 223); q.lineTo(469, 207); q.lineTo(488, 223); q.fill();
    q.fillStyle = ORANGE; q.fillRect(466, 228, 6, 11); q.fillStyle = '#ffd27a'; q.fillRect(475, 227, 4, 4);
    q.fillStyle = '#f1f5f8'; q.beginPath(); q.moveTo(0, 322); q.bezierCurveTo(160, 296, 330, 332, 660, 304); q.lineTo(660, H); q.lineTo(0, H); q.fill();
    q.fillStyle = '#c9d6e0'; q.beginPath(); q.ellipse(430, 372, 120, 7, 0, 0, 7); q.fill();
    q.restore();
    const blur = Math.max(0, 26 / o.N - 2.6) * Math.sqrt(z);
    if (canBlur && blur > 0.8 && !o.fast) { c.filter = `blur(${blur.toFixed(1)}px)`; c.drawImage(bgC, 0, 0); c.filter = 'none'; } else c.drawImage(bgC, 0, 0);
    c.save(); tf(c);                                        // the subject stays sharp
    c.fillStyle = '#c9d6e0'; c.beginPath(); c.ellipse(236, 366, 54, 6, 0, 0, 7); c.fill();
    c.fillStyle = '#1a262f'; c.fillRect(196, 300, 14, 62); c.fillRect(214, 300, 14, 62);
    c.fillStyle = ORANGE; rr(c, 186, 226, 52, 92, 16); c.fill();
    c.fillStyle = '#e9b994'; c.beginPath(); c.arc(212, 206, 17, 0, 7); c.fill();
    c.fillStyle = INK; c.beginPath(); c.arc(212, 203, 18, Math.PI, 0); c.fill();
    c.restore();
    if (!o.fast) {                                          // falling snow: dots when the shutter is fast, streaks when slow
      const len = Math.min(120, Math.max(1.6, 1400 / o.den)); c.lineCap = 'round';
      for (const f of flakes) { c.strokeStyle = `rgba(255,255,255,${(0.92 - len / 190) * (0.4 + f.z * 0.6)})`; c.lineWidth = 1.4 + f.z * 2.2; c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x - len * 0.2 * f.z, f.y - len * f.z - 0.01); c.stroke(); }
      const grain = o.iso <= 200 ? 0 : Math.min(1, (Math.log2(o.iso / 100) - 1) / 6) ** 1.2 * 0.5;
      if (grain > 0.01) { c.globalAlpha = grain; c.globalCompositeOperation = 'overlay'; c.imageSmoothingEnabled = false; c.drawImage(noise, 0, 0, W, H); c.imageSmoothingEnabled = true; c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
    }
    if (o.stops > 0.05) { c.fillStyle = `rgba(255,255,255,${1 - 2 ** (-o.stops * 0.9)})`; c.fillRect(0, 0, W, H); }
    else if (o.stops < -0.05) { c.fillStyle = `rgba(0,0,0,${1 - 2 ** (o.stops * 0.8)})`; c.fillRect(0, 0, W, H); }
    c.restore();
  }
  const dim = (a) => { b.fillStyle = `rgba(0,0,0,${a})`; b.fillRect(0, 0, W, H); };
  const brackets = (x, y, w, h, col) => { b.strokeStyle = col; b.lineWidth = 4; const k = 16; [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([a, c, sx, sy]) => { b.beginPath(); b.moveTo(a + k * sx, c); b.lineTo(a, c); b.lineTo(a, c + k * sy); b.stroke(); }); };
  const badge = (s, x, y = 20, hot = false) => { F(b, 24, 700); const w = b.measureText(s).width + 20; b.fillStyle = hot ? ORANGE : 'rgba(0,0,0,.62)'; b.fillRect(x, y, w, 36); b.fillStyle = hot ? '#000' : '#fff'; b.fillText(s, x + 10, y + 19); return x + w + 8; };
  function bar(S, E, hot) {
    b.fillStyle = '#000'; b.fillRect(0, H - 54, W, 54);
    const third = S.mode === 'M' ? `M.M. ${fmtEV(Math.round(Math.max(-5, Math.min(5, E.stops)) * 3))}` : fmtEV(S.ev);
    const items = [['ss', fmtSS(E.den), 24, E.mine.ss], ['f', fmtF(E.N), 170, E.mine.f], ['ev', third, 300, false], ['iso', `ISO ${E.auto ? 'A ' : ''}${E.iso}`, 482, false]];
    F(b, 27, 650);
    for (const [k, s, x, mine] of items) {
      if (k === hot) { b.fillStyle = ORANGE; b.fillRect(x - 10, H - 47, b.measureText(s).width + 20, 40); b.fillStyle = '#000'; } else b.fillStyle = mine ? ORANGE : '#fff';
      b.fillText(s, x, H - 26);
    }
  }
  function histogram(stops) {
    const x0 = W - 232, y0 = H - 196, n = 46, bins = new Array(n).fill(0), sh = stops * 0.13;
    const add = (mu, sd, amp) => { for (let k = -40; k < n + 60; k++) { const t = k / n; bins[Math.max(0, Math.min(n - 1, k))] += amp * Math.exp(-((t - mu) ** 2) / (2 * sd * sd)); } };
    add(0.7 + sh, 0.075, 1); add(0.36 + sh, 0.07, 0.32); add(0.13 + sh, 0.06, 0.2);
    const peak = Math.max(...bins.slice(1, n - 1), 0.4);
    b.fillStyle = 'rgba(0,0,0,.62)'; b.fillRect(x0, y0, 210, 128); b.strokeStyle = 'rgba(255,255,255,.5)'; b.lineWidth = 2; b.strokeRect(x0, y0, 210, 128);
    bins.forEach((v, i) => { const h = Math.min(112, (v / peak) * 104); b.fillStyle = (i === n - 1 || i === 0) && v > peak * 0.3 ? ORANGE : '#fff'; b.fillRect(x0 + 8 + i * 4.25, y0 + 120 - h, 3.3, h); });
  }
  function list(title, rows, sel) {
    b.fillStyle = 'rgba(8,11,14,.92)'; b.fillRect(40, 44, W - 80, H - 88);
    F(b, 19, 600); b.fillStyle = '#9fb0bc'; b.fillText(title.toUpperCase(), 64, 76);
    const first = Math.max(0, Math.min(rows.length - 6, sel - 2));
    rows.slice(first, first + 6).forEach((r, k) => { const i = first + k, y = 104 + k * 46; if (i === sel) { b.fillStyle = ORANGE; b.fillRect(52, y, W - 104, 40); } F(b, 25, 600); b.fillStyle = i === sel ? '#000' : '#fff'; b.fillText(r, 68, y + 21); });
    if (rows.length > 6) { b.fillStyle = 'rgba(255,255,255,.25)'; b.fillRect(W - 50, 104, 3, 270); b.fillStyle = '#fff'; b.fillRect(W - 50, 104 + 270 * first / rows.length, 3, 270 * 6 / rows.length); }
  }
  function toast(s) {
    F(b, 21, 600); const w = Math.min(W - 40, b.measureText(s).width + 36);
    b.fillStyle = 'rgba(8,11,14,.9)'; b.fillRect((W - w) / 2, H - 128, w, 46); b.fillStyle = '#fff'; b.textAlign = 'center'; b.fillText(s, W / 2, H - 104, W - 76); b.textAlign = 'left';
  }

  function paint(S) {
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.textAlign = 'left'; b.textBaseline = 'middle';
    b.fillStyle = '#000'; b.fillRect(0, 0, W, H);
    if (!S.power || S.screen === 'off') return;
    const E = expose(S), live = { mm: S.mm, N: E.N, den: E.den, iso: E.iso, stops: E.stops };
    const sc = S.screen;
    if (sc === 'play' || sc === 'delete' || sc === 'send') {
      const p = S.photos[S.play] || live;
      scene(b, { ...p, punch: S.zoomed ? 2.6 : 0 });
      b.fillStyle = 'rgba(0,0,0,.6)'; b.fillRect(0, 0, W, 50); F(b, 22, 600); b.fillStyle = '#fff';
      b.fillText(S.zoomed ? 'Enlarged' : `${S.play + 1} / ${S.photos.length}`, 22, 26);
      F(b, 18, 500); b.textAlign = 'right'; b.fillText(`${fmtSS(p.den)}   ${fmtF(p.N)}   ISO ${p.iso}`, W - 74, 26); b.textAlign = 'left';
      b.strokeStyle = '#fff'; b.lineWidth = 3; b.strokeRect(W - 58, 13, 34, 24); b.beginPath(); b.moveTo(W - 46, 19); b.lineTo(W - 34, 25); b.lineTo(W - 46, 31); b.closePath(); b.fill();
      if (sc === 'delete') { dim(0.45); b.fillStyle = 'rgba(8,11,14,.94)'; b.fillRect(150, 150, 360, 150); F(b, 25, 600); b.fillStyle = ORANGE; b.fillRect(170, 172, 320, 46); b.fillStyle = '#000'; b.fillText('Delete', 190, 196); b.fillStyle = '#fff'; b.fillText('Cancel', 190, 254); }
      if (sc === 'send') { dim(0.45); b.fillStyle = 'rgba(8,11,14,.94)'; b.fillRect(110, 140, 440, 160); F(b, 19, 600); b.fillStyle = '#9fb0bc'; b.fillText('SEND TO SMARTPHONE', 134, 172); F(b, 25, 600); b.fillStyle = ORANGE; b.fillRect(126, 196, 408, 46); b.fillStyle = '#000'; b.fillText('This Image', 144, 220); b.fillStyle = '#fff'; b.fillText('Cancel', 144, 270); }
    } else if (sc === 'index') {
      b.fillStyle = '#0b0e11'; b.fillRect(0, 0, W, H);
      const first = Math.max(0, Math.min(S.photos.length - 9, S.play - 4));
      for (let k = 0; k < 9 && first + k < S.photos.length; k++) {
        const x = 12 + (k % 3) * 216, y = 10 + Math.floor(k / 3) * 143;
        b.save(); b.beginPath(); b.rect(x, y, 204, 136); b.clip(); b.translate(x, y); b.scale(204 / W, 136 / H); scene(b, { ...S.photos[first + k], fast: true }); b.restore();
        if (first + k === S.play) { b.strokeStyle = ORANGE; b.lineWidth = 5; b.strokeRect(x, y, 204, 136); }
      }
    } else {
      scene(b, live);
      if (sc === 'menu') { dim(0.7); list('Menu', MENU, S.sel); }
      else if (sc === 'iso') { dim(0.3); list('ISO', ISOS.map((v) => (v === 'AUTO' ? 'ISO AUTO' : `ISO ${v}`)), S.iso); }
      else if (sc === 'drive') { dim(0.6); list('Drive Mode', DRIVES, S.drive); }
      else if (sc === 'fn') {
        dim(0.35);
        FN.forEach(([name, opts], i) => {
          const x = 14 + (i % 6) * 106, y = H - 176 + Math.floor(i / 6) * 84, on = i === S.sel;
          const val = i === 0 ? DRIVES[S.drive].replace(/^(Cont\. Shooting|Self-timer): /, '').replace(' Shooting', '') : i === 3 ? String(ISOS[S.iso]) : opts[S.fn[i] % opts.length];
          b.fillStyle = on ? ORANGE : 'rgba(8,11,14,.86)'; b.fillRect(x, y, 100, 78);
          b.textAlign = 'center'; F(b, 13, 600); b.fillStyle = on ? 'rgba(0,0,0,.7)' : '#9fb0bc'; b.fillText(name.toUpperCase(), x + 50, y + 22, 92);
          F(b, 19, 650); b.fillStyle = on ? '#000' : '#fff'; b.fillText(val, x + 50, y + 50, 92); b.textAlign = 'left';
        });
      } else {
        // live view
        if (S.disp !== 2) {
          let x = badge(S.sms === 'movie' ? 'MOVIE' : S.sms === 'sq' ? 'S&Q' : S.mode, 22);
          if (S.sms !== 'still') x = badge(S.mode, x);
          if (S.rec) { b.fillStyle = '#e0202c'; b.beginPath(); b.arc(x + 14, 38, 10, 0, 7); b.fill(); F(b, 24, 700); b.fillStyle = '#fff'; b.fillText(`REC 0:${String(S.recT).padStart(2, '0')}`, x + 32, 39); }
          else { F(b, 17, 600); b.fillStyle = 'rgba(255,255,255,.9)'; b.textAlign = 'right'; b.fillText(`${DRIVES[S.drive].toUpperCase()}   ${S.mm} MM`, W - 22, 38); b.textAlign = 'left'; }
        }
        if (S.half) brackets(176, 168, 72, 72, '#3fdc6a'); else brackets(W / 2 - 60, H / 2 - 70, 120, 90, 'rgba(255,255,255,.85)');
        if (S.disp === 1) histogram(E.stops);
        if (sc === 'ev') {
          b.fillStyle = 'rgba(8,11,14,.9)'; b.fillRect(40, H - 172, W - 80, 104);
          F(b, 19, 600); b.fillStyle = '#9fb0bc'; b.fillText('EXPOSURE COMP.', 64, H - 146);
          F(b, 34, 700); b.fillStyle = ORANGE; b.textAlign = 'right'; b.fillText(fmtEV(S.ev), W - 64, H - 140); b.textAlign = 'left';
          for (let i = -15; i <= 15; i++) { const x = 330 + i * 17.4, big = i % 3 === 0; b.fillStyle = '#fff'; b.fillRect(x - 1, H - 100, 2, big ? 16 : 8); if (big && (i / 3) % 2 === 0) { F(b, 14, 600); b.textAlign = 'center'; b.fillText(String(Math.abs(i / 3)), x, H - 112); b.textAlign = 'left'; } }
          const mx = 330 + S.ev * 17.4; b.fillStyle = ORANGE; b.beginPath(); b.moveTo(mx - 9, H - 80); b.lineTo(mx + 9, H - 80); b.lineTo(mx, H - 96); b.fill();
        }
        if (S.disp !== 2 || sc === 'ev') bar(S, E, sc === 'ev' ? 'ev' : null);
      }
    }
    if (S.msg) toast(S.msg);
  }

  return {
    /* redraw from state; crossfade when the screen itself changes, cut when only a value does */
    update(S, crossfade = false) {
      if (crossfade) { pv.drawImage(canvas, 0, 0); fade = { t0: performance.now(), ms: 220 }; }
      paint(S); dirty = true;
    },
    blink(ms = 110) { blackUntil = performance.now() + ms; dirty = true; },
    /* copy to the visible canvas; returns true when it drew, so the texture needs uploading */
    present(now) {
      if (!dirty && !fade && !blackUntil) return false;
      dirty = false;
      if (now < blackUntil) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return true; }
      blackUntil = 0;
      g.globalAlpha = 1; g.drawImage(buf, 0, 0);
      if (fade) { const t = (now - fade.t0) / fade.ms; if (t < 1) { g.globalAlpha = (1 - t) ** 2; g.drawImage(prev, 0, 0); g.globalAlpha = 1; } else fade = null; }
      return true;
    },
    get busy() { return !!fade || !!blackUntil; },
  };
}
