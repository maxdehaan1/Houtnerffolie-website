/* houtnerffolie.nl — kleine dingen voor de kleurenpagina: zoeken in de stalen. */
(function () {
  var veld = document.getElementById('zoek');
  if (!veld) return;
  var stalen = Array.prototype.slice.call(document.querySelectorAll('[data-zoek]'));
  var groepen = Array.prototype.slice.call(document.querySelectorAll('[data-groep]'));
  var populair = document.querySelector('[data-groep="populair"]');
  var telling = document.getElementById('zoek-telling');
  var leeg = document.getElementById('zoek-leeg');
  var totaal = stalen.length;

  function filter() {
    var woorden = veld.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    var gevonden = 0;
    stalen.forEach(function (li) {
      var tekst = li.getAttribute('data-zoek');
      var past = woorden.every(function (w) { return tekst.indexOf(w) !== -1; });
      li.hidden = !past;
      if (past) gevonden++;
    });
    groepen.forEach(function (g) {
      if (g === populair) { g.hidden = woorden.length > 0; return; }
      g.hidden = !g.querySelector('[data-zoek]:not([hidden])');
    });
    if (telling) telling.textContent = woorden.length ? gevonden + ' van ' + totaal + ' stalen' : totaal + ' stalen';
    if (leeg) leeg.hidden = gevonden > 0;
  }

  veld.addEventListener('input', filter);
  if (veld.value) filter();
})();

/* Een staal in 3D op een kozijn bekijken. Het 3D-script (met three.js) wordt pas geladen
   bij de eerste klik, zodat de kleurenpagina zelf snel blijft. */
(function () {
  var dialoog = document.getElementById('kijker');
  var data = document.getElementById('folie-kleuren');
  if (!dialoog || !data || typeof dialoog.showModal !== 'function') return;
  var kleuren = JSON.parse(data.textContent || '[]');
  var standaard = { kozijn: 'ice-cream-b-46835', raam: 'dark-green-6125' };
  var naam = document.getElementById('kijker-naam');
  var code = document.getElementById('kijker-code');
  var uitleg = document.getElementById('kijker-uitleg');
  var opKnoppen = Array.prototype.slice.call(dialoog.querySelectorAll('[data-op]'));
  var api = null, laden = null, huidig = null, op = 'beide';

  function vind(slug) {
    for (var i = 0; i < kleuren.length; i++) if (kleuren[i].slug === slug) return kleuren[i];
    return null;
  }
  function kort(k) { return k.naam.split(' / ')[0]; }
  function laad() {
    // import() in een functie, zodat oude browsers niet over dit bestand struikelen
    if (!laden) laden = new Function('u', 'return import(u)')('/js/folie3d.js').then(function (m) {
      api = m.start(dialoog.querySelector('.kijker'));
      return api;
    });
    return laden;
  }
  function toon() {
    if (!huidig) return;
    var k = op === 'raam' ? standaard.kozijn : huidig.slug;
    var r = op === 'kozijn' ? standaard.raam : huidig.slug;
    if (op === 'beide') uitleg.textContent = 'Kozijn en raam allebei in ' + kort(huidig) + '.';
    else if (op === 'kozijn') uitleg.textContent = 'Het kozijn in ' + kort(huidig) + ', het raam in dennengroen (RAL 6009).';
    else uitleg.textContent = 'Het raam in ' + kort(huidig) + ', het kozijn in crèmewit (RAL 9001).';
    if (api) { api.zetKleur('kozijn', k); api.zetKleur('raam', r); }
  }
  function open(slug) {
    huidig = vind(slug);
    if (!huidig) return;
    naam.textContent = kort(huidig);
    var delen = [];
    if (huidig.ral) delen.push('RAL ' + huidig.ral);
    if (huidig.code && huidig.code !== huidig.ral) delen.push(huidig.code);
    if (huidig.soort === 'decor') delen.push('houtdecor');
    code.textContent = delen.join(' · ');
    toon();
    if (!dialoog.open) dialoog.showModal();
    laad().then(toon).catch(function (e) { if (window.console) console.error(e); dialoog.classList.add('kijker-fout'); });
  }

  Array.prototype.slice.call(document.querySelectorAll('.staal-knop')).forEach(function (b) {
    b.addEventListener('click', function () { open(b.getAttribute('data-slug')); });
  });
  opKnoppen.forEach(function (b) {
    b.addEventListener('click', function () {
      op = b.getAttribute('data-op');
      opKnoppen.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      toon();
    });
  });
  dialoog.querySelector('.kijker-sluit').addEventListener('click', function () { dialoog.close(); });
  dialoog.addEventListener('click', function (e) { if (e.target === dialoog) dialoog.close(); });
})();
