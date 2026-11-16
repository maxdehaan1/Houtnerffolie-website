/* houtnerffolie.nl — de 3D-uitleg bovenaan de homepage.

   Een crèmewit kunststof kozijn met een dennengroen draairaam (RAL 6009) en dubbel glas.
   Bij het scrollen komt een stuk folie van het raam los en valt het uiteen in zijn lagen.
   Daarna kiest de bezoeker zelf kleuren. Nog verder naar beneden verweert de folie, net
   als in de 3D-animatie op iwrap.nl (krijtig, gebarsten in eilandjes met opgekrulde randen),
   en tot slot gaat de oude folie eraf en komt er een nieuwe op.

   Werkt het niet (geen WebGL, oude browser), dan blijft de stilstaande afbeelding staan en
   is alle tekst gewoon leesbaar.

   Maten in millimeters; het kozijn staat in het XY-vlak met de buitenkant naar +Z. */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/CSS2DRenderer.js';

/* ---------- maten en profielen ---------------------------------------------------- */

const W = 1000, H = 1300;            // buitenmaat kozijn
const A = W / 2, B = H / 2;
const RAAM_IN = 59;                  // buitenkant kozijn -> buitenkant raam
const As = A - RAAM_IN, Bs = B - RAAM_IN;
const GLAS_IN = 56;                  // buitenkant raam -> rand van het glas
const STUK = [-As + 120, -As + 470]; // stuk onderdorpel van het raam waar de folie loskomt

// Doorsneden als [u, v, straal]: u loopt van de buitenrand naar binnen (de dag in),
// v van de voorkant van het kozijn naar achteren.
const KOZIJN = [[0, 0, 6], [68, 0, 4], [68, 16, 1.5], [57, 16, 0], [57, 70, 0], [0, 70, 2]];
const KOZIJN_FOLIE = [[0, 68, 0], [0, 0, 6], [68, 0, 4], [68, 14, 0]];
const RAAM = [[0, 18, 2], [64, 18, 3], [64, 26, 1], [54, 26, 0], [54, 54, 0], [64, 54, 1], [64, 80, 2], [0, 80, 2]];
const RAAM_FOLIE = [[0, 28, 0], [0, 18, 2], [64, 18, 3], [64, 24.5, 0]];
const STUK_FOLIE = [[12, 18, 0], [64, 18, 3], [64, 24.5, 0]];   // het stuk dat loskomt
const STUK_REST = [[0, 28, 0], [0, 18, 2], [12, 18, 0]];        // blijft langs de buitenrand zitten
const RUBBER = [[60, 26, 0], [66.5, 26, 0.8], [66.5, 30, 0], [60, 30, 0]];
const AANSLAG = [[64, 12, 0], [70.5, 12, 0.8], [70.5, 18, 0], [64, 18, 0]];   // rubber tussen kozijn en raam
const AFSTAND = [[56.5, 34, 0], [69.5, 34, 0.6], [69.5, 50, 0.6], [56.5, 50, 0]];   // afstandhouder tussen de ruiten

const FOLIE_AF = 0.4;                // de folie ligt zo ver boven het profiel
const UV = [350, 140];               // mm per textuureenheid: langs het profiel, rondom
const RAND = [34, 4];                // de rand die loskomt of wordt aangedrukt: lengte en hoogte in mm
const GLAS = [2 * (As - GLAS_IN), 2 * (Bs - GLAS_IN)];
const ZON = new THREE.Vector3(-1.4, 2.4, 1.5).normalize();
const ZON_LOS = new THREE.Vector3(-0.45, 2.6, -0.95).normalize();

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
  constructor() { this.p = []; this.n = []; this.t = []; this.z = []; this.i = []; }
  punt(p, n, t, zijde = 0) {
    this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.t.push(t[0], t[1]); this.z.push(zijde);
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
    g.setAttribute('aZijde', new THREE.Float32BufferAttribute(this.z, 1));
    g.setIndex(this.i);
    return g;
  }
}

// Een zijde van een rechthoekig kozijn (0 onder, 1 rechts, 2 boven, 3 links); de hoeken
// worden in verstek gezaagd doordat elk punt van de doorsnede een eigen, ingesprongen
// rechthoek volgt.
function zijde(k, u, a, b) {
  const lo = [-a + u, -b + u], ro = [a - u, -b + u], rb = [a - u, b - u], lb = [-a + u, b - u];
  return [[lo, ro, [0, 1]], [ro, rb, [-1, 0]], [rb, lb, [0, -1]], [lb, lo, [1, 0]]][k];
}

function veeg(bouwer, p, a, b, k, opt = {}) {
  const { van = null, tot = null, af = 0, sExtra = 0, stap = 0 } = opt;
  const as = k % 2 === 0 ? 0 : 1;
  const lijnen = p.v.map(([u0, v0, nu, nv]) => {
    const u = u0 + nu * af, v = v0 + nv * af;
    const [p0, p1, binnen] = zijde(k, u, a, b);
    const s = p0.slice(), e = p1.slice();
    if (van !== null) s[as] = van;
    if (tot !== null) e[as] = tot;
    return { s, e, v, n: [binnen[0] * nu, binnen[1] * nu, -nv] };
  });
  // met stap wordt de zijde in stukjes verdeeld, zodat de folie kan buigen (loskomen, aandrukken)
  const lengte = Math.max(...lijnen.map(l => Math.abs(l.e[as] - l.s[as])));
  const delen = stap ? Math.max(1, Math.ceil(lengte / stap)) : 1;
  const rij = lijnen.map(({ s, e, v, n }, j) => {
    const tv = (p.s[j] + sExtra) / UV[1], r = [];
    for (let i = 0; i <= delen; i++) {
      const f = i / delen, q = [s[0] + (e[0] - s[0]) * f, s[1] + (e[1] - s[1]) * f];
      r.push(bouwer.punt([q[0], q[1], -v], n, [q[as] / UV[0], tv], k));
    }
    return r;
  });
  const m = p.gesloten ? rij.length : rij.length - 1;
  for (let j = 0; j < m; j++) {
    const q = rij[j], r = rij[(j + 1) % rij.length];
    for (let i = 0; i < delen; i++) bouwer.vlak(q[i], q[i + 1], r[i + 1], r[i]);
  }
}

function kozijnDeel(profiel, a, b, opt = {}) {
  const bw = new Bouwer();
  for (let k = 0; k < 4; k++) veeg(bw, profiel, a, b, k, opt);
  return bw.geometrie();
}

/* Eén laag van het losgekomen stuk folie: een dunne schaal die de vorm van de onderdorpel
   van het raam volgt. De punten worden elk beeld opnieuw uitgerekend, zodat de laag kan
   buigen (afpellen), dikker kan worden en kan verschuiven. Groep 0 zijn de vlakken, groep 1
   de randen (bij de heldere toplaag lichten die op, zoals bij echt acryl). */
