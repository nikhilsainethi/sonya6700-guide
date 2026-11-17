/* a6700 Field Manual — Chapter 00: stage, motion and interface.
   The model can be operated: buttons press, dials turn, and the rear screen answers. */
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { CONTROLS, TASKS, FACES } from './camera-data.js';
import { buildCamera, mat, ORANGE } from './camera-model.js';
import { createLCD, defaults, expose, F_STOPS, SHUTTERS, ISOS, DRIVES, MODES, ZOOMS, SMS, FN_COUNT, MENU_COUNT, fnOptions, fmtF, fmtSS, fmtEV } from './camera-lcd.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rad = (d) => d * Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PHONE = matchMedia('(max-width: 760px), (max-height: 500px) and (orientation: landscape)');   // layouts where the page scrolls
const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

const PRESS = new Set(['shutter', 'power', 'c2', 'movie', 'menu', 'afon', 'fn', 'wheelUp', 'wheelDown', 'wheelLeft', 'wheelRight', 'wheelCenter', 'playback', 'del', 'c1', 'lensRelease', 'monitor', 'mount']);
const TURN = new Set(['frontDial', 'rearDial', 'wheel', 'modeDial', 'smsDial', 'diopter', 'lens']);
const EDGE = /^wheel(Up|Down|Left|Right)$/;
const dialOf = (id) => (EDGE.test(id || '') ? 'wheel' : id);
const turnOf = (id) => (id === 'wheelCenter' ? 'wheel' : dialOf(id));      // a drag that starts on the centre button still turns the wheel
const DETENT = { frontDial: rad(15), rearDial: rad(13.85), wheel: rad(18), diopter: rad(30), lens: rad(11) };

/* ═════════════ springs: every moving part eases through one of these ═════════════ */
const springs = [];
function spring(apply, { x = 0, k = 320, d = 30 } = {}) { const s = { x, v: 0, to: x, k, d, apply, live: true }; springs.push(s); return s; }
function go(s, to) { s.to = to; s.live = true; }
function stepSprings(dt) {
  let any = false;
  for (const s of springs) {
    if (!s.live) continue;
    if (reduced) { s.x = s.to; s.v = 0; } else { s.v += (s.k * (s.to - s.x) - s.d * s.v) * dt; s.x += s.v * dt; }
    if (Math.abs(s.to - s.x) < 4e-4 && Math.abs(s.v) < 4e-3) { s.x = s.to; s.v = 0; s.live = false; }
    s.apply(s.x); any = true;
  }
  return any;
}
const tapSpring = (s, depth = 1, hold = 120) => { go(s, depth); setTimeout(() => go(s, 0), reduced ? 0 : hold); };
const nudge = (s, delta, hold = 280) => { const home = s.to, out = home + delta; go(s, out); setTimeout(() => { if (s.to === out) go(s, home); }, hold); };

/* ═════════════ stage ═════════════ */
const stage = $('#stage'), canvas = $('#gl'), pin = $('#pin'), pinName = $('#pinName'), tip = $('#tip'), faceName = $('#faceName');
let M = null, lcd = null, renderer, scene, view;
const cur = { yaw: rad(118), pitch: rad(6), dist: 620, ox: 0, oy: 0 };
let tween = null, inertia = null, zoomTo = null, needs = true, selected = null, dragging = false, lastT = 0;
const pivot = new THREE.Group();
const A = { press: {}, spin: {}, flash: {} };        // actuators (springs), filled by rig()

function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { $('#fallback').hidden = false; $('.stage__hud').hidden = true; return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.75;
  view = new THREE.PerspectiveCamera(26, 1, 10, 3000);
  const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(-180, 260, 320); scene.add(key);
  const rim = new THREE.DirectionalLight('#cfe2f2', 1.3); rim.position.set(240, 120, -260); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9c6cf', 0.7));

  M = buildCamera();
  M.cam.position.set(0, 0, -8);                       // centre the mass (body + lens) on the pivot
  pivot.add(M.cam); scene.add(pivot);
  lcd = createLCD(M.lcdCanvas);

  const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sg = sc.getContext('2d');
  const gr = sg.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(14,20,24,.34)'); gr.addColorStop(1, 'rgba(14,20,24,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(250, 150), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), opacity: 0.7, transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -78; shadow.renderOrder = -1; scene.add(shadow);

  rig();
  new ResizeObserver(resize).observe(stage); resize();
  requestAnimationFrame(frame);
  return true;
}
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); view.aspect = w / h; view.updateProjectionMatrix(); needs = true;
}
const fit = () => Math.max(1, 1.18 / view.aspect);

