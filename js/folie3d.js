/* houtnerffolie.nl — de 3D-uitleg bovenaan de homepage.

   Een kunststof kozijn met folie. Bij het scrollen komt een stuk folie van de
   onderdorpel los en valt het uiteen in zijn lagen; aan het eind kan de bezoeker
   van kleur wisselen. Werkt het niet (geen WebGL, oude browser), dan blijft de
   stilstaande afbeelding staan en is alle tekst gewoon leesbaar.

   Maten in millimeters, het kozijn staat in het XY-vlak met de buitenkant naar +Z. */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/CSS2DRenderer.js';

/* ---------- maten en profielen ---------------------------------------------------- */

const W = 1000, H = 1300;            // buitenmaat kozijn
const A = W / 2, B = H / 2;
const RAAM_IN = 59;                  // buitenkant kozijn -> buitenkant raam
const As = A - RAAM_IN, Bs = B - RAAM_IN;
const GLAS_IN = 56;                  // buitenkant raam -> rand van het glas
const STUK = [-A + 150, -A + 520];   // stuk onderdorpel waar de folie loskomt

// Doorsneden als [u, v, straal]: u loopt van de buitenrand naar binnen (de dag
// in), v van de voorkant naar achteren.
const KOZIJN = [[0, 0, 6], [68, 0, 4], [68, 16, 1.5], [57, 16, 0], [57, 70, 0], [0, 70, 2]];
const KOZIJN_FOLIE = [[0, 68, 0], [0, 0, 6], [68, 0, 4], [68, 14, 0]];
const RAAM = [[0, 18, 2], [64, 18, 3], [64, 26, 1], [54, 26, 0], [54, 54, 0], [64, 54, 1], [64, 80, 2], [0, 80, 2]];
const STUK_FOLIE = [[0, 10, 0], [0, 0, 6], [68, 0, 4], [68, 14, 0]];   // het stuk dat loskomt
const STUK_REST = [[0, 68, 0], [0, 10, 0]];                           // blijft op de buitenrand zitten
const RAAM_FOLIE = [[0, 28, 0], [0, 18, 2], [64, 18, 3], [64, 24.5, 0]];
const RUBBER = [[60, 26, 0], [66.5, 26, 0.8], [66.5, 30, 0], [60, 30, 0]];
const AANSLAG = [[64, 12, 0], [70.5, 12, 0.8], [70.5, 18, 0], [64, 18, 0]];   // rubber tussen kozijn en raam

const FOLIE_AF = 0.4;                // de folie ligt zo ver boven het profiel
const UV = [350, 140];               // mm per textuureenheid: langs het profiel, rondom

/* ---------- geometrie ------------------------------------------------------------- */

// Zet een doorsnede met afgeronde hoeken om in punten met normalen.
function pad(punten, gesloten, seg = 8) {
  const P = punten.map(q => ({ x: q[0], y: q[1], r: q[2] || 0 }));
  const m = P.length, uit = [];
  const eenheid = (x, y) => { const l = Math.hypot(x, y); return [x / l, y / l]; };
  const voeg = (x, y, nx, ny) => uit.push([x, y, nx, ny]);
  if (!gesloten) {
    const [dx, dy] = eenheid(P[1].x - P[0].x, P[1].y - P[0].y);
    voeg(P[0].x, P[0].y, dy, -dx);
  }
  const hoeken = gesloten ? [...Array(m).keys()] : [...Array(m).keys()].slice(1, -1);
  for (const i of hoeken) {
    const a = P[(i - 1 + m) % m], c = P[i], b = P[(i + 1) % m];
    const [ax, ay] = eenheid(c.x - a.x, c.y - a.y);
    const [bx, by] = eenheid(b.x - c.x, b.y - c.y);
    const na = [ay, -ax], nb = [by, -bx];
    const phi = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    if (!c.r || Math.abs(phi) < 1e-4) { voeg(c.x, c.y, na[0], na[1]); voeg(c.x, c.y, nb[0], nb[1]); continue; }
    const d = c.r * Math.tan(Math.abs(phi) / 2);
    const s = phi > 0 ? 1 : -1;
    const mx = c.x - ax * d - na[0] * c.r * s, my = c.y - ay * d - na[1] * c.r * s;
    const t0 = Math.atan2(na[1], na[0]);
    const k = Math.max(2, Math.round(seg * Math.abs(phi) / (Math.PI / 2)));
    for (let j = 0; j <= k; j++) {
      const t = t0 + phi * j / k, nx = Math.cos(t), ny = Math.sin(t);
      voeg(mx + nx * c.r * s, my + ny * c.r * s, nx, ny);
    }
  }
  if (!gesloten) {
    const [dx, dy] = eenheid(P[m - 1].x - P[m - 2].x, P[m - 1].y - P[m - 2].y);
    voeg(P[m - 1].x, P[m - 1].y, dy, -dx);
  }
  const S = [0];
  for (let i = 1; i < uit.length; i++) S.push(S[i - 1] + Math.hypot(uit[i][0] - uit[i - 1][0], uit[i][1] - uit[i - 1][1]));
  return { v: uit, s: S, gesloten };
}

