# houtnerffolie.nl

Kennisbank over Renolit houtnerffolie op kunststof kozijnen: hoe de folie is opgebouwd,
welke kleuren er zijn, artikelen over kleur, decors en onderhoud, praktijkvoorbeelden en
veelgestelde vragen.

**Positionering:** een kennisbron, geen tweede aanbieder. De site verkoopt niets en doet
geen offertes; wie het werk wil laten uitvoeren, wordt doorverwezen naar iwrap.nl. Alle
links daarheen hebben utm-codes (`utm_source=houtnerffolie`), zodat in de statistieken van
iwrap.nl te zien is hoeveel verkeer deze site oplevert en via welk onderdeel
(`utm_content=menu`, `cta`, `artikel`, `footer`, `referenties`).

## Teksten aanpassen

Alle pagina's worden gebouwd uit `src/pages/`. Pas daar de tekst aan en draai daarna:

```
python3 build.py
```

Bewerk de gebouwde `.html`-bestanden in de projectmap niet met de hand: die worden bij de
volgende build overschreven.

Elke bron begint met een JSON-blok in een HTML-comment met de paginagegevens (titel,
beschrijving, deelafbeelding), gevolgd door de inhoud. Kop, menu, voet, structured data,
het offerteblok van iWrap, de sitemap en de rss-feed maakt `build.py` zelf.

```
src/pages/index.html            Homepage: de 3D-uitleg, artikelen, kleuren, praktijk, vragen
src/pages/kleuren.html          Kleurenpagina (de stalen komen uit stalen.json)
src/pages/artikelen/index.html  Overzicht van alle artikelen
src/pages/artikelen/*.html      De artikelen zelf
src/pages/404.html              Pagina niet gevonden
```

### Een artikel toevoegen

Kopieer een bestaand artikel in `src/pages/artikelen/` en pas het JSON-blok aan:

- `kop` is de grote titel (een deel mag cursief met `<em>`), `title` en `description`
  zijn voor Google (titel liefst onder de 60 tekens, beschrijving onder de 160)
- `intro` is de inleiding onder de titel
- `beeld` (1600x1000) en `ogImage` (1200x630, voor delen op social media)
- `volgorde` bepaalt de plek in de lijsten; `"uitgelicht": true` zet een artikel groot
  op de homepage
- `verder` zijn de artikelen die onderaan als "Verder lezen" staan

Met `{{stalen:slug1,slug2}}` in de tekst komt er een rij stalen uit `stalen.json` in het
artikel, met de juiste naam en RAL-code.

De leestijd, de datumweergave, de structured data (BlogPosting en kruimelpad) en de
vermelding in sitemap en feed gaan vanzelf.

### Veelgestelde vragen

De vragen staan als `<details class="vraag">`-blokken in `src/pages/index.html`. De
structured data voor Google (FAQPage) maakt `build.py` uit die zichtbare tekst, dus die
kunnen niet meer uit elkaar lopen.

### Kleuren

`stalen.json` bevat per staal de naam, RAL-code, het artikelnummer, de kleurwaarde, of de
kleur veelgekozen is en het bestand van de staalfoto. `build.py` sorteert de stalen op
kleurverwantschap, zet de RAL-codes en markeert de veelgekozen kleuren, op de
kleurenpagina en in de kleurenstrook op de homepage.

De stalen komen van de RENOLIT eShop en worden lokaal gehost, met bronvermelding op de
pagina. Van een paar stalen bestaat geen bruikbare foto; die tonen een placeholder. Effen
kleuren krijgen de nerf (`images/houtnerf-textuur.webp`) als losse laag erover; decors en
het zelf opgebouwde crèmewit (`eigen_staal`) hebben hun nerf al in de foto.

## De 3D-uitleg op de homepage

`js/folie3d.js` tekent een crèmewit kunststof kozijn (RAL 9001) met een dennengroen draairaam
(RAL 6009), de combinatie die je in Nederland het vaakst ziet. De uitleg heeft drie
hoofdstukken (rechtsboven in beeld aan te klikken):

1. **Opbouw** (stap 1 tot 5): een stuk folie komt los van de onderdorpel van het raam en valt
   uiteen in de heldere toplaag (acryl, met de nerf erin), de kleurlaag en de lijmlaag, boven
   het kale profiel. De lagen werpen schaduw op elkaar; de labels noemen per laag het
   materiaal en wat de laag doet.
2. **Kleur** (stap 6): de bezoeker kiest eerst kozijn of raam en dan een kleur.
3. **Levensduur** (stap 7 tot 9): de folie verweert zoals in de 3D-animatie op iwrap.nl
   (krijtig, gebarsten in eilandjes met opgekrulde randen), daarna gaat de oude folie eraf
   (eerst blijft er lijm achter, dan kaal kunststof) en komt er een nieuwe folie op. Het
   hoe en waarom van het werk zelf staat op iwrap.nl; hier staat alleen wat er met de folie
   gebeurt, met een link naar de werkwijze van iWrap.

Details:

- **Glas:** dubbel glas met een afstandhouder, twee ruiten die de lucht, bomen en gevels
  aan de overkant weerspiegelen (iets bol, zoals echte isolatieruiten), en daarachter een
  kamer met diepte. De weerspiegeling is een getekende omgeving in `lucht()`, de kamer zit
  in `binnenMateriaal()`.
- **Standen:** bovenin het script (`STANDEN`); `TIMING` bepaalt wanneer binnen een overgang
  iets gebeurt (de verwering komt pas als de camera er is). Het aantal standen is gelijk aan
  het aantal stappen in `src/pages/index.html`.
