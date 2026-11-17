/* a6700 Field Manual — Chapter 00: the 3D camera.
   The model is built from primitives at 1 unit = 1 mm (body 122 × 69 × 75 including grip and eyecup).
   It is a faithful diagram of where the controls are, not a scan of the product. */
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { CONTROLS, TASKS, FACES } from './camera-data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rad = (d) => d * Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PHONE = matchMedia('(max-width: 760px), (max-height: 500px) and (orientation: landscape)');   // layouts where the page scrolls
const INK = '#0e1418', ORANGE = '#ff5a1f';

/* ═════════════ model ═════════════ */
const FACE = {
  back: { n: V(0, 0, -1), up: V(0, 1, 0) },
  front: { n: V(0, 0, 1), up: V(0, 1, 0) },
  top: { n: V(0, 1, 0), up: V(0, 0, 1) },          // text reads for someone standing behind the camera
  bottom: { n: V(0, -1, 0), up: V(0, 0, 1) },
  grip: { n: V(-1, 0, 0), up: V(0, 1, 0) },
  ports: { n: V(1, 0, 0), up: V(0, 1, 0) },
};
function orient(obj, face) {
  const n = face.n.clone().normalize();
  const r = new THREE.Vector3().crossVectors(face.up, n).normalize();
  const u = new THREE.Vector3().crossVectors(n, r);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, u, n));
  return obj;
}

const mat = {
  body: new THREE.MeshStandardMaterial({ color: '#191c1f', roughness: 0.62, metalness: 0.18 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#0e1012', roughness: 0.96, metalness: 0 }),
  ctl: new THREE.MeshStandardMaterial({ color: '#272b2f', roughness: 0.5, metalness: 0.35 }),
  knurl: new THREE.MeshStandardMaterial({ color: '#23272a', roughness: 0.42, metalness: 0.55, flatShading: true }),
  silver: new THREE.MeshStandardMaterial({ color: '#c3c8cc', roughness: 0.28, metalness: 1 }),
  steel: new THREE.MeshStandardMaterial({ color: '#6d747a', roughness: 0.35, metalness: 1 }),
  dark: new THREE.MeshStandardMaterial({ color: '#050607', roughness: 0.9, metalness: 0 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#06090c', roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, reflectivity: 1 }),
  sensor: new THREE.MeshPhysicalMaterial({ color: '#27505c', roughness: 0.12, metalness: 0.9, clearcoat: 1 }),
  gold: new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.3, metalness: 1 }),
  accent: new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.4, metalness: 0.6 }),
  red: new THREE.MeshStandardMaterial({ color: '#c8202c', roughness: 0.5, metalness: 0.1 }),
  amber: new THREE.MeshPhysicalMaterial({ color: '#5c1f10', roughness: 0.08, metalness: 0, clearcoat: 1 }),
  white: new THREE.MeshStandardMaterial({ color: '#e9edf0', roughness: 0.6 }),
  hi: new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.45, metalness: 0.1, emissive: ORANGE, emissiveIntensity: 0.55 }),
};

/* geometry helpers */
function roundedPoly(pts) {                         // pts: [x, y, radius]
  const s = new THREE.Shape(), n = pts.length;
  const P = (i) => new THREE.Vector2(pts[(i + n) % n][0], pts[(i + n) % n][1]);
  for (let i = 0; i < n; i++) {
    const p = P(i), a = P(i - 1), b = P(i + 1), r = pts[i][2];
    const da = a.clone().sub(p), db = b.clone().sub(p);
    const ra = Math.min(r, da.length() / 2), rb = Math.min(r, db.length() / 2);
    const s1 = p.clone().add(da.normalize().multiplyScalar(ra)), s2 = p.clone().add(db.normalize().multiplyScalar(rb));
    i === 0 ? s.moveTo(s1.x, s1.y) : s.lineTo(s1.x, s1.y);
    s.quadraticCurveTo(p.x, p.y, s2.x, s2.y);
  }
  s.closePath();
  return s;
}
const rrect = (w, h, r) => roundedPoly([[-w / 2, -h / 2, r], [w / 2, -h / 2, r], [w / 2, h / 2, r], [-w / 2, h / 2, r]]);
/* slab: rounded rectangle w×h in local XY, thickness d rising along +Z from z = 0 */
function slab(w, h, d, r, bevel = 0.5) {
  const b = Math.min(bevel, d / 2.2, r);
  const g = new THREE.ExtrudeGeometry(rrect(w, h, r), { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, b);
  return g;
}
/* cyl: axis along +Z, base at z = 0 */
function cyl(r, h, rTop = r, seg = 40) { const g = new THREE.CylinderGeometry(rTop, r, h, seg); g.rotateX(Math.PI / 2); g.translate(0, 0, h / 2); return g; }
function knurl(r, h, teeth, depth = 0.06) {
  const g = new THREE.CylinderGeometry(r, r, h, teeth * 2, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z);
    if (d < r * 0.5) continue;
    const k = Math.round(Math.atan2(z, x) / (Math.PI / teeth));
    const s = (k % 2 ? 1 - depth : 1);
    p.setX(i, x * s); p.setZ(i, z * s);
  }
  g.computeVertexNormals(); g.rotateX(Math.PI / 2); g.translate(0, 0, h / 2);
  return g;
}

/* printed labels */
const PX = 12;                                       // canvas pixels per millimetre
function decal(w, h, draw) {
  const c = document.createElement('canvas'); c.width = Math.round(w * PX); c.height = Math.round(h * PX);
  const g = c.getContext('2d'); g.scale(PX, PX); g.fillStyle = g.strokeStyle = '#eef2f4'; g.lineWidth = 0.28; g.lineCap = g.lineJoin = 'round';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.renderOrder = 2; m.raycast = () => {};
  return m;
}
const font = (g, mm, weight = 600) => { g.font = `${weight} ${mm}px Archivo, Arial, sans-serif`; };
const text = (s, mm, w = 600) => decal(Math.max(4, s.length * mm * 0.72 + 1), mm * 1.5, (g, W, H) => { font(g, mm, w); g.fillText(s, W / 2, H / 2 + mm * 0.04); });

