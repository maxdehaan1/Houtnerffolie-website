# houtnerffolie.nl

Statische informatiesite over Renolit Exofol houtnerffolie: opbouw van de folie, kleuren,
toepassingen, veroudering en onderhoud, praktijkvoorbeelden en een FAQ.

**Positionering:** dit is een kennisbron, geen tweede aanbieder. De site verkoopt niets en
doet geen offertes; wie het werk wil laten uitvoeren wordt doorverwezen naar iwrap.nl.
Alle links daarheen hebben UTM-tags (`utm_source=houtnerffolie`), zodat in de analytics van
iwrap.nl te zien is hoeveel verkeer deze site oplevert en via welk element.

## Structuur

```
index.html              Hoofdpagina
kleuren.html            Volledig kleurenoverzicht (96 stalen, met zoekfunctie)
css/style.css           Alle styling
robots.txt              Verwijst naar de sitemap
sitemap.xml             Eén URL; bijwerken zodra er pagina's bijkomen
images/
  houtnerf-textuur.webp   Nerftextuur, als overlay over elke kleur (het enige
                          textuurbestand: de lichte variant is dezelfde afbeelding
                          met filter:invert(1) in CSS)
  houtnerf-textuur.svg    Bronbestand van de textuur, niet gebruikt op de pagina
  kozijn-voor.jpg         Voorbeeld: verweerde/beschadigde folie
  kozijn-na.jpg           Voorbeeld: nieuwe folie na herstel
  ral9001-textuur.jpg     Echte nerftextuur, gebruikt als RAL 9001-swatch
  og-image.jpg            1200x630 deelafbeelding voor social media
  stalen/                 89 staalafbeeldingen voor kleuren.html, afkomstig van
                          de RENOLIT eShop en verkleind naar 260px WebP
```

De favicon staat als inline data-URI in `index.html`.

## Aandachtspunten bij aanpassen

- **FAQ en structured data moeten synchroon blijven.** De FAQ staat twee keer in
  `index.html`: als zichtbare `<details>`-blokken en als JSON-LD in de `<head>`. Bij een
  wijziging het JSON-LD-blok opnieuw genereren uit de zichtbare tekst, niet handmatig
  bijwerken.
- **Scroll-animaties.** Elementen met `.reveal` worden pas zichtbaar bij scrollen. Dat
  verbergen gebeurt via `.js .reveal`, waarbij de klasse `js` door een klein script in de
  `<head>` wordt gezet. Zo blijft de pagina leesbaar als JavaScript niet draait.
- **Staalafbeeldingen.** De stalen op kleuren.html komen van de RENOLIT eShop en
  worden lokaal gehost met bronvermelding op de pagina. Van 7 stalen bestaat daar
  geen bruikbare foto; die tonen een placeholder. Zes stalen zijn uitgesneden uit
  een productfoto waar een folie-stift op lag.
- **Feitelijke claims.** Getallen op de site (10 jaar garantie, 95% UV-absorptie, 18-35°C
  verwerkingstemperatuur) zijn gecontroleerd. Nieuwe claims niet zomaar toevoegen.

## Huisstijl

- Lettertype: Newsreader (serif, via Google Fonts)
- Kleuren: RAL 9001 (crèmewit, canvas) en RAL 6009 (dennengroen, accent)
- Dezelfde stijl wordt ook gebruikt op kozijnwrap.nl (los project)

## Openstaand

- Het domein houtnerffolie.nl wijst nog niet naar deze site
- Gebruik van RENOLIT-beeldmateriaal nog even afstemmen met de contactpersoon daar
- Referentiesectie heeft nog 2 placeholders ("Voor/na-foto's volgen")
- Google Search Console nog koppelen en sitemap aanmelden