/* wire each moving part of the model to a spring */
const ZAX = V(0, 0, 1), YAX = V(0, 1, 0);
function rig() {
  for (const [id, objs] of Object.entries(M.press)) {
    const n = M.reg[id].normal.clone().negate(), base = objs.map((o) => o.position.clone());
    const travel = id === 'shutter' ? 2.3 : id === 'wheelCenter' ? 0.7 : 0.85;
    A.press[id] = spring((x) => objs.forEach((o, i) => o.position.copy(base[i]).addScaledVector(n, travel * x)), { k: 1100, d: 40 });
  }
  for (const [id, o] of Object.entries(M.spin)) {
    if (id === 'power') continue;
    const q0 = o.quaternion.clone(), q = new THREE.Quaternion();
    A.spin[id] = spring((x) => { q.setFromAxisAngle(ZAX, x); o.quaternion.copy(q0).multiply(q); }, { k: 460, d: 30 });
  }
  { // ON/OFF: the collar turns and its lever swings round the shutter button
    const col = M.spin.power, q0 = col.quaternion.clone(), { lever, centre, arm } = M.power, lq0 = lever.quaternion.clone(), q = new THREE.Quaternion(), p = new THREE.Vector3();
    A.power = spring((x) => {
      const a = (x - 1) * 0.62;
      q.setFromAxisAngle(ZAX, a); col.quaternion.copy(q0).multiply(q);
      q.setFromAxisAngle(YAX, a); lever.quaternion.copy(q).multiply(lq0); lever.position.copy(p.copy(arm).applyQuaternion(q).add(centre));
    }, { x: 1, k: 300, d: 24 });
  }
  { // the control wheel dips when one of its edges is pressed
    const parts = M.wheel.parts, base = parts.map((o) => o.position.clone());
    A.wheelDip = spring((x) => parts.forEach((o, i) => o.position.copy(base[i]).addScaledVector(ZAX, 0.5 * x)), { k: 1100, d: 40 });
  }
  for (const id of ['wheelUp', 'wheelDown', 'wheelLeft', 'wheelRight']) A.flash[id] = spring(() => paintWedges(), { k: 260, d: 26 });
  A.dial = spring((x) => { M.dialPivot.rotation.y = x; }, { x: dialAngle('A', Math.PI), k: 210, d: 20 });
  A.sms = spring((x) => { M.smsPivot.rotation.y = x; M.reg.smsDial.anchor.copy(M.sms.arm).applyAxisAngle(YAX, x).add(M.sms.centre); }, { x: SMS_ANG.still, k: 260, d: 22 });
  A.lens = spring(applyLens, { k: 34, d: 11.7 });
  const base = new THREE.Color('#272b2f'), hot = new THREE.Color(ORANGE);
  A.hi = spring((x) => { const t = clamp(x, 0, 1); mat.hi.color.copy(base).lerp(hot, t); mat.hi.emissiveIntensity = 0.55 * t; paintWedges(); }, { k: 150, d: 22 });
}
function paintWedges() {
  for (const id in A.flash) M.reg[id].wedge.material.opacity = clamp(Math.max(id === selected ? 0.9 * A.hi.x : 0, 0.95 * A.flash[id].x), 0, 1);
}
const SMS_ANG = { still: rad(16), movie: 0, sq: rad(-16) };
function dialAngle(mode, near) { let a = MODES.indexOf(mode) * Math.PI / 4 + Math.PI / 2; a += Math.round((near - a) / (Math.PI * 2)) * Math.PI * 2; return a; }
function applyLens(x) {
  const t = clamp(x, 0, 1), twist = Math.min(1, t / 0.3), pull = clamp((t - 0.2) / 0.8, 0, 1), pe = pull * pull * (3 - 2 * pull);
  M.lens.visible = t < 0.995;
  M.lens.rotation.z = -twist * rad(42);                 // unlock with a twist, then lift away
  M.lens.position.set(8 + pe * 46, -1.5 + pe * 5, 22.6 + pe * 74);
  const op = 1 - clamp((pull - 0.45) / 0.55, 0, 1);
  M.lensMats.forEach((m) => { m.transparent = op < 0.999; m.opacity = op; });
}

/* ── moving the viewpoint ── */
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeO = (t) => 1 - Math.pow(1 - t, 3);
function flyTo(yawDeg, pitchDeg, dist, anchor, ms) {
  if (!M) return;
  let yaw = rad(yawDeg); const pitch = rad(pitchDeg);
  yaw += Math.round((cur.yaw - yaw) / (Math.PI * 2)) * Math.PI * 2;       // shortest way round
  let ox = 0, oy = 0;
  if (anchor) { const p = anchor.clone().add(M.cam.position).applyEuler(new THREE.Euler(pitch, yaw, 0, 'XYZ')); ox = -p.x * 0.82; oy = -p.y * 0.82; }
  const to = { yaw, pitch, dist, ox, oy };
  const turn = Math.hypot((yaw - cur.yaw) * Math.cos((pitch + cur.pitch) / 2), pitch - cur.pitch);
  const travel = turn + Math.abs(dist - cur.dist) / 500 + Math.hypot(ox - cur.ox, oy - cur.oy) / 160;
  inertia = null; zoomTo = null;
  if (reduced || ms === 0 || travel < 0.01) { Object.assign(cur, to); tween = null; arrive(); needs = true; return; }
  tween = { from: { ...cur }, to, t0: performance.now(), ms: ms || clamp(460 + travel * 400, 520, 1500), lift: turn > 0.6 ? Math.min(130, turn * 46) : 0, ease: turn > 0.6 ? easeIO : easeO };
  stage.classList.add('is-flying'); needs = true;
}
function arrive() { stage.classList.remove('is-flying'); if (selected) restart(pin, 'is-in'); }

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.12, (now - lastT) / 1000 || 0.016); lastT = now;
  if (tween) {
    const t = clamp((now - tween.t0) / tween.ms, 0, 1), e = tween.ease(t);
    for (const k in tween.to) cur[k] = tween.from[k] + (tween.to[k] - tween.from[k]) * e;
    cur.dist += tween.lift * Math.sin(Math.PI * t);     // pull back a little mid-flight, like changing places on a globe
    if (t >= 1) { tween = null; arrive(); }
    needs = true;
  } else if (inertia) {
    cur.yaw += inertia.vy * dt; cur.pitch = clamp(cur.pitch + inertia.vp * dt, rad(-89), rad(89));
    const f = Math.exp(-dt * 4.2); inertia.vy *= f; inertia.vp *= f;
    if (Math.hypot(inertia.vy, inertia.vp) < 0.03) inertia = null;
    needs = true;
  }
  if (zoomTo !== null) { cur.dist += (zoomTo - cur.dist) * (1 - Math.exp(-dt * 13)); if (Math.abs(zoomTo - cur.dist) < 0.3) { cur.dist = zoomTo; zoomTo = null; } needs = true; }
  for (let n = Math.max(1, Math.ceil(dt / 0.011)), i = 0; i < n; i++) if (stepSprings(dt / n)) needs = true;   // small sub-steps keep stiff springs stable on slow frames
  if (lcd.present(now)) { M.lcdTex.needsUpdate = true; needs = true; }
  if (!needs) return; needs = false;
  pivot.rotation.set(cur.pitch, cur.yaw, 0, 'XYZ'); pivot.position.set(cur.ox, cur.oy, 0);
  view.position.set(0, 0, cur.dist * fit()); view.lookAt(0, 0, 0);
  renderer.render(scene, view);
  placePin(); nameFace();
}