function buildCamera() {
  const cam = new THREE.Group();
  const reg = {};                                    // control id → { meshes, anchor, normal }
  const pickables = [];
  const add = (mesh, pos, face, parent = cam) => { if (face) orient(mesh, face); mesh.position.copy(pos); parent.add(mesh); pickables.push(mesh); return mesh; };
  const put = (d, pos, face, parent = cam) => { orient(d, face); d.position.copy(pos).addScaledVector(face.n, 0.07); parent.add(d); return d; };
  const control = (id, meshes, anchor, normal) => {
    meshes = [].concat(meshes); meshes.forEach((m) => { m.userData.cid = id; m.userData.base = m.material; });
    reg[id] = { meshes, anchor, normal: normal.clone() };
  };

  /* body: top-view outline (x, z) extruded 66 mm tall. −x is the grip side, +z is the front. */
  const outline = [[61, -21, 6], [61, 17, 6], [-25, 17, 4], [-30, 43, 9], [-55, 46, 12], [-61, 30, 9], [-61, -21, 7]];
  const bodyG = new THREE.ExtrudeGeometry(roundedPoly(outline.map(([x, z, r]) => [x, -z, r])), { depth: 63, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.5, bevelOffset: -1.5, bevelSegments: 4, curveSegments: 14 });
  bodyG.translate(0, 0, -31.5); bodyG.rotateX(-Math.PI / 2);          // extrusion axis → +Y, shape y → −z
  const body = new THREE.Mesh(bodyG, mat.body); cam.add(body); pickables.push(body);
  // grip wrap: a slightly proud rubber skin over the grip
  const gripG = new THREE.ExtrudeGeometry(roundedPoly([[-26, 15, 3], [-30.5, 43.4, 9], [-55.2, 46.5, 12], [-61.5, 30, 9], [-61.5, 4, 3], [-40, 4, 3]].map(([x, z, r]) => [x, -z, r])), { depth: 50, bevelEnabled: true, bevelThickness: 1, bevelSize: 0.6, bevelOffset: -0.6, bevelSegments: 3, curveSegments: 14 });
  gripG.translate(0, 0, -29); gripG.rotateX(-Math.PI / 2);
  const grip = new THREE.Mesh(gripG, mat.rubber); cam.add(grip); pickables.push(grip);

  const TOP = 33, BACK = -21, FRONT = 17, BOT = -33;

  /* ── top plate ── */
  // shutter button + power collar
  const sh = V(-46, TOP, 31);
  const collar = add(new THREE.Mesh(knurl(9.4, 2.6, 22, 0.05), mat.knurl), sh, FACE.top);
  const lever = add(new THREE.Mesh(slab(4.2, 3, 2.6, 1), mat.ctl), sh.clone().add(V(9.6, 0, -2)), FACE.top);
  const shBtn = add(new THREE.Mesh(cyl(6.1, 4.4, 5.6), mat.silver), sh, FACE.top);
  control('shutter', shBtn, sh.clone().add(V(0, 4.4, 0)), FACE.top.n);
  control('power', [collar, lever], sh.clone().add(V(9, 2.6, -2)), FACE.top.n);
  put(text('ON/OFF', 1.4), V(-30.5, TOP, 25.5), FACE.top);

  const c2 = add(new THREE.Mesh(cyl(3.1, 1.5, 2.8), mat.ctl), V(-53, TOP, 14.5), FACE.top);
  control('c2', c2, V(-53, TOP + 1.5, 14.5), FACE.top.n);
  put(text('C2', 1.7), V(-53, TOP, 9.6), FACE.top);
  const mv = add(new THREE.Mesh(cyl(3.3, 1.5, 3), mat.ctl), V(-41, TOP, 13), FACE.top);
  const mvDot = add(new THREE.Mesh(cyl(1.2, 1.62, 1.2), mat.red), V(-41, TOP, 13), FACE.top);
  control('movie', [mv], V(-41, TOP + 1.5, 13), FACE.top.n); mvDot.userData.cid = 'movie';
  put(text('MOVIE', 1.4), V(-41, TOP, 8), FACE.top);

  // mode dial with the Still/Movie/S&Q ring beneath it
  const md = V(-21, TOP, -5);
  const smsPivot = new THREE.Group(); smsPivot.position.copy(md); cam.add(smsPivot);
  const smsRing = add(new THREE.Mesh(cyl(13, 2.4), mat.ctl), V(0, 0, 0), FACE.top, smsPivot);
  const smsTab = add(new THREE.Mesh(slab(5.5, 4.4, 2.8, 1.2), mat.knurl), V(-14.6, 0, 0), FACE.top, smsPivot);
  control('smsDial', [smsRing, smsTab], md.clone().add(V(-14.6, 2.8, 0)), FACE.top.n);
  const dialPivot = new THREE.Group(); dialPivot.position.copy(md).add(V(0, 2.4, 0)); cam.add(dialPivot);
  const dial = add(new THREE.Mesh(knurl(10.6, 6.6, 30, 0.05), mat.knurl), V(0, 0, 0), FACE.top, dialPivot);
  const MODES = ['AUTO', 'P', 'A', 'S', 'M', '1', '2', '3'];
  const dialFace = decal(20, 20, (g) => {
    g.translate(10, 10);
    MODES.forEach((m, i) => { g.save(); g.rotate(i * Math.PI / 4); font(g, m === 'AUTO' ? 1.9 : 2.7, 700); g.fillStyle = m === 'AUTO' ? '#7fd08a' : '#eef2f4'; g.fillText(m, 0, -6.6); g.restore(); });
  });
  put(dialFace, V(0, 6.6, 0), FACE.top, dialPivot);
  control('modeDial', dial, md.clone().add(V(0, 9, 0)), FACE.top.n);
  // index mark printed on the body beside the mode dial
  put(decal(3.4, 1, (g, W, H) => { g.fillRect(0, H / 2 - 0.3, W, 0.6); }), V(-4.6, TOP, -5), FACE.top);

  // rear dial, sunk into the back corner
  const rd = add(new THREE.Mesh(knurl(8.6, 5.4, 26, 0.07), mat.knurl), V(-49, TOP - 3.4, -14.5), FACE.top);
  control('rearDial', rd, V(-49, TOP + 2, -17), FACE.top.n);

  // Multi Interface Shoe
  const shoe = new THREE.Group(); shoe.position.set(12, TOP, -5.5); cam.add(shoe);
  const shoeParts = [
    add(new THREE.Mesh(slab(20, 19, 0.8, 1.2, 0.2), mat.steel), V(0, 0, 0), FACE.top, shoe),
    add(new THREE.Mesh(slab(3, 19, 2.6, 0.5, 0.2), mat.silver), V(-8.5, 0, 0), FACE.top, shoe),
    add(new THREE.Mesh(slab(3, 19, 2.6, 0.5, 0.2), mat.silver), V(8.5, 0, 0), FACE.top, shoe),
    add(new THREE.Mesh(slab(5.4, 19, 0.8, 0.4, 0.2), mat.silver), V(-7.3, 2.2, 0), FACE.top, shoe),
    add(new THREE.Mesh(slab(5.4, 19, 0.8, 0.4, 0.2), mat.silver), V(7.3, 2.2, 0), FACE.top, shoe),
    add(new THREE.Mesh(slab(20, 2.4, 2.6, 0.5, 0.2), mat.silver), V(0, 0, 8.3), FACE.top, shoe),
  ];
  control('shoe', shoeParts, V(12, TOP + 3, -5.5), FACE.top.n);

  /* ── back ── */
  // viewfinder eyepiece
  const ev = V(47, 24.5, BACK);
  const cup = add(new THREE.Mesh(slab(27, 21, 8.5, 6, 1.6), mat.rubber), ev, FACE.back);
  const eyeGlass = add(new THREE.Mesh(slab(15, 10.5, 0.6, 2.4, 0.2), mat.glass), ev.clone().add(V(0, 0, -8.3)), FACE.back);
  const eyeSensor = add(new THREE.Mesh(slab(2.2, 6, 0.5, 1, 0.15), mat.glass), ev.clone().add(V(-11, 0, -8.3)), FACE.back);
  control('evf', [cup, eyeGlass, eyeSensor], ev.clone().add(V(0, 0, -9)), FACE.back.n);
  const dio = new THREE.Mesh(knurl(3.3, 2.6, 12, 0.1), mat.knurl); dio.rotation.y = Math.PI / 2; dio.position.set(31.2, 26.5, BACK - 2.6); cam.add(dio); pickables.push(dio);
  control('diopter', dio, V(31.5, 26.5, BACK - 6), FACE.back.n);

  // monitor
  const lcdC = V(20, -9.5, BACK);
  const lcdFrame = add(new THREE.Mesh(slab(73, 47, 2.4, 2.4, 0.6), mat.ctl), lcdC, FACE.back);
  const hinge = add(new THREE.Mesh(slab(3, 30, 3, 1.2, 0.5), mat.body), V(58.2, -9.5, BACK), FACE.back);
  const lcdCanvas = document.createElement('canvas'); lcdCanvas.width = 660; lcdCanvas.height = 440;
  const lcdTex = new THREE.CanvasTexture(lcdCanvas); lcdTex.colorSpace = THREE.SRGBColorSpace; lcdTex.anisotropy = 8;
  const screen = add(new THREE.Mesh(new THREE.PlaneGeometry(66, 44), new THREE.MeshBasicMaterial({ map: lcdTex, toneMapped: false })), lcdC.clone().add(V(0, 0, -2.46)), FACE.back);
  control('monitor', [lcdFrame], lcdC.clone().add(V(0, 0, -2.6)), FACE.back.n); screen.userData.cid = 'monitor'; hinge.userData.cid = 'monitor';

  const button = (id, pos, r, label, lpos, lmm = 1.7) => {
    const m = add(new THREE.Mesh(cyl(r, 1.4, r - 0.35), mat.ctl), pos, FACE.back);
    control(id, m, pos.clone().add(V(0, 0, -1.4)), FACE.back.n);
    if (label) put(typeof label === 'string' ? text(label, lmm) : label, lpos, FACE.back);
    return m;
  };
  button('menu', V(22, 24.6, BACK), 3, 'MENU', V(22, 30.2, BACK));
  button('afon', V(-28, 23.6, BACK), 4.3, 'AF-ON', V(-28, 30.4, BACK));
  const thumb = add(new THREE.Mesh(slab(21, 23, 3.4, 5, 1.4), mat.rubber), V(-49, 11.5, BACK), FACE.back); thumb.userData.cid = undefined;
  button('fn', V(-27.5, 6.2, BACK), 3.1, 'Fn', V(-27.5, 11.6, BACK), 1.9);

  // control wheel: ring + centre button + four pressable edges
  const wc = V(-40, -12.5, BACK), WR = 11;
  const wheelRing = add(new THREE.Mesh(knurl(WR, 2.2, 40, 0.035), mat.knurl), wc, FACE.back);
  const wheelFace = add(new THREE.Mesh(cyl(WR - 1, 2.35), mat.ctl), wc, FACE.back);
  const centre = add(new THREE.Mesh(cyl(4.3, 2.9, 4), mat.ctl), wc, FACE.back);
  control('wheel', [wheelRing], wc.clone().add(V(0, 0, -2.4)), FACE.back.n); wheelFace.userData.cid = 'wheel';
  control('wheelCenter', centre, wc.clone().add(V(0, 0, -2.9)), FACE.back.n);
  put(decal(21, 21, (g) => {
    g.translate(10.5, 10.5);
    font(g, 1.75, 700); g.fillText('DISP', 0, -7.1);
    font(g, 1.75, 700); g.fillText('ISO', 7.1, 0.05);
    // drive mode: stacked frames
    g.lineWidth = 0.3; g.strokeRect(-8.5, -0.5, 2.6, 1.9); g.beginPath(); g.moveTo(-7.9, -1.1); g.lineTo(-5.3, -1.1); g.lineTo(-5.3, 0.8); g.stroke();
    // exposure compensation: ± in a split box
    g.strokeRect(-1.6, 5.6, 3.2, 3.2); g.beginPath(); g.moveTo(-1.6, 8.8); g.lineTo(1.6, 5.6); g.stroke();
    g.lineWidth = 0.26; g.beginPath(); g.moveTo(-1.1, 6.5); g.lineTo(-0.1, 6.5); g.moveTo(-0.6, 6); g.lineTo(-0.6, 7); g.moveTo(0.3, 8); g.lineTo(1.2, 8); g.stroke();
  }), wc.clone().add(V(0, 0, -2.35)), FACE.back);
  const wedge = (id, a0, dir) => {
    const g = new THREE.RingGeometry(4.8, WR - 0.6, 24, 1, a0 - Math.PI / 4.4, Math.PI / 2.2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.0, depthWrite: false, toneMapped: false }));
    orient(m, FACE.back); m.position.copy(wc).add(V(0, 0, -2.5)); m.renderOrder = 3; cam.add(m); pickables.push(m);
    m.userData.cid = id; reg[id] = { meshes: [], wedge: m, anchor: wc.clone().add(V(dir[0] * 7.4, dir[1] * 7.4, -2.5)), normal: FACE.back.n.clone() };
  };
  // plane local +x maps to the viewer's right when seen from behind
  wedge('wheelUp', Math.PI / 2, [0, 1]); wedge('wheelDown', -Math.PI / 2, [0, -1]);
  wedge('wheelRight', 0, [-1, 0]); wedge('wheelLeft', Math.PI, [1, 0]);

  button('playback', V(-31.5, -28.6, BACK), 2.7, decal(4, 3.4, (g) => { g.strokeRect(0.5, 0.5, 3, 2.4); g.beginPath(); g.moveTo(1.5, 1.05); g.lineTo(2.75, 1.7); g.lineTo(1.5, 2.35); g.closePath(); g.fill(); }), V(-25.2, -28.6, BACK));
  button('del', V(-48.5, -28.6, BACK), 2.7, decal(7.6, 3.6, (g) => {
    font(g, 1.6, 700); g.fillText('C3', 1.7, 1.9);
    g.lineWidth = 0.28; g.beginPath(); g.moveTo(4.4, 1.1); g.lineTo(7.2, 1.1); g.moveTo(5.3, 1.1); g.lineTo(5.3, 0.6); g.lineTo(6.3, 0.6); g.lineTo(6.3, 1.1);
    g.moveTo(4.8, 1.1); g.lineTo(5, 3.1); g.lineTo(6.6, 3.1); g.lineTo(6.8, 1.1); g.stroke();
  }), V(-55.6, -28.6, BACK));

  // C1: on the grip-side face, at the outer edge of the thumb rest
  const c1 = add(new THREE.Mesh(cyl(2.7, 1.3, 2.4), mat.ctl), V(-61, 13.5, -12), FACE.grip);
  control('c1', c1, V(-62.3, 13.5, -12), FACE.grip.n);
  put(text('C1', 1.7), V(-61, 19, -12), FACE.grip);

  /* ── front ── */
  const fd = new THREE.Mesh(knurl(7.6, 5, 24, 0.07), mat.knurl); orient(fd, FACE.top); fd.position.set(-45.5, 22, 43); cam.add(fd); pickables.push(fd);
  control('frontDial', fd, V(-45.5, 24.5, 50.6), FACE.front.n);
  const lamp = add(new THREE.Mesh(cyl(2.5, 0.9, 2.2), mat.amber), V(-20.5, 24.5, FRONT), FACE.front);
  control('afLamp', lamp, V(-20.5, 24.5, FRONT + 0.9), FACE.front.n);

  // mount
  const mc = V(8, -1.5, FRONT);
  const mountG = new THREE.Group(); mountG.position.copy(mc); cam.add(mountG);
  const ringShape = (ro, ri) => { const s = new THREE.Shape(); s.absarc(0, 0, ro, 0, Math.PI * 2); const h = new THREE.Path(); h.absarc(0, 0, ri, 0, Math.PI * 2, true); s.holes.push(h); return s; };
  const flange = add(new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape(30.6, 23.2), { depth: 4.6, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelOffset: -0.5, bevelSegments: 2, curveSegments: 48 }), mat.silver), V(0, 0, 0.4), null, mountG);
  const hue = add(new THREE.Mesh(new THREE.TorusGeometry(31.1, 0.75, 10, 72), mat.accent), V(0, 0, 0.7), null, mountG); hue.userData.cid = 'mount';
  const throat = add(new THREE.Mesh(new THREE.CylinderGeometry(23.2, 21.6, 5, 48, 1, true), new THREE.MeshStandardMaterial({ color: '#08090a', roughness: 0.85, side: THREE.BackSide })), V(0, 0, 2.6), null, mountG); throat.rotation.x = Math.PI / 2;
  const sensorBack = add(new THREE.Mesh(new THREE.CircleGeometry(21.2, 48), mat.dark), V(0, 0, 0.12), null, mountG);
  const sensor = add(new THREE.Mesh(slab(23.5, 15.6, 0.5, 0.6, 0.1), mat.sensor), V(0, 0, 0.14), null, mountG);
  const contacts = [];
  for (let i = 0; i < 10; i++) { const a = rad(250 + i * 4.4); contacts.push(add(new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.2, 0.5), mat.gold), V(Math.cos(a) * 19.6, Math.sin(a) * 19.6, 0.5), null, mountG)); contacts[i].rotation.z = a - Math.PI / 2; }
  const idx = add(new THREE.Mesh(cyl(1.05, 0.3), mat.white), V(Math.cos(rad(62)) * 27, Math.sin(rad(62)) * 27, 5.5), null, mountG); idx.userData.cid = 'mount';
  control('mount', [flange], mc.clone().add(V(0, 0, 6)), FACE.front.n);
  [throat, sensorBack, sensor, ...contacts].forEach((m) => { m.userData.cid = 'mount'; });
  const rel = add(new THREE.Mesh(cyl(4.1, 2.6, 3.7), mat.ctl), V(43.6, -14.5, FRONT), FACE.front);
  control('lensRelease', rel, V(43.6, -14.5, FRONT + 2.6), FACE.front.n);

  // lens: Sigma 18–50mm proportions (≈ 65 mm wide, 75 mm long), simplified
  const lens = new THREE.Group(); lens.position.copy(mc).add(V(0, 0, 5.6)); cam.add(lens);
  const lathe = (pts, m) => { const g = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), 72); g.rotateX(Math.PI / 2); return add(new THREE.Mesh(g, m), V(0, 0, 0), null, lens); };
  const lensMat = new THREE.MeshStandardMaterial({ color: '#16181a', roughness: 0.5, metalness: 0.35 });
  const lensRubber = new THREE.MeshStandardMaterial({ color: '#0d0e10', roughness: 0.9, metalness: 0.05, flatShading: true });
  const lensGlass = mat.glass.clone(); lensGlass.envMapIntensity = 0.45;
  const barrel = lathe([[0, 0], [29.6, 0], [30.6, 1.2], [30.6, 9], [31.6, 10.5], [31.6, 55], [32.4, 56.5], [32.4, 72.5], [31.2, 74], [27.6, 74], [26.6, 71.5], [20, 66], [0, 66]], lensMat);
  const zoomRing = add(new THREE.Mesh(knurl(32.9, 27, 60, 0.022), lensRubber), V(0, 0, 13), null, lens);
  const focusRing = add(new THREE.Mesh(knurl(32.9, 9, 90, 0.014), lensRubber), V(0, 0, 44.5), null, lens);
  const front = add(new THREE.Mesh(new THREE.SphereGeometry(40, 48, 16, 0, Math.PI * 2, 0, 0.53), lensGlass), V(0, 0, 32.6), null, lens); front.rotation.x = Math.PI / 2;
  const lensIdx = add(new THREE.Mesh(cyl(1.05, 0.3), mat.white), V(Math.cos(rad(62)) * 30.7, Math.sin(rad(62)) * 30.7, 4), null, lens); lensIdx.rotation.set(0, 0, 0); orient(lensIdx, { n: V(Math.cos(rad(62)), Math.sin(rad(62)), 0), up: V(0, 0, 1) });
  const lensParts = [barrel, zoomRing, focusRing, front, lensIdx];
  control('lens', [zoomRing], mc.clone().add(V(0, 33.5, 29)), V(0, 0.5, 0.86));
  lensParts.forEach((m) => { m.userData.cid = 'lens'; });
  const lensMats = [lensMat, lensRubber, lensGlass, mat.white];

  /* ── sides and bottom ── */
  const door = add(new THREE.Mesh(slab(17, 25, 1.1, 2.4, 0.4), mat.rubber), V(61, 7, -1.5), FACE.ports);
  control('card', door, V(62.2, 7, -1.5), FACE.ports.n);
  const port = add(new THREE.Mesh(slab(17, 20, 1.1, 2.4, 0.4), mat.rubber), V(61, -18.5, -1.5), FACE.ports);
  control('ports', port, V(62.2, -18.5, -1.5), FACE.ports.n);
  const lampDot = add(new THREE.Mesh(cyl(0.7, 0.3), mat.red), V(61, 22.5, -12), FACE.ports); lampDot.userData.cid = 'card';
  const hook = (x, face) => {
    const post = add(new THREE.Mesh(slab(5, 7, 1.6, 1.4, 0.4), mat.steel), V(x, 25, 6.5), face);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.6, 8, 28), mat.silver); loop.position.set(x + face.n.x * 2.2, 22.6, 6.5); loop.rotation.y = Math.PI / 2; loop.rotation.x = 0; cam.add(loop); pickables.push(loop);
    return [post, loop];
  };
  control('strap', [...hook(61, FACE.ports), ...hook(-61, FACE.grip)], V(63.5, 23, 6.5), FACE.ports.n);
  const bat = add(new THREE.Mesh(slab(24, 40, 0.9, 3, 0.3), mat.ctl), V(-44, BOT, 14), FACE.bottom);
  const batLatch = add(new THREE.Mesh(slab(8, 3.4, 1.5, 1, 0.3), mat.knurl), V(-44, BOT, -2.4), FACE.bottom);
  control('battery', [bat, batLatch], V(-44, BOT - 1.2, 14), FACE.bottom.n);
  const tri = add(new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape(5.4, 3.1), { depth: 0.7, bevelEnabled: false, curveSegments: 32 }), mat.silver), V(8, BOT, -1), FACE.bottom);
  const triHole = add(new THREE.Mesh(cyl(3.1, 0.2), mat.dark), V(8, BOT, -1), FACE.bottom);
  control('tripod', [tri], V(8, BOT - 1, -1), FACE.bottom.n); triHole.userData.cid = 'tripod';

  return { cam, reg, pickables, lens, lensMats, dialPivot, smsPivot, MODES, lcdCanvas, lcdTex, hinge, thumb };
}

