#!/usr/bin/env python3
"""Bouwt kleuren.html op uit stalen.json.

Draaien vanuit de projectmap:  python3 bouw-kleurenpagina.py

De kop, het menu en de voettekst worden uit index.html overgenomen, zodat beide
pagina's niet uit elkaar lopen. Pas dus stalen.json aan en draai dit script
opnieuw; bewerk kleuren.html niet met de hand.
"""
import colorsys
import html
import json
import pathlib

HIER = pathlib.Path(__file__).parent
POPULAIR_VOLGORDE = ["9001", "9010", "7016", "7021", "6009", "5011"]

# Onder deze waarde geldt een kleur als neutraal (wit/grijs/zwart). De maat is
# relatief aan de helderheid: bij donkere kleuren is het absolute kleurverschil
# klein terwijl de kleur wel degelijk gekleurd is. RAL 6009 komt bijvoorbeeld op
# 0,55 uit en hoort dus bij de groenen, niet bij de bijna-zwarte grijzen.
NEUTRAAL_GRENS = 0.28


def helderheid(hex_kleur):
    r, g, b = (int(hex_kleur[i:i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def sorteersleutel(staal):
    """Neutralen eerst van licht naar donker, daarna de kleuren op tint."""
    if not staal["hex"]:
        return (9, 0, 0)                      # stalen zonder foto achteraan
    r, g, b = (int(staal["hex"][i:i + 2], 16) for i in (1, 3, 5))
    tint, licht, _ = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if (max(r, g, b) - min(r, g, b)) / max(max(r, g, b), 1) < NEUTRAAL_GRENS:
        return (0, 0, -licht)
    return (1, round(tint * 24), -licht)


def label(staal):
    """RAL-code vooraan; het artikelnummer erachter als dat afwijkt."""
    ral, code = staal.get("ral"), staal.get("code")
    if ral and code and ral != code:
        return f"RAL {ral} · {code}"
    if ral:
        return f"RAL {ral}"
    return html.escape(code or "")


def kaart(staal, nerf_overlay, toon_badge=True):
    naam = html.escape(staal["naam"])
    tekst = label(staal)
    zoekwoorden = " ".join(filter(None, [
        staal["naam"], staal.get("code"), staal.get("ral"), tekst,
        "populair veelgekozen" if staal.get("populair") else "",
    ]))
    # de decors tonen hun eigen echte houtnerf; daar zou een overlay dubbelop zijn
    overlay = ""
    if nerf_overlay and staal["hex"]:
        overlay = " grain-dark" if helderheid(staal["hex"]) > 140 else " grain-light"
    if staal["bestand"]:
        vlak = (f'<img src="{staal["bestand"]}" alt="RENOLIT EXOFOL {naam}" width="260" height="260" '
                f'loading="lazy" decoding="async" style="background:{staal["hex"]}">')
    else:
        vlak = '<div class="staal-leeg">geen staalfoto beschikbaar</div>'
    badge = '<span class="staal-badge">Veelgekozen</span>' if (toon_badge and staal.get("populair")) else ""
    return (f'      <div class="staal" data-zoek="{html.escape(zoekwoorden.lower())}">{badge}\n'
            f'        <div class="staal-vlak{overlay}">{vlak}</div>\n'
            f'        <div class="staal-info"><div class="n">{naam}</div><div class="r">{tekst}</div></div>\n'
            f'      </div>')


def knip(bron, vanaf, tot):
    return bron[bron.index(vanaf):bron.index(tot) + len(tot)]


def main():
    stalen = json.loads((HIER / "stalen.json").read_text(encoding="utf-8"))
    kleuren = sorted((s for s in stalen if s["soort"] == "kleur"), key=sorteersleutel)
    decors = sorted((s for s in stalen if s["soort"] == "decor"), key=sorteersleutel)
    populair = sorted((s for s in stalen if s.get("populair")),
                      key=lambda s: POPULAIR_VOLGORDE.index(s["ral"]))

    index = (HIER / "index.html").read_text(encoding="utf-8")
    head = index[index.index('<link rel="icon"'):index.index('<script type="application/ld+json">')]
    kop = knip(index, '<header class="site">', "</header>")
    for van, naar in [("#kleuren", "index.html#kleuren"), ("#referenties", "index.html#referenties"),
                      ("#faq", "index.html#faq"), ('href="#top"', 'href="index.html"')]:
        kop = kop.replace(f'href="{van}"', f'href="{naar}"') if van.startswith("#") else kop.replace(van, naar)
    voet = knip(index, "<footer>", "</footer>")

    vervang = {
        "{NK}": str(len(kleuren)), "{ND}": str(len(decors)), "{NTOT}": str(len(stalen)),
        "{ZONDER}": str(sum(1 for s in stalen if not s["bestand"])),
        "{HEAD}": head, "{HEADER}": kop, "{FOOTER}": voet,
        "{KLEUREN}": "\n".join(kaart(s, True) for s in kleuren),
        "{DECORS}": "\n".join(kaart(s, False) for s in decors),
        "{POPULAIR}": "\n".join(kaart(s, True, toon_badge=False) for s in populair),
    }
    pagina = (HIER / "kleurenpagina-sjabloon.html").read_text(encoding="utf-8")
    for sleutel, waarde in vervang.items():
        pagina = pagina.replace(sleutel, waarde)
    (HIER / "kleuren.html").write_text(pagina, encoding="utf-8")
    print(f"kleuren.html gebouwd: {len(kleuren)} kleuren, {len(decors)} decors, "
          f"{len(populair)} veelgekozen, {vervang['{ZONDER}']} zonder staalfoto")


if __name__ == "__main__":
    main()