const wp = new THREE.Vector3(), wn = new THREE.Vector3();
function placePin() {
  if (!selected || !M) { pin.hidden = true; return; }
  const r = M.reg[selected];
  wp.copy(r.anchor); M.cam.localToWorld(wp);
  wn.copy(r.normal).applyQuaternion(pivot.quaternion);
  const facing = wn.dot(view.position.clone().sub(wp).normalize());
  wp.project(view);
  const w = stage.clientWidth, h = stage.clientHeight, x = (wp.x * 0.5 + 0.5) * w, y = (-wp.y * 0.5 + 0.5) * h;
  pin.hidden = false; pin.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  pin.classList.toggle('is-behind', facing < 0.08);
  pin.classList.toggle('is-left', x > w * 0.7);
}
const FACE_NAMES = [['Front', 'front', V(0, 0, 1)], ['Back', 'back', V(0, 0, -1)], ['Top', 'top', V(0, 1, 0)], ['Bottom', 'bottom', V(0, -1, 0)], ['Grip side', 'grip', V(-1, 0, 0)], ['Port side', 'ports', V(1, 0, 0)]];
let lastFace = '';
function nameFace() {
  let best = null, bd = -2;
  for (const f of FACE_NAMES) { const d = wn.copy(f[2]).applyQuaternion(pivot.quaternion).z; if (d > bd) { bd = d; best = f; } }
  if (best[0] === lastFace) return; lastFace = best[0];
  faceName.textContent = best[0]; restart(faceName, 'is-in');
  $$('.views button').forEach((b) => b.classList.toggle('is-on', b.dataset.view === best[1]));
}

function highlight(id) {
  if (!M) return;
  if (selected) M.reg[selected].meshes.forEach((m) => { m.material = m.userData.base; });
  selected = id;
  if (id) { M.reg[id].meshes.forEach((m) => { m.material = mat.hi; }); pinName.textContent = CONTROLS[id].name.replace(/ \(.*\)$/, ''); }
  A.hi.x = 0; A.hi.v = 0; go(A.hi, id ? 1 : 0); paintWedges(); needs = true;
}

/* ═════════════ the camera's state, and what each control does to it ═════════════ */
let S = defaults(), last = null, operated = false, timers = [], recTimer = 0, msgTimer = 0, demoOn = true;
const later = (fn, ms) => { const t = setTimeout(() => { timers = timers.filter((x) => x !== t); fn(); }, ms); timers.push(t); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; clearInterval(recTimer); recTimer = 0; clearTimeout(msgTimer); };
const screenKey = () => `${S.power}|${S.screen}|${S.disp}|${S.zoomed}|${S.play}|${S.photos.length}`;
const PLAYING = new Set(['play', 'index', 'delete', 'send']);

/* bring the model, the rear screen and the read-out in line with S */
function sync(crossfade = false) {
  if (!M) { updateNow(); return; }
  go(A.dial, dialAngle(S.mode, A.dial.to)); go(A.sms, SMS_ANG[S.sms]); go(A.power, S.power ? 1 : 0); go(A.lens, S.lens ? 0 : 1);
  const b = $('#lensBtn'); b.setAttribute('aria-pressed', S.lens); b.querySelector('span').textContent = S.lens ? 'Lens attached' : 'Lens removed';
  lcd.update(S, crossfade && !reduced); updateNow(); needs = true;
}
function lcdNote(text) { S.msg = text; clearTimeout(msgTimer); msgTimer = setTimeout(() => { S.msg = ''; if (lcd) { lcd.update(S); needs = true; } }, 2600); }
function setRec(on) {
  S.rec = on; S.recT = 0; clearInterval(recTimer); recTimer = 0;
  if (on) recTimer = setInterval(() => { S.recT = (S.recT + 1) % 60; lcd.update(S); needs = true; }, 1000);
}
function focusFor(ms) { S.half = true; later(() => { S.half = false; sync(); }, ms); }