/* ═════════════ rear screen ═════════════ */
function drawLCD(c, mode, letter = 'A') {
  const g = c.getContext('2d'), W = c.width, H = c.height;
  const F = (px, w = 600) => { g.font = `${w} ${px}px Archivo, Arial, sans-serif`; };
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (mode === 'off') return;
  const scene = (zoom = 1, dim = 1) => {
    g.save(); g.translate(W / 2, H / 2); g.scale(zoom, zoom); g.translate(-W / 2 - (zoom > 1 ? 40 : 0), -H / 2 + (zoom > 1 ? 30 : 0));
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#6f97b8'); sky.addColorStop(1, '#cfdfea'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#8ba7be'; g.beginPath(); g.moveTo(0, 280); g.lineTo(90, 170); g.lineTo(150, 225); g.lineTo(250, 110); g.lineTo(340, 215); g.lineTo(410, 160); g.lineTo(500, 240); g.lineTo(585, 135); g.lineTo(660, 215); g.lineTo(660, 330); g.lineTo(0, 330); g.fill();
    g.fillStyle = '#eff4f8'; g.beginPath(); g.moveTo(250, 110); g.lineTo(220, 150); g.lineTo(240, 142); g.lineTo(252, 158); g.lineTo(268, 140); g.lineTo(284, 152); g.fill();
    g.fillStyle = '#f1f5f8'; g.beginPath(); g.moveTo(0, 318); g.bezierCurveTo(160, 290, 320, 330, 660, 300); g.lineTo(660, H); g.lineTo(0, H); g.fill();
    g.fillStyle = '#1a262f'; g.fillRect(196, 300, 14, 62); g.fillRect(214, 300, 14, 62);
    g.fillStyle = ORANGE; g.beginPath(); g.roundRect ? g.roundRect(186, 226, 52, 92, 16) : g.rect(186, 226, 52, 92); g.fill();
    g.fillStyle = '#e9b994'; g.beginPath(); g.arc(212, 206, 17, 0, 7); g.fill();
    g.fillStyle = INK; g.beginPath(); g.arc(212, 203, 18, Math.PI, 0); g.fill();
    g.restore();
    if (dim < 1) { g.fillStyle = `rgba(0,0,0,${1 - dim})`; g.fillRect(0, 0, W, H); }
  };
  const bar = (hot) => {
    g.fillStyle = '#000'; g.fillRect(0, H - 54, W, 54);
    const items = [['ss', '1/500', 26], ['f', 'F8.0', 176], ['ev', hot === 'ev' ? '+1.0' : '±0.0', 326], ['iso', 'ISO 100', 476]];
    F(27, 650);
    items.forEach(([k, s, x]) => {
      if (k === hot) { g.fillStyle = ORANGE; g.fillRect(x - 12, H - 47, g.measureText(s).width + 24, 40); g.fillStyle = '#000'; } else g.fillStyle = '#fff';
      g.fillText(s, x, H - 26);
    });
  };
  const badge = (s, x = 22) => { F(24, 700); const w = g.measureText(s).width + 20; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, 20, w, 36); g.fillStyle = '#fff'; g.fillText(s, x + 10, 39); return x + w + 8; };
  const brackets = (x, y, w, h, col) => { g.strokeStyle = col; g.lineWidth = 4; const k = 16; [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([a, b, sx, sy]) => { g.beginPath(); g.moveTo(a + k * sx, b); g.lineTo(a, b); g.lineTo(a, b + k * sy); g.stroke(); }); };
  const list = (title, rows, sel) => {
    scene(1, 0.25);
    g.fillStyle = 'rgba(8,11,14,.92)'; g.fillRect(40, 44, W - 80, H - 88);
    F(19, 600); g.fillStyle = '#9fb0bc'; g.fillText(title.toUpperCase(), 64, 76);
    rows.forEach((r, i) => { const y = 104 + i * 46; if (i === sel) { g.fillStyle = ORANGE; g.fillRect(52, y, W - 104, 40); } F(25, 600); g.fillStyle = i === sel ? '#000' : '#fff'; g.fillText(r, 68, y + 21); });
  };

  if (mode === 'menu') { list('Menu', ['File Format', 'Focus Mode', 'Focus Area', 'Zebra Display', 'Grid Line Display', 'Custom Key/Dial Set.'], 0); return; }
  if (mode === 'iso') { scene(1, 0.5); list('ISO', ['ISO AUTO', 'ISO 100', 'ISO 200', 'ISO 400', 'ISO 800', 'ISO 1600'], 1); return; }
  if (mode === 'drive') { list('Drive Mode', ['Single Shooting', 'Cont. Shooting', 'Self-timer (Single)', 'Self-timer (Cont.)', 'Cont. Bracket', 'Single Bracket'], 1); return; }
  if (mode === 'delete') { scene(1, 0.45); g.fillStyle = 'rgba(8,11,14,.94)'; g.fillRect(150, 150, 360, 150); F(25, 600); g.fillStyle = ORANGE; g.fillRect(170, 172, 320, 46); g.fillStyle = '#000'; g.fillText('Delete', 190, 196); g.fillStyle = '#fff'; g.fillText('Cancel', 190, 254); return; }
  if (mode === 'fn') {
    scene(1, 0.55);
    const tiles = ['Drive', 'Focus Mode', 'Focus Area', 'ISO', 'Metering', 'White Bal.', 'Creative Look', 'File Format', 'SteadyShot', 'Zebra', 'Grid Line', 'Subject'];
    tiles.forEach((t, i) => {
      const x = 14 + (i % 6) * 106, y = H - 176 + Math.floor(i / 6) * 84;
      g.fillStyle = i === 1 ? ORANGE : 'rgba(8,11,14,.86)'; g.fillRect(x, y, 100, 78);
      F(15, 600); g.fillStyle = i === 1 ? '#000' : '#fff'; g.textAlign = 'center'; t.split(' ').forEach((w, k, a) => g.fillText(w, x + 50, y + 40 + (k - (a.length - 1) / 2) * 18)); g.textAlign = 'left';
    });
    return;
  }
  if (mode === 'play' || mode === 'zoom') {
    scene(mode === 'zoom' ? 2.6 : 1);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, 50); F(22, 600); g.fillStyle = '#fff'; g.fillText(mode === 'zoom' ? 'Enlarged ×2.6' : '12 / 48', 22, 26);
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(W - 62, 13, 34, 24); g.beginPath(); g.moveTo(W - 50, 19); g.lineTo(W - 38, 25); g.lineTo(W - 50, 31); g.closePath(); g.fillStyle = '#fff'; g.fill();
    return;
  }
  // live view variants
  scene();
  const hot = ['f', 'ss', 'ev', 'iso'].includes(mode) ? mode : null;
  let x = badge(letter);
  if (mode === 'rec') { g.fillStyle = '#e0202c'; g.beginPath(); g.arc(x + 14, 38, 10, 0, 7); g.fill(); F(24, 700); g.fillStyle = '#fff'; g.fillText('REC 0:07', x + 32, 39); }
  if (mode === 'focus') brackets(176, 168, 72, 72, '#3fdc6a'); else brackets(W / 2 - 60, H / 2 - 70, 120, 90, 'rgba(255,255,255,.85)');
  if (mode === 'histo') {
    g.fillStyle = 'rgba(0,0,0,.62)'; g.fillRect(W - 232, H - 196, 210, 128); g.strokeStyle = ORANGE; g.lineWidth = 3; g.strokeRect(W - 232, H - 196, 210, 128);
    g.fillStyle = '#fff'; for (let i = 0; i < 46; i++) { const t = i / 46; const v = Math.exp(-((t - 0.72) ** 2) / 0.012) + 0.3 * Math.exp(-((t - 0.34) ** 2) / 0.02); g.fillRect(W - 224 + i * 4.3, H - 76 - v * 100, 3.3, v * 100); }
  }
  bar(hot);
}