class Bouwer {
  constructor() { this.p = []; this.n = []; this.t = []; this.i = []; }
  punt(p, n, t) {
    this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.t.push(t[0], t[1]);
    return this.p.length / 3 - 1;
  }
  // Vierhoek; de draairichting wordt zo gekozen dat hij met de normaal meeloopt.
  vlak(a, b, c, d) {
    const P = this.p, N = this.n;
    const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
    const vx = P[d * 3] - P[a * 3], vy = P[d * 3 + 1] - P[a * 3 + 1], vz = P[d * 3 + 2] - P[a * 3 + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * cx + cy * cy + cz * cz < 1e-10) return;
    const dot = cx * (N[a * 3] + N[c * 3]) + cy * (N[a * 3 + 1] + N[c * 3 + 1]) + cz * (N[a * 3 + 2] + N[c * 3 + 2]);
    if (dot >= 0) this.i.push(a, b, c, a, c, d); else this.i.push(a, c, b, a, d, c);
  }
  geometrie() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.t, 2));
    g.setIndex(this.i);
    return g;
  }
}

// Een zijde van een rechthoekig kozijn; de hoeken worden in verstek gezaagd doordat
// elk punt van de doorsnede een eigen, ingesprongen rechthoek volgt.
function zijde(k, u, a, b) {
  const lo = [-a + u, -b + u], ro = [a - u, -b + u], rb = [a - u, b - u], lb = [-a + u, b - u];
  return [[lo, ro, [0, 1]], [ro, rb, [-1, 0]], [rb, lb, [0, -1]], [lb, lo, [1, 0]]][k];
}

function veeg(bouwer, p, a, b, k, opt = {}) {
  const { van = null, tot = null, af = 0 } = opt;
  const as = k % 2 === 0 ? 0 : 1;
  const rij = p.v.map(([u0, v0, nu, nv], j) => {
    const u = u0 + nu * af, v = v0 + nv * af;
    const [p0, p1, binnen] = zijde(k, u, a, b);
    const s = p0.slice(), e = p1.slice();
    if (van !== null) s[as] = van;
    if (tot !== null) e[as] = tot;
    const n = [binnen[0] * nu, binnen[1] * nu, -nv];
    const tv = p.s[j] / UV[1];
    return [
      bouwer.punt([s[0], s[1], -v], n, [s[as] / UV[0], tv]),
      bouwer.punt([e[0], e[1], -v], n, [e[as] / UV[0], tv]),
    ];
  });
  const m = p.gesloten ? rij.length : rij.length - 1;
  for (let j = 0; j < m; j++) {
    const q = rij[j], r = rij[(j + 1) % rij.length];
    bouwer.vlak(q[0], q[1], r[1], r[0]);
  }
}

function kozijnDeel(profiel, a, b, opt = {}) {
  const bw = new Bouwer();
  for (let k = 0; k < 4; k++) veeg(bw, profiel, a, b, k, opt);
  return bw.geometrie();
}

/* Eén laag van het losgekomen stuk folie: een dunne schaal die de vorm van de
   onderdorpel volgt. De punten worden elk beeld opnieuw uitgerekend, zodat de laag
   kan buigen (afpellen), dikker kan worden en kan verschuiven. */