function press(id) {
  if (id === 'power') { S.power = !S.power; if (!S.power) { S.screen = 'live'; S.half = false; S.zoomed = false; setRec(false); } return S.power ? 'Power on. The screen wakes up.' : 'Power off.'; }
  if (id === 'lensRelease') { S.lens = !S.lens; return S.lens ? 'Lens back on: twisted until it clicked.' : 'Lens unlocked, twisted and lifted away.'; }
  if (id === 'mount') { if (S.lens) return 'The lens is on. Press the release button beside the mount to take it off.'; S.lens = true; return 'Lens back on: marks lined up, twisted until it clicked.'; }
  if (!S.power) return 'The camera is off. Flick the ON/OFF switch first.';
  const sc = S.screen, n = S.photos.length;
  switch (id) {
    case 'shutter':
      if (sc !== 'live') { S.screen = 'live'; S.zoomed = false; return 'Half-press: straight back to shooting.'; }
      S.half = true;
      later(() => {
        const E = expose(S); S.half = false;
        S.photos.push({ mm: S.mm, N: E.N, den: E.den, iso: E.iso, stops: E.stops }); S.play = S.photos.length - 1;
        lcd.blink(); sync(); say(`Click. Photo ${S.photos.length} saved at ${fmtSS(E.den)}, ${fmtF(E.N)}, ISO ${E.iso}.`);
      }, reduced ? 0 : 300);
      return 'Half-press: focused on the subject…';
    case 'movie': setRec(!S.rec); S.screen = 'live'; return S.rec ? 'Recording. Press MOVIE again to stop.' : 'Recording stopped.';
    case 'menu': S.screen = sc === 'menu' ? 'live' : 'menu'; S.sel = 0; return S.screen === 'menu' ? 'Menu open.' : 'Menu closed.';
    case 'fn':
      if (PLAYING.has(sc)) { S.screen = sc === 'send' ? 'play' : 'send'; return S.screen === 'send' ? 'Send to Smartphone.' : 'Cancelled.'; }
      S.screen = sc === 'fn' ? 'live' : 'fn'; S.sel = 0; return S.screen === 'fn' ? 'Function menu open.' : 'Function menu closed.';
    case 'wheelUp':
      if (sc === 'live') { S.disp = (S.disp + 1) % 3; return ['Display: standard.', 'Display: histogram.', 'Display: picture only.'][S.disp]; }
      if (sc === 'menu') S.sel = (S.sel + MENU_COUNT - 1) % MENU_COUNT; else if (sc === 'fn') S.sel = (S.sel + 6) % FN_COUNT;
      else if (sc === 'iso') S.iso = Math.max(0, S.iso - 1); else if (sc === 'drive') S.drive = Math.max(0, S.drive - 1); else if (sc === 'index') S.play = Math.max(0, S.play - 3);
      return '';
    case 'wheelDown':
      if (sc === 'live') { if (S.mode === 'AUTO') return 'Exposure compensation is not offered in AUTO. Turn the mode dial to P, A or S.'; S.screen = 'ev'; return 'Exposure compensation open. Turn the wheel.'; }
      if (sc === 'menu') S.sel = (S.sel + 1) % MENU_COUNT; else if (sc === 'fn') S.sel = (S.sel + 6) % FN_COUNT;
      else if (sc === 'iso') S.iso = Math.min(ISOS.length - 1, S.iso + 1); else if (sc === 'drive') S.drive = Math.min(DRIVES.length - 1, S.drive + 1);
      else if (sc === 'play') { S.screen = 'index'; S.zoomed = false; return 'Image index: your photos as a grid.'; } else if (sc === 'index') S.play = Math.min(n - 1, S.play + 3);
      return '';
    case 'wheelLeft':
      if (sc === 'live') { S.screen = 'drive'; return 'Drive mode open. Turn the wheel.'; }
      if (sc === 'ev') S.ev = Math.max(-15, S.ev - 1); else if (sc === 'fn') S.sel = (S.sel + FN_COUNT - 1) % FN_COUNT; else if (sc === 'play' || sc === 'index') S.play = Math.max(0, S.play - 1);
      return '';
    case 'wheelRight':
      if (sc === 'live') { S.screen = 'iso'; return 'ISO open. Turn the wheel.'; }
      if (sc === 'ev') S.ev = Math.min(15, S.ev + 1); else if (sc === 'fn') S.sel = (S.sel + 1) % FN_COUNT; else if (sc === 'play' || sc === 'index') S.play = Math.min(n - 1, S.play + 1);
      return '';
    case 'wheelCenter':
      if (sc === 'iso' || sc === 'drive' || sc === 'ev' || sc === 'fn') { S.screen = 'live'; return 'Confirmed.'; }
      if (sc === 'menu') { lcdNote('On the real camera this opens the setting'); return 'That item would open. MENU steps back out.'; }
      if (sc === 'delete') { if (n > 1) { S.photos.splice(S.play, 1); S.play = Math.min(S.play, S.photos.length - 1); } S.screen = 'play'; return 'Photo deleted.'; }
      if (sc === 'send') { S.screen = 'play'; return 'On the real camera the photo now goes to your phone.'; }
      if (sc === 'index') { S.screen = 'play'; return ''; }
      return sc === 'live' ? 'Nothing is waiting to be confirmed.' : '';
    case 'playback':
      if (PLAYING.has(sc)) { S.screen = 'live'; S.zoomed = false; return 'Back to shooting.'; }
      S.screen = 'play'; S.zoomed = false; S.play = n - 1; return `Playback: photo ${n} of ${n}.`;
    case 'del':
      if (sc === 'play') { S.screen = 'delete'; S.zoomed = false; return 'Delete this photo? Press the centre to confirm.'; }
      if (sc === 'delete') { S.screen = 'play'; return 'Kept.'; }
      lcdNote('C3: not assigned'); return 'While shooting this is C3, a spare button. Give it a job in MENU, Custom Key/Dial Set.';
    case 'afon':
      if (sc === 'play') { S.zoomed = !S.zoomed; return S.zoomed ? 'Enlarged. Check the eyes.' : 'Back to the whole photo.'; }
      if (sc === 'live' || sc === 'ev') { focusFor(1100); return 'AF-ON: focused on the subject.'; }
      return '';
    case 'monitor': if (sc === 'live') { focusFor(1100); return 'Tapped: the camera focuses there.'; } return '';
    case 'c1': case 'c2': lcdNote(`${id.toUpperCase()}: not assigned`); return `${id.toUpperCase()} is a spare button. Give it a job in MENU, Custom Key/Dial Set.`;
    default: return undefined;
  }
}
function turn(id, dir) {
  if (id === 'modeDial') { S.mode = MODES[(MODES.indexOf(S.mode) + dir + 8) % 8]; return { AUTO: 'AUTO: the camera sets everything.', P: 'P: the camera sets aperture and shutter.', A: 'A: you set the aperture.', S: 'S: you set the shutter speed.', M: 'M: you set both.' }[S.mode] || `${S.mode}: recalls a setup you have saved.`; }
  if (id === 'smsDial') { S.sms = SMS[clamp(SMS.indexOf(S.sms) + dir, 0, 2)]; if (S.sms === 'still' && S.rec) setRec(false); return { still: 'Still photos.', movie: 'Movie mode.', sq: 'S&Q: slow and quick motion.' }[S.sms]; }
  if (id === 'diopter') return 'Viewfinder focus adjusted. Your photos are unaffected.';
  if (id === 'lens') { if (!S.lens) return ''; S.mm = ZOOMS[clamp(ZOOMS.indexOf(S.mm) + dir, 0, ZOOMS.length - 1)]; return `Zoomed to ${S.mm} mm.`; }
  if (!S.power) return 'The camera is off. Flick the ON/OFF switch first.';
  const sc = S.screen, n = S.photos.length;
  if (sc === 'iso') { S.iso = clamp(S.iso + dir, 0, ISOS.length - 1); return ''; }
  if (sc === 'drive') { S.drive = clamp(S.drive + dir, 0, DRIVES.length - 1); return ''; }
  if (sc === 'ev') { S.ev = clamp(S.ev + dir, -15, 15); return ''; }
  if (sc === 'menu') { S.sel = (S.sel + dir + MENU_COUNT) % MENU_COUNT; return ''; }
  if (sc === 'fn') {
    const i = S.sel, k = fnOptions(i);
    if (i === 0) S.drive = (S.drive + dir + k) % k; else if (i === 3) S.iso = (S.iso + dir + k) % k; else S.fn[i] = (S.fn[i] + dir + k) % k;
    return '';
  }
  if (PLAYING.has(sc)) { if (sc === 'play' || sc === 'index') S.play = clamp(S.play + dir, 0, n - 1); return ''; }
  if (id === 'wheel') return 'On the live view the wheel waits for a shortcut. Press one of its edges first.';
  if (S.mode === 'AUTO') return 'In AUTO the camera chooses the exposure. Turn the mode dial to A, S or M.';
  const which = S.mode === 'S' ? 'si' : S.mode === 'M' && id === 'rearDial' ? 'si' : 'fi';
  if (which === 'fi') S.fi = clamp(S.fi + dir, 0, F_STOPS.length - 1); else S.si = clamp(S.si + dir, 0, SHUTTERS.length - 1);
  const E = expose(S), off = E.stops - E.target;          // in A and S the camera balances the other setting, until it runs out of range
  if (S.mode === 'S' && off > 0.4) return `Too bright: at ${fmtSS(E.den)} even the smallest aperture, ${fmtF(E.N).replace('F', 'f/')}, lets in too much light. In real snow you would need a darker filter.`;
  if (S.mode === 'S' && off < -0.4) return `Too dark: the lens cannot open wider than ${fmtF(E.N).replace('F', 'f/')}. Slow the shutter or raise ISO.`;
  if (S.mode !== 'M' && off > 0.4) return `Too bright: the shutter cannot go faster than ${fmtSS(E.den)}.`;
  if (S.mode === 'M') return Math.abs(E.stops) < 0.2 ? 'Balanced: the meter reads zero.' : `The meter reads ${fmtEV(Math.round(clamp(E.stops, -5, 5) * 3))}: ${E.stops > 0 ? 'too bright' : 'too dark'}.`;
  return '';
}