/* ═════════════ stage ═════════════ */
const stage = $('#stage'), canvas = $('#gl'), pin = $('#pin'), pinName = $('#pinName'), tip = $('#tip'), faceName = $('#faceName');
let M = null, renderer, scene, view, env;
const cur = { yaw: rad(64), pitch: rad(8), dist: 560, ox: 0, oy: 0 };
let tween = null, needs = true, selected = null, lensOn = true, lensT = 0, lensTween = null, dialA = Math.PI, smsA = rad(16), lcdMode = 'live', dialLetter = 'A';
const pivot = new THREE.Group();

function initGL() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { $('#fallback').hidden = false; $('.stage__hud').hidden = true; return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); env = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = env; scene.environmentIntensity = 0.75;
  view = new THREE.PerspectiveCamera(26, 1, 10, 3000);
  const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(-180, 260, 320); scene.add(key);
  const rim = new THREE.DirectionalLight('#cfe2f2', 1.3); rim.position.set(240, 120, -260); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9c6cf', 0.7));

  M = buildCamera();
  M.cam.position.set(0, 0, -8);                       // centre the mass (body + lens) on the pivot
  pivot.add(M.cam); scene.add(pivot);

  // soft contact shadow that stays on the "table"
  const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sg = sc.getContext('2d');
  const gr = sg.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(14,20,24,.34)'); gr.addColorStop(1, 'rgba(14,20,24,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(250, 150), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), opacity: 0.7, transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -78; shadow.renderOrder = -1; scene.add(shadow);

  drawLCD(M.lcdCanvas, 'live', dialLetter); lcdMode = 'live' + dialLetter; M.lcdTex.needsUpdate = true;
  M.dialPivot.rotation.y = dialA; M.smsPivot.rotation.y = smsA;
  new ResizeObserver(resize).observe(stage); resize();
  requestAnimationFrame(frame);
  return true;
}
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); view.aspect = w / h; view.updateProjectionMatrix(); needs = true;
}
const fit = () => Math.max(1, 1.18 / view.aspect);

