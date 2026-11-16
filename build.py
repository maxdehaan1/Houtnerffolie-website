#!/usr/bin/env python3
"""
Bouwt houtnerffolie.nl uit src/pages/ naar de map van het project.

Elke bron in src/pages/ begint met een JSON-blok in een HTML-comment (de
paginagegevens), gevolgd door de inhoud. Alles wat op elke pagina hetzelfde is
(de <head>, de kop, de voet, de structured data, de doorverwijzing naar iWrap)
staat alleen hier. Dezelfde opzet als bij iwrap.nl en kozijnwrap.nl.

    python3 build.py

Wat er gebouwd wordt:
  - elke pagina in src/pages/ (artikelen in src/pages/artikelen/)
  - de kleurenpagina, met de stalen uit stalen.json
  - sitemap.xml en feed.xml (rss) met alle artikelen

Bewerk de gebouwde .html-bestanden in de projectmap niet met de hand: bij de
volgende build worden ze overschreven.
"""

import colorsys
import hashlib
import json
import math
import re
from datetime import date
from email.utils import format_datetime
from datetime import datetime, timezone
from html import escape
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src" / "pages"
SITE = "https://www.houtnerffolie.nl"
VANDAAG = date.today().isoformat()

NAV = [
    ("mogelijkheden", "/mogelijkheden", "Mogelijkheden"),
    ("specificaties", "/specificaties", "Specificaties"),
    ("kleuren", "/kleuren", "Kleuren"),
    ("artikelen", "/artikelen", "Artikelen"),
]

# iWrap voert het werk uit; deze site verwijst door. Alle links krijgen
# utm-codes, zodat in de statistieken van iwrap.nl te zien is waar bezoekers
# vandaan komen (utm_content zegt via welk onderdeel).
IWRAP = {
    "naam": "iWrap",
    "site": "https://iwrap.nl",
    "offerte": "https://iwrap.nl/contact/",
    "reviews_score": "4,9",
    "reviews_aantal": "84",
    "reviews_url": "https://search.google.com/local/reviews?placeid=ChIJyzBbwf-FxkcRIdeuLPGJt9U",
}


def naar_iwrap(onderdeel, pad=None):
    basis = IWRAP["offerte"] if pad is None else IWRAP["site"] + pad
    return f"{basis}?utm_source=houtnerffolie&utm_medium=referral&utm_content={onderdeel}"


FAVICON = (
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 34'%3E"
    "%3Crect width='34' height='34' rx='8' fill='%232f5a50'/%3E"
    "%3Cpath d='M3 10 Q11 6 17.5 9.2 T32 8.4' stroke='%23ffffff' stroke-width='2.1' fill='none' stroke-linecap='round'/%3E"
    "%3Cpath d='M3 17 Q11 13 17.5 16.2 T32 15.4' stroke='%23a3cdc2' stroke-width='2.1' fill='none' stroke-linecap='round'/%3E"
    "%3Cpath d='M3 24 Q11 20 17.5 23.2 T32 22.4' stroke='%23a3cdc2' stroke-width='2.1' fill='none' stroke-linecap='round' opacity='.6'/%3E"
    "%3C/svg%3E"
)

MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli",
           "augustus", "september", "oktober", "november", "december"]

PIJL = '<span class="pijl" aria-hidden="true">&rsaquo;</span>'
PIJL_UIT = ('<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 2.5h6v6M9.5 2.5 2.5 9.5" '
            'fill="none" stroke="currentColor" stroke-width="1.4"/></svg>')

# De kleuren in de 3D-uitleg op de homepage (volgorde = volgorde in de kiezer)
KIEZER = ["ice-cream-b-46835", "dark-green-6125", "white-9152", "anthracite-grey-7016", "black-grey-7021",
          "steel-blue-5150", "golden-oak", "irish-oak", "walnut-v", "mahogony"]
# Kleurwaarde voor het 3D-kozijn. De hex in stalen.json is het gemiddelde van de
# staalfoto; voor de RAL-kleuren ligt de referentiewaarde dichter bij het echte
# kozijn (de foto's zijn vaak donkerder en verzadigder).
KLEUR_3D = {"white-9152": "#f1ede3", "anthracite-grey-7016": "#383e42", "black-grey-7021": "#2b2e31",
            "dark-green-6125": "#2c3a2e", "steel-blue-5150": "#222c3a", "moss-green-6005": "#1f4236",
            "monumentengruen-9925": "#17261f"}