function act(id, kind, dir = 1) {
  if (!CONTROLS[id]) return;
  last = { id, kind, dir };
  if (selected && (id === selected || dialOf(id) === dialOf(selected))) operated = true;
  const before = screenKey();
  if (M) {                                                // the physical movement
    if (kind === 'press') {
      if (id === 'shutter') { go(A.press.shutter, 0.45); setTimeout(() => go(A.press.shutter, 1), reduced ? 0 : 230); setTimeout(() => go(A.press.shutter, 0), reduced ? 0 : 400); }
      else if (A.press[id]) tapSpring(A.press[id]);
      else if (A.flash[id]) { tapSpring(A.flash[id], 1, 160); tapSpring(A.wheelDip, 1, 110); }
    } else if (A.spin[id]) go(A.spin[id], A.spin[id].to + dir * DETENT[id]);
  }
  const note = kind === 'press' ? press(id) : turn(id, dir);
  sync(screenKey() !== before);
  if (note) say(note);
  checkStep({ id, kind });
}

/* a small nudge every few seconds showing how the highlighted control moves */
function demo() {
  if (!M || !demoOn || !selected || operated || reduced || tween || dragging || document.hidden) return;
  const id = selected;
  if (A.flash[id]) { tapSpring(A.flash[id], 0.7, 200); tapSpring(A.wheelDip, 0.6, 140); }
  else if (id === 'shutter') tapSpring(A.press.shutter, 0.45, 260);
  else if (A.press[id]) tapSpring(A.press[id], 0.8, 160);
  else if (id === 'power') nudge(A.power, S.power ? -0.3 : 0.3);
  else if (id === 'modeDial') nudge(A.dial, 0.17);
  else if (id === 'smsDial') nudge(A.sms, S.sms === 'still' ? -0.1 : 0.1);
  else if (A.spin[id]) nudge(A.spin[id], DETENT[id] * 0.7, 300);
}

function showControl(id) {
  highlight(id); operated = false;
  if (M) { const c = CONTROLS[id]; flyTo(c.view[0], c.view[1], c.view[2], M.reg[id].anchor); }
  $('#hint').classList.add('is-gone');
}