const ease = (t) => 1 - Math.pow(1 - t, 4);
function flyTo(yawDeg, pitchDeg, dist, anchor, ms = 1100) {
  if (!M) return;
  let yaw = rad(yawDeg); const pitch = rad(pitchDeg);
  yaw += Math.round((cur.yaw - yaw) / (Math.PI * 2)) * Math.PI * 2;       // shortest way round
  let ox = 0, oy = 0;
  if (anchor) {
    const p = anchor.clone().add(M.cam.position).applyEuler(new THREE.Euler(pitch, yaw, 0, 'XYZ'));
    ox = -p.x * 0.82; oy = -p.y * 0.82;
  }
  const to = { yaw, pitch, dist, ox, oy };
  if (reduced || ms === 0) { Object.assign(cur, to); tween = null; needs = true; return; }
  tween = { from: { ...cur }, to, t0: performance.now(), ms };
  needs = true;
}

function frame(now) {
  requestAnimationFrame(frame);
  if (tween) {
    const t = clamp((now - tween.t0) / tween.ms, 0, 1), e = ease(t);
    for (const k in tween.to) cur[k] = tween.from[k] + (tween.to[k] - tween.from[k]) * e;
    if (t >= 1) tween = null;
    needs = true;
  }
  if (lensTween) {
    const t = clamp((now - lensTween.t0) / 700, 0, 1); lensT = lensTween.from + (lensTween.to - lensTween.from) * ease(t);
    if (t >= 1) lensTween = null; applyLens(); needs = true;
  }
  // dials ease towards their target angle
  const dd = dialA - M.dialPivot.rotation.y, ds = smsA - M.smsPivot.rotation.y;
  if (Math.abs(dd) > 0.001 || Math.abs(ds) > 0.001) { M.dialPivot.rotation.y += dd * (reduced ? 1 : 0.14); M.smsPivot.rotation.y += ds * (reduced ? 1 : 0.14); needs = true; }
  if (!needs) return; needs = false;
  pivot.rotation.set(cur.pitch, cur.yaw, 0, 'XYZ'); pivot.position.set(cur.ox, cur.oy, 0);
  view.position.set(0, 0, cur.dist * fit()); view.lookAt(0, 0, 0);
  renderer.render(scene, view);
  placePin(); nameFace();
}
function applyLens() {
  M.lens.visible = lensT < 0.999;
  M.lens.position.z = 17 + 5.6 + lensT * 70; M.lens.position.x = 8 + lensT * 46; M.lens.position.y = -1.5 + lensT * 4;
  M.lensMats.forEach((m) => { m.transparent = lensT > 0.001; m.opacity = 1 - lensT; });
}
function setLens(on, instant) {
  if (!M || on === lensOn) return; lensOn = on;
  const b = $('#lensBtn'); b.setAttribute('aria-pressed', on); b.querySelector('span').textContent = on ? 'Lens attached' : 'Lens removed';
  if (instant || reduced) { lensT = on ? 0 : 1; applyLens(); needs = true; } else lensTween = { from: lensT, to: on ? 0 : 1, t0: performance.now() };
}

