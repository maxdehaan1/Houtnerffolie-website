# houtnerffolie.nl

Kennisbank over Renolit folie (RENOLIT EXOFOL) en houtnerffolie op kunststof kozijnen: wat
Renolit folie is, hoe de folie is opgebouwd, de specificaties, welke kleuren er zijn,
artikelen over kleur, decors en onderhoud, en veelgestelde vragen. Renolit folie is waar
alles om draait: de site moet gevonden worden op "Renolit folie" en "houtnerffolie", in
Google en in AI-zoekmachines.

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
src/pages/index.html            Homepage: de 3D-uitleg, wat is Renolit folie, tegels,
                                artikelen, kleuren, vragen
src/pages/renolit-folie.html    Wat is Renolit folie? De hoofdpagina voor dat zoekwoord
src/pages/specificaties.html    De specificaties van de folie (Renolit Exofol PR)
src/pages/mogelijkheden.html    Wat er kan met Renolit folie
src/pages/kleuren.html          Kleurenpagina (de stalen komen uit stalen.json); een klik op een
                                staal toont de kleur in 3D op een kozijn
src/pages/artikelen/index.html  Overzicht van alle artikelen
src/pages/artikelen/*.html      De artikelen zelf
src/pages/404.html              Pagina niet gevonden
```

### Een artikel toevoegen

Kopieer een bestaand artikel in `src/pages/artikelen/` en pas het JSON-blok aan:

- `kop` is de grote titel (een deel mag cursief met `<em>`), `title` en `description`
  zijn voor Google (titel liefst onder de 60 tekens, beschrijving onder de 160)
- `intro` is de inleiding onder de titel
- `beeld` (1600x1000) en `ogImage` (1200x630, voor delen op social media). De
  deelafbeelding maak je met `python3 tools/maak_og.py <naam>`: zet eerst een beeld van
  600x630 in `tools/og-beelden/<naam>.webp` (de rechterhelft); kopje en kop komen uit
  `categorie` en `kop`
- `volgorde` bepaalt de plek in de lijsten; `"uitgelicht": true` zet een artikel groot
  op de homepage
- `verder` zijn de artikelen die onderaan als "Verder lezen" staan

Met `{{stalen:slug1,slug2}}` in de tekst komt er een rij stalen uit `stalen.json` in het
artikel, met de juiste naam en RAL-code.

De leestijd, de datumweergave, de structured data (BlogPosting en kruimelpad) en de
vermelding in sitemap en feed gaan vanzelf.

### Veelgestelde vragen

De vragen staan als `<details class="vraag">`-blokken in `src/pages/index.html` en
`src/pages/renolit-folie.html`. De structured data voor Google (FAQPage) maakt `build.py` uit die zichtbare tekst, dus die
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

`js/folie3d.js` tekent een crèmewit kunststof kozijn (RAL 9001) met een staalblauw draairaam
(RAL 5011): het blauw sluit aan op het donkerblauw van de huisstijl (Max, november 2026). De uitleg heeft drie
hoofdstukken (rechtsboven in beeld aan te klikken):

1. **Opbouw** (stap 1 tot 5): een stuk folie komt los van de crèmewitte onderdorpel van het
   kozijn (niet van het raam) en valt uiteen in de heldere toplaag (acryl, met de nerf erin), de kleurlaag en de lijmlaag, boven
   het kale profiel. Dat zijn dezelfde drie lagen (plus het profiel) als op de
   specificatiepagina en op /renolit-folie: de primer en de acrylaatlijm vallen samen onder
   de lijmlaag, de pvc-basisfolie en de drukinkt onder de kleurlaag. De lagen werpen schaduw op elkaar; de labels noemen per laag het
   materiaal en wat de laag doet.
2. **Kleur** (stap 6): de bezoeker kiest eerst kozijn of raam en dan een kleur.
3. **Vernieuwen** (stap 7 tot 9): de folie verweert zoals in de 3D-animatie op iwrap.nl
   (krijtig, gebarsten in eilandjes met opgekrulde randen), daarna gaat de oude folie eraf
   (eerst blijft er lijm achter, dan kaal kunststof) en komt er een nieuwe folie op. Het
   hoe en waarom van het werk zelf staat op iwrap.nl; hier staat alleen wat er met de folie
   gebeurt, met een link naar de werkwijze van iWrap.

Details:

- **De laag met uitleg:** bij elke stap over één laag schuift die laag naar de kijker toe (voor
  de andere langs), worden de andere lagen bleek en schuift de camera half mee. De maten staan in
  `NADRUK` bovenin het script.
- **Glas:** dubbel glas met een afstandhouder, twee ruiten die de lucht, bomen en gevels
  aan de overkant weerspiegelen (iets bol, zoals echte isolatieruiten), en daarachter een
  kamer met diepte. De weerspiegeling is een getekende omgeving in `lucht()`, de kamer zit
  in `binnenMateriaal()`.
- **Standen:** bovenin het script (`STANDEN`); `TIMING` bepaalt wanneer binnen een overgang
  iets gebeurt (de verwering komt pas als de camera er is). Het aantal standen is gelijk aan
  het aantal stappen in `src/pages/index.html`.
- **Kleuren:** de beginkleuren staan in `src/pages/index.html` (`data-kozijn` en `data-raam`
  op de sectie; ook op de kleurenpagina en in `js/site.js`), de kleuren in de kiezer in `build.py` (`KIEZER`). Voor de RAL-kleuren
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

## Specificaties: welke folie

De specificatiepagina beschrijft één folie: **Renolit Exofol PR** (door Max bevestigd: dat is de
folie die iWrap bestelt, met tien jaar garantie van Renolit), de zelfklevende reparatiefolie
in dezelfde kwaliteit als Renolit Exofol PX. Renolit maakt reparatiefolie in vier kwaliteiten
(MR, PR, FR en PFR). FR is de hoogste, maar bestaat maar in een kleine groep kleuren; de
klassieke houtnerfkleuren (crèmewit, wit, dennengroen, staalblauw, Irish Oak) zijn het hoogst
leverbaar in PR. Gecontroleerd in de eShop van Renolit in november 2026: van de 94 kleuren op
de kleurenpagina zijn er 48 in PR leverbaar.

Op de pagina staan alleen gegevens die Renolit openbaar publiceert (productpagina's en flyers,
met bronnen onderaan). De laboratoriumwaarden uit het productblad van Exofol PR (dikte,
treksterkte, weertestwaarden) staan er bewust niet op: dat blad zegt dat de inhoud niet
gepubliceerd mag worden zonder schriftelijke toestemming van Renolit.

**Verwering:** de verweerde folie in de 3D-uitleg is folie van een oudere generatie. Zo staat het ook overal op de site; de folie van nu is veel sterker (geen
weekmakers, meer uv-filter, SolShield). Klanten moeten niet het idee krijgen dat nieuwe folie
zo verweert.

## Huisstijl

- **Boodschap: kwaliteit.** Renolit folie uit het hoogste segment (Max, november 2026: "de
  boodschap moet kwaliteitsfolie zijn"). Daarom een verfijnde, lichte stijl met goud als enige
  accentkleur, en op de homepage direct na de 3D-uitleg het blok "Het hoogste segment" met zes
  onderbouwde punten (uv-filter, garantie, levensduur, geen weekmakers, SolShield, ruim boven de
  norm). Onder de intro staat de kwaliteit in het kort (`.bewijs`). Elke claim komt uit de
  bronnen op de specificatiepagina; houd dat zo.
- **Opzet:** licht en rustig, richting Apple, op de basis van iwrap.nl: overal dezelfde
  achtergrond `#f7f6f3` met een zachte waas van blauw en goud over de hele site (`body::before`,
  vast in beeld), inhoud op licht doorschijnende witte vlakken (`--vlak`) die met een heel zachte
  schaduw zweven (`--schaduw`, bij aanwijzen `--schaduw-op`). Geen wisselende achtergrondbanden.
  Strakke koppen in één reeks maten (zie Letters), het menu altijd zichtbaar (licht
  doorschijnend). Het offerteblok is een wit vlak met een dunne gouden rand. Geen donkere vlakken
  en geen crème achtergronden (vindt Max AI-achtig).
- **Kleuren:** elke site van iWrap heeft een eigen leidende kleur op dezelfde lichte basis:
  iwrap.nl mint `#a3cdc2`, kozijnwrap.nl hemelsblauw `#a9c8e4`, en deze site **goud met diep
  donkerblauw**. Donkerblauw `--navy` `#13294b` is voor wat leidt en wat je aanklikt: koppen,
  knoppen, links en de gekozen stand van een schakelaar. Goud is voor de details:
  `--goud` `#b38b4d` (haarlijnen, stippen, sterren), `--goud-inkt` `#876430` (goud als tekst:
  haalt AA op wit en papier), `--goud-lijn` `#d1b885` (randen, onderstrepingen), `--goud-was`
  `#f6efe0` (kleine vlakjes), `--goud-verloop` (bladgoud, voor het logo en actieve nummers) en
  `--goud-tekst` (verloop voor de woorden met nadruk in grote koppen). Knoppen zijn donkerblauw
  met een gouden glans; lopende tekst is antraciet `#22262a` of grijs. Geen derde kleur: goud
  en donkerblauw op gebroken wit is een compleet palet, en het 3D-beeld brengt zelf al kleur.
- **Vaste onderdelen:** kleine kopjes in goud, in gewone zinsopbouw zoals bij Apple (kapitalen
  met haarlijnen oogden als een sjabloon); nummers in goud met een stipje erachter; links met
  een pijltje in een dun gouden rondje; vragen met een plus in een dun gouden rondje; woorden
  met nadruk (`<em>`) in grote koppen in goud. Alles staat als variabelen en regels in
  `css/site.css`.
- **Letters:** koppen, menu, knoppen, kleine kopjes en de vragen in Montserrat, de letter van
  het iWrap-logo (sinds 17 november 2026, net als op iwrap.nl en kozijnwrap.nl; `--kop`). De
  lopende tekst is het lettertype van het apparaat zelf (`--sans`): San Francisco op een Mac en
  iPhone, Segoe UI op Windows, Roboto op Android. Montserrat staat op de site zelf (`fonts/`,
  dezelfde bestanden als op iwrap.nl: één variabel bestand, 35 kB) en wordt in de `<head>`
  vooraf geladen; de terugval `Montserrat-terugval` (Arial op maat) zorgt dat er niets
  verspringt. Op een smal scherm mogen lange woorden in koppen afbreken. De teksten in de
  getekende doorsneden blijven in `--sans`.
  **Eén reeks maten** (compositieronde, 19 november 2026, dezelfde als op iwrap.nl), als
  variabelen bovenin `css/site.css`: `--h1` `clamp(2.1rem,1.45rem + 2.3vw,3.1rem)`, `--h2`
  `clamp(1.65rem,1.25rem + 1.35vw,2.3rem)` en `--h3` `clamp(1.14rem,1.06rem + .3vw,1.28rem)`: op
  een breed scherm 50 / 37 / 20px, op een telefoon 34 / 26 / 18px. Elke paginakop, artikelkop en
  de kop van de 3D-uitleg is een `--h1`; elke sectiekop (ook in de 3D-uitleg, in een artikel, bij
  de kleurgroepen en in het blok naar iWrap) een `--h2`. In een kaart is de titel `1.18rem`
  (`--kaart-titel`) en de tekst `1.02rem` grijs (`--kaart-tekst`): de zes punten van "Het hoogste
  segment", de lijst met artikelen, Verder lezen en de zes kaarten op /mogelijkheden. De twee
  kleine tegels op de homepage en de rijen in het artikeloverzicht hebben een titel in `--h3`, de
  grote tegel en het uitgelichte artikel een kop in `--h2`. De grote getallen bij "Het hoogste
  segment" zijn niet groter dan een sectiekop (`--h2`). De inleiding onder een sectiekop is
  `--lede` (19,5px), op een paginakop, onder een artikelkop en in de 3D-uitleg `--lede-kop` (20px).
  Maak een kop niet groter dan zijn kolom aankan: een kop breekt op een breed scherm nooit op een
  los woord ("Renolit / houtnerffolie, / laag voor laag" was zo'n geval; daarom is de tekstkolom
  van de 3D-intro 34rem en een artikelkop maximaal 18em), en titels in een rij kaarten staan
  allemaal op één regel. Zijn ze daar te lang voor (Verder lezen), dan staan de regels eronder met
  subgrid toch op één lijn.
- **Regellengte:** lopende tekst niet breder dan zo'n 85 tekens. De inleiding onder een kop en op
  een paginakop `34em`, de tekst in een kanttekening of naast een kop (Wat is Renolit folie?, de
  kleurgroepen, een kaart) `36em`, de tekstkolom van een artikel `--lees` (40rem). Reken in `em`,
  niet in `ch`: `ch` is in deze letter breder dan een gemiddeld teken. Een lijst die over de hele
  breedte zou lopen (Wat niet kan, op /mogelijkheden) staat op een breed scherm in drie kolommen.
- **Witruimte:** één sectie-eenheid (`--sectie`: 116px op een breed scherm, 64px op een telefoon,
  net als op iwrap.nl) tussen twee blokken. Een `.sectie` heeft die ruimte boven en onder; volgt er
  een sectie op een sectie, dan valt de ruimte erboven weg (`.sectie + .sectie`), want de
  achtergrond is overal dezelfde. Onder de paginakop en de artikelkop staat precies één eenheid:
  de kop houdt die zelf onderin, het blok eronder begint zonder eigen ruimte. Elk inhoudsblok
  (`.tekst`, `.spec`, `main > .wrap`) eindigt met één eenheid, en het blok naar iWrap
  (`.uitvoering`) voegt erboven niets toe en heeft één eenheid tot de voet. Binnen een artikel staan
  de foto en de tekst dichter op elkaar (64px), en de kleurgroepen op /kleuren een eenheid uit
  elkaar. Wat als eerste of laatste in een blok staat, voegt geen eigen marge toe; zet dus geen
  losse `style="padding-bottom"` in een bron.
- **Compositie:** wat naast elkaar staat, is ongeveer even hoog. De twee kleine tegels op de
  homepage zijn even hoog en gevuld (de stalen in vier kolommen naast de drie kozijnen); de 3D-intro
  heeft de kop in twee regels naast het kozijn. Het reviewcijfer in het blok naar iWrap loopt als
  gewone tekst door, zodat het netjes afbreekt, en de korte zin bij de knop staat op een eigen
  regel.
- **Controleren:** na een wijziging in de opmaak de pagina's bekijken op 1440x900, 1366x768 en
  390 breed, met schermafdrukken die scherm voor scherm worden gemaakt (een schermafdruk van de hele
  pagina in één keer geeft in Chrome afwijkingen). Meet koppen met een los woord, rijen
  kaarttitels, regellengtes en de witruimte tussen blokken (alleen 116 breed en 64 op een telefoon
  zijn goed), en kijk of er niets zijwaarts schuift.
- **Logo:** de houtnerf vormt een H, als bladgoud met een gegraveerde nerf (`#7a5724`). De
  staanders en de dwarsbalk van de H blijven glad. Getekend in `build.py` (`beeldmerk()`, met de
  lijnen in `NERF_ZIJ` en `NERF_VAK` en het verloop in `GOUD_VERLOOP`); elke build schrijft
  daaruit `images/logo.svg` en `favicon.svg` (een eenvoudige versie met alleen de H, die ook op
  16 pixels leesbaar is). Naast het teken "Houtnerffolie" en daaronder "Alles over Renolit
  folie", en achter een dun streepje het RENOLIT-logo (`images/renolit-logo.svg`), dat naar
  /renolit-folie linkt. `images/logo.png` (512 px, voor Google), `apple-touch-icon.png` en
  `favicon.ico` zijn van dezelfde tekening gemaakt; maak ze opnieuw als het teken verandert.
- **Beelden:** de artikelbeelden staan op `#eeece7`; de deelafbeeldingen (1200x630) hebben
  links het gouden kopje, de kop (in Montserrat, met de woorden met nadruk in goud) en het
  woordmerk, rechts een beeld op `#eeece7`. Ze worden gemaakt met `tools/maak_og.py` (Chrome,
  met `cdp.py` uit `iwrap-project/beweging/tools`), de rechterhelften staan in
  `tools/og-beelden/`. De kop wordt zo groot als past, zonder kort woordje alleen op een
  regel. `build.py` zet de inhoud als versie achter het adres (`?v=`), zodat WhatsApp en
  Facebook een nieuwe afbeelding ook echt ophalen. De beelden voor de tegels staan in
  `images/tegels/` (transparant).

## Vindbaarheid: Google en AI

- **Zoekwoorden:** "Renolit folie" en "houtnerffolie". Ze staan in de titels en koppen van
  de homepage, /renolit-folie, /specificaties, /kleuren en /mogelijkheden. /renolit-folie is
  de hoofdpagina voor "Renolit folie" en "wat is Renolit folie"; alle pagina's linken ernaar
  (menu, kop, voet).
- **RENOLIT zelf:** het logo staat in de kop, in het blok "Wat is Renolit folie?" op de
  homepage en in de voet, met links naar renolit.com en de productpagina's (bronnen). In de
  voet staat dat RENOLIT en EXOFOL merken van RENOLIT SE zijn en dat dit een onafhankelijke
  kennisbank van iWrap is, geen website van RENOLIT. Zo blijft het eerlijk en kan niemand
  denken dat dit de officiële site van Renolit is.
- **Structured data** (maakt `build.py`): WebSite (met `about`: Renolit folie), Organization
  (iWrap, met `knowsAbout`), RENOLIT SE als organisatie, een Product voor Renolit Exofol PR
  op de specificatiepagina, een Article voor /renolit-folie, BlogPosting voor de artikelen,
  FAQPage uit de zichtbare vragen en overal een kruimelpad.
- **AI-zoekmachines:** `llms.txt` (maakt `build.py`) vat de site in gewone tekst samen: de
  belangrijkste feiten over Renolit folie en een lijst van alle pagina's. `robots.txt` laat
  alle crawlers toe, behalve `/src/`; die map krijgt ook een `noindex` in `vercel.json`.
- **Na een wijziging:** in Google Search Console de gewijzigde pagina's opnieuw laten
  indexeren.

## Structuur

```
build.py                Bouwt de site uit src/pages/ en stalen.json
src/pages/              De bronnen (hier pas je teksten aan)
stalen.json             Alle stalen
css/site.css            Alle styling
js/folie3d.js           De 3D-uitleg op de homepage
js/site.js              Zoeken op de kleurenpagina
js/vendor/three-*/      three.js (MIT-licentie)
images/artikelen/       Artikelbeelden (1600x1000)
images/og/              Deelafbeeldingen (1200x630), gemaakt met tools/maak_og.py
tools/og-beelden/       De rechterhelften van de deelafbeeldingen (600x630)
images/stalen/          Staalfoto's (RENOLIT)
images/logo.svg         Het beeldmerk van de site
images/renolit-logo.svg Het logo van RENOLIT (kop, homepage, voet)
favicon.svg, favicon.ico, apple-touch-icon.png   Pictogrammen
llms.txt                Samenvatting voor AI-zoekmachines (gebouwd)
robots.txt              Voor zoekmachines; verwijst naar de sitemap
images/houtnerf-textuur.webp  De nerf, als laag over de stalen en in het 3D-model
images/ral9001-textuur.jpg    Bron van het zelf opgebouwde crèmewit-staal
vercel.json             Schone adressen (/kleuren in plaats van /kleuren.html), cache
```

Gebouwd en meegecommit: `index.html`, `renolit-folie.html`, `specificaties.html`,
`mogelijkheden.html`, `kleuren.html`, `404.html`, `artikelen/`, `sitemap.xml`, `feed.xml`,
`llms.txt`. Vercel serveert de map zoals hij is; er draait daar geen build.

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

## Openstaand

- Gebruik van het RENOLIT-logo en de staalfoto's nog even afstemmen met de contactpersoon
  daar, en vragen of de waarden uit het productblad van Exofol PR op de specificatiepagina
  mogen
- Google Search Console koppelen en de sitemap aanmelden (staat in
  `../iwrap-project/LIVEGANG.md`, stap 5); na de overstap naar het nieuwe ontwerp ook de
  nieuwe adressen (`/artikelen/...`) laten indexeren
- three.js is nu niet verkleind (gzip ongeveer 400 kB); verkleinen met esbuild scheelt
  ongeveer de helft