/* ═════════════ pointer: orbit, zoom, press and turn ═════════════ */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, view);
  const hits = ray.intersectObjects(M.pickables.filter((m) => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; }), false);
  return hits.length ? hits[0].object.userData.cid || null : null;
}
const canTurn = (id) => { const d = turnOf(id); return TURN.has(d) && (d !== 'lens' || selected === 'lens'); };
function tap(id) {
  if (!id) return;
  if (PRESS.has(id)) act(id, 'press'); else last = { id, kind: 'tap' };
  if (!active || (active.type === 'control' && active.id !== id)) openControl(id, true, true);
}
function bindPointer() {
  const pts = new Map(); let moved = 0, pinch = 0, mode = 'orbit', dial = null, acc = 0, lastMove = 0, vy = 0, vp = 0, wheelAcc = 0;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; acc = 0; vy = vp = 0;
    tween = null; inertia = null; stage.classList.remove('is-flying');
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); mode = 'orbit'; }
    else { const id = pick(e); dial = canTurn(id) ? turnOf(id) : null; mode = dial ? 'dial' : 'orbit'; }
    dragging = true; stage.classList.add('is-drag'); stage.classList.toggle('is-dial', mode === 'dial'); tip.hidden = true; lastMove = performance.now();
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) {                                         // hover
      if (e.pointerType !== 'mouse') return;
      const id = pick(e); stage.classList.toggle('is-over', !!id); stage.classList.toggle('is-turnable', !!id && canTurn(id) && !PRESS.has(id));
      if (id) { const r = stage.getBoundingClientRect(); tip.hidden = false; tip.textContent = CONTROLS[id].name.replace(/ \(.*\)$/, '') + (PRESS.has(id) ? ' · click' : canTurn(id) ? ' · drag to turn' : ''); tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 16}px)`; } else tip.hidden = true;
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    const now = performance.now(), dt = Math.max(0.008, (now - lastMove) / 1000); lastMove = now;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) cur.dist = clamp(cur.dist * pinch / d, 170, 760); pinch = d; moved = 99;
    } else if (mode === 'dial') {
      moved += Math.abs(dx) + Math.abs(dy); acc += dx - dy;
      while (Math.abs(acc) >= 15) { const s = Math.sign(acc); acc -= s * 15; act(dial, 'turn', s); }
    } else {
      moved += Math.abs(dx) + Math.abs(dy);
      const ry = dx * 0.0085, rp = dy * 0.0085;
      cur.yaw += ry; cur.pitch = clamp(cur.pitch + rp, rad(-89), rad(89));
      vy = vy * 0.6 + (ry / dt) * 0.4; vp = vp * 0.6 + (rp / dt) * 0.4;
    }
    needs = true;
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); pinch = 0;
    if (!pts.size) { dragging = false; stage.classList.remove('is-drag', 'is-dial'); }
    if (e.type === 'pointerup' && moved < 6) tap(pick(e));
    else if (moved >= 6) {
      $('#hint').classList.add('is-gone');
      if (mode === 'orbit' && !pts.size && !reduced && performance.now() - lastMove < 60 && Math.hypot(vy, vp) > 0.4) inertia = { vy: clamp(vy, -9, 9), vp: clamp(vp, -6, 6) };
    }
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => { tip.hidden = true; stage.classList.remove('is-over', 'is-turnable'); });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault(); tween = null; inertia = null; stage.classList.remove('is-flying');
    const id = pick(e);
    if (id && canTurn(id)) { wheelAcc += e.deltaY; while (Math.abs(wheelAcc) >= 50) { const s = Math.sign(wheelAcc); wheelAcc -= s * 50; act(turnOf(id), 'turn', s); } return; }
    zoomTo = clamp((zoomTo ?? cur.dist) * Math.exp(e.deltaY * 0.0014), 170, 760); needs = true;
  }, { passive: false });
}

/* ═════════════ interface ═════════════ */
const esc = (s) => s.replace(/&(?!amp;|lt;|gt;)/g, '&amp;');
const listTasks = $('#listTasks'), listParts = $('#listParts'), body = $('#panelBody'), empty = $('#panelEmpty'), nowEl = $('#now'), sayEl = $('#say');
let active = null;                                  // { type: 'task', task, i, done: [] } | { type: 'control', id }

function buildLists() {
  let n = 0;
  const groups = [...new Set(TASKS.map((t) => t.group))];
  listTasks.innerHTML = groups.map((g) => `<div class="grp"><p class="grp__name label">${g}</p>${TASKS.filter((t) => t.group === g).map((t) => `<button type="button" class="item" style="--n:${n}" data-task="${t.id}"><i>${String(++n).padStart(2, '0')}</i><span>${esc(t.title)}</span><em>${t.steps.length} ${t.steps.length > 1 ? 'steps' : 'step'}</em></button>`).join('')}</div>`).join('');
  listParts.innerHTML = FACES.map((f) => `<div class="grp"><p class="grp__name label">${f}</p>${Object.entries(CONTROLS).filter(([, c]) => c.face === f).map(([id, c]) => `<button type="button" class="item" data-control="${id}"><i>·</i><span>${esc(c.name)}</span></button>`).join('')}</div>`).join('');
  TASKS.forEach((t, i) => { t.no = i + 1; });
}
function markList() {
  $$('.item').forEach((b) => b.classList.toggle('is-on', !!active && ((active.type === 'task' && b.dataset.task === active.task.id) || (active.type === 'control' && b.dataset.control === active.id))));
}
function setTab(which) {
  const tasks = which === 'tasks', was = !listTasks.hidden;
  $('#tabTasks').classList.toggle('is-on', tasks); $('#tabParts').classList.toggle('is-on', !tasks);
  $('#tabTasks').setAttribute('aria-selected', tasks); $('#tabParts').setAttribute('aria-selected', !tasks);
  listTasks.hidden = !tasks; listParts.hidden = tasks;
  if (was !== tasks) restart(tasks ? listTasks : listParts, 'is-swap');
}
const setHash = (h) => history.replaceState(null, '', h ? `#${h}` : location.pathname);
function reveal(userAction) {
  empty.hidden = true; body.hidden = false; nowEl.hidden = false;
  if (userAction && PHONE.matches) scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  const on = $('.item.is-on'); if (on && !PHONE.matches) on.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
}

/* the read-out: what the camera is set to right now */
const SCREEN_NAME = { live: 'Live view', ev: 'Exposure comp.', iso: 'ISO', drive: 'Drive mode', fn: 'Function menu', menu: 'Menu', play: 'Playback', index: 'Image index', delete: 'Delete?', send: 'Send to phone' };
function updateNow() {
  const E = expose(S), on = S.power;
  const vals = { mode: S.mode, ss: fmtSS(E.den), f: fmtF(E.N).replace('F', 'f/'), ev: fmtEV(S.mode === 'M' ? Math.round(clamp(E.stops, -5, 5) * 3) : S.ev), iso: `${E.auto ? 'A ' : ''}${E.iso}` };
  const mine = { ss: E.mine.ss, f: E.mine.f, ev: S.mode !== 'M' && S.ev !== 0 };
  nowEl.classList.toggle('is-off', !on);
  for (const cell of $$('[data-k]', nowEl)) {
    const k = cell.dataset.k, dd = cell.lastElementChild, v = on ? vals[k] : '–';
    if (k === 'ev') cell.firstElementChild.textContent = S.mode === 'M' ? 'Meter' : '±';
    cell.classList.toggle('is-mine', on && !!mine[k]);
    if (dd.textContent !== v) { dd.textContent = v; restart(dd, 'is-tick'); }
  }
  const strip = on ? `<b>${vals.mode}</b><span${mine.ss ? ' class="is-mine"' : ''}>${vals.ss}</span><span${mine.f ? ' class="is-mine"' : ''}>${vals.f}</span><span${mine.ev ? ' class="is-mine"' : ''}>${vals.ev}</span><span>ISO ${vals.iso}</span>` : '<b>OFF</b>';
  const sn = $('#stageNow'); if (sn.innerHTML !== strip) sn.innerHTML = strip;
  const name = !on ? 'Switched off' : S.rec ? 'Recording' : SCREEN_NAME[S.screen] || 'Live view';
  const el = $('#nowScreen'); if (el.textContent !== name) { el.textContent = name; restart(el, 'is-tick'); }
}
function say(text) { if (sayEl.textContent === text) { restart(sayEl, 'is-in'); return; } sayEl.textContent = text; restart(sayEl, 'is-in'); }