const wp = new THREE.Vector3(), wn = new THREE.Vector3();
function placePin() {
  if (!selected || !M) { pin.hidden = true; return; }
  const r = M.reg[selected];
  wp.copy(r.anchor); M.cam.localToWorld(wp);
  wn.copy(r.normal).applyQuaternion(pivot.quaternion);
  const toCam = view.position.clone().sub(wp).normalize();
  const facing = wn.dot(toCam);
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
  faceName.textContent = best[0];
  $$('.views button').forEach((b) => b.classList.toggle('is-on', b.dataset.view === best[1]));
}

/* highlight + model state */
function highlight(id) {
  if (!M) return;
  if (selected) { const o = M.reg[selected]; o.meshes.forEach((m) => { m.material = m.userData.base; }); if (o.wedge) o.wedge.material.opacity = 0; }
  selected = id;
  if (id) { const o = M.reg[id]; o.meshes.forEach((m) => { m.material = mat.hi; }); if (o.wedge) o.wedge.material.opacity = 0.9; pinName.textContent = CONTROLS[id].name.replace(/ \(.*\)$/, ''); }
  needs = true;
}
function setState({ dial, sms, lcd } = {}) {
  if (!M) return;
  if (dial) { dialLetter = dial === 'AUTO' ? 'AUTO' : dial; const i = M.MODES.indexOf(dial); let a = i * Math.PI / 4 + Math.PI / 2; a += Math.round((dialA - a) / (Math.PI * 2)) * Math.PI * 2; dialA = a; }
  if (sms) smsA = { still: rad(16), movie: 0, sq: rad(-16) }[sms];
  const m = lcd || 'live';
  const key = m + dialLetter;
  if (key !== lcdMode) { lcdMode = key; drawLCD(M.lcdCanvas, m, dialLetter); M.lcdTex.needsUpdate = true; }
  needs = true;
}
function showControl(id, step = {}) {
  const c = CONTROLS[id];
  const wantLens = step.lens !== undefined ? step.lens : (c.lens !== undefined ? c.lens : true);
  setLens(wantLens);
  setState(step);
  highlight(id);
  if (M) flyTo(c.view[0], c.view[1], c.view[2], M.reg[id].anchor);
  $('#hint').classList.add('is-gone');
}