class Laag {
  constructor(p, materialen, nx = 40) {
    this.p = p;
    const V = p.v, S = p.s, n = V.length;
    const u = [], v = [], nu = [], nv = [], s = [], buiten = [];
    const bw = new Bouwer();
    const punt = (j, f, uit, nrm) => {
      u.push(V[j][0]); v.push(V[j][1]); nu.push(V[j][2]); nv.push(V[j][3]); s.push(f); buiten.push(uit);
      return bw.punt(Laag.positie(V[j][0], V[j][1], V[j][2], V[j][3], f, uit, 1, 0, 0, 0, 0), nrm, [0, S[j] / UV[1]]);
    };
    const normaal = (j, teken) => [0, V[j][2] * teken, -V[j][3] * teken];
    for (const uit of [1, 0]) {
      const rij = [];
      for (let j = 0; j < n; j++) {
        const r = [];
        for (let i = 0; i <= nx; i++) r.push(punt(j, i / nx, uit, normaal(j, uit ? 1 : -1)));
        rij.push(r);
      }
      for (let j = 0; j < n - 1; j++) for (let i = 0; i < nx; i++) bw.vlak(rij[j][i], rij[j][i + 1], rij[j + 1][i + 1], rij[j + 1][i]);
    }
    const vlakken = bw.i.length;
    for (const [j, teken] of [[0, -1], [n - 1, 1]]) {
      const jj = teken < 0 ? 1 : n - 2;
      const tx = V[j][0] - V[jj][0], ty = V[j][1] - V[jj][1], l = Math.hypot(tx, ty);
      const nrm = [0, tx / l, -ty / l];
      const r0 = [], r1 = [];
      for (let i = 0; i <= nx; i++) { r0.push(punt(j, i / nx, 0, nrm)); r1.push(punt(j, i / nx, 1, nrm)); }
      for (let i = 0; i < nx; i++) bw.vlak(r0[i], r0[i + 1], r1[i + 1], r1[i]);
    }
    for (const f of [0, 1]) {
      const nrm = [f ? 1 : -1, 0, 0];
      const r0 = [], r1 = [];
      for (let j = 0; j < n; j++) { r0.push(punt(j, f, 0, nrm)); r1.push(punt(j, f, 1, nrm)); }
      for (let j = 0; j < n - 1; j++) bw.vlak(r0[j], r0[j + 1], r1[j + 1], r1[j]);
    }
    this.geo = bw.geometrie();
    this.geo.addGroup(0, vlakken, 0);
    this.geo.addGroup(vlakken, bw.i.length - vlakken, 1);
    Object.assign(this, { u, v, nu, nv, s, buiten });
    this.mesh = new THREE.Mesh(this.geo, materialen);
    this.mesh.frustumCulled = false;
    this.meshes = [this.mesh];
  }

