# houtnerffolie.nl

Statische website die Renolit houtnerffolie (Exofol MX/PX/FX) uitlegt: varianten, kleuren,
voordelen, toepassingen, levensduur en een referentiesectie. Onderdeel van iWrap.

## Structuur

```
index.html        Volledige pagina (één document)
css/style.css      Alle styling
images/            Projectfoto's en textuurbeeld
  kozijn-voor.jpg      Voorbeeld: verweerde/beschadigde folie
  kozijn-na.jpg        Voorbeeld: nieuwe folie na herstel
  ral9001-textuur.jpg  Echte nerftextuur, gebruikt als RAL 9001-swatch
```

Kleine decoratieve SVG-patronen (het houtnerfeffect in de hero en het "Toplaag"-vlak,
en de favicon) staan als inline data-URI's in `css/style.css` / `index.html` zelf —
die zijn te klein om als los bestand de moeite waard te zijn.

## Huisstijl

- Lettertype: Newsreader (serif, via Google Fonts)
- Kleuren: RAL 9001 (crèmewit, canvas) en RAL 6009 (dennengroen, accent)
- Dezelfde stijl wordt ook gebruikt op kozijnwrap.nl (los project)

## Openstaand

- Referentiesectie heeft nog 2 placeholder-projecten ("Voor/na-foto's volgen") die
  aangevuld kunnen worden zodra er meer projectfoto's zijn
- Contactgegevens/CTA linken naar iwrap.nl
