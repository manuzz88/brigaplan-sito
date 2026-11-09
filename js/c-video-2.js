/* Homepage, grafica C: il video parte da un'immagine ferma. Parte da solo solo se chi guarda non ha chiesto meno movimento,
   non ha il risparmio dati e non è su una rete 2G; sul telefono la versione piccola. Si ferma quando esce dallo schermo.
   Se il browser non lo lascia partire da solo (per esempio l'iPhone con il risparmio energetico), oppure se chi guarda ha chiesto
   meno movimento o meno dati, compare il bottone «Guarda il video»: al tocco il video si carica e parte (regia, 9/11/2026). */
(function () {
  var v = document.getElementById('pianta3d');
  if (!v) return;
  var b = document.getElementById('guarda-video');
  var c = navigator.connection || {};
  var meno = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var daSolo = !meno && !c.saveData && !/2g$/.test(c.effectiveType || '');
  var voluto = false;                                   // l'ha fatto partire chi guarda, con il bottone
  var src = window.innerWidth <= 760 ? v.getAttribute('data-piccolo') : v.getAttribute('data-grande');
  var bottone = function (si) { if (b) b.hidden = !si; };
  var parti = function () {
    if (!v.getAttribute('src')) v.setAttribute('src', src);
    var p = v.play();
    if (p && p.then) {
      p.then(function () { bottone(false); }, function (e) {
        if (!e || e.name !== 'AbortError') bottone(true); // AbortError: fermato perché è uscito dallo schermo, non un rifiuto
      });
    }
  };
  v.addEventListener('playing', function () { bottone(false); });
  if (b) b.addEventListener('click', function () { voluto = true; bottone(false); parti(); });
  if (!daSolo) bottone(true);
  var vista = function (dentro) { if (!dentro) v.pause(); else if (daSolo || voluto) parti(); };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { vista(e[0].isIntersecting); }, { threshold: 0.1 }).observe(v);
  } else { vista(true); }
})();