/* pointer: drag to orbit, wheel/pinch to zoom, click to pick */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, view);
  const hits = ray.intersectObjects(M.pickables.filter((m) => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; }), false);
  for (const h of hits) { if (h.object.material && h.object.material.opacity === 0 && !h.object.userData.cid) continue; return h.object.userData.cid || null; }
  return null;
}
function bindPointer() {
  const pts = new Map(); let moved = 0, pinch = 0;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; tween = null;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    stage.classList.add('is-drag'); tip.hidden = true;
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) {                                         // hover
      if (e.pointerType !== 'mouse') return;
      const id = pick(e); stage.classList.toggle('is-over', !!id);
      if (id && id !== selected) { const r = stage.getBoundingClientRect(); tip.hidden = false; tip.textContent = CONTROLS[id].name; tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 16}px)`; } else tip.hidden = true;
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) cur.dist = clamp(cur.dist * pinch / d, 170, 760); pinch = d; moved = 99;
    } else {
      moved += Math.abs(dx) + Math.abs(dy);
      cur.yaw += dx * 0.0085; cur.pitch = clamp(cur.pitch + dy * 0.0085, rad(-89), rad(89));
    }
    needs = true;
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); pinch = 0;
    if (!pts.size) stage.classList.remove('is-drag');
    if (e.type === 'pointerup' && moved < 6) { const id = pick(e); if (id) openControl(id, true); }
    else if (moved >= 6) $('#hint').classList.add('is-gone');
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => { tip.hidden = true; stage.classList.remove('is-over'); });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); tween = null; cur.dist = clamp(cur.dist * Math.exp(e.deltaY * 0.0012), 170, 760); needs = true; }, { passive: false });
}

/* ═════════════ interface ═════════════ */
const esc = (s) => s.replace(/&(?!amp;|lt;|gt;)/g, '&amp;');
const listTasks = $('#listTasks'), listParts = $('#listParts'), body = $('#panelBody'), empty = $('#panelEmpty');
let active = null;                                  // { type: 'task', task, i } | { type: 'control', id }

function buildLists() {
  let n = 0;
  const groups = [...new Set(TASKS.map((t) => t.group))];
  listTasks.innerHTML = groups.map((g) => `<div class="grp"><p class="grp__name label">${g}</p>${TASKS.filter((t) => t.group === g).map((t) => `<button type="button" class="item" data-task="${t.id}"><i>${String(++n).padStart(2, '0')}</i><span>${esc(t.title)}</span><em>${t.steps.length} ${t.steps.length > 1 ? 'steps' : 'step'}</em></button>`).join('')}</div>`).join('');
  listParts.innerHTML = FACES.map((f) => `<div class="grp"><p class="grp__name label">${f}</p>${Object.entries(CONTROLS).filter(([, c]) => c.face === f).map(([id, c]) => `<button type="button" class="item" data-control="${id}"><i>·</i><span>${esc(c.name)}</span></button>`).join('')}</div>`).join('');
  TASKS.forEach((t, i) => { t.no = i + 1; });
}
function markList() {
  $$('.item').forEach((b) => b.classList.toggle('is-on', !!active && ((active.type === 'task' && b.dataset.task === active.task.id) || (active.type === 'control' && b.dataset.control === active.id))));
}
function setTab(which) {
  const tasks = which === 'tasks';
  $('#tabTasks').classList.toggle('is-on', tasks); $('#tabParts').classList.toggle('is-on', !tasks);
  $('#tabTasks').setAttribute('aria-selected', tasks); $('#tabParts').setAttribute('aria-selected', !tasks);
  listTasks.hidden = !tasks; listParts.hidden = tasks;
}
const setHash = (h) => history.replaceState(null, '', h ? `#${h}` : location.pathname);
function reveal(userAction) {
  empty.hidden = true; body.hidden = false;
  if (userAction && PHONE.matches) scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  const on = $('.item.is-on'); if (on && !PHONE.matches) on.scrollIntoView({ block: 'nearest' });
}