- **Kleuren:** de beginkleuren staan in `src/pages/index.html` (`data-kozijn` en `data-raam`
  op de sectie), de kleuren in de kiezer in `build.py` (`KIEZER`). Voor de RAL-kleuren
  gebruikt het model een referentiekleur (`KLEUR_3D`), omdat de gemiddelde kleur van de
  staalfoto vaak te donker is.
- **Verwering en herstel:** in de shader `VERWEER_MAP` (overgenomen uit `oudeFolie` in de
  3D-animatie van iwrap.nl). Het herstel loopt vanaf de hoek rechtsonder over het kozijn.
- Gebouwd met three.js 0.187.0, zelf gehost in `js/vendor/three-0.187.0/` (geen verzoek
  naar een externe server).
- Zonder WebGL of JavaScript blijft `images/folie-kozijn.webp` staan en is alle tekst
  gewoon leesbaar. Het beeld draait alleen als het in beeld is; bij "beweging beperken" in
  het besturingssysteem staat de rustbeweging uit.

De startafbeelding, het artikelbeeld van "Wat elke laag doet" en de deelafbeeldingen zijn
renders uit hetzelfde model. Op een lokale server (`localhost`) heeft het script een
hulpfunctie `window.__folie.opname(pad, breedte, hoogte, stand, { kozijn, raam })` om nieuwe
renders op te slaan; online doet die niets.

## Huisstijl

- **Opzet:** als een vakblad. Papier, inkt en één accentkleur, lijnen in plaats van
  kaders en schaduwen. Bewust geen glimmende "app"-uitstraling.
- **Letters:** Newsreader voor koppen en lopende tekst, Schibsted Grotesk voor labels,
  knoppen en bijschriften. Beide zelf gehost in `fonts/` (`css/fonts.css`).
- **Kleuren:** papier `#f4f0e7`, inkt `#1b1d1a`, accent dennengroen `#26392d` (RAL 6009),
  hout `#8b5a2b` voor kleine accenten. Alles staat als variabelen bovenin `css/site.css`.

## Structuur

```
build.py                Bouwt de site uit src/pages/ en stalen.json
src/pages/              De bronnen (hier pas je teksten aan)
stalen.json             Alle stalen
css/site.css            Alle styling
css/fonts.css           De zelf gehoste lettertypes
js/folie3d.js           De 3D-uitleg op de homepage
js/site.js              Zoeken op de kleurenpagina
js/vendor/three-*/      three.js (MIT-licentie)
images/artikelen/       Artikelbeelden (1600x1000)
images/og/              Deelafbeeldingen (1200x630)
images/stalen/          Staalfoto's (RENOLIT)
images/projecten/       Praktijkvoorbeelden, alleen projecten met Renolit houtnerffolie
                        (niet met facadefilm)
images/houtnerf-textuur.webp  De nerf, als laag over de stalen en in het 3D-model
images/ral9001-textuur.jpg    Bron van het zelf opgebouwde crèmewit-staal
vercel.json             Schone adressen (/kleuren in plaats van /kleuren.html), cache
```

Gebouwd en meegecommit: `index.html`, `kleuren.html`, `404.html`, `artikelen/`,
`sitemap.xml`, `feed.xml`. Vercel serveert de map zoals hij is; er draait daar geen build.

## Aandachtspunten

- **Feitelijke claims.** Getallen op de site (tien jaar fabrieksgarantie op de folie, vijf
  jaar op de montage, 95% uv-absorptie, 18 tot 35 °C, profiel 50 tot 75 jaar, folie
  vijftien tot vijfentwintig jaar, seizoen maart tot november) zijn gecontroleerd en staan
  ook op iwrap.nl en kozijnwrap.nl. Wijzig je er één, wijzig ze dan op alle drie.
- **Geen overlap met de andere sites.** kozijnwrap.nl heeft al artikelen over folie die
  loslaat, verkleuring, schilderen, kosten en RAL 7016. Deze site gaat over de folie zelf:
  opbouw, kleuren, decors, structuur en onderhoud.
- **Zelf doen** blijft klein: één vraag, laat in de lijst.

## Samenwerking met iwrap.nl

- **iWrap doet kozijnen, draairamen, schuifpuien en deuren**, geen gevels of
  gevelbekleding. De folie zelf wordt wel op gevels gebruikt, dus in de uitleg over de
  folie mag "gevels" staan; bij wat iWrap doet niet.
- **De knoppen naar iWrap** gaan naar `iwrap.nl/contact/`. Na de overstap stuurt de
  nieuwe iwrap.nl deze links (aan de utm-codes herkend) door naar het offerteformulier,
  met "houtnerffolie.nl" als herkomst. Die doorverwijzing staat in `vercel.json` van iwrap.nl.
- **Het Google-cijfer van iWrap** in het offerteblok is een reserve; een klein script haalt
  de live stand op bij `iwrap.nl/api/reviews` (tot de overstap:
  `iwrap-website.vercel.app/api/reviews`).
- De praktijkvoorbeelden linken naar `iwrap.nl/voorbeelden`.

## Openstaand

- Gebruik van RENOLIT-beeldmateriaal nog even afstemmen met de contactpersoon daar
- Google Search Console koppelen en de sitemap aanmelden (staat in
  `../iwrap-project/LIVEGANG.md`, stap 5); na de overstap naar het nieuwe ontwerp ook de
  nieuwe adressen (`/artikelen/...`) laten indexeren
- three.js is nu niet verkleind (gzip ongeveer 400 kB); verkleinen met esbuild scheelt
  ongeveer de helft
