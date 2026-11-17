/* a6700 Field Manual — Chapter 00: the 3D model.
   Built from primitives at 1 unit = 1 mm (body 122 × 69 × 75 including grip and eyecup).
   It is a faithful diagram of where the controls are, not a scan of the product. */
import * as THREE from '../vendor/three.module.min.js';

const rad = (d) => d * Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const ORANGE = '#ff5a1f';

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

export const mat = {
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

export function buildCamera() {
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
  control('wheel', [wheelRing], wc.clone().add(V(7.6, 7.6, -2.3)), FACE.back.n);   // marker sits on the rim, clear of the centre button wheelFace.userData.cid = 'wheel';
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
  const lensWhite = mat.white.clone();
  const lensIdx = add(new THREE.Mesh(cyl(1.05, 0.3), lensWhite), V(Math.cos(rad(62)) * 30.7, Math.sin(rad(62)) * 30.7, 4), null, lens); lensIdx.rotation.set(0, 0, 0); orient(lensIdx, { n: V(Math.cos(rad(62)), Math.sin(rad(62)), 0), up: V(0, 0, 1) });
  const lensParts = [barrel, zoomRing, focusRing, front, lensIdx];
  control('lens', [zoomRing], mc.clone().add(V(0, 33.5, 29)), V(0, 0.5, 0.86));
  lensParts.forEach((m) => { m.userData.cid = 'lens'; });
  const lensMats = [lensMat, lensRubber, lensGlass, lensWhite];

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

  /* moving parts: what travels when a control is pressed, and what rotates when it is turned */
  const one = (id) => reg[id].meshes;
  const press = {
    shutter: [shBtn], c2: [c2], movie: [mv, mvDot], menu: one('menu'), afon: one('afon'), fn: one('fn'),
    wheelCenter: [centre], playback: one('playback'), del: one('del'), c1: [c1], lensRelease: [rel],
  };
  const spin = { frontDial: fd, rearDial: rd, wheel: wheelRing, diopter: dio, lens: zoomRing, power: collar };
  const wheel = { parts: [wheelRing, wheelFace], centre, centreV: wc.clone() };
  const power = { lever, centre: sh.clone(), arm: V(9.6, 0, -2) };
  const sms = { centre: md.clone(), arm: V(-14.6, 2.8, 0) };

  return { cam, reg, pickables, lens, lensMats, dialPivot, smsPivot, MODES, lcdCanvas, lcdTex, press, spin, wheel, power, sms };
}