POPULAIR_VOLGORDE = ["9001", "9010", "7016", "7021", "6009", "5011"]
# Onder deze waarde geldt een kleur als neutraal (wit/grijs/zwart). Relatief aan de
# helderheid: RAL 6009 komt op 0,55 uit en hoort dus bij de groenen.
NEUTRAAL_GRENS = 0.28


# ---------- hulpjes ---------------------------------------------------------------

def datum_nl(iso):
    j, m, d = (int(x) for x in iso.split("-"))
    return f"{d} {MAANDEN[m - 1]} {j}"


def tekst_van(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html)).strip()


def leestijd(html):
    return max(2, math.ceil(len(tekst_van(html).split()) / 220))


def versie(*paden):
    h = hashlib.sha1()
    for p in paden:
        h.update((ROOT / p).read_bytes())
    return h.hexdigest()[:8]


def url_voor(slug):
    if slug == "index":
        return "/"
    if slug.endswith("/index"):
        return "/" + slug[:-len("/index")]
    return "/" + slug


def lees(pad):
    bron = pad.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--\s*(\{.*?\})\s*-->\s*", bron, re.S)
    if not m:
        raise SystemExit(f"{pad}: geen JSON-blok bovenaan")
    meta = json.loads(m.group(1))
    meta.setdefault("slug", str(pad.relative_to(SRC).with_suffix("")))
    return meta, bron[m.end():]


def ld(obj):
    return ('<script type="application/ld+json">'
            + json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
            + "</script>")


ORGANISATIE = {
    "@type": "Organization",
    "@id": IWRAP["site"] + "/#organisatie",
    "name": IWRAP["naam"],
    "url": IWRAP["site"],
    "logo": {"@type": "ImageObject", "url": SITE + "/images/logo.png", "width": 512, "height": 512},
}


def kruimel_ld(items):
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": naam, "item": SITE + url}
            for i, (naam, url) in enumerate(items)
        ],
    }


# ---------- stalen ----------------------------------------------------------------

