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
