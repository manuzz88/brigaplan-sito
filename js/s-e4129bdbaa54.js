(function () {
  var reelBtn = document.getElementById("reel-btn");
  // Due video: verticale sul telefono, orizzontale sul computer (si sceglie con la stessa regola del CSS).
  // Parte da solo, senza audio. Se il telefono lo blocca (risparmio energetico), al suo posto scorrono sei immagini
  // del video giusto; si riprova al primo tocco o scorrimento.
  if (reelBtn) {
  var telefono = window.matchMedia ? window.matchMedia("(max-width: 700px)") : { matches: false };
  var reel = null, fermatoDaTe = false, fermi = null;
  function statoReel() { var fermo = (!reel || reel.paused) && !fermi; reelBtn.textContent = fermo ? reelBtn.dataset.txtRiproduci : reelBtn.dataset.txtPausa; reelBtn.setAttribute("aria-pressed", String(fermo)); }
  function mostraFermi() {
    if (fermi || fermatoDaTe || !reel) return;
    fermi = document.getElementById(telefono.matches ? "reel-fermi-v" : "reel-fermi-o").content.firstElementChild.cloneNode(true);
    reel.parentNode.insertBefore(fermi, reelBtn); statoReel();
  }
  function togliFermi() { if (fermi) { fermi.remove(); fermi = null; } statoReel(); }
  function prova() { if (!reel) return; var pr = reel.play(); if (pr && pr.then) pr.then(togliFermi, mostraFermi); }
  function scegli() {
    var nuovo = document.querySelector(telefono.matches ? ".reel-v" : ".reel-o");
    if (nuovo === reel) return;
    if (reel) reel.pause();
    togliFermi();
    reel = nuovo;
    reel.muted = true; reel.defaultMuted = true; reel.setAttribute("muted", ""); reel.playsInline = true; reel.preload = "auto";
    if (!fermatoDaTe) prova();
    statoReel();
  }
  document.querySelectorAll(".reel video").forEach(function (v) {
    v.addEventListener("playing", function () { if (v === reel) togliFermi(); });
    v.addEventListener("play", statoReel); v.addEventListener("pause", statoReel);
  });
  scegli();
  if (telefono.addEventListener) telefono.addEventListener("change", scegli); else if (telefono.addListener) telefono.addListener(scegli);
  setTimeout(function () { if (reel && reel.paused && !fermatoDaTe) mostraFermi(); }, 2500);
  ["touchstart", "scroll", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, function () { if (reel && reel.paused && !fermatoDaTe) prova(); }, { once: true, passive: true });
  });
  reelBtn.addEventListener("click", function () {
    if (fermi) { fermatoDaTe = true; togliFermi(); }                 // ferma anche le immagini di riserva
    else if (reel.paused) { fermatoDaTe = false; prova(); }
    else { fermatoDaTe = true; reel.pause(); }
  });
  }

  var sheet = document.getElementById("tavola");
  var testiLivelli = document.getElementById("livelli-testi").content;
  var bottoni = sheet.querySelectorAll("[data-set]");
  var img = document.getElementById("tavola-img");
  function mostra(l) {
    var d = testiLivelli.querySelector('[data-livello="' + l + '"]');
    if (!d) return;
    bottoni.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-set") === l)); });
    var nuova = d.querySelector('[data-k="img"]');
    img.src = nuova.getAttribute("src"); img.alt = nuova.getAttribute("alt");
    document.getElementById("tavola-cap").innerHTML = d.querySelector('[data-k="cap"]').innerHTML;
    ["tavola", "scala", "attr", "stima"].forEach(function (k) { document.getElementById("c-" + k).textContent = d.querySelector('[data-k="' + k + '"]').textContent; });
  }
  bottoni.forEach(function (b) { b.addEventListener("click", function () { mostra(b.getAttribute("data-set")); }); });
})();