def helderheid(hex_kleur):
    r, g, b = (int(hex_kleur[i:i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def sorteersleutel(staal):
    """Neutralen eerst van licht naar donker, daarna de kleuren op tint."""
    if not staal["hex"]:
        return (9, 0, 0)
    r, g, b = (int(staal["hex"][i:i + 2], 16) for i in (1, 3, 5))
    tint, licht, _ = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if (max(r, g, b) - min(r, g, b)) / max(max(r, g, b), 1) < NEUTRAAL_GRENS:
        return (0, 0, -licht)
    return (1, round(tint * 24), -licht)


def staal_label(staal):
    ral, code = staal.get("ral"), staal.get("code")
    if ral and code and ral != code:
        return f"RAL {ral} · {code}"
    if ral:
        return f"RAL {ral}"
    return code or ("houtdecor" if staal["soort"] == "decor" else "")


def staal_vlak(staal, groot=False):
    """Het vierkantje zelf. Effen kleuren krijgen de nerf als losse laag erover;
    decors en zelf opgebouwde stalen hebben hun eigen nerf al in de foto."""
    if not staal["bestand"]:
        return '<div class="staal-vlak geen-foto">geen staalfoto beschikbaar</div>'
    nerf = ""
    if staal["soort"] == "kleur" and staal["hex"] and not staal.get("eigen_staal"):
        nerf = " nerf-d" if helderheid(staal["hex"]) > 140 else " nerf-l"
    maat = 260
    return (f'<div class="staal-vlak{nerf}" style="--kleur:{staal["hex"]}">'
            f'<img src="/{staal["bestand"]}" alt="Renolit Exofol {escape(staal["naam"])}" '
            f'width="{maat}" height="{maat}" loading="lazy" decoding="async"></div>')


def staal_item(staal, zoek=True, knop=False):
    label = staal_label(staal)
    attrs = ' class="is-populair"' if staal.get("populair") and zoek else ""
    if zoek:
        woorden = " ".join(filter(None, [staal["naam"], staal.get("code"), staal.get("ral"), label,
                                         "populair veelgekozen" if staal.get("populair") else "",
                                         "decor hout" if staal["soort"] == "decor" else "effen"]))
        attrs += f' data-zoek="{escape(woorden.lower())}"'
    vlak = staal_vlak(staal)
    if knop:
        # op de kleurenpagina opent een klik op het staal de kleur op een kozijn in 3D
        vlak = (f'<button type="button" class="staal-knop" data-slug="{staal["slug"]}" '
                f'aria-label="Bekijk {escape(staal["naam"].split(" / ")[0])} op een kozijn">{vlak}'
                f'<span class="staal-3d" aria-hidden="true">3D</span></button>')
    return (f'<li{attrs}>{vlak}<b>{escape(staal["naam"])}</b>'
            f'<span>{escape(label)}</span></li>')


def stalenrij(body, stalen):
    """{{stalen:slug1,slug2}} in een tekst wordt een rij stalen uit stalen.json."""
    per_slug = {s["slug"]: s for s in stalen}
    def vervang(m):
        items = [per_slug[x.strip()] for x in m.group(1).split(",")]
        return '<ul class="stalenrij">' + "".join(staal_item(s, zoek=False) for s in items) + "</ul>"
    return re.sub(r"\{\{stalen:([^}]+)\}\}", vervang, body)


def laad_stalen():
    stalen = json.loads((ROOT / "stalen.json").read_text(encoding="utf-8"))
    kleuren = sorted((s for s in stalen if s["soort"] == "kleur"), key=sorteersleutel)
    decors = sorted((s for s in stalen if s["soort"] == "decor"), key=sorteersleutel)
    populair = sorted((s for s in stalen if s.get("populair")), key=lambda s: POPULAIR_VOLGORDE.index(s["ral"]))
    return stalen, kleuren, decors, populair


def alle_kleuren_json(stalen):
    """Alle stalen voor de 3D-weergave op de kleurenpagina."""
    data = [{
        "slug": s["slug"], "naam": s["naam"], "ral": s["ral"], "code": s.get("code"),
        "hex": KLEUR_3D.get(s["slug"], s["hex"] or "#888888"),
        "soort": s["soort"], "bestand": "/" + s["bestand"] if s["bestand"] else None,
    } for s in stalen]
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def kiezer_json(stalen):
    per_slug = {s["slug"]: s for s in stalen}
    data = [{
        "slug": k, "naam": per_slug[k]["naam"], "ral": per_slug[k]["ral"],
        "hex": KLEUR_3D.get(k, per_slug[k]["hex"]),
        "soort": per_slug[k]["soort"], "bestand": "/" + per_slug[k]["bestand"],
    } for k in KIEZER]
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


# ---------- vaste onderdelen --------------------------------------------------------

def render_kop(actief):
    huidig = ' aria-current="page"'
    links = "".join(
        f'<a href="{url}"{huidig if sleutel == actief else ""}>{naam}</a>'
        for sleutel, url, naam in NAV)
    return f"""<a class="overslaan" href="#inhoud">Naar de inhoud</a>
<header class="kop">
  <div class="wrap kop-in">
    <a class="woordmerk" href="/" aria-label="Houtnerffolie, naar de homepage"><b>Houtnerffolie</b><small>over Renolit-folie</small></a>
    <nav class="nav" aria-label="Hoofdmenu">{links}</nav>
    <a class="knop knop-klein knop-glans" href="{naar_iwrap('menu')}">Laten herstellen</a>
  </div>
</header>"""


def render_uitvoering(onderdeel="cta"):
    return f"""<section class="uitvoering" aria-labelledby="uitvoering-kop">
  <div class="wrap">
    <div>
      <p class="kicker">Laten uitvoeren</p>
      <h2 id="uitvoering-kop">Nieuwe folie op je kozijnen?</h2>
      <p>Deze site legt uit hoe de folie werkt. Het werk zelf doet iWrap, het bedrijf achter deze site: herstel van kunststof kozijnen, draairamen, schuifpuien en deuren, door heel Nederland. Tien jaar fabrieksgarantie op de folie, vijf jaar op de montage.</p>
    </div>
    <div>
      <p>Stuur een paar foto's, dan krijg je een vaste prijs.</p>
      <a class="knop knop-glans" href="{naar_iwrap(onderdeel)}">Offerte aanvragen bij iWrap {PIJL_UIT}</a><br>
      <a class="reviews" href="{IWRAP['reviews_url']}" target="_blank" rel="noopener"><span class="sterren" aria-hidden="true">★★★★★</span> <b data-rv="score">{IWRAP['reviews_score']}</b> uit <span data-rv="aantal">{IWRAP['reviews_aantal']}</span> Google-reviews &middot; sinds 2014 duizenden kozijnen hersteld</a>
    </div>
  </div>
</section>"""


def render_voet():
    jaar = date.today().year
    return f"""<footer class="voet">
  <div class="wrap voet-in">
    <div>
      <a class="woordmerk" href="/"><b>Houtnerffolie</b></a>
      <p>Een kennisbank over Renolit houtnerffolie op kunststof kozijnen: hoe de folie is opgebouwd, welke kleuren er zijn en hoe je hem onderhoudt. Deze site verkoopt niets; wie het werk wil laten doen, verwijzen we door naar iWrap.</p>
    </div>
    <div>
      <h2>Onderwerpen</h2>
      <ul>
        <li><a href="/#opbouw">De opbouw van de folie</a></li>
        <li><a href="/mogelijkheden">Mogelijkheden</a></li>
        <li><a href="/specificaties">Specificaties</a></li>
        <li><a href="/kleuren">Alle kleuren</a></li>
        <li><a href="/artikelen">Artikelen</a></li>
        <li><a href="/#vragen">Veelgestelde vragen</a></li>
      </ul>
    </div>
    <div>
      <h2>Uitvoering</h2>
      <ul>
        <li><a href="{naar_iwrap('footer', '/')}">iWrap</a></li>
        <li><a href="{naar_iwrap('footer')}">Offerte aanvragen</a></li>
        <li><a href="/feed.xml">Rss-feed</a></li>
      </ul>
    </div>
    <p class="voet-klein"><span>&copy; {jaar} houtnerffolie.nl &middot; onderdeel van iWrap</span><span>Geen cookies; bezoek wordt alleen anoniem geteld &middot; <a href="https://iwrap.nl/privacy">privacy</a></span></p>
  </div>
</footer>"""


REVIEWS_SCRIPT = """<script>
(function(){
  var velden = document.querySelectorAll('[data-rv]');
  if (!velden.length || !window.fetch) return;
  function zet(d){ velden.forEach(function(v){ v.textContent = v.getAttribute('data-rv') === 'score' ? d.score_tekst : String(d.aantal); }); }
  var bronnen = ['https://iwrap.nl/api/reviews', 'https://iwrap-website.vercel.app/api/reviews'];
  (function probeer(i){
    if (i >= bronnen.length) return;
    fetch(bronnen[i]).then(function(r){ if (!r.ok) throw r; return r.json(); })
      .then(function(d){ if (!d || !d.aantal) throw d; zet(d); })
      .catch(function(){ probeer(i + 1); });
  })(0);
})();
</script>"""

ANALYTICS = '<script defer src="/_vercel/insights/script.js"></script>'

IMPORTMAP = """<script type="importmap">{"imports":{"three":"/js/vendor/three-0.187.0/three.module.js","three/addons/":"/js/vendor/three-0.187.0/addons/"}}</script>"""
THREE_HEAD = IMPORTMAP + """
<link rel="modulepreload" href="/js/vendor/three-0.187.0/three.core.js">
<link rel="modulepreload" href="/js/vendor/three-0.187.0/three.module.js">
<link rel="modulepreload" href="/js/folie3d.js">"""


def render_head(meta, ver, jsonld, extra=""):
    url = SITE + url_voor(meta["slug"])
    beeld = meta.get("ogImage", "/images/og-image.jpg")
    og_type = meta.get("ogType", "website")
    artikel = ""
    if og_type == "article":
        artikel = (f'\n<meta property="article:published_time" content="{meta["datum"]}">'
                   f'\n<meta property="article:modified_time" content="{meta.get("bijgewerkt", meta["datum"])}">'
                   f'\n<meta property="article:section" content="{escape(meta.get("categorie", ""))}">')
    robots = "noindex" if meta.get("noindex") else "index, follow, max-image-preview:large"
    return f"""<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(meta["title"])}</title>
<meta name="description" content="{escape(meta["description"])}">
<link rel="canonical" href="{url}">
<meta name="robots" content="{robots}">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="{og_type}">
<meta property="og:locale" content="nl_NL">
<meta property="og:site_name" content="Houtnerffolie">
<meta property="og:title" content="{escape(meta.get("ogTitle", meta["title"]))}">
<meta property="og:description" content="{escape(meta.get("ogDescription", meta["description"]))}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}{beeld}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">{artikel}
<link rel="icon" type="image/svg+xml" href="{FAVICON}">
<link rel="alternate" type="application/rss+xml" title="Houtnerffolie: artikelen" href="/feed.xml">
<link rel="stylesheet" href="/css/site.css?v={ver}">
<script>document.documentElement.classList.add('js')</script>
{extra}{"".join(ld(x) for x in jsonld)}
</head>"""


def pagina(meta, ver, jsonld, inhoud, actief="", extra_head="", scripts="", cta=True):
    delen = [render_head(meta, ver, jsonld, extra_head), f'<body class="{meta.get("bodyClass", "")}">',
             render_kop(actief), inhoud]
    if cta:
        delen.append(render_uitvoering(meta.get("ctaOnderdeel", "cta")))
    delen.append(render_voet())
    if cta:
        delen.append(REVIEWS_SCRIPT)
    if scripts:
        delen.append(scripts)
    delen.append(ANALYTICS)
    delen.append("</body>\n</html>\n")
    return "\n".join(delen)


# ---------- artikelen ---------------------------------------------------------------

def artikel_kaart_lijst(a, nr=None):
    nummer = f'<span class="nr">{nr:02d}</span>' if nr is not None else '<span class="nr"></span>'
    return (f'<li><a href="{url_voor(a["slug"])}">{nummer}<h3>{a["kop_tekst"]}</h3>'
            f'<p class="meta"><span>{escape(a["categorie"])}</span><span>{a["leestijd"]} min lezen</span></p></a></li>')


def render_artikelen_home(artikelen):
    uit = next((a for a in artikelen if a.get("uitgelicht")), artikelen[0])
    rest = [a for a in artikelen if a is not uit][:5]
    lijst = "".join(artikel_kaart_lijst(a, i + 1) for i, a in enumerate(rest))
    return f"""<div class="artikelen">
  <article class="uitgelicht">
    <a href="{url_voor(uit["slug"])}">
      <figure><img src="{uit["beeld"]}" alt="{escape(uit["beeldAlt"])}" width="1600" height="1000" loading="lazy" decoding="async"></figure>
      <p class="kicker"><span>{escape(uit["categorie"])}</span><span>{uit["leestijd"]} min lezen</span></p>
      <h3>{uit["kop_tekst"]}</h3>
      <p>{escape(uit["intro"])}</p>
    </a>
  </article>
  <ol class="lijst" aria-label="Meer artikelen">{lijst}</ol>
</div>"""


def render_archief(artikelen):
    items = []
    for a in artikelen:
        items.append(f"""<li><a href="{url_voor(a["slug"])}">
  <figure><img src="{a["beeld"]}" alt="" width="1600" height="1000" loading="lazy" decoding="async"></figure>
  <div><h2>{a["kop_tekst"]}</h2><p>{escape(a["intro"])}</p></div>
  <p class="meta"><span>{escape(a["categorie"])}</span><span>{a["leestijd"]} min</span></p>
</a></li>""")
    return '<ol class="archief">' + "".join(items) + "</ol>"


def render_artikel(meta, body, artikelen, ver):
    url = url_voor(meta["slug"])
    bronnen = ""
    if meta.get("bronnen"):
        bronnen = ('<aside class="bronnen"><h2>Bronnen</h2><ol>'
                   + "".join(f"<li>{b}</li>" for b in meta["bronnen"]) + "</ol></aside>")
    verder_lijst = [a for a in artikelen if a["slug"] in meta.get("verder", [])]
    verder_lijst += [a for a in artikelen if a["slug"] != meta["slug"] and a not in verder_lijst]
    verder = "".join(artikel_kaart_lijst(a) for a in verder_lijst[:3])
    inhoud = f"""<main id="inhoud">
<article>
  <header class="artikel-kop">
    <div class="wrap">
      <nav class="kruimel" aria-label="Kruimelpad"><ol><li><a href="/">Home</a></li><li><a href="/artikelen">Artikelen</a></li><li aria-current="page">{escape(meta["categorie"])}</li></ol></nav>
      <p class="kicker"><span>{escape(meta["categorie"])}</span></p>
      <h1>{meta["kop"]}</h1>
      <p class="standfirst">{escape(meta["intro"])}</p>
      <p class="byline meta"><span>Door <a href="{naar_iwrap('artikel-auteur', '/')}">iWrap</a></span><span><time datetime="{meta["datum"]}">{datum_nl(meta["datum"])}</time></span><span>{meta["leestijd"]} min lezen</span></p>
    </div>
  </header>
  <figure class="artikel-beeld">
    <img src="{meta["beeld"]}" alt="{escape(meta["beeldAlt"])}" width="1600" height="1000" fetchpriority="high" decoding="async">
    {f'<figcaption>{meta["bijschrift"]}</figcaption>' if meta.get("bijschrift") else ""}
  </figure>
  <div class="tekst">
{body.strip()}
{bronnen}
  </div>
</article>
<section class="sectie" aria-labelledby="verder-kop">
  <div class="wrap verder">
    <h2 id="verder-kop">Verder lezen</h2>
    <ul class="lijst">{verder}</ul>
  </div>
</section>
</main>"""
    jsonld = [
        {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": tekst_van(meta["kop"])[:110],
            "description": meta["description"],
            "image": [SITE + meta["beeld"], SITE + meta["ogImage"]],
            "datePublished": meta["datum"],
            "dateModified": meta.get("bijgewerkt", meta["datum"]),
            "inLanguage": "nl-NL",
            "articleSection": meta["categorie"],
            "wordCount": len(tekst_van(body).split()),
            "mainEntityOfPage": SITE + url,
            "author": {"@type": "Organization", "name": IWRAP["naam"], "url": IWRAP["site"]},
            "publisher": ORGANISATIE,
            "isPartOf": {"@id": SITE + "/#website"},
        },
        kruimel_ld([("Home", "/"), ("Artikelen", "/artikelen"), (tekst_van(meta["kop"]), url)]),
    ]
    meta.setdefault("ctaOnderdeel", "artikel")
    return pagina(meta, ver, jsonld, inhoud, actief="artikelen")


# ---------- vragen (FAQ) ------------------------------------------------------------

def vragen_ld(body):
    paren = re.findall(r'<details class="vraag"[^>]*>\s*<summary>(.*?)</summary>\s*<div class="vraag-antwoord">(.*?)</div>\s*</details>', body, re.S)
    if not paren:
        return None
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": tekst_van(v),
             "acceptedAnswer": {"@type": "Answer", "text": tekst_van(a)}}
            for v, a in paren
        ],
    }