function openTask(id, i = 0, userAction = false) {
  const task = TASKS.find((t) => t.id === id); if (!task) return;
  active = { type: 'task', task, i: clamp(i, 0, task.steps.length - 1) };
  setTab('tasks'); markList(); renderTask(); reveal(userAction); setHash(`t=${id}`);
}
function renderTask() {
  const { task, i } = active, n = task.steps.length;
  body.innerHTML = `
    <p class="label panel__kicker">Task ${String(task.no).padStart(2, '0')} · ${task.group}</p>
    <h2 class="panel__title">${esc(task.title)}</h2>
    <p class="panel__intro">${task.intro}</p>
    <h3 class="label">${n > 1 ? `${n} steps` : 'One step'}</h3>
    <ol class="steps">${task.steps.map((s, k) => `<li class="step${k === i ? ' is-on' : ''}"><button type="button" data-step="${k}"${k === i ? ' aria-current="step"' : ''}><span><span class="step__on">${esc(CONTROLS[s.c].name)}</span><span class="step__do">${s.do}</span></span></button></li>`).join('')}</ol>
    ${n > 1 ? `<div class="stepnav"><button type="button" class="btn btn--ghost" data-go="-1"${i === 0 ? ' disabled' : ''}>Back</button><button type="button" class="btn" data-go="1"${i === n - 1 ? ' disabled' : ''}>Next step</button><span class="stepnav__count">${i + 1}<small> / ${n}</small></span></div>` : ''}
    <div class="panel__note"><b class="label">Where it is</b>${CONTROLS[task.steps[i].c].where}</div>
    ${task.more ? `<a class="panel__more" href="${task.more[0]}">${task.more[1]} →</a>` : ''}`;
  showControl(task.steps[i].c, task.steps[i]);
}
const keepStep = () => { if (PHONE.matches) body.querySelector('.step.is-on')?.scrollIntoView({ block: 'nearest' }); };
function openControl(id, userAction = false) {
  if (!CONTROLS[id]) return;
  active = { type: 'control', id };
  if (!userAction || !listParts.hidden) setTab('parts');
  markList();
  const c = CONTROLS[id], used = TASKS.filter((t) => t.steps.some((s) => s.c === id));
  body.innerHTML = `
    <p class="label panel__kicker">Control · ${c.face}</p>
    <h2 class="panel__title">${esc(c.name)}</h2>
    <p class="panel__where"><span class="label">Where</span><span>${c.where}</span></p>
    <p class="panel__intro">${c.what}</p>
    ${c.facts ? `<h3 class="label">What it does</h3><dl class="facts">${c.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
    ${used.length ? `<h3 class="label">You use it to</h3><div class="chips">${used.map((t) => `<button type="button" data-task="${t.id}" data-at="${t.steps.findIndex((s) => s.c === id)}">${esc(t.title)}</button>`).join('')}</div>` : ''}`;
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
    const s = e.target.closest('[data-step]'), go = e.target.closest('[data-go]'), t = e.target.closest('[data-task]');
    if (s) { active.i = +s.dataset.step; renderTask(); keepStep(); }
    else if (go && !go.disabled) { active.i = clamp(active.i + +go.dataset.go, 0, active.task.steps.length - 1); renderTask(); (body.querySelector(`[data-go="${go.dataset.go}"]:not([disabled])`) || body.querySelector('[data-go]:not([disabled])'))?.focus({ preventScroll: true }); keepStep(); }
    else if (t) openTask(t.dataset.task, +t.dataset.at || 0, true);
  });
  document.addEventListener('keydown', (e) => {
    if (!active || active.type !== 'task' || e.target.closest('input, textarea, [role="tab"]')) return;
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
    const i = clamp(active.i + d, 0, active.task.steps.length - 1); if (i !== active.i) { active.i = i; renderTask(); }
  });
  const VIEWS = { front: [24, 10], back: [180, 8], top: [180, 66], bottom: [0, -72], grip: [90, 8], ports: [-90, 8] };
  $('.views').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const v = VIEWS[b.dataset.view]; flyTo(v[0], v[1], 380, null, 900); $('#hint').classList.add('is-gone'); });
  $('#lensBtn').addEventListener('click', () => setLens(!lensOn));
  addEventListener('hashchange', fromHash);
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
  if (ok) { bindPointer(); window.__cam = { cur, reg: M.reg, flyTo, get selected() { return selected; }, get busy() { return !!tween || !!lensTween; } }; }
  if (!fromHash() && ok) flyTo(28, 14, 380, null, 1500);   // opening move: swing round to a front three-quarter view
  document.documentElement.classList.add('cam-ready');
});