  // dikte in mm, z = hoe ver de laag van het profiel af staat, dx = verschuiving langs de
  // dorpel, pel = 0..1 hoe ver het afpellen is, til = hoe hoog het losse stuk komt.
  static positie(u, v, nu, nv, f, buiten, dikte, z, dx, pel, til) {
    const af = FOLIE_AF + (buiten ? dikte : 0);
    const g = Math.min(1, Math.max(0, (pel - (1 - f) * 0.55) / 0.45));   // afpellen begint rechts
    const k = g * g * (3 - 2 * g);
    return [STUK[0] + f * (STUK[1] - STUK[0]) + dx, -Bs + u + nu * af, -(v + nv * af) + til * k + z];
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

// Wat er in het glas weerspiegelt: lucht met wolken, een rij huizen en bomen aan de
// overkant, de straat. Zo ziet een ruit er van buiten uit.
function lucht() {
  const w = 2048, h = 1024, hor = h / 2 + 70, c = canvas(w, h), g = c.getContext('2d');
  let zaad = 11;
  const r = () => { zaad = (zaad * 16807) % 2147483647; return (zaad - 1) / 2147483646; };
  const rond = (teken) => { for (const dx of [0, -w, w]) teken(dx); };
  const hemel = g.createLinearGradient(0, 0, 0, hor);
  hemel.addColorStop(0, '#5a88bd'); hemel.addColorStop(0.45, '#8fb2d6'); hemel.addColorStop(0.82, '#c9d9e8'); hemel.addColorStop(1, '#e4ebf0');
  g.fillStyle = hemel; g.fillRect(0, 0, w, hor);
  for (let i = 0; i < 70; i++) {
    const x = r() * w, y = hor * (0.18 + r() * 0.62), rx = 70 + r() * 170, ry = rx * (0.42 + r() * 0.2), a = 0.06 + r() * 0.14;
    rond(dx => {
      g.save(); g.translate(x + dx, y); g.scale(1, ry / rx);
      const gr = g.createRadialGradient(0, -rx * 0.15, 0, 0, 0, rx);
      gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.55, `rgba(246,249,252,${a * 0.55})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
    });
  }
  const grond = g.createLinearGradient(0, hor, 0, h);
  grond.addColorStop(0, '#a3a49f'); grond.addColorStop(0.035, '#868883'); grond.addColorStop(0.07, '#626463');
  grond.addColorStop(0.3, '#585b59'); grond.addColorStop(0.5, '#6a6e66'); grond.addColorStop(0.75, '#5d6851'); grond.addColorStop(1, '#3c4237');
  g.fillStyle = grond; g.fillRect(0, hor, w, h - hor);
  g.fillStyle = 'rgba(220,220,214,0.4)'; g.fillRect(0, hor + 30, w, 3);
  g.fillStyle = 'rgba(220,220,214,0.25)'; g.fillRect(0, hor + 150, w, 4);
  const muren = ['#6e625a', '#625a54', '#7a6e64', '#857a6e', '#5c544e', '#9a9286', '#8a8378'];
  let x = 0;
  while (x < w) {
    const bw = 46 + r() * 70, bh = 18 + r() * 14, kap = 8 + r() * 12, kleur = muren[Math.floor(r() * muren.length)];
    const n = Math.max(2, Math.round(bw / 22)), plat = r() < 0.25;
    rond(dx => {
      const x0 = x + dx;
      g.fillStyle = kleur; g.fillRect(x0, hor - bh, bw, bh);
      g.fillStyle = '#3c3f44';
      if (plat) g.fillRect(x0 - 2, hor - bh - 4, bw + 4, 5);
      else { g.beginPath(); g.moveTo(x0 - 4, hor - bh); g.lineTo(x0 + bw / 2, hor - bh - kap); g.lineTo(x0 + bw + 4, hor - bh); g.closePath(); g.fill(); }
      for (let i = 0; i < n; i++) {
        const wx = x0 + (i + 0.5) * bw / n - 4;
        for (const wy of [hor - bh + 4, hor - bh * 0.48]) {
          g.fillStyle = 'rgba(34,42,50,0.9)'; g.fillRect(wx, wy, 8, 7);
          g.fillStyle = 'rgba(240,238,230,0.75)'; g.fillRect(wx - 1, wy - 1, 10, 1.2);
          g.fillStyle = 'rgba(150,170,185,0.35)'; g.fillRect(wx + 1, wy + 1, 3, 5);
        }
      }
    });
    x += bw + 14 + r() * 60;
  }
  for (let i = 0; i < 70; i++) {
    const tx = r() * w, rr = 7 + r() * 14, ty = hor - 10 - rr * 0.9 - r() * 14;
    rond(dx => {
      g.fillStyle = '#463b32'; g.fillRect(tx + dx - 2, ty, 4, hor - ty);
      const kr = g.createRadialGradient(tx + dx - rr * 0.3, ty - rr * 0.35, rr * 0.1, tx + dx, ty, rr);
      kr.addColorStop(0, '#6c7a5a'); kr.addColorStop(0.6, '#45523d'); kr.addColorStop(1, 'rgba(56,66,48,0)');
      g.fillStyle = kr; g.beginPath(); g.arc(tx + dx, ty, rr, 0, Math.PI * 2); g.fill();
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- bijzondere materialen ------------------------------------------------- */

// Alleen weerspiegeling (glas, de glans op acryl): het licht wordt opgeteld bij wat erachter
// zit, met de juiste Fresnel (meer spiegeling naarmate je er schuiner op kijkt). De alfa is
// de helderheid van de spiegeling, zodat het ook boven de lichte pagina klopt.
function spiegel(opties) {
  const m = new THREE.MeshPhysicalMaterial(Object.assign({
    color: 0x000000, roughness: 0.02, metalness: 0, ior: 1.52, specularIntensity: 1,
    transparent: true, depthWrite: false,
  }, opties));
  m.blending = THREE.CustomBlending;
  m.blendEquation = THREE.AddEquation;
  m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneFactor;
  m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
      'gl_FragColor = vec4( outgoingLight, clamp( max( outgoingLight.r, max( outgoingLight.g, outgoingLight.b ) ), 0.0, 1.0 ) );');
  };
  m.customProgramCacheKey = () => 'spiegel';
  return m;
}

// Wat je achter het glas ziet: een kamer met diepte (interior mapping). Per pixel wordt
// uitgerekend welke muur, vloer of welk gordijn je door het raam heen ziet.
function binnenMateriaal() {
  return new THREE.ShaderMaterial({
    uniforms: { uOog: { value: new THREE.Vector3(0, 0, 3000) }, uLicht: { value: 1 } },
    vertexShader: /* glsl */`
      varying vec3 vLok;
      void main() { vLok = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uOog;
      uniform float uLicht;
      varying vec3 vLok;
      const float HB = 1900.0, VL = -1550.0, PL = 1050.0, DP = 4300.0;
      const float GH = ${(GLAS[0] / 2).toFixed(1)};
      float kh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
      void main() {
        vec3 ro = vLok, rd = normalize(vLok - uOog);
        vec3 col = vec3(0.01);
        if (rd.z < -0.001) {
          vec3 tt = vec3((sign(rd.x) * HB - ro.x) / rd.x, ((rd.y > 0.0 ? PL : VL) - ro.y) / rd.y, (-DP - ro.z) / rd.z);
          float t = min(tt.x, min(tt.y, tt.z));
          vec3 p = ro + rd * t;
          float licht = exp(p.z / 2600.0);
          if (t == tt.z) {
            col = lin(vec3(0.76, 0.76, 0.75));
            if (p.x > 450.0 && p.x < 1300.0 && p.y < VL + 2100.0) col = lin(vec3(0.6, 0.58, 0.55));
            if (abs(p.x + 650.0) < 430.0 && abs(p.y - (VL + 1650.0)) < 300.0) col = lin(vec3(0.45, 0.48, 0.5));
          } else if (t == tt.x) {
            col = lin(vec3(0.74, 0.74, 0.73)) * (rd.x > 0.0 ? 0.8 : 1.0);
          } else if (rd.y > 0.0) {
            col = lin(vec3(0.88, 0.87, 0.84));
            licht = mix(licht, 1.0, 0.3);
          } else {
            float plank = kh(vec2(floor(p.x / 190.0), floor((p.z + 5000.0) / 1400.0)));
            col = lin(vec3(0.42, 0.37, 0.32)) * (0.82 + 0.3 * plank);
            col *= 1.0 - 0.3 * smoothstep(0.44, 0.5, abs(fract(p.x / 190.0) - 0.5));
            licht *= 0.9;
          }
          float a1 = HB - abs(p.x), a2 = p.y - VL, a3 = PL - p.y, a4 = DP + p.z;
          float tweede = min(max(min(a1, a2), min(a3, a4)), min(max(a1, a2), max(a3, a4)));
          col *= 0.55 + 0.45 * smoothstep(0.0, 700.0, tweede);
          col *= licht * 0.1 * uLicht;
          // gordijnen opzij, vlak achter het raam: die vangen het meeste daglicht
          float tg = (-120.0 - ro.z) / rd.z;
          vec3 pg = ro + rd * tg;
          float ax = abs(pg.x);
          if (ax > GH - 70.0 && ax < GH + 320.0 && pg.y > VL + 60.0 && pg.y < PL - 40.0) {
            float plooi = 0.5 + 0.5 * sin(pg.x * 0.12 + 0.6 * sin(pg.x * 0.031));
            col = lin(vec3(0.8, 0.79, 0.76)) * (0.62 + 0.38 * plooi) * 0.075 * uLicht;
          }
        }
        col *= vec3(0.9, 0.97, 0.98);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/* De folie op kozijn en raam: nieuw, verweerd (de toplaag is op), weg (alleen lijm of kaal
   kunststof) of opnieuw aangebracht. De verwering is dezelfde als in de 3D-animatie op
   iwrap.nl: krijtig en dof, gebarsten in eilandjes met opgekrulde randen, vuil in de barsten
   en hier en daar een schilfer die ontbreekt. */
const VERWEER_PARS = /* glsl */`
uniform float uOud;
uniform float uWeg;
uniform float uSchoon;
uniform float uNieuw;
uniform float uGlans;
varying vec2 vMm;
varying float vPad;
float vw_h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 vw_h22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 vw_vnd(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f), du = 6.0 * f * (1.0 - f);
  float a = vw_h12(i), b = vw_h12(i + vec2(1.0, 0.0)), c = vw_h12(i + vec2(0.0, 1.0)), d = vw_h12(i + vec2(1.0, 1.0));
  float k1 = b - a, k2 = c - a, k4 = a - b - c + d;
  return vec3(a + k1 * u.x + k2 * u.y + k4 * u.x * u.y, du * vec2(k1 + k4 * u.y, k2 + k4 * u.x));
}
float vw_fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vw_vnd(p).x; p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
vec4 vw_rand(vec2 x) {
  vec2 n = floor(x), f = fract(x), mg = vec2(0.0), mr = vec2(0.0); float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)), o = vw_h22(n + g) * 0.8 + 0.1, r = g + o - f; float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0; vec2 bn = vec2(0.0, 1.0);
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j)), o = vw_h22(n + g) * 0.8 + 0.1, r = g + o - f, dr = r - mr;
    if (dot(dr, dr) > 1e-5) { vec2 nn = normalize(dr); float d = dot(0.5 * (mr + r), nn); if (d < md) { md = d; bn = nn; } }
  }
  return vec4(md, bn, vw_h12(n + mg));
}
mat3 vw_frame(vec3 p, vec3 n, vec2 st) {
  vec3 q0 = dFdx(p), q1 = dFdy(p); vec2 s0 = dFdx(st), s1 = dFdy(st);
  vec3 q1p = cross(q1, n), q0p = cross(n, q0);
  vec3 T = q1p * s0.x + q0p * s1.x, Bt = q1p * s0.y + q0p * s1.y;
  float det = max(dot(T, T), dot(Bt, Bt)); float sc = det == 0.0 ? 0.0 : inversesqrt(det);
  return mat3(T * sc, Bt * sc, n);
}
`;

const VERWEER_MAP = /* glsl */`
vec2 vwGrad = vec2(0.0);
float vwRuw = 0.5, vwRuwMix = 0.0, vwCc = 1.0, vwBand = 0.0;
{
  float vwNieuw = 1.0 - smoothstep(-1.5, 1.5, vPad - uNieuw);
  float vwWeg = 1.0 - smoothstep(-1.5, 1.5, vPad - uWeg);
  float vwSchoon = 1.0 - smoothstep(-1.5, 1.5, vPad - uSchoon);
  vec2 s = vMm;
  if (vwWeg > 0.5 && vwNieuw < 0.5) {
    // de oude folie is eraf: lijmresten, of (na het schoonmaken) kaal kunststof
    if (vwSchoon > 0.5) discard;
    float dik = vw_fbm(s * 0.045 + 3.1);
    if (dik < 0.17) discard;
    diffuseColor.rgb = mix(vec3(0.70, 0.56, 0.3), vec3(0.8, 0.68, 0.42), smoothstep(0.3, 0.75, vw_fbm(s * 0.03 + 7.0)));
    vec3 r = vw_vnd(s * 0.32), r2 = vw_vnd(vec2(s.x * 0.04, s.y * 0.5) + 5.0);
    vwGrad = r.yz * 0.032 + r2.yz * vec2(0.04, 0.5) * 0.035;
    vwRuw = 0.24; vwRuwMix = 1.0; vwCc = 0.0;
  } else if (!gl_FrontFacing) {
    // de onderkant van een rand die loskomt: de lijmkant
    diffuseColor.rgb = vec3(0.72, 0.6, 0.38);
    vwRuw = 0.35; vwRuwMix = 1.0; vwCc = 0.0;
  } else if (vwNieuw > 0.5) {
    float a = uNieuw - vPad;
    vwBand = exp(-a * a / (2.0 * 34.0 * 34.0)) * uGlans;
  } else if (uOud > 0.001) {
    float st = uOud;
    vec3 basis = diffuseColor.rgb;
    vec2 w = vec2(vw_fbm(s * 0.045), vw_fbm(s * 0.045 + 13.7)) - 0.5;
    float masker = 0.35 + 0.65 * smoothstep(0.3, 0.62, vw_fbm(s * 0.018 + 3.0));
    float sm = st * masker;
    vec4 v1 = vw_rand(vec2(s.x / 15.0, s.y / 9.0) + w * 1.25);
    float d1 = v1.x * 11.0; vec2 g1 = -v1.yz * vec2(11.0 / 15.0, 11.0 / 9.0); float id = v1.w;
    vec4 v2 = vw_rand(vec2(s.x / 5.0, s.y / 3.6) + w * 0.8 + 7.3);
    float d2 = v2.x * 4.2; vec2 g2 = -v2.yz * vec2(4.2 / 5.0, 4.2 / 3.6);
    float pix = length(fwidth(s));
    float lod = 1.0 - smoothstep(0.35, 1.5, pix);
    float fw1 = max(fwidth(d1), 1e-3), fw2 = max(fwidth(d2), 1e-3);
    float cw = 0.05 + 0.08 * sm;
    float b1 = (1.0 - smoothstep(cw - fw1, cw + fw1, d1)) * smoothstep(0.08, 0.4, sm);
    float b2 = (1.0 - smoothstep(0.035 - fw2, 0.035 + fw2, d2)) * smoothstep(0.35, 0.9, sm);
    float mt = 0.006 * st * st * masker;
    float mis = step(id, mt);
    float krul = (1.0 - mis) * step(mt, id) * step(id, mt + 0.16 * sm);
    float lipH = (0.2 + 0.75 * krul) * sm * lod, lipW = 0.75 + 1.1 * krul;
    float e = exp(-max(d1 - cw, 0.0) / lipW), e2 = exp(-max(d2 - 0.035, 0.0) / 0.45);
    vec2 grad = (-lipH / lipW * e * step(cw, d1)) * g1 + (-0.05 * sm * lod / 0.45 * e2 * step(0.035, d2)) * g2;
    if (mis > 0.5) grad = -grad;
    float lum = dot(basis, vec3(0.2126, 0.7152, 0.0722));
    float donker = 1.0 - smoothstep(0.04, 0.45, lum);
    vec3 tint = mix(vec3(1.0), clamp(basis / max(lum, 0.004), 0.0, 1.6), 0.38);
    vec3 krijt = mix(basis, vec3(lum) * vec3(1.03, 1.0, 0.92), 0.32);
    krijt = krijt * (0.84 - 0.1 * donker) + vec3(0.066, 0.064, 0.058) * tint * (1.0 + 0.55 * donker);
    float bl = vw_fbm(s * 0.03 + 4.0), str = vw_fbm(vec2(s.x * 0.16, s.y * 0.018) + 9.0);
    vec3 c = krijt * mix(0.93, 1.05, smoothstep(0.3, 0.72, bl));
    c *= 0.975 + 0.05 * fract(id * 7.13);
    c = mix(c, c * vec3(0.96, 0.9, 0.78), smoothstep(0.55, 0.85, vw_fbm(s * 0.012 + 2.0)) * 0.35);
    c = mix(c, c * 0.8, smoothstep(0.5, 0.8, str) * 0.2 * st);
    c = mix(c, min(c * 1.2 + 0.05, vec3(1.0)), e * (0.18 + 0.4 * krul) * sm * (1.0 - mis));
    if (mis > 0.5) c = mix(vec3(0.56, 0.48, 0.32), vec3(0.42, 0.39, 0.33), vw_fbm(s * 0.4));
    c = mix(c, vec3(0.13, 0.12, 0.10), b1 * 0.62);
    c = mix(c, c * 0.72, b2 * 0.45);
    float k = smoothstep(0.0, 0.35, st);
    diffuseColor.rgb = mix(basis, c, k);
    vwGrad = grad * k;
    vwRuw = mix(0.74, 0.9, clamp(b1 + 0.5 * b2, 0.0, 1.0)); vwRuwMix = k;
    vwCc = 1.0 - k;
  }
}
`;

function verweer(materiaal, a, b) {
  const lengte = 2 * (a + b);
  const u = {
    uAB: { value: new THREE.Vector2(a, b) },
    uOud: { value: 0 }, uWeg: { value: -10 }, uSchoon: { value: -10 }, uNieuw: { value: -10 }, uGlans: { value: 0 },
  };
  materiaal.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aZijde;
uniform vec2 uAB;
uniform float uWeg;
uniform float uNieuw;
varying vec2 vMm;
varying float vPad;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vMm = uv * vec2(${UV[0].toFixed(1)}, ${UV[1].toFixed(1)});
if (aZijde < 0.5) vPad = uAB.x - transformed.x;
else if (aZijde < 1.5) vPad = transformed.y + uAB.y;
else if (aZijde < 2.5) vPad = 2.0 * uAB.y + uAB.x - transformed.x;
else vPad = 2.0 * uAB.x + transformed.y + uAB.y;
{
  // Vlak voor de rand staat de oude folie een beetje op (je ziet de lijmkant eronder);
  // de nieuwe folie heeft vlak achter de rand nog een kleine opstaande rand. Alleen de
  // voorkant: zo blijven de hoeken netjes.
  float dW = vPad - uWeg, dN = uNieuw - vPad;
  float voor = smoothstep(0.5, 0.9, objectNormal.z);
  if (uWeg > 0.0 && dN < 0.0 && dW >= 0.0 && dW < ${RAND[0].toFixed(1)}) { float t = 1.0 - dW / ${RAND[0].toFixed(1)}; transformed += objectNormal * ${RAND[1].toFixed(1)} * t * t * voor; }
  if (uNieuw > 0.0 && dN >= 0.0 && dN < ${RAND[0].toFixed(1)}) { float t = 1.0 - dN / ${RAND[0].toFixed(1)}; transformed += objectNormal * ${(RAND[1] * 0.7).toFixed(1)} * t * t * voor; }
}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + VERWEER_PARS)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + VERWEER_MAP)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, vwRuw, vwRuwMix);
roughnessFactor = mix(roughnessFactor, 0.14, vwBand);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if (dot(vwGrad, vwGrad) > 1e-9) normal = normalize(vw_frame(-vViewPosition, normal, vMm) * vec3(-vwGrad * 1.5, 1.0));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(0.11, 0.108, 0.1) * vwBand;`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
material.clearcoat *= vwCc;
#endif`);
  };
  materiaal.customProgramCacheKey = () => 'verweer';
  return { u, lengte };
}

/* ---------- de standen van de uitleg ---------------------------------------------- */

// Tussen twee standen wordt geleidelijk overgevloeid.
// zicht = zichtbare hoogte in mm, focus = naar het losse stuk, hoek = naar de hoek rechtsonder,
// sx/dy = verschuiving van het beeld op een breed scherm, mx/sy = op een smal scherm,
// oud = verwering, eraf = de oude folie gaat eraf, erop = de nieuwe folie gaat erop.
const BASIS = { rotY: -0.5, kant: 0, focus: 0, hoek: 0, zicht: 2050, breed: 1250, az: 0, el: 0.1, til: 0, pel: 0, uit: 0, schaduw: 1, rust: 1, labels: 0, sx: 0.04, sy: -0.13, mx: 0, dy: 0.05, nadruk: -1, oud: 0, eraf: 0, erop: 0 };
const LOS = { rotY: -0.06, kant: 1.48, focus: 1, zicht: 500, breed: 470, az: -0.5, el: 0.6, til: 36, pel: 1, uit: 1, schaduw: 0, rust: 0, labels: 1, sx: -0.13, sy: 0.1, mx: -0.27, dy: -0.06 };
const STANDEN = [
  BASIS,
  { ...BASIS, ...LOS, rotY: -0.1, kant: 1.42, zicht: 460, breed: 420, uit: 0, labels: 0 },
  { ...BASIS, ...LOS, nadruk: 0 },
  { ...BASIS, ...LOS, nadruk: 1 },
  { ...BASIS, ...LOS, nadruk: 2 },
  { ...BASIS, ...LOS, zicht: 560, breed: 520, uit: 1.3, nadruk: 3 },
  { ...BASIS, rotY: -0.42, breed: 1150, el: 0.08, sy: 0.2, dy: 0.03 },
  { ...BASIS, rotY: -0.78, hoek: 1, zicht: 470, breed: 600, az: 0.1, el: 0.16, rust: 0, sx: 0.0, dy: 0.0, mx: 0, sy: 0.12, oud: 1 },
  { ...BASIS, rotY: -0.62, hoek: 0.5, zicht: 1250, breed: 1000, az: 0.04, el: 0.12, rust: 0, sx: 0.02, dy: 0.02, mx: 0, sy: 0.14, oud: 1, eraf: 1 },
  { ...BASIS, rotY: -0.42, breed: 1150, el: 0.08, sy: 0.2, dy: 0.03, oud: 1, eraf: 1, erop: 1 },
];
// Wanneer binnen een overgang iets verandert (standaard tussen 20% en 80%).
const TIMING = { oud: [0.45, 0.85], eraf: [0.1, 0.92], erop: [0.1, 0.92] };
const LAGEN = ['lijm', 'kleur', 'top'];
const TUSSEN = 40, SCHUIF = 22;      // afstand tussen de lagen, en hoe ver ze opzij schuiven

/* ---------- de scène -------------------------------------------------------------- */

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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = studio;
  scene.environmentIntensity = 0.62;

  const zon = new THREE.DirectionalLight(0xfff4e6, 2.7);
  zon.castShadow = true;
  zon.shadow.mapSize.set(2048, 2048);
  zon.shadow.radius = 3;
  zon.shadow.bias = -0.0002;
  zon.shadow.normalBias = 0.6;
  zon.shadow.camera.near = 100;
  zon.shadow.camera.far = 6000;
  scene.add(zon, zon.target);
  const tegen = new THREE.DirectionalLight(0xe8eef2, 0.7);
  tegen.position.set(1.6, 0.6, -0.8);
  scene.add(tegen);

  const camera = new THREE.PerspectiveCamera(26, 1, 20, 20000);

  /* ----- materialen ----- */
  const pvc = new THREE.MeshPhysicalMaterial({ color: 0xf2f1ec, roughness: 0.46, clearcoat: 0.1, clearcoatRoughness: 0.5 });
  const folieOpties = { color: 0xffffff, roughness: 0.56, clearcoat: 0.3, clearcoatRoughness: 0.32, bumpScale: 0.7, side: THREE.DoubleSide };
  const folie = { kozijn: new THREE.MeshPhysicalMaterial(folieOpties), raam: new THREE.MeshPhysicalMaterial(folieOpties) };
  const zones = { kozijn: verweer(folie.kozijn, A, B), raam: verweer(folie.raam, As, Bs) };
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1b1c1c, roughness: 0.85 });
  const afstandMat = new THREE.MeshStandardMaterial({ color: 0x2c2f32, roughness: 0.5, metalness: 0.35 });
  const dopMat = new THREE.MeshPhysicalMaterial({ color: 0xe9e0d2, roughness: 0.5, clearcoat: 0.2 });
  const luchtTex = lucht();
  const glasVoor = spiegel({ envMap: luchtTex, envMapIntensity: 3.4 });
  const glasAchter = spiegel({ envMap: luchtTex, envMapIntensity: 1.7 });
  const binnenMat = binnenMateriaal();
  const mat = {
    // de toplaag: een waas, oplichtende randen en (apart) de spiegeling met de nerf erin
    topVlak: new THREE.MeshPhysicalMaterial({ color: 0xf2f8f9, roughness: 0.3, transparent: true, opacity: 0.14, depthWrite: false }),
    topRand: new THREE.MeshPhysicalMaterial({ color: 0xe6f6f6, emissive: 0x9ed3d2, emissiveIntensity: 0.32, roughness: 0.2, transparent: true, opacity: 0.8, depthWrite: false }),
    topSpiegel: spiegel({ roughness: 0.12, ior: 1.49, envMap: studio, envMapIntensity: 1.5, bumpScale: 0.6 }),
    kleur: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.58, clearcoat: 0.3, clearcoatRoughness: 0.32, bumpScale: 0.7 }),
    lijm: new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#c99232'), roughness: 0.32, transparent: true, opacity: 0.8, depthWrite: false, sheen: 0.3, sheenColor: 0xffe7b0 }),
  };

  /* ----- het kozijn ----- */
  const draai = new THREE.Group();      // draait om de onderdorpel
  const kozijn = new THREE.Group();
  kozijn.position.y = B - 35;
  draai.add(kozijn);
  scene.add(draai);
  const voeg = (geo, m, schaduw = true) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = schaduw; mesh.receiveShadow = schaduw;
    kozijn.add(mesh);
    return mesh;
  };

  const pKozijnFolie = pad(KOZIJN_FOLIE, false), pRaamFolie = pad(RAAM_FOLIE, false);
  voeg(kozijnDeel(pad(KOZIJN, true), A, B), pvc);
  voeg(kozijnDeel(pad(RAAM, true), As, Bs), pvc);
  voeg(kozijnDeel(pad(RUBBER, true, 3), As, Bs), rubber);
  voeg(kozijnDeel(pad(AANSLAG, true, 3), A, B), rubber);
  voeg(kozijnDeel(pad(AFSTAND, true, 2), As, Bs), afstandMat, false);

  // folie: het kozijn heel, het raam met de onderdorpel in stukken zodat het middelste stuk los kan
  voeg(kozijnDeel(pKozijnFolie, A, B, { af: FOLIE_AF, stap: 12 }), folie.kozijn);
  const bw = new Bouwer();
  for (let k = 1; k < 4; k++) veeg(bw, pRaamFolie, As, Bs, k, { af: FOLIE_AF, stap: 12 });
  veeg(bw, pRaamFolie, As, Bs, 0, { af: FOLIE_AF, tot: STUK[0], stap: 12 });
  veeg(bw, pRaamFolie, As, Bs, 0, { af: FOLIE_AF, van: STUK[1], stap: 12 });
  voeg(bw.geometrie(), folie.raam);
  const pRest = pad(STUK_REST, false), sNaRest = pRest.s[pRest.s.length - 1];
  const bwStuk = new Bouwer();
  veeg(bwStuk, pad(STUK_FOLIE, false), As, Bs, 0, { af: FOLIE_AF, van: STUK[0], tot: STUK[1], sExtra: sNaRest, stap: 12 });
  const stukDicht = voeg(bwStuk.geometrie(), folie.raam);
  const bwRest = new Bouwer();
  veeg(bwRest, pRest, As, Bs, 0, { af: FOLIE_AF, van: STUK[0], tot: STUK[1], stap: 12 });
  voeg(bwRest.geometrie(), folie.raam);

  // afwateringskapjes op de onderdorpel
  const dopGeo = new THREE.CapsuleGeometry(3.6, 20, 4, 10);
  dopGeo.rotateZ(Math.PI / 2);
  dopGeo.scale(1, 1, 0.5);
  for (const x of [-A + 92, A - 92]) {
    const dop = voeg(dopGeo, dopMat);
    dop.position.set(x, -B + 13, FOLIE_AF + 0.9);
  }

  // dubbel glas: twee ruiten die spiegelen (iets bol, zoals echte isolatieruiten), en daarachter de kamer
  function ruit(bol) {
    const g = new THREE.PlaneGeometry(GLAS[0], GLAS[1], 24, 32);
    const p = g.attributes.position, n = g.attributes.normal, hw = GLAS[0] / 2, hh = GLAS[1] / 2;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / hw, y = p.getY(i) / hh;
      const dx = bol * (-2 * x / hw) * (1 - y * y), dy = bol * (1 - x * x) * (-2 * y / hh);
      const l = Math.hypot(dx, dy, 1);
      n.setXYZ(i, -dx / l, -dy / l, 1 / l);
    }
    return g;
  }
  const binnen = new THREE.Mesh(new THREE.PlaneGeometry(GLAS[0], GLAS[1]), binnenMat);
  binnen.position.z = -54.5;
  kozijn.add(binnen);
  const ruitAchter = new THREE.Mesh(ruit(-1.6), glasAchter);
  ruitAchter.position.z = -50;
  ruitAchter.renderOrder = 4;
  kozijn.add(ruitAchter);
  const ruitVoor = new THREE.Mesh(ruit(2.6), glasVoor);
  ruitVoor.position.z = -30;
  ruitVoor.renderOrder = 5;
  kozijn.add(ruitVoor);

  // de lagen van het losse stuk
  const lagen = {};
  const pStuk = pad(STUK_FOLIE, false);
  lagen.lijm = new Laag(pStuk, [mat.lijm, mat.lijm]);
  lagen.kleur = new Laag(pStuk, [mat.kleur, mat.kleur]);
  lagen.top = new Laag(pStuk, [mat.topVlak, mat.topRand]);
  const topGlans = new THREE.Mesh(lagen.top.geo, [mat.topSpiegel, mat.topSpiegel]);
  topGlans.frustumCulled = false;
  lagen.top.meshes.push(topGlans);
  lagen.lijm.mesh.renderOrder = 1; lagen.top.mesh.renderOrder = 2; topGlans.renderOrder = 3;
  lagen.kleur.mesh.castShadow = lagen.kleur.mesh.receiveShadow = true;
  lagen.lijm.mesh.castShadow = lagen.lijm.mesh.receiveShadow = true;
  for (const naam of LAGEN) for (const m of lagen[naam].meshes) { m.visible = false; kozijn.add(m); }

  // zachte schaduw onder het kozijn
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

  /* ----- labels bij de lagen ----- */
  const labelRenderer = new CSS2DRenderer({ element: sectie.querySelector('.folie-labels') });
  const labelTekst = [
    ['1', 'Toplaag', 'acryl (PMMA): uv-filter en nerf'],
    ['2', 'Kleurlaag', 'pvc met pigment of houtprint'],
    ['3', 'Lijmlaag', 'acrylaatlijm, hecht bij 18 tot 35 °C'],
    ['4', 'Kunststof profiel', 'pvc, gaat 50 tot 75 jaar mee'],
  ];
  const labels = labelTekst.map(([nr, naam, uitleg]) => {
    const el = document.createElement('div');
    el.className = 'folie-label';
    el.innerHTML = `<span class="folie-label-nr">${nr}</span><span><b>${naam}</b><small>${uitleg}</small></span>`;
    const obj = new CSS2DObject(el);
    obj.center.set(0, 0.5);
    kozijn.add(obj);
    return { el, obj };
  });

  /* ----- kleuren ----- */
  let nerf = null;
  const cache = new Map();
  const kleur = { kozijn: null, raam: null };
  const standaard = { kozijn: sectie.dataset.kozijn || 'ice-cream-b-46835', raam: sectie.dataset.raam || 'dark-green-6125' };

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

  async function zetKleur(deel, k) {
    if (!k) return;
    kleur[deel] = k;
    const tex = await maakKleur(k);
    if (kleur[deel] !== k) return;
    const m = folie[deel];
    m.map = tex; m.needsUpdate = true;
    m.roughness = helderheid(k.hex || '#777777') < 0.12 ? 0.5 : 0.56;
    if (deel === 'raam') { mat.kleur.map = tex; mat.kleur.needsUpdate = true; }
    if (deel === 'kozijn') dopMat.color.set(k.hex);
    vraagBeeld();
    sectie.dispatchEvent(new CustomEvent('folie:kleur', { detail: { ...kleur } }));
  }

  /* ----- de kiezer: eerst kies je het deel (kozijn of raam), dan de kleur ----- */
  const kiezer = sectie.querySelector('.kiezer');
  const kiezerNaam = sectie.querySelector('.kiezer-naam');
  const tabs = [...sectie.querySelectorAll('.kiezer-deel [data-deel]')];
  let actief = 'kozijn';
  const knoppen = [];
  function toonKeuze() {
    for (const { knop, k } of knoppen) knop.setAttribute('aria-pressed', kleur[actief] && kleur[actief].slug === k.slug ? 'true' : 'false');
    for (const t of tabs) t.setAttribute('aria-pressed', t.dataset.deel === actief ? 'true' : 'false');
    if (kiezer) kiezer.setAttribute('aria-label', actief === 'kozijn' ? 'Kleur van het kozijn' : 'Kleur van het raam');
  }
  if (kiezer && kleurenData.length) {
    for (const k of kleurenData) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'kiezer-knop' + (k.soort === 'decor' ? ' is-decor' : '') + (helderheid(k.hex || '#777') > 0.45 ? ' is-licht' : '');
      knop.style.setProperty('--kleur', k.hex || '#888');
      if (k.soort === 'decor' && k.bestand) knop.style.backgroundImage = `url("${k.bestand}")`;
      knop.setAttribute('aria-label', k.naam.split(' / ')[0] + (k.ral ? ', RAL ' + k.ral : ''));
      knop.addEventListener('click', () => { zetKleur(actief, k).then(toonKeuze); toonKeuze(); });
      kiezer.appendChild(knop);
      knoppen.push({ knop, k });
    }
    for (const t of tabs) t.addEventListener('click', () => { actief = t.dataset.deel; toonKeuze(); });
    const naam = k => k ? `${k.naam.split(' / ')[0]}${k.ral ? ' &middot; RAL ' + k.ral : (k.soort === 'decor' ? ' &middot; houtdecor' : '')}` : '';
    sectie.addEventListener('folie:kleur', e => {
      const d = e.detail;
      if (kiezerNaam) kiezerNaam.innerHTML = `<span><b>Kozijn</b> ${naam(d.kozijn)}</span><span><b>Raam</b> ${naam(d.raam)}</span>`;
      toonKeuze();
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
    const a = STANDEN[i], b = STANDEN[i + 1], uit = {};
    for (const k in a) {
      if (k === 'nadruk') continue;
      const [van, tot] = TIMING[k] || [0.2, 0.8];
      uit[k] = a[k] + (b[k] - a[k]) * glad(van, tot, t - i);
    }
    // nadruk per laag als vier gewichten
    const f = glad(0.2, 0.8, t - i);
    for (let n = 0; n < 4; n++) uit['n' + n] = (a.nadruk === n ? 1 : 0) * (1 - f) + (b.nadruk === n ? 1 : 0) * f;
    uit.nadrukIets = (a.nadruk >= 0 ? 1 : 0) * (1 - f) + (b.nadruk >= 0 ? 1 : 0) * f;
    return uit;
  }

  let stand = doelStand(voortgang());
  const tmp = new THREE.Vector3(), midden = new THREE.Vector3(), stukMidden = new THREE.Vector3(), hoekMidden = new THREE.Vector3();
  const oog = new THREE.Vector3(), zonRichting = new THREE.Vector3();

  function pasToe(s, tijd) {
    const rust = rustig.matches ? 0 : s.rust;
    draai.rotation.set(-s.kant, s.rotY + Math.sin(tijd * 0.35) * 0.045 * rust, 0, 'YXZ');
    draai.position.y = Math.sin(tijd * 0.7) * 7 * rust;
    draai.updateMatrixWorld(true);

    // het stuk folie van het raam: dicht of los
    const los = s.til > 0.5 || s.uit > 0.01;
    stukDicht.visible = !los;
    const dikte = 0.12 + 2.6 * Math.min(1, s.uit);
    const tussen = TUSSEN * s.uit;
    LAGEN.forEach((naam, i) => {
      const laag = lagen[naam];
      for (const m of laag.meshes) m.visible = los;
      if (!los) return;
      const extra = s['n' + (2 - i)] * 12;           // de laag met nadruk komt iets verder naar voren
      laag.zet(dikte, tussen * (i + 1) + dikte * i + extra, SCHUIF * s.uit * (i + 1), s.pel, s.til);
    });
    pvc.emissive.setScalar(0.05 * s.n3);
    // Zolang de lagen nog op elkaar liggen, ziet het losse stuk eruit als gewone folie; de
    // heldere toplaag (met de nerf) wordt pas zichtbaar als de lagen uit elkaar gaan.
    const apart = glad(0, 0.5, s.uit);
    mat.topVlak.opacity = 0.14 * apart;
    mat.topRand.opacity = 0.8 * apart;
    mat.topRand.emissiveIntensity = 0.32 + 0.35 * s.n0;
    mat.topSpiegel.envMapIntensity = (1.5 + 0.8 * s.n0) * apart;
    mat.kleur.bumpScale = 0.7 * (1 - apart);
    mat.kleur.clearcoat = 0.02 + 0.28 * (1 - apart);
    mat.topSpiegel.envMapRotation.y = 0.9 * Math.sin(tijd * 0.75);

    // verwering en herstel
    for (const deel of ['kozijn', 'raam']) {
      const { u, lengte: L } = zones[deel];
      u.uOud.value = Math.min(1, Math.max(0, s.oud));
      u.uWeg.value = s.eraf * 1.3 * L - 3;
      u.uSchoon.value = (s.eraf * 1.35 - 0.3) * L - 3;
      u.uNieuw.value = (s.erop * 1.15 - 0.05) * L - 3;
      u.uGlans.value = s.erop > 0.002 && s.erop < 0.998 ? 1 : 0;
    }

    schaduw.material.opacity = s.schaduw;
    schaduw.visible = s.schaduw > 0.01;

    // labels
    labels.forEach((lb, i) => {
      const laagIndex = 2 - i;                       // label 1 = toplaag
      let x, y, z;
      if (i < 3) {
        x = STUK[1] + SCHUIF * s.uit * (laagIndex + 1) + 6;
        y = -Bs + 40;
        z = -18 + tussen * (laagIndex + 1) + dikte * laagIndex + s.til + s['n' + i] * 12 + 3;
      } else {
        x = STUK[1] + 34; y = -Bs + 40; z = -20;
      }
      lb.obj.position.set(x, y, z);
      const zichtbaar = Math.max(0, Math.min(1, (s.labels - 0.25) / 0.75));
      lb.el.style.opacity = (zichtbaar * (0.45 + 0.55 * (s.nadrukIets < 0.5 ? 1 : s['n' + i]))).toFixed(3);
      lb.el.classList.toggle('is-actief', s['n' + i] > 0.5);
    });
    sectie.style.setProperty('--folie-uit', Math.min(1, s.uit).toFixed(3));

    // camera
    midden.set(0, 0, -35); kozijn.localToWorld(midden);
    stukMidden.set((STUK[0] + STUK[1]) / 2 + 30 * s.uit, -Bs + 38, -18 + 0.5 * s.til + 52 * s.uit); kozijn.localToWorld(stukMidden);
    hoekMidden.set(A - 175, -B + 135, -30); kozijn.localToWorld(hoekMidden);
    const doel = tmp.copy(midden).multiplyScalar(Math.max(0, 1 - s.focus - s.hoek))
      .addScaledVector(stukMidden, s.focus).addScaledVector(hoekMidden, s.hoek);
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
    camera.updateMatrixWorld();

    // de zon volgt waar we naar kijken, zodat de schaduwen scherp blijven
    const vak = THREE.MathUtils.lerp(2150, 700, Math.max(s.focus, s.hoek * 0.8));
    const sc_ = zon.shadow.camera;
    sc_.left = -vak / 2; sc_.right = vak / 2; sc_.top = vak / 2; sc_.bottom = -vak / 2;
    sc_.updateProjectionMatrix();
    zon.target.position.copy(doel);
    zonRichting.copy(ZON).lerp(ZON_LOS, s.focus).normalize();
    zon.position.copy(doel).addScaledVector(zonRichting, 3000);
    zon.target.updateMatrixWorld();

    // de kamer achter het glas
    binnen.updateMatrixWorld();
    binnenMat.uniforms.uOog.value.copy(binnen.worldToLocal(oog.copy(camera.position)));
    binnenMat.uniforms.uLicht.value = 1 - 0.45 * Math.min(1, s.kant / 1.4);
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
    // stilstaan als er niets beweegt (en er geen rustbeweging of glans op de toplaag is)
    const leeft = !rustig.matches && (stand.rust > 0.01 || stand.n0 > 0.15);
    if (beweging < 1e-3 && !leeft && !nodig) { loopt = false; return; }
    requestAnimationFrame(lus);
  }

  // het hoofdstuk waar je nu bent
  const hoofdstukken = [...sectie.querySelectorAll('.folie-hoofdstukken a')];
  function markeer() {
    const v = voortgang(), t = Math.round(v);
    sectie.classList.toggle('na-intro', v > 0.45);
    for (const a of hoofdstukken) {
      if (t >= +a.dataset.van && t <= +a.dataset.tot) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    }
  }
  markeer();
  new IntersectionObserver(([e]) => { zichtbaar = e.isIntersecting; if (zichtbaar) vraagBeeld(); }, { rootMargin: '100px' }).observe(sectie);
  window.addEventListener('scroll', () => { vraagBeeld(); markeer(); }, { passive: true });
  window.addEventListener('resize', kader);
  document.addEventListener('visibilitychange', vraagBeeld);
  new ResizeObserver(kader).observe(podium);

  // actieve stap markeren (voor de tekst)
  const stapObs = new IntersectionObserver(items => {
    for (const it of items) it.target.classList.toggle('is-actief', it.isIntersecting);
  }, { rootMargin: '-45% 0px -45% 0px' });
  stappen.forEach(s => stapObs.observe(s));

  /* ----- opstarten ----- */
  const vind = slug => kleurenData.find(x => x.slug === slug);
  laadBeeld('/images/houtnerf-textuur.webp').then(async img => {
    nerf = img;
    // reliëf: groeven waar de nerf loopt
    const cb = canvas(512, 512), gb = cb.getContext('2d');
    gb.fillStyle = '#fff'; gb.fillRect(0, 0, 512, 512);
    gb.drawImage(nerfLaag(nerf, '#000'), 0, 0);
    const nerfBump = textuur(cb, false, NERF_HERHAAL);
    for (const m of [folie.kozijn, folie.raam, mat.topSpiegel, mat.kleur]) { m.bumpMap = nerfBump; m.needsUpdate = true; }
    if (kleurenData.length) {
      await Promise.all([
        zetKleur('kozijn', vind(standaard.kozijn) || kleurenData[0]),
        zetKleur('raam', vind(standaard.raam) || kleurenData[0]),
      ]);
    }
    kader();
    pasToe(stand, 0);
    // alles één keer klaarzetten, zodat er later bij het scrollen niets hapert
    const verborgen = LAGEN.flatMap(n => lagen[n].meshes).filter(m => !m.visible);
    verborgen.forEach(m => { m.visible = true; });
    renderer.compile(scene, camera);
    verborgen.forEach(m => { m.visible = false; });
    pasToe(stand, 0);
    sectie.classList.add('folie-3d');
    vraagBeeld();
  }).catch(fout => { console.error(fout); sectie.classList.add('folie-geen3d'); });

  /* ----- alleen lokaal: beelden opslaan voor de site ----- */
  if (lokaal) {
    window.__folie = {
      async opname(pad, w, h, t, opties = {}) {
        if (opties.kozijn) await zetKleur('kozijn', vind(opties.kozijn));
        if (opties.raam) await zetKleur('raam', vind(opties.raam));
        const oud = [bw_, bh_];
        renderer.setPixelRatio(opties.dpr || 1);
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
      zetKleur: (deel, slug) => zetKleur(deel, vind(slug)),
      kleuren: kleurenData,
      renderer, glas: [glasVoor, glasAchter], binnen: binnenMat, scene,
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
