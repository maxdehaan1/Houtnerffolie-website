"""De deelafbeeldingen (WhatsApp, LinkedIn, Facebook): images/og/<pagina>.jpg, plus images/og-image.jpg
(dezelfde als de homepage).

Links op papier met een zachte gouden gloed: het kleine kopje in goud, de kop in donkerblauw met de
woorden met nadruk in goud, en onderaan het woordmerk; alles zoals op de site zelf (koppen in
Montserrat, sinds 17 november 2026). Rechts het beeld van de pagina: tools/og-beelden/<pagina>.webp
(600 x 630). De kopjes en koppen van de artikelen komen uit hun metadatablok (categorie en kop), die
van de andere pagina's staan hieronder in PAGINAS.

Gebruik: python3 tools/maak_og.py            (alle pagina's)
         python3 tools/maak_og.py home kleuren (alleen deze)
Een nieuwe pagina: zet een beeld van 600 x 630 in tools/og-beelden/ met de naam uit "ogImage".
Nodig: Chrome en cdp.py uit iwrap-project/beweging/tools (staat naast deze map).
"""
import base64, glob, html, json, os, shutil, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HIER)
sys.path.append(os.path.join(os.path.dirname(ROOT), "iwrap-project", "beweging", "tools"))
from cdp import Chrome

# Pagina's zonder categorie en kop in hun metadatablok
PAGINAS = {
    "home": ("Kozijnfolie uit het hoogste segment", "Renolit houtnerffolie, <em>laag voor laag</em>"),
    "renolit-folie": ("Renolit folie", "Wat is <em>Renolit folie?</em>"),
    "specificaties": ("Renolit Exofol PR", "De hoogste kwaliteit, <em>laag voor laag</em>"),
    "mogelijkheden": ("Mogelijkheden", "Wat kan er met <em>houtnerffolie?</em>"),
    "kleuren": ("Kleuren en decors", "Alle 94 <em>houtnerfkleuren</em>"),
    "artikelen": ("Kennisbank", "Artikelen over <em>houtnerffolie</em>"),
}

SJABLOON = """<!doctype html><html lang="nl"><head><meta charset="utf-8"><style>
  @font-face{font-family:"Montserrat-og";font-weight:100 900;src:url(../fonts/montserrat-latin-83a31c81.woff2) format("woff2");}
  :root{--navy:#13294b;--goud-inkt:#876430;--papier:#f7f6f3;--vlak:#eeece7;
    --goud-tekst:linear-gradient(100deg,#b8904e 0%%,#8a6731 50%%,#b08744 100%%);
    --kop:"Montserrat-og",Arial,sans-serif;
    --sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue","Segoe UI",Roboto,Arial,sans-serif;}
  html,body{margin:0;width:1200px;height:630px;overflow:hidden;}
  body{display:grid;grid-template-columns:600px 600px;background:var(--papier);font-family:var(--sans);
    -webkit-font-smoothing:antialiased;}
  .tekst{position:relative;padding:92px 40px 0 64px;
    background:radial-gradient(520px 520px at 240px -40px,rgba(211,187,140,.30),rgba(211,187,140,0)),var(--papier);}
  .kicker{font-family:var(--kop);font-weight:600;font-size:23px;line-height:1.3;letter-spacing:-.004em;
    color:var(--goud-inkt);margin:0 0 20px;}
  h1{font-family:var(--kop);font-weight:700;font-size:60px;line-height:1.08;letter-spacing:-.03em;
    color:var(--navy);margin:0;text-wrap:balance;}
  h1 em{font-style:normal;background:var(--goud-tekst);-webkit-background-clip:text;background-clip:text;
    color:transparent;-webkit-box-decoration-break:clone;box-decoration-break:clone;}
  .merk{position:absolute;left:64px;bottom:52px;display:flex;align-items:center;gap:14px;}
  .merk img{width:46px;height:46px;display:block;}
  .merk b{display:block;font-family:var(--kop);font-weight:700;font-size:24px;line-height:1.05;
    letter-spacing:-.022em;color:var(--navy);}
  .merk small{display:block;font-weight:500;font-size:16px;color:var(--goud-inkt);margin-top:4px;}
  .beeld{background:var(--vlak);}
  .beeld img{display:block;width:600px;height:630px;object-fit:cover;}
</style></head><body>
<div class="tekst">
  <p class="kicker">%(kicker)s</p>
  <h1>%(kop)s</h1>
  <div class="merk"><img src="../images/logo.svg" alt=""><span><b>Houtnerffolie</b><small>Alles over Renolit folie</small></span></div>
</div>
<div class="beeld"><img src="og-beelden/%(slug)s.webp" alt=""></div>
<script>
  // De kop zo groot als past: hooguit vier regels, geen woord breder dan de kolom, en geen kort
  // woordje alleen op een regel ("tot", "van"). Lukt dat laatste niet, dan de grootste die past.
  window.pas = async () => {
    await document.fonts.ready;
    const h = document.querySelector("h1"), woorden = [];
    (function splits(el) {
      for (const n of [...el.childNodes]) {
        if (n.nodeType !== 3) { splits(n); continue; }
        const stukken = document.createDocumentFragment();
        for (const t of n.data.split(/(\\s+)/)) {
          if (!t) continue;
          if (/^\\s+$/.test(t)) { stukken.append(t); continue; }
          const s = document.createElement("span"); s.textContent = t; woorden.push(s); stukken.append(s);
        }
        n.replaceWith(stukken);
      }
    })(h);
    const regels = () => {
      const r = new Map();
      for (const w of woorden) {
        const b = w.getBoundingClientRect(), k = Math.round(b.top), v = r.get(k) || [1e9, -1e9];
        r.set(k, [Math.min(v[0], b.left), Math.max(v[1], b.right)]);
      }
      return [...r.entries()].sort((a, b) => a[0] - b[0]).map(([, [l, rr]]) => rr - l);
    };
    const breed = h.clientWidth;
    let beste = null;
    for (let s = 60; s >= 42; s -= 2) {
      h.style.fontSize = s + "px";
      const r = regels();
      if (r.length > 4 || h.scrollWidth > h.clientWidth) continue;
      if (beste === null) beste = s;
      const middenOk = r.slice(0, -1).every((b) => b >= 0.3 * breed), eindOk = r[r.length - 1] >= 0.18 * breed;
      if (r.length === 1 || (middenOk && eindOk)) return s;
    }
    h.style.fontSize = (beste || 42) + "px";
    return beste || 42;
  };
</script>
</body></html>"""


