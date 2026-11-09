/* Homepage, il giro della cucina con i comandi (versione 2, richiesta di Manuel del 9/11/2026 sera: «ogni utente deve poterlo
   mandare avanti o indietro a piacimento»).
   Come c-video-3.js: muto, in loop, parte da solo se chi guarda non ha chiesto meno movimento o meno dati, si ferma quando esce
   dallo schermo, sul telefono il quadrato; se il browser non lo lascia partire compare il bottone «Guarda il video».
   In più, sotto il video: tappa precedente, pausa e avvio, tappa successiva, la barra da toccare o trascinare e i numeri delle
   tappe per saltare. Gli inizi delle tappe sono in data-tappe (secondi), scritti da monta_giro.py in video/tappe.json.
   Sul telefono un trascinamento verticale sulla barra fa scorrere la pagina e non sposta il video.
   c-video-3.js resta sul sito per la homepage vecchia che la CDN tiene in cache. */
(function () {
  var v = document.getElementById('pianta3d');
  if (!v) return;
  var b = document.getElementById('guarda-video');
  var c = navigator.connection || {};
  var meno = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var daSolo = !meno && !c.saveData && !/2g$/.test(c.effectiveType || '');
  var voluto = false;                                   // l'ha fatto partire chi guarda
  var fermo = false;                                    // l'ha fermato chi guarda: resta fermo anche quando torna nello schermo
  var piccolo = window.innerWidth <= 760;
  var src = piccolo ? v.getAttribute('data-piccolo') : v.getAttribute('data-grande');
  var loc = piccolo ? v.getAttribute('data-locandina-piccola') : v.getAttribute('data-locandina-grande');
  if (loc) v.setAttribute('poster', loc);
  var bottone = function (si) { if (b) b.hidden = !si; };
  var carica = function () { if (!v.getAttribute('src')) v.setAttribute('src', src); };
  var parti = function () {
    carica();
    var p = v.play();
    if (p && p.then) {
      p.then(function () { bottone(false); }, function (e) {
        if (!e || e.name !== 'AbortError') bottone(true); // AbortError: fermato perché è uscito dallo schermo, non un rifiuto
      });
    }
  };
  var vuole = function () { voluto = true; fermo = false; bottone(false); parti(); };
  v.addEventListener('playing', function () { bottone(false); });
  if (b) b.addEventListener('click', vuole);
  if (!daSolo) bottone(true);
  var vista = function (dentro) { if (!dentro) { if (!v.paused) v.pause(); } else if ((daSolo || voluto) && !fermo) parti(); };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { vista(e[0].isIntersecting); }, { threshold: 0.1 }).observe(v);
  } else { vista(true); }

  // comandi
  var box = document.getElementById('comandi-giro');
  if (!box) return;
  var tappe = (v.getAttribute('data-tappe') || '0').split(',').map(parseFloat);
  var durata = parseFloat(v.getAttribute('data-durata')) || 1;
  var DENTRO = 0.42;                                    // si salta poco dopo l'inizio della tappa, a didascalia già cambiata
  var tp = document.getElementById('giro-pausa');
  var barra = document.getElementById('giro-barra');
  var pieno = barra.querySelector('.pieno');
  var pomo = barra.querySelector('.pomo');
  var bin = barra.querySelector('.binario');
  var numeri = box.querySelectorAll('.tappe button');
  for (var k = 1; k < tappe.length; k++) {             // i segni delle tappe sulla barra
    var s = document.createElement('span');
    s.className = 'segno';
    s.style.left = (tappe[k] / durata * 100) + '%';
    bin.appendChild(s);
  }
  var attesa = null;                                    // salto chiesto prima che il video abbia caricato i suoi dati
  var lungo = function () { return (v.duration > 0 && isFinite(v.duration)) ? v.duration : durata; };
  var ora = function () { return attesa !== null ? attesa : (v.getAttribute('src') ? v.currentTime : 0); };
  var quale = function (t) { var i = 0; while (i + 1 < tappe.length && t >= tappe[i + 1] - 0.05) i++; return i; };
  var mmss = function (t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); };
  var prima = {};
  var disegna = function () {
    var t = ora(), f = Math.max(0, Math.min(1, t / lungo()));
    pieno.style.transform = 'scaleX(' + f + ')';
    pomo.style.left = (f * 100) + '%';
    var sec = Math.round(t), ferma = v.paused;
    var q = (v.getAttribute('src') || attesa !== null) ? quale(t) : -1;  // sulla copertina (tappa 3) nessun numero acceso
    if (sec !== prima.sec) {
      barra.setAttribute('aria-valuenow', sec);
      barra.setAttribute('aria-valuetext', mmss(t) + ' / ' + mmss(lungo()));
      prima.sec = sec;
    }
    if (q !== prima.q) {
      for (var i = 0; i < numeri.length; i++) {
        if (i === q) numeri[i].setAttribute('aria-current', 'step'); else numeri[i].removeAttribute('aria-current');
      }
      prima.q = q;
    }
    if (ferma !== prima.ferma) {
      tp.classList.toggle('fermo', ferma);
      tp.setAttribute('aria-label', box.getAttribute(ferma ? 'data-txt-avvia' : 'data-txt-pausa'));
      prima.ferma = ferma;
    }
  };
  var vaiA = function (t, eParti) {
    t = Math.max(0, Math.min(t, lungo() - 0.1));
    carica();
    if (v.readyState >= 1) { v.currentTime = t; attesa = null; } else { attesa = t; v.preload = 'auto'; }
    if (eParti) vuole();
    disegna();
  };
  var riprova = function () { if (attesa !== null) { var t = attesa; attesa = null; v.currentTime = t; } };
  v.addEventListener('loadedmetadata', riprova);
  v.addEventListener('canplay', riprova);
  var vaiTappa = function (i) {
    i = (i + tappe.length) % tappe.length;
    vaiA(i === 0 ? 0 : tappe[i] + DENTRO, true);
  };
  var giro = null;
  var passo = function () { disegna(); giro = v.paused ? null : window.requestAnimationFrame(passo); };
  v.addEventListener('play', function () { if (!giro) giro = window.requestAnimationFrame(passo); });
  ['pause', 'seeked', 'timeupdate', 'loadedmetadata', 'ended'].forEach(function (ev) { v.addEventListener(ev, disegna); });

  tp.addEventListener('click', function () { if (v.paused) vuole(); else { fermo = true; v.pause(); } });
  document.getElementById('giro-indietro').addEventListener('click', function () {
    var t = ora(), i = quale(t);
    vaiTappa(t - tappe[i] > 1.5 ? i : i - 1);           // a metà tappa torna al suo inizio, all'inizio va alla precedente
  });
  document.getElementById('giro-avanti').addEventListener('click', function () { vaiTappa(quale(ora()) + 1); });
  for (var n = 0; n < numeri.length; n++) {
    numeri[n].addEventListener('click', (function (i) { return function () { vaiTappa(i); }; })(n));
  }

  // barra: col mouse si salta subito; col dito si salta al tocco o trascinando in orizzontale (in verticale scorre la pagina)
  var daX = function (e) { var r = barra.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * lungo(); };
  var dito = null, trascino = false, meta = null, chiesto = false;
  var segui = function () { chiesto = false; if (meta !== null) vaiA(meta, false); };
  var sposta = function (t) { meta = t; if (!chiesto) { chiesto = true; window.requestAnimationFrame(segui); } };
  barra.addEventListener('pointerdown', function (e) {
    if (e.button) return;
    dito = { id: e.pointerId, x: e.clientX, tocco: e.pointerType === 'touch' };
    trascino = !dito.tocco;
    if (trascino) {
      try { barra.setPointerCapture(e.pointerId); } catch (x) { /* niente */ }
      if (!v.paused) v.pause();
      sposta(daX(e));
    }
  });
  barra.addEventListener('pointermove', function (e) {
    if (!dito || e.pointerId !== dito.id) return;
    if (!trascino && Math.abs(e.clientX - dito.x) > 6) {
      trascino = true;
      try { barra.setPointerCapture(e.pointerId); } catch (x) { /* niente */ }
      if (!v.paused) v.pause();
    }
    if (trascino) sposta(daX(e));
  });
  var lascia = function (e, annulla) {
    if (!dito || e.pointerId !== dito.id) return;
    var eraTrascino = trascino;
    dito = null; trascino = false;
    if (annulla && !eraTrascino) return;               // il dito ha fatto scorrere la pagina: il video resta dov'è
    meta = null;
    vaiA(daX(e), !fermo);
    if (fermo) disegna();
  };
  barra.addEventListener('pointerup', function (e) { lascia(e, false); });
  barra.addEventListener('pointercancel', function (e) { lascia(e, true); });
  barra.addEventListener('keydown', function (e) {
    var t = ora(), n = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') n = t - 5;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') n = t + 5;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tappe[tappe.length - 1] + DENTRO;
    else if (e.key === 'PageUp') { e.preventDefault(); vaiTappa(quale(t) - 1); return; }
    else if (e.key === 'PageDown') { e.preventDefault(); vaiTappa(quale(t) + 1); return; }
    if (n !== null) { e.preventDefault(); vaiA(n, !fermo); }
  });
  disegna();
})();