/* the "try it" box for a step or a control */
const EDGE_LABEL = { wheelUp: ['↑', 'Press the top edge'], wheelDown: ['↓', 'Press the bottom edge'], wheelLeft: ['←', 'Press the left edge'], wheelRight: ['→', 'Press the right edge'] };
const pressBtn = (id, label) => `<button type="button" class="try__b" data-act="press" data-id="${id}">${label}</button>`;
const turnBtns = (id) => `<button type="button" class="try__b" data-act="turn" data-id="${id}" data-dir="-1" aria-label="Turn one click back">← Turn</button><button type="button" class="try__b" data-act="turn" data-id="${id}" data-dir="1" aria-label="Turn one click forward">Turn →</button>`;
function tryBox(spec, open = false) {
  if (!spec) return '';
  const [kind, a, b] = spec; let how, btns;
  if (kind === 'press') { how = 'Click the orange control on the model, or use this button.'; btns = pressBtn(a, EDGE_LABEL[a] ? EDGE_LABEL[a][1] : { monitor: 'Tap the screen', power: 'Flick the switch', lensRelease: 'Press and twist', shutter: 'Press the shutter' }[a] || 'Press it'); }
  else if (kind === 'pressAny') { how = 'Click one of the wheel\'s edges on the model, or use these.'; btns = a.map((id) => `<button type="button" class="try__b try__b--sq" data-act="press" data-id="${id}" aria-label="${EDGE_LABEL[id][1]}">${EDGE_LABEL[id][0]}</button>`).join(''); }
  else if (kind === 'turn') { how = 'Drag across the orange dial on the model, scroll over it, or use these.'; btns = turnBtns(a); }
  else if (a === 'mode') { how = `Turn the dial until <b>${b}</b> sits at the white mark. Drag it on the model, or use these.`; btns = turnBtns('modeDial'); }
  else if (a === 'sms') { how = `Move the lever to the <b>${{ still: 'still photo', movie: 'movie', sq: 'S&amp;Q' }[b]}</b> position. Drag it on the model, or use these.`; btns = turnBtns('smsDial'); }
  else if (a === 'power') { how = 'Click the switch on the model, or use this button.'; btns = pressBtn('power', b ? 'Switch on' : 'Switch off'); }
  else if (a === 'lens') { how = b ? 'Click the mount on the model, or use this button.' : 'Click the release button on the model, or use this one.'; btns = pressBtn(b ? 'mount' : 'lensRelease', b ? 'Attach the lens' : 'Release the lens'); }
  else if (a === 'disp') { how = 'Click the top edge of the wheel on the model, or use this button.'; btns = pressBtn('wheelUp', 'Press DISP'); }
  else return '';
  return `<div class="try${open ? ' is-open' : ''}"><div class="try__in"><p class="label try__head">Try it</p><p class="try__how">${how}</p><div class="try__btns">${btns}</div></div></div>`;
}
const TICK = '<svg class="step__tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5.2 5L20 6.5"/></svg>';

function stateFor(task, k) { return Object.assign(defaults(), task.init || {}, ...task.steps.slice(0, k).map((s) => s.result || {})); }
function resetTo(task, k) { clearTimers(); const before = screenKey(); S = stateFor(task, k); if (S.rec) setRec(true); sync(screenKey() !== before); }

function openTask(id, i = 0, userAction = false) {
  const task = TASKS.find((t) => t.id === id); if (!task) return;
  active = { type: 'task', task, i: clamp(i, 0, task.steps.length - 1), done: [] };
  setTab('tasks'); markList();
  const n = task.steps.length, next = TASKS[task.no % TASKS.length];
  body.innerHTML = `
    <p class="label panel__kicker">Task ${String(task.no).padStart(2, '0')} · ${task.group}</p>
    <h2 class="panel__title">${esc(task.title)}</h2>
    <p class="panel__intro">${task.intro}</p>
    <div class="prog" aria-hidden="true">${task.steps.map(() => '<i></i>').join('')}</div>
    <ol class="steps">${task.steps.map((s, k) => `<li class="step" data-k="${k}"><button type="button" class="step__head" data-step="${k}"><span class="step__no">${k + 1}${TICK}</span><span><span class="step__on">${esc(CONTROLS[s.c].name)}</span><span class="step__do">${s.do}</span></span></button>${tryBox(s.try)}</li>`).join('')}</ol>
    ${n > 1 ? '<div class="stepnav"><button type="button" class="btn btn--ghost" data-go="-1">Back</button><button type="button" class="btn" data-go="1">Next step</button><span class="stepnav__count"></span></div>' : ''}
    <div class="done" hidden><p class="label">Done</p><p class="done__msg">That is the whole move. Do it once on the real camera and it will stick.</p><div class="done__btns"><button type="button" class="btn" data-task="${next.id}">Next: ${esc(next.title)}</button><button type="button" class="link" data-again>Again</button></div></div>
    <div class="panel__note"><b class="label">Where it is</b><span id="where"></span></div>
    ${task.more ? `<a class="panel__more" href="${task.more[0]}">${task.more[1]} →</a>` : ''}`;
  restart(body, 'is-enter');
  resetTo(task, active.i); say(task.steps[active.i].try ? 'Your turn: the camera on the left is live.' : '');
  paintSteps(); showControl(task.steps[active.i].c);
  reveal(userAction); setHash(`t=${id}`);
}
function paintSteps() {
  const { task, i, done } = active, n = task.steps.length;
  $$('.step', body).forEach((li, k) => {
    li.classList.toggle('is-on', k === i); li.classList.toggle('is-done', !!done[k]);
    const b = li.firstElementChild; k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current');
  });
  $$('.prog i', body).forEach((el, k) => { el.classList.toggle('is-done', !!done[k]); el.classList.toggle('is-on', k === i); });
  const back = $('[data-go="-1"]', body), fwd = $('[data-go="1"]', body), cnt = $('.stepnav__count', body);
  if (back) { back.disabled = i === 0; fwd.disabled = i === n - 1; cnt.innerHTML = `${i + 1}<small> / ${n}</small>`; }
  const w = $('#where'), text = CONTROLS[task.steps[i].c].where;
  if (w.textContent !== text) { w.textContent = text; restart(w, 'is-tick'); }
  const all = i === n - 1 && task.steps.every((s, k) => !s.try || done[k]), fin = $('.done', body);
  if (fin.hidden === all) { fin.hidden = !all; if (all) restart(fin, 'is-in'); }
}
function goStep(k, rebuild) {
  const { task } = active; k = clamp(k, 0, task.steps.length - 1);
  active.i = k; if (rebuild) resetTo(task, k);
  paintSteps(); showControl(task.steps[k].c);
  if (PHONE.matches) $('.step.is-on', body)?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });   // park the new step just under the pinned camera
}
function met(spec, ev) {
  const [kind, a, b] = spec;
  if (kind === 'press') return ev.kind === 'press' && ev.id === a;
  if (kind === 'pressAny') return ev.kind === 'press' && a.includes(ev.id);
  if (kind === 'turn') return ev.kind === 'turn' && ev.id === a;
  return S[a] === b;
}
function checkStep(ev) {
  if (!active || active.type !== 'task') return;
  const { task, i, done } = active, step = task.steps[i];
  if (!step.try || done[i] || !met(step.try, ev)) return;
  done[i] = true; paintSteps();
  const me = active;
  if (i < task.steps.length - 1) setTimeout(() => { if (active === me && me.i === i) goStep(i + 1, false); }, reduced ? 250 : 900);
}