def meta(pad):
    s = open(pad, encoding="utf-8").read()
    return json.loads(s[s.index("<!--") + 4:s.index("-->")])


def paginas():
    """(slug, kopje, kop) voor elke pagina met een eigen deelafbeelding."""
    uit = []
    for pad in sorted(glob.glob(os.path.join(ROOT, "src", "pages", "**", "*.html"), recursive=True)):
        m = meta(pad)
        og = m.get("ogImage", "")
        if not og.startswith("/images/og/"):
            continue
        slug = og[len("/images/og/"):-len(".jpg")]
        if m.get("type") == "artikel":
            uit.append((slug, m["categorie"], m["kop"]))
        elif slug in PAGINAS:
            uit.append((slug,) + PAGINAS[slug])
        else:
            sys.exit("Geen kopje en kop voor %s: zet hem in PAGINAS" % slug)
    return uit


def veilig(kop):
    """HTML-escapen, maar <em> laten staan."""
    return html.escape(kop, quote=False).replace("&lt;em&gt;", "<em>").replace("&lt;/em&gt;", "</em>")


def main():
    alleen = set(sys.argv[1:])
    lijst = [p for p in paginas() if not alleen or p[0] in alleen]
    c = Chrome(1200, 630)
    tmp = os.path.join(HIER, "_og.html")
    try:
        for slug, kicker, kop in lijst:
            if not os.path.exists(os.path.join(HIER, "og-beelden", slug + ".webp")):
                sys.exit("Geen beeld: tools/og-beelden/%s.webp" % slug)
            open(tmp, "w", encoding="utf-8").write(SJABLOON % {"kicker": html.escape(kicker), "kop": veilig(kop), "slug": slug})
            c.goto("file://" + tmp, wait=0.4)
            maat = c.js("window.pas()")
            if not c.js("document.fonts.check('700 40px Montserrat-og')"):
                sys.exit("Montserrat niet geladen")
            time.sleep(0.2)
            data = base64.b64decode(c.call("Page.captureScreenshot", {"format": "jpeg", "quality": 90})["data"])
            uit = os.path.join(ROOT, "images", "og", slug + ".jpg")
            open(uit, "wb").write(data)
            print("ok", os.path.relpath(uit, ROOT), "kop %dpx" % maat)
            if slug == "home":
                shutil.copyfile(uit, os.path.join(ROOT, "images", "og-image.jpg"))
                print("ok images/og-image.jpg")
    finally:
        c.close()
        if os.path.exists(tmp):
            os.remove(tmp)


if __name__ == "__main__":
    main()