class Laag {
  constructor(p, materiaal, nx = 40) {
    this.p = p;
    const V = p.v, S = p.s, n = V.length;
    const u = [], v = [], nu = [], nv = [], s = [], buiten = [];
    const bw = new Bouwer();
    // De beginstand wordt meteen uitgerekend: de draairichting van de vlakken
    // wordt bepaald aan de hand van echte posities.
    const punt = (j, f, uit, nrm) => {
      u.push(V[j][0]); v.push(V[j][1]); nu.push(V[j][2]); nv.push(V[j][3]); s.push(f); buiten.push(uit);
      return bw.punt(Laag.positie(V[j][0], V[j][1], V[j][2], V[j][3], f, uit, 1, 0, 0, 0, 0), nrm, [0, S[j] / UV[1]]);
    };
    const normaal = (j, teken) => [0, V[j][2] * teken, -V[j][3] * teken];
    // boven- en onderkant
    for (const uit of [1, 0]) {
      const rij = [];
      for (let j = 0; j < n; j++) {
        const r = [];
        for (let i = 0; i <= nx; i++) r.push(punt(j, i / nx, uit, normaal(j, uit ? 1 : -1)));
        rij.push(r);
      }
      for (let j = 0; j < n - 1; j++) for (let i = 0; i < nx; i++) bw.vlak(rij[j][i], rij[j][i + 1], rij[j + 1][i + 1], rij[j + 1][i]);
    }
    // de twee lange randen
    for (const [j, teken] of [[0, -1], [n - 1, 1]]) {
      const jj = teken < 0 ? 1 : n - 2;
      const tx = V[j][0] - V[jj][0], ty = V[j][1] - V[jj][1], l = Math.hypot(tx, ty);
      const nrm = [0, tx / l, -ty / l];
      const r0 = [], r1 = [];
      for (let i = 0; i <= nx; i++) { r0.push(punt(j, i / nx, 0, nrm)); r1.push(punt(j, i / nx, 1, nrm)); }
      for (let i = 0; i < nx; i++) bw.vlak(r0[i], r0[i + 1], r1[i + 1], r1[i]);
    }
    // de twee kopse kanten
    for (const f of [0, 1]) {
      const nrm = [f ? 1 : -1, 0, 0];
      const r0 = [], r1 = [];
      for (let j = 0; j < n; j++) { r0.push(punt(j, f, 0, nrm)); r1.push(punt(j, f, 1, nrm)); }
      for (let j = 0; j < n - 1; j++) bw.vlak(r0[j], r0[j + 1], r1[j + 1], r1[j]);
    }
    this.geo = bw.geometrie();
    Object.assign(this, { u, v, nu, nv, s, buiten });
    this.mesh = new THREE.Mesh(this.geo, materiaal);
    this.mesh.frustumCulled = false;
  }

  // dikte in mm, z = hoe ver de laag van het profiel af staat, dx = verschuiving
  // langs de dorpel, pel = 0..1 hoe ver het afpellen is.
  static positie(u, v, nu, nv, f, buiten, dikte, z, dx, pel, til) {
    const af = FOLIE_AF + (buiten ? dikte : 0);
    // afpellen begint aan de rechterkant
    const g = Math.min(1, Math.max(0, (pel - (1 - f) * 0.55) / 0.45));
    const k = g * g * (3 - 2 * g);
    return [STUK[0] + f * (STUK[1] - STUK[0]) + dx, -B + u + nu * af, -(v + nv * af) + til * k + z];
  }