# ---------- sitemap en feed ---------------------------------------------------------

def schrijf_sitemap(paginas):
    regels = ['<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for meta in paginas:
        if meta.get("noindex"):
            continue
        regels.append(f"  <url><loc>{SITE}{url_voor(meta['slug'])}</loc>"
                      f"<lastmod>{meta.get('bijgewerkt', meta.get('datum', VANDAAG))}</lastmod></url>")
    regels.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(regels) + "\n", encoding="utf-8")


def schrijf_feed(artikelen):
    def rfc822(iso):
        j, m, d = (int(x) for x in iso.split("-"))
        return format_datetime(datetime(j, m, d, 8, 0, tzinfo=timezone.utc))
    items = []
    for a in artikelen:
        url = SITE + url_voor(a["slug"])
        items.append(f"""  <item>
    <title>{escape(tekst_van(a["kop"]))}</title>
    <link>{url}</link>
    <guid isPermaLink="true">{url}</guid>
    <pubDate>{rfc822(a["datum"])}</pubDate>
    <category>{escape(a["categorie"])}</category>
    <description>{escape(a["intro"])}</description>
  </item>""")
    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Houtnerffolie: artikelen</title>
  <link>{SITE}/artikelen</link>
  <atom:link href="{SITE}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Artikelen over Renolit houtnerffolie op kunststof kozijnen: opbouw, kleuren, decors en onderhoud.</description>
  <language>nl-nl</language>
{chr(10).join(items)}
</channel>
</rss>
"""
    (ROOT / "feed.xml").write_text(feed, encoding="utf-8")


# ---------- bouwen ------------------------------------------------------------------

def bouw():
    ver = versie("css/site.css", "js/folie3d.js", "js/site.js")
    stalen, kleuren, decors, populair = laad_stalen()

    bronnen = sorted(SRC.rglob("*.html"))
    paginas = [(lees(p)) for p in bronnen]

    # Artikelen eerst verzamelen: de homepage en het overzicht tonen ze.
    artikelen = []
    paginas = [(meta, stalenrij(body, stalen)) for meta, body in paginas]
    for meta, body in paginas:
        if meta.get("type") == "artikel":
            meta["leestijd"] = leestijd(body)
            meta["kop_tekst"] = meta["kop"]
            artikelen.append(meta)
    artikelen.sort(key=lambda a: (a.get("volgorde", 99), a["slug"]))

    gebouwd = []
    for meta, body in paginas:
        soort = meta.get("type", "pagina")
        slug = meta["slug"]
        if soort == "artikel":
            html = render_artikel(meta, body, artikelen, ver)
        else:
            vervang = {
                "{{artikelen}}": render_artikelen_home(artikelen) if artikelen else "",
                "{{archief}}": render_archief(artikelen),
                "{{kleurstrook}}": '<ul class="kleurstrook">' + "".join(staal_item(s, zoek=False) for s in populair) + "</ul>",
                "{{folie-kleuren}}": kiezer_json(stalen),
                "{{stalen-populair}}": "".join(staal_item(s, zoek=False, knop=True) for s in populair),
                "{{stalen-kleuren}}": "".join(staal_item(s, knop=True) for s in kleuren),
                "{{stalen-decors}}": "".join(staal_item(s, knop=True) for s in decors),
                "{{folie-kleuren-alle}}": alle_kleuren_json(stalen),
                "{{aantal-totaal}}": str(len(stalen)),
                "{{aantal-kleuren}}": str(len(kleuren)),
                "{{aantal-decors}}": str(len(decors)),
                "{{aantal-zonder}}": str(sum(1 for s in stalen if not s["bestand"])),
                "{{aantal-artikelen}}": str(len(artikelen)),
                "{{offerte}}": naar_iwrap("tekst"),
                "{{iwrap-werkwijze}}": naar_iwrap("uitleg", "/werkwijze"),
            }
            for k, v in vervang.items():
                body = body.replace(k, v)
            jsonld = []
            extra = ""
            scripts = ""
            actief = meta.get("actief", "")
            if slug == "index":
                jsonld.append({"@context": "https://schema.org", "@type": "WebSite", "@id": SITE + "/#website",
                               "name": "Houtnerffolie", "url": SITE + "/", "inLanguage": "nl-NL",
                               "description": meta["description"], "publisher": ORGANISATIE})
                extra = THREE_HEAD + "\n"
                scripts = '<script type="module" src="/js/folie3d.js"></script>'
            elif slug == "kleuren":
                extra = IMPORTMAP + "\n"
            faq = vragen_ld(body)
            if faq:
                jsonld.append(faq)
            if meta.get("kruimel"):
                jsonld.append(kruimel_ld([("Home", "/")] + [tuple(x) for x in meta["kruimel"]]))
            if meta.get("siteScript"):
                scripts += f'\n<script defer src="/js/site.js?v={ver}"></script>'
            html = pagina(meta, ver, jsonld, f'<main id="inhoud">\n{body.strip()}\n</main>',
                          actief=actief, extra_head=extra, scripts=scripts, cta=meta.get("cta", True))
        doel = ROOT / (slug + ".html")
        doel.parent.mkdir(parents=True, exist_ok=True)
        doel.write_text(html, encoding="utf-8")
        gebouwd.append(meta)

    schrijf_sitemap(sorted(gebouwd, key=lambda m: (m["slug"] != "index", m["slug"])))
    schrijf_feed(artikelen)
    print(f"{len(gebouwd)} pagina's gebouwd, waarvan {len(artikelen)} artikelen; "
          f"kleurenpagina met {len(kleuren)} kleuren en {len(decors)} decors")


if __name__ == "__main__":
    bouw()