function openControl(id, userAction = false, fromModel = false) {
  if (!CONTROLS[id]) return;
  active = { type: 'control', id };
  if (!fromModel || !listParts.hidden) setTab('parts');
  markList();
  const c = CONTROLS[id], used = TASKS.filter((t) => t.steps.some((s) => s.c === id));
  const spec = PRESS.has(id) && id !== 'mount' ? ['press', id] : TURN.has(id) ? ['turn', id] : null;
  body.innerHTML = `
    <p class="label panel__kicker">Control · ${c.face}</p>
    <h2 class="panel__title">${esc(c.name)}</h2>
    <p class="panel__where"><span class="label">Where</span><span>${c.where}</span></p>
    <p class="panel__intro">${c.what}</p>
    ${tryBox(spec, true)}
    ${c.facts ? `<h3 class="label">What it does</h3><dl class="facts">${c.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
    ${used.length ? `<h3 class="label">You use it to</h3><div class="chips">${used.map((t) => `<button type="button" data-task="${t.id}" data-at="${t.steps.findIndex((s) => s.c === id)}">${esc(t.title)}</button>`).join('')}</div>` : ''}`;
  restart(body, 'is-enter');
  if (!fromModel) {                                      // chosen from the list: put the model in a sensible state for it
    const before = screenKey();
    if (id === 'mount') S.lens = false; else if (id === 'lens' || id === 'lensRelease') S.lens = true;
    sync(screenKey() !== before);
  } else updateNow();
  showControl(id); reveal(userAction); setHash(`c=${id}`);
}

function bindUI() {
  $('#tabTasks').addEventListener('click', () => setTab('tasks'));
  $('#tabParts').addEventListener('click', () => setTab('parts'));
  $('.cam__scroll').addEventListener('click', (e) => {
    const b = e.target.closest('.item'); if (!b) return;
    b.dataset.task ? openTask(b.dataset.task, 0, true) : openControl(b.dataset.control, true);
  });
  body.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]'), s = e.target.closest('[data-step]'), g = e.target.closest('[data-go]'), t = e.target.closest('[data-task]'), again = e.target.closest('[data-again]');
    if (a) act(a.dataset.id, a.dataset.act, +a.dataset.dir || 1);
    else if (s) goStep(+s.dataset.step, true);
    else if (g && !g.disabled) { goStep(active.i + +g.dataset.go, true); ($(`[data-go="${g.dataset.go}"]:not([disabled])`, body) || $('[data-go]:not([disabled])', body))?.focus({ preventScroll: true }); }
    else if (again) openTask(active.task.id, 0, true);
    else if (t) openTask(t.dataset.task, +t.dataset.at || 0, true);
  });
  document.addEventListener('keydown', (e) => {
    if (!active || active.type !== 'task' || e.target.closest('input, textarea, [role="tab"]')) return;
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
    const i = clamp(active.i + d, 0, active.task.steps.length - 1); if (i !== active.i) goStep(i, true);
  });
  const VIEWS = { front: [24, 10], back: [180, 8], top: [180, 66], bottom: [0, -72], grip: [90, 8], ports: [-90, 8] };
  $('.views').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const v = VIEWS[b.dataset.view]; flyTo(v[0], v[1], 380, null); $('#hint').classList.add('is-gone'); });
  $('#lensBtn').addEventListener('click', () => act(S.lens ? 'lensRelease' : 'mount', 'press'));
  addEventListener('hashchange', fromHash);
  setInterval(demo, 2600);
}
function fromHash() {
  const m = location.hash.match(/^#([tc])=([\w-]+)/); if (!m) return false;
  m[1] === 't' ? openTask(m[2]) : openControl(m[2]);
  return !!active;
}

/* ═════════════ go ═════════════ */
buildLists(); bindUI();
(document.fonts?.load ? Promise.all([document.fonts.load('600 20px Archivo'), document.fonts.load('700 20px Archivo')]).catch(() => {}) : Promise.resolve()).then(() => {
  const ok = initGL();
  if (ok) {
    bindPointer(); sync();
    window.__cam = {
      cur, reg: M.reg, flyTo, act,
      screenOf(id) { const v = M.reg[id].anchor.clone(); M.cam.localToWorld(v); v.project(view); const r = canvas.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height }; },
      get S() { return S; }, get selected() { return selected; }, get last() { return last; }, get active() { return active; },
      get busy() { return !!tween || !!inertia || zoomTo !== null || lcd.busy || springs.some((s) => s.live); },
      set demo(v) { demoOn = v; },
      get why() { return { tween: !!tween, inertia: !!inertia, zoomTo, lcd: lcd.busy, springs: springs.map((x, i) => (x.live ? `${i}:${x.x.toFixed(4)}>${x.to.toFixed(4)} v${x.v.toFixed(4)}` : '')).filter(Boolean) }; },
    };
  } else updateNow();
  if (!fromHash() && ok) flyTo(28, 14, 380, null, 1900);   // opening move: swing round to a front three-quarter view
  document.documentElement.classList.add('cam-ready');
});