  zet(dikte, z, dx, pel, til) {
    const pos = this.geo.attributes.position.array, uv = this.geo.attributes.uv.array;
    for (let i = 0; i < this.s.length; i++) {
      const q = Laag.positie(this.u[i], this.v[i], this.nu[i], this.nv[i], this.s[i], this.buiten[i], dikte, z, dx, pel, til);
      pos[i * 3] = q[0]; pos[i * 3 + 1] = q[1]; pos[i * 3 + 2] = q[2];
      uv[i * 2] = (STUK[0] + this.s[i] * (STUK[1] - STUK[0])) / UV[0];
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.uv.needsUpdate = true;
  }
}

/* ---------- texturen -------------------------------------------------------------- */

function laadBeeld(src) {
  return new Promise((ok, nee) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => ok(img);
    img.onerror = nee;
    img.src = src;
  });
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// De nerf die ook op de stalen van de site ligt (zwarte lijnen in het alfakanaal).
function nerfLaag(nerf, kleur) {
  const c = canvas(512, 512), g = c.getContext('2d');
  g.drawImage(nerf, 0, 0, 512, 512);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = kleur;
  g.fillRect(0, 0, 512, 512);
  return c;
}

function textuur(c, srgb = true, herhaal = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
  t.repeat.set(herhaal[0], herhaal[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const NERF_HERHAAL = [UV[0] / 85, UV[1] / 85];
const DECOR_HERHAAL = [UV[0] / 420, UV[1] / 110];

function helderheid(hex) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/* ---------- de scène -------------------------------------------------------------- */

// Standen van de uitleg; tussen twee standen wordt geleidelijk overgevloeid.
// zicht = zichtbare hoogte in mm, sx/sy = verschuiving van het beeld (breed/smal scherm)
const STANDEN = [
  { rotY: -0.5, kant: 0, focus: 0, zicht: 2050, breed: 1250, az: 0, el: 0.1, til: 0, pel: 0, uit: 0, schaduw: 1, rust: 1, labels: 0, sx: 0.04, sy: -0.13, mx: 0, dy: 0.05, nadruk: -1 },
  { rotY: -0.08, kant: 1.45, focus: 1, zicht: 600, breed: 520, az: -0.5, el: 0.5, til: 32, pel: 1, uit: 0, schaduw: 0, rust: 0, labels: 0, sx: -0.05, sy: 0.08, mx: -0.17, dy: -0.1, nadruk: -1 },
  { rotY: -0.06, kant: 1.5, focus: 1, zicht: 700, breed: 560, az: -0.55, el: 0.52, til: 32, pel: 1, uit: 1, schaduw: 0, rust: 0, labels: 1, sx: -0.05, sy: 0.08, mx: -0.17, dy: -0.1, nadruk: 0 },
  { rotY: -0.06, kant: 1.5, focus: 1, zicht: 700, breed: 560, az: -0.55, el: 0.52, til: 32, pel: 1, uit: 1, schaduw: 0, rust: 0, labels: 1, sx: -0.05, sy: 0.08, mx: -0.17, dy: -0.1, nadruk: 1 },
  { rotY: -0.06, kant: 1.5, focus: 1, zicht: 700, breed: 560, az: -0.55, el: 0.52, til: 32, pel: 1, uit: 1, schaduw: 0, rust: 0, labels: 1, sx: -0.05, sy: 0.08, mx: -0.17, dy: -0.1, nadruk: 2 },
  { rotY: -0.06, kant: 1.5, focus: 1, zicht: 740, breed: 600, az: -0.55, el: 0.52, til: 32, pel: 1, uit: 1.3, schaduw: 0, rust: 0, labels: 1, sx: -0.05, sy: 0.08, mx: -0.17, dy: -0.1, nadruk: 3 },
  { rotY: -0.42, kant: 0, focus: 0, zicht: 2050, breed: 1150, az: 0, el: 0.08, til: 0, pel: 0, uit: 0, schaduw: 1, rust: 1, labels: 0, sx: 0.04, sy: 0.2, mx: 0, dy: 0.03, nadruk: -1 },
];
const LAGEN = ['lijm', 'kleur', 'top'];

function start(sectie) {
  const podium = sectie.querySelector('.folie-podium');
  const doek = sectie.querySelector('.folie-doek');
  const kleurenData = JSON.parse(document.getElementById('folie-kleuren')?.textContent || '[]');
  const stappen = [...sectie.querySelectorAll('[data-stap]')];
  const rustig = matchMedia('(prefers-reduced-motion: reduce)');

  const lokaal = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  const renderer = new THREE.WebGLRenderer({ canvas: doek, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: lokaal });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;

  const zon = new THREE.DirectionalLight(0xfff4e6, 2.2);
  zon.position.set(-1.4, 2.4, 1.5);
  scene.add(zon);
  const tegen = new THREE.DirectionalLight(0xe8eef2, 0.7);
  tegen.position.set(1.6, 0.6, -0.8);
  scene.add(tegen);

  const camera = new THREE.PerspectiveCamera(26, 1, 20, 20000);

  // Materialen
  const pvc = new THREE.MeshPhysicalMaterial({ color: 0xf2f1ec, roughness: 0.48, clearcoat: 0.1, clearcoatRoughness: 0.5 });
  const folie = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.56, clearcoat: 0.3, clearcoatRoughness: 0.32, bumpScale: 0.7 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1b1c1c, roughness: 0.85 });
  // Glas: een verloop met een paar schuine lichtbanen, zoals een ruit buiten oogt
  const gc = canvas(256, 512), gg = gc.getContext('2d');
  const gl = gg.createLinearGradient(0, 0, 0, 512);
  gl.addColorStop(0, '#9fb0b2'); gl.addColorStop(0.42, '#55676b'); gl.addColorStop(1, '#27323a');
  gg.fillStyle = gl; gg.fillRect(0, 0, 256, 512);
  gg.globalCompositeOperation = 'lighter';
  for (const [x, b, a] of [[40, 70, 0.10], [150, 26, 0.07], [200, 10, 0.06]]) {
    gg.save(); gg.translate(x, 0); gg.transform(1, 0, -0.45, 1, 0, 0);
    const bl = gg.createLinearGradient(0, 0, b, 0);
    bl.addColorStop(0, 'rgba(255,255,255,0)'); bl.addColorStop(0.5, `rgba(255,255,255,${a})`); bl.addColorStop(1, 'rgba(255,255,255,0)');
    gg.fillStyle = bl; gg.fillRect(0, 0, b, 512); gg.restore();
  }
  const glasTex = new THREE.CanvasTexture(gc); glasTex.colorSpace = THREE.SRGBColorSpace;
  const glas = new THREE.MeshPhysicalMaterial({ map: glasTex, roughness: 0.08, clearcoat: 0.35, clearcoatRoughness: 0.06, transparent: true, opacity: 0.95, envMapIntensity: 0.35 });
  const mat = {
    top: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, bumpScale: 1.4 }),
    kleur: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.62, transparent: true, opacity: 1 }),
    lijm: new THREE.MeshPhysicalMaterial({ color: 0xfaf6ec, roughness: 0.95, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide, sheen: 0.6, sheenColor: 0xffffff }),
  };

  // Kozijn opbouwen
  const draai = new THREE.Group();      // draait om de onderdorpel
  const kozijn = new THREE.Group();
  kozijn.position.y = B - 35;
  draai.add(kozijn);
  scene.add(draai);

  const pKozijn = pad(KOZIJN, true), pKozijnFolie = pad(KOZIJN_FOLIE, false);
  const pRaam = pad(RAAM, true), pRaamFolie = pad(RAAM_FOLIE, false), pRubber = pad(RUBBER, true, 3);

  kozijn.add(new THREE.Mesh(kozijnDeel(pKozijn, A, B), pvc));
  kozijn.add(new THREE.Mesh(kozijnDeel(pRaam, As, Bs), pvc));
  kozijn.add(new THREE.Mesh(kozijnDeel(pRubber, As, Bs), rubber));
  kozijn.add(new THREE.Mesh(kozijnDeel(pad(AANSLAG, true, 3), A, B), rubber));
  const glasMesh = new THREE.Mesh(new THREE.BoxGeometry(2 * (As - GLAS_IN), 2 * (Bs - GLAS_IN), 20), glas);
  glasMesh.position.z = -40;
  kozijn.add(glasMesh);

  // Folie op het kozijn: drie zijden heel, de onderdorpel in drie stukken zodat
  // het middelste stuk los kan komen.
  const bw = new Bouwer();
  for (let k = 1; k < 4; k++) veeg(bw, pKozijnFolie, A, B, k, { af: FOLIE_AF });
  veeg(bw, pKozijnFolie, A, B, 0, { af: FOLIE_AF, tot: STUK[0] });
  veeg(bw, pKozijnFolie, A, B, 0, { af: FOLIE_AF, van: STUK[1] });
  kozijn.add(new THREE.Mesh(bw.geometrie(), folie));
  kozijn.add(new THREE.Mesh(kozijnDeel(pRaamFolie, As, Bs, { af: FOLIE_AF }), folie));
  const bwStuk = new Bouwer();
  veeg(bwStuk, pad(STUK_FOLIE, false), A, B, 0, { af: FOLIE_AF, van: STUK[0], tot: STUK[1] });
  const stukDicht = new THREE.Mesh(bwStuk.geometrie(), folie);
  kozijn.add(stukDicht);
  const bwRest = new Bouwer();
  veeg(bwRest, pad(STUK_REST, false), A, B, 0, { af: FOLIE_AF, van: STUK[0], tot: STUK[1] });
  kozijn.add(new THREE.Mesh(bwRest.geometrie(), folie));

  const lagen = {};
  LAGEN.forEach((naam, i) => {
    const laag = new Laag(pad(STUK_FOLIE, false), mat[naam]);
    laag.mesh.renderOrder = 1 + i;
    laag.mesh.visible = false;
    kozijn.add(laag.mesh);
    lagen[naam] = laag;
  });

  // Zachte schaduw onder het kozijn
  const sc = canvas(256, 256), sg = sc.getContext('2d');
  const grad = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(40,32,20,0.55)');
  grad.addColorStop(0.55, 'rgba(40,32,20,0.18)');
  grad.addColorStop(1, 'rgba(40,32,20,0)');
  sg.fillStyle = grad; sg.fillRect(0, 0, 256, 256);
  const schaduw = new THREE.Mesh(new THREE.PlaneGeometry(1700, 520),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  schaduw.rotation.x = -Math.PI / 2;
  schaduw.position.set(0, -60, -30);
  scene.add(schaduw);

  // Labels bij de lagen
  const labelRenderer = new CSS2DRenderer({ element: sectie.querySelector('.folie-labels') });
  const labelTekst = [
    ['1', 'Toplaag', 'acryl (PMMA) met de nerf'],
    ['2', 'Kleurlaag', 'pvc met pigment of houtprint'],
    ['3', 'Lijmlaag', 'acrylaatlijm'],
    ['4', 'Kunststof profiel', 'blijft gewoon zitten'],
  ];
  const labels = labelTekst.map(([nr, naam, uitleg]) => {
    const el = document.createElement('div');
    el.className = 'folie-label';
    el.innerHTML = `<span class="folie-label-nr">${nr}</span><span><b>${naam}</b></span>`;
    el.title = uitleg;
    const obj = new CSS2DObject(el);
    obj.center.set(0, 0.5);
    kozijn.add(obj);
    return { el, obj };
  });

  /* ----- kleuren ----- */
  let nerf = null, nerfBump = null, nerfAlpha = null;
  const cache = new Map();
  let huidige = null;

  async function maakKleur(k) {
    if (cache.has(k.slug)) return cache.get(k.slug);
    let tex;
    if (k.soort === 'decor' && k.bestand) {
      const img = await laadBeeld(k.bestand);
      const c = canvas(1024, 256), g = c.getContext('2d');
      // De stalen hebben een staande nerf; hier ligt hij langs het profiel.
      g.translate(512, 128);
      g.rotate(-Math.PI / 2);
      g.drawImage(img, -128, -512, 256, 1024);
      tex = textuur(c, true, DECOR_HERHAAL);
    } else {
      const c = canvas(512, 512), g = c.getContext('2d');
      g.fillStyle = k.hex; g.fillRect(0, 0, 512, 512);
      const licht = helderheid(k.hex) > 0.45;
      g.globalAlpha = licht ? 0.16 : 0.1;
      g.drawImage(nerfLaag(nerf, licht ? '#3a3226' : '#ffffff'), 0, 0);
      tex = textuur(c, true, NERF_HERHAAL);
    }
    cache.set(k.slug, tex);
    return tex;
  }

  async function zetKleur(k) {
    huidige = k;
    const tex = await maakKleur(k);
    if (huidige !== k) return;
    for (const m of [folie, mat.kleur]) { m.map = tex; m.needsUpdate = true; }
    const donker = helderheid(k.hex || '#777777') < 0.12;
    folie.roughness = donker ? 0.5 : 0.56;
    vraagBeeld();
    sectie.dispatchEvent(new CustomEvent('folie:kleur', { detail: k }));
  }

  /* ----- de kiezer in de laatste stap ----- */
  const kiezer = sectie.querySelector('.kiezer');
  const kiezerNaam = sectie.querySelector('.kiezer-naam');
  if (kiezer && kleurenData.length) {
    kleurenData.forEach((k, i) => {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'kiezer-knop' + (k.soort === 'decor' ? ' is-decor' : '') + (helderheid(k.hex || '#777') > 0.45 ? ' is-licht' : '');
      knop.style.setProperty('--kleur', k.hex || '#888');
      if (k.soort === 'decor' && k.bestand) knop.style.backgroundImage = `url("${k.bestand}")`;
      knop.setAttribute('aria-label', k.naam + (k.ral ? ', RAL ' + k.ral : ''));
      knop.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      knop.addEventListener('click', () => {
        kiezer.querySelectorAll('.kiezer-knop').forEach(b => b.setAttribute('aria-pressed', b === knop ? 'true' : 'false'));
        zetKleur(k);
      });
      kiezer.appendChild(knop);
    });
    sectie.addEventListener('folie:kleur', e => {
      const k = e.detail;
      if (kiezerNaam) kiezerNaam.innerHTML = `<b>${k.naam.split(' / ')[0]}</b>${k.ral ? ' &middot; RAL ' + k.ral : (k.soort === 'decor' ? ' &middot; houtdecor' : '')}`;
    });
  }

  /* ----- maat en kader ----- */
  let bw_ = 1, bh_ = 1, smal = false;
  function kader() {
    bw_ = doek.clientWidth || podium.clientWidth; bh_ = doek.clientHeight || podium.clientHeight;
    smal = podium.clientWidth < 760;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smal ? 1.75 : 2));
    renderer.setSize(bw_, bh_, false);
    labelRenderer.setSize(bw_, bh_);
    camera.aspect = bw_ / bh_;
    camera.updateProjectionMatrix();
    vraagBeeld();
  }

  /* ----- stand uit de scrollpositie ----- */
  const N = STANDEN.length;
  function voortgang() {
    const r = sectie.getBoundingClientRect();
    const totaal = r.height - window.innerHeight;
    if (totaal <= 0) return 0;
    return Math.min(1, Math.max(0, -r.top / totaal)) * (N - 1);
  }
  const glad = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function doelStand(t) {
    const i = Math.min(N - 2, Math.floor(t));
    const f = glad(0.2, 0.8, t - i);
    const a = STANDEN[i], b = STANDEN[i + 1], uit = {};
    for (const k in a) if (k !== 'nadruk') uit[k] = a[k] + (b[k] - a[k]) * f;
    // nadruk per laag als vier gewichten
    for (let n = 0; n < 4; n++) uit['n' + n] = (a.nadruk === n ? 1 : 0) * (1 - f) + (b.nadruk === n ? 1 : 0) * f;
    uit.nadrukIets = (a.nadruk >= 0 ? 1 : 0) * (1 - f) + (b.nadruk >= 0 ? 1 : 0) * f;
    return uit;
  }

  let stand = doelStand(voortgang());
  const tmp = new THREE.Vector3(), midden = new THREE.Vector3(), stukMidden = new THREE.Vector3();

  function pasToe(s, tijd) {
    const rust = rustig.matches ? 0 : s.rust;
    draai.rotation.set(-s.kant, s.rotY + Math.sin(tijd * 0.35) * 0.045 * rust, 0, 'YXZ');
    draai.position.y = Math.sin(tijd * 0.7) * 7 * rust;
    draai.updateMatrixWorld(true);

    // folie: dicht of los
    const los = s.til > 0.5 || s.uit > 0.01;
    stukDicht.visible = !los;
    const dikte = 0.12 + 2.2 * Math.min(1, s.uit);
    const tussen = 32 * s.uit;
    LAGEN.forEach((naam, i) => {
      const laag = lagen[naam];
      laag.mesh.visible = los;
      if (!los) return;
      const extra = s['n' + (2 - i)] * 10;           // laag met nadruk komt iets verder naar voren
      laag.zet(dikte, tussen * (i + 1) + extra, 16 * s.uit * (i + 1), s.pel, s.til);
    });
    // lagen zonder nadruk worden lichter
    const dim = (n) => 1 - 0.7 * s.nadrukIets * (1 - s['n' + n]);
    mat.top.opacity = 0.55 * dim(0);
    mat.kleur.opacity = dim(1);
    mat.kleur.depthWrite = mat.kleur.opacity > 0.98;
    mat.lijm.opacity = 0.82 * dim(2);
    pvc.emissive.setScalar(0.05 * s.n3);

    schaduw.material.opacity = s.schaduw;
    schaduw.visible = s.schaduw > 0.01;

    // labels
    const L = STUK[1] - STUK[0];
    labels.forEach((lb, i) => {
      const laagIndex = 2 - i;                     // label 1 = toplaag
      let x, y, z;
      if (i < 3) {
        x = STUK[1] + 16 * s.uit * (laagIndex + 1) + 6;
        y = -B + 34;
        z = tussen * (laagIndex + 1) + s.til + s['n' + i] * 10 + 2;
      } else {
        x = STUK[1] + 30; y = -B + 30; z = -2;
      }
      lb.obj.position.set(x, y, z);
      const zicht = Math.max(0, Math.min(1, (s.labels - 0.25) / 0.75));
      lb.el.style.opacity = (zicht * (0.45 + 0.55 * (s.nadrukIets < 0.5 ? 1 : s['n' + i]))).toFixed(3);
      lb.el.classList.toggle('is-actief', s['n' + i] > 0.5);
    });
    sectie.style.setProperty('--folie-uit', Math.min(1, s.uit).toFixed(3));

    // camera
    midden.set(0, 0, -35); kozijn.localToWorld(midden);
    stukMidden.set((STUK[0] + STUK[1]) / 2 + 25 * s.uit, -B + 30, 0.5 * s.til + 40 * s.uit); kozijn.localToWorld(stukMidden);
    const doel = tmp.copy(midden).lerp(stukMidden, s.focus);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const zichtH = Math.max(s.zicht, s.breed / camera.aspect);
    const afstand = (zichtH / 2) / Math.tan(fov / 2);
    camera.position.set(
      doel.x + afstand * Math.sin(s.az) * Math.cos(s.el),
      doel.y + afstand * Math.sin(s.el),
      doel.z + afstand * Math.cos(s.az) * Math.cos(s.el));
    camera.lookAt(doel);
    const sx = smal ? s.mx : s.sx, sy = smal ? s.sy : s.dy;
    camera.setViewOffset(bw_, bh_, -sx * bw_, sy * bh_, bw_, bh_);
  }

  /* ----- lus ----- */
  let zichtbaar = false, loopt = false, vorige = performance.now(), nodig = true;
  function vraagBeeld() { nodig = true; if (zichtbaar && !loopt) { loopt = true; vorige = performance.now(); requestAnimationFrame(lus); } }

  function lus(nu) {
    if (!zichtbaar || document.hidden || (lokaal && window.__folie?.pauze)) { loopt = false; return; }
    const dt = Math.min(0.05, (nu - vorige) / 1000);
    vorige = nu;
    const doel = doelStand(voortgang());
    const k = rustig.matches ? 1 : 1 - Math.exp(-dt * 5.5);
    let beweging = 0;
    for (const key in doel) { const d = doel[key] - stand[key]; stand[key] += d * k; beweging += Math.abs(d); }
    const tijd = nu / 1000;
    pasToe(stand, tijd);
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    nodig = false;
    // stilstaan als er niets beweegt (en er geen rustbeweging is)
    if (beweging < 1e-3 && (stand.rust < 0.01 || rustig.matches) && !nodig) { loopt = false; return; }
    requestAnimationFrame(lus);
  }

  new IntersectionObserver(([e]) => { zichtbaar = e.isIntersecting; if (zichtbaar) vraagBeeld(); }, { rootMargin: '100px' }).observe(sectie);
  window.addEventListener('scroll', vraagBeeld, { passive: true });
  window.addEventListener('resize', kader);
  document.addEventListener('visibilitychange', vraagBeeld);
  new ResizeObserver(kader).observe(podium);

  // Actieve stap markeren (voor de tekst)
  const stapObs = new IntersectionObserver(items => {
    for (const it of items) it.target.classList.toggle('is-actief', it.isIntersecting);
  }, { rootMargin: '-45% 0px -45% 0px' });
  stappen.forEach(s => stapObs.observe(s));

  /* ----- opstarten ----- */
  Promise.all([laadBeeld('/images/houtnerf-textuur.webp')]).then(async ([img]) => {
    nerf = img;
    // reliëf: groeven waar de nerf loopt
    const cb = canvas(512, 512), gb = cb.getContext('2d');
    gb.fillStyle = '#fff'; gb.fillRect(0, 0, 512, 512);
    gb.drawImage(nerfLaag(nerf, '#000'), 0, 0);
    nerfBump = textuur(cb, false, NERF_HERHAAL);
    // op de heldere toplaag is de nerf als lichte lijntjes te zien
    const ca = canvas(512, 512), ga = ca.getContext('2d');
    ga.fillStyle = '#262626'; ga.fillRect(0, 0, 512, 512);
    ga.drawImage(nerfLaag(nerf, '#e0e0e0'), 0, 0);
    nerfAlpha = textuur(ca, false, NERF_HERHAAL);
    folie.bumpMap = nerfBump; folie.needsUpdate = true;
    mat.top.bumpMap = nerfBump; mat.top.alphaMap = nerfAlpha; mat.top.needsUpdate = true;
    if (kleurenData.length) await zetKleur(kleurenData[0]);
    kader();
    pasToe(stand, 0);
    renderer.compile(scene, camera);
    sectie.classList.add('folie-3d');
    vraagBeeld();
  }).catch(fout => { console.error(fout); sectie.classList.add('folie-geen3d'); });

  /* ----- alleen lokaal: beelden opslaan voor de site ----- */
  if (lokaal) {
    window.__folie = {
      async opname(pad, w, h, t, opties = {}) {
        if (opties.kleurObj) await zetKleur(opties.kleurObj);
        else if (opties.kleur) {
          const k = kleurenData.find(x => x.slug === opties.kleur);
          if (k) await zetKleur(k);
        }
        const oud = [bw_, bh_];
        renderer.setPixelRatio(1);
        renderer.setSize(w, h, false);
        bw_ = w; bh_ = h; smal = opties.smal || false;
        camera.aspect = w / h; camera.updateProjectionMatrix();
        const s = Object.assign(doelStand(t), opties.stand || {});
        pasToe(s, opties.tijd || 0);
        if (opties.geenOffset) camera.clearViewOffset();
        renderer.render(scene, camera);
        const blob = await new Promise(ok => doek.toBlob(ok, opties.type || 'image/webp', opties.kwaliteit || 0.9));
        const r = await fetch('/__save?pad=' + encodeURIComponent(pad), { method: 'POST', body: blob });
        bw_ = oud[0]; bh_ = oud[1];
        kader();
        return r.text();
      },
      toon(t, extra = {}) { stand = Object.assign(doelStand(t), extra); pasToe(stand, 0); renderer.render(scene, camera); labelRenderer.render(scene, camera); },
      zetKleur: slug => zetKleur(kleurenData.find(x => x.slug === slug)),
      kleuren: kleurenData,
    };
  }
}

/* ---------- opstarten ------------------------------------------------------------- */

const sectie = document.querySelector('[data-folie]');
if (sectie) {
  try {
    start(sectie);
  } catch (fout) {
    console.error(fout);
    sectie.classList.add('folie-geen3d');
  }
}
