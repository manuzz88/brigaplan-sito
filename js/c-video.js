/* Homepage, grafica C: il video parte da un'immagine ferma. Si carica solo se chi guarda non ha chiesto meno movimento, non
   ha il risparmio dati e non è su una rete 2G; sul telefono la versione piccola. Si ferma quando esce dallo schermo. */
(function () {
  var v = document.getElementById('pianta3d');
  if (!v) return;
  var c = navigator.connection || {};
  if ((window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || c.saveData || /2g$/.test(c.effectiveType || '')) return;
  var src = window.innerWidth <= 760 ? v.getAttribute('data-piccolo') : v.getAttribute('data-grande');
  var avvia = function () { if (!v.getAttribute('src')) v.setAttribute('src', src); var p = v.play(); if (p && p.catch) p.catch(function () {}); };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { if (e[0].isIntersecting) avvia(); else v.pause(); }, { threshold: 0.1 }).observe(v);
  } else { avvia(); }
})();
