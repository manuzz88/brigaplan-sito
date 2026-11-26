/* Home «wow» (schizzo della Chat sito, 26/11/2026): visore 360° nostro, in WebGL, senza librerie né servizi esterni.
   Prima l'immagine ferma; il panorama si carica dopo il load, solo quando il palco è visibile. Punti = <button> veri
   (tastiera), frecce per girarsi, «riduci movimento» rispettato (niente giro da solo, niente animazioni). */
(function () {
  'use strict';
  var palco = document.getElementById('wow-palco');
  if (!palco) return;
  var tela = palco.querySelector('.wow-tela');
  var ferma = palco.querySelector('.wow-ferma');
  var punti = [].slice.call(palco.querySelectorAll('.wow-punto'));
  var chips = [].slice.call(document.querySelectorAll('.wow-chip'));
  var schede = palco.querySelector('.wow-schede');
  var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var R = Math.PI / 180;
  var vista = { yaw: 0, pitch: -8 }, meta = null, aperta = null, apriDa = null;
  var gl, webgl2 = false, prog, loc = {}, pronto = false, sporco = true, visibile = true, ultimoTocco = 0, inGiro = false;

  function fov() {                 // stessa regola delle immagini ferme (prepara_media.py)
    var a = palco.clientWidth / Math.max(1, palco.clientHeight);
    var v = 2 * Math.atan(Math.tan(52.5 * R) / a) / R;     // 105° in orizzontale sugli schermi larghi, 100° al massimo in verticale
    return Math.min(100, Math.max(60, v));
  }

  // ---------- proiezione dei punti (inversa dello shader)
  function aSchermo(yaw, pitch) {
    var y = yaw * R, p = pitch * R;
    var x = Math.cos(p) * Math.sin(y), yy = Math.sin(p), z = Math.cos(p) * Math.cos(y);
    var cy = -vista.yaw * R, cp = -vista.pitch * R;
    var x1 = x * Math.cos(cy) + z * Math.sin(cy), z1 = -x * Math.sin(cy) + z * Math.cos(cy);
    var y2 = yy * Math.cos(cp) + z1 * Math.sin(cp), z2 = -yy * Math.sin(cp) + z1 * Math.cos(cp);
    if (z2 <= 0.05) return null;
    var W = palco.clientWidth, H = palco.clientHeight, t = Math.tan(fov() / 2 * R), a = W / H;
    var sx = x1 / (z2 * a * t), sy = y2 / (z2 * t);
    return { x: (sx + 1) / 2 * W, y: (1 - sy) / 2 * H, dentro: Math.abs(sx) < 0.94 && Math.abs(sy) < 0.9 };
  }
  var testo = palco.querySelector('.wow-testo .wrap');
  function rettangoliTesto() {
    var out = [], w = document.createTreeWalker(testo, NodeFilter.SHOW_TEXT), n, rg = document.createRange();
    while ((n = w.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      rg.selectNodeContents(n);
      [].push.apply(out, [].slice.call(rg.getClientRects()));
    }
    [].forEach.call(testo.querySelectorAll('.btn'), function (b) { out.push(b.getBoundingClientRect()); });
    return out.filter(function (c) { return c.width > 0; });
  }
  function sottoIlTesto(s, b) {      // il cerchio o l'etichetta del punto toccano il testo del titolo o il bottone
    var q = palco.getBoundingClientRect(), x = s.x + q.left, y = s.y + q.top, m = 10;
    var nome = b.querySelector('.nome'), w = nome ? nome.offsetWidth : 0, sx = b.classList.contains('a-sinistra');
    var pezzi = [[x - 22, y - 22, x + 22, y + 22], sx ? [x - 36 - w, y - 15, x - 36, y + 15] : [x + 36, y - 15, x + 36 + w, y + 15]];
    return rettangoliTesto().some(function (c) {
      return pezzi.some(function (r) { return r[0] < c.right + m && r[2] > c.left - m && r[1] < c.bottom + m && r[3] > c.top - m; });
    });
  }
  function mettiPunti() {
    var W = palco.clientWidth;
    punti.forEach(function (b) {
      var s = aSchermo(+b.dataset.yaw, +b.dataset.pitch);
      if (!s) { b.classList.add('fuori'); return; }
      b.classList.toggle('a-sinistra', s.x > W - 150);
      b.classList.toggle('fuori', !s.dentro || (b.getAttribute('aria-expanded') !== 'true' && sottoIlTesto(s, b)));
      b.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px)';
    });
  }

  // ---------- WebGL: un triangolo che copre lo schermo, il colore viene dal panorama equirettangolare
  var VS = 'attribute vec2 p;varying vec2 q;void main(){q=p;gl_Position=vec4(p,0.,1.);}';
  var FS = 'precision highp float;varying vec2 q;uniform sampler2D t;uniform float yaw,pitch,tf,asp;' +
    'void main(){vec3 c=normalize(vec3(q.x*asp*tf,q.y*tf,1.));' +
    'float cp=cos(pitch),sp=sin(pitch);c=vec3(c.x,c.y*cp+c.z*sp,-c.y*sp+c.z*cp);' +
    'float cy=cos(yaw),sy=sin(yaw);c=vec3(c.x*cy+c.z*sy,c.y,-c.x*sy+c.z*cy);' +
    'float lon=atan(c.x,c.z),lat=asin(clamp(c.y,-1.,1.));' +
    'gl_FragColor=texture2D(t,vec2(.5+lon/6.2831853,.5-lat/3.1415927));}';
  function preparaGL() {
    var opz = { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: true };   // senza, WebKit mostra nero
    try { gl = tela.getContext('webgl2', opz); webgl2 = !!gl; if (!gl) gl = tela.getContext('webgl', opz); } catch (e) { gl = null; }
    if (!gl) return false;
    function sh(tipo, src) { var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var ap = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
    ['yaw', 'pitch', 'tf', 'asp'].forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });
    return true;
  }
  function caricaPanorama() {        // PC 6144 (webp, poi jpg), telefono 4096, sfocato 1024 se la scheda video è piccola
    var max = gl.getParameter(gl.MAX_TEXTURE_SIZE), poco = navigator.connection && navigator.connection.saveData;
    var chiave = (!poco && max >= 8192 && palco.clientWidth >= 900) ? 'panoPc' : (max >= 4096 ? 'panoTelefono' : 'panoSegnaposto');
    var base = palco.dataset[chiave], tipi = ['.webp', '.jpg'], n = 0;
    var img = new Image();
    img.onerror = function () { if (++n < tipi.length) img.src = base + tipi[n]; };
    img.onload = function () {
      var pot = (img.width & (img.width - 1)) === 0;
      var tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, (pot || webgl2) ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      pronto = true; sporco = true; disegna();
      if (tutto_nero()) {                         // mai il nero: se la tela non ha disegnato niente, resta l'immagine ferma
        pronto = false; palco.classList.add('senza-3d'); return;
      }
      palco.classList.add('vivo');                 // la tela compare sopra l'immagine ferma
      ultimoTocco = performance.now();
    };
    img.src = base + tipi[0];
  }
  function tutto_nero() {
    var w = tela.width, h = tela.height, px = new Uint8Array(4), somma = 0;
    for (var i = 1; i <= 4; i++) for (var j = 1; j <= 4; j++) {
      gl.readPixels(Math.floor(w * i / 5), Math.floor(h * j / 5), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      somma += px[0] + px[1] + px[2];
    }
    return somma / 48 < 4;
  }
  function misura() {
    var d = Math.min(2, window.devicePixelRatio || 1), w = Math.round(palco.clientWidth * d), h = Math.round(palco.clientHeight * d);
    if (tela.width !== w || tela.height !== h) { tela.width = w; tela.height = h; sporco = true; }
  }
  function disegna() {
    if (pronto && sporco) {
      misura();
      gl.viewport(0, 0, tela.width, tela.height);
      gl.uniform1f(loc.yaw, vista.yaw * R); gl.uniform1f(loc.pitch, vista.pitch * R);
      gl.uniform1f(loc.tf, Math.tan(fov() / 2 * R)); gl.uniform1f(loc.asp, palco.clientWidth / palco.clientHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (sporco) mettiPunti();
    sporco = false;
  }

  // ---------- movimento: trascinare, frecce, giro lento da solo (mai con «riduci movimento»)
  function limita() {
    vista.yaw = ((vista.yaw + 540) % 360) - 180;
    vista.pitch = Math.max(-50, Math.min(30, vista.pitch));
    sporco = true;
  }
  var ultimo = 0;
  function ciclo(t) {
    var dt = Math.min(0.05, (t - (ultimo || t)) / 1000); ultimo = t;
    if (meta) {
      var d = ((meta.yaw - vista.yaw + 540) % 360) - 180, k = calmo ? 1 : Math.min(1, dt * 6);
      vista.yaw += d * k; vista.pitch += (meta.pitch - vista.pitch) * k; limita();
      if (Math.abs(d) < 0.2 && Math.abs(meta.pitch - vista.pitch) < 0.2) meta = null;
    } else if (!calmo && pronto && !aperta && !inGiro && !giro && t - ultimoTocco > 2500) {
      vista.yaw += dt * 3; limita();                  // 3° al secondo
    }
    disegna();
    if (visibile && !document.hidden) requestAnimationFrame(ciclo); else ultimo = 0;
  }
  function riparti() { if (visibile && !document.hidden) { ultimo = 0; requestAnimationFrame(ciclo); } }

  var giu = null;
  palco.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button, a, .wow-scheda')) return;
    giu = { x: e.clientX, y: e.clientY, yaw: vista.yaw, pitch: vista.pitch, id: e.pointerId, tipo: e.pointerType };
    inGiro = true; meta = null; ultimoTocco = performance.now(); palco.classList.add('toccato');
    try { palco.setPointerCapture(e.pointerId); } catch (er) { }
  });
  palco.addEventListener('pointermove', function (e) {
    if (!giu || e.pointerId !== giu.id) return;
    var gradi = fov() / palco.clientHeight;
    vista.yaw = giu.yaw - (e.clientX - giu.x) * gradi;
    if (giu.tipo === 'mouse') vista.pitch = giu.pitch + (e.clientY - giu.y) * gradi;   // sul telefono il su/giù fa scorrere la pagina
    limita(); ultimoTocco = performance.now();
    if (aperta && Math.abs(e.clientX - giu.x) > 12) chiudi(false);
  });
  function su() { giu = null; inGiro = false; ultimoTocco = performance.now(); }
  palco.addEventListener('pointerup', su); palco.addEventListener('pointercancel', su);
  palco.addEventListener('keydown', function (e) {
    if (e.target !== palco) return;
    var passi = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
    if (!passi) return;
    e.preventDefault(); meta = null; palco.classList.add('toccato'); vista.yaw += passi[0]; vista.pitch += passi[1]; limita(); ultimoTocco = performance.now();
  });

  // ---------- schede
  function guarda(b) {               // il punto va sopra il centro: sotto ci sono la scheda (telefono) o il titolo (PC)
    meta = { yaw: +b.dataset.yaw, pitch: Math.max(-50, +b.dataset.pitch - fov() * 0.22) }; ultimoTocco = performance.now();
  }
  function apri(zona, da) {
    var s = document.getElementById('wow-s-' + zona), b = palco.querySelector('.wow-punto[data-zona="' + zona + '"]');
    if (!s) return;
    if (aperta && aperta !== s) aperta.hidden = true;
    aperta = s; apriDa = da || b; s.hidden = false; schede.classList.add('su');
    punti.concat(chips).forEach(function (x) { x.setAttribute('aria-expanded', x.dataset.zona === zona ? 'true' : 'false'); });
    if (b) guarda(b);
    var h = s.querySelector('h2'); if (h) h.focus({ preventScroll: true });
    if (window.innerWidth < 760 && da && da.classList.contains('wow-chip')) palco.scrollIntoView({ block: 'start', behavior: calmo ? 'auto' : 'smooth' });
  }
  function chiudi(rimettiFuoco) {
    if (!aperta) return;
    aperta.hidden = true; aperta = null; schede.classList.remove('su');
    punti.concat(chips).forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
    if (rimettiFuoco !== false && apriDa) apriDa.focus({ preventScroll: true });
    ultimoTocco = performance.now();
  }
  punti.forEach(function (b) {
    b.addEventListener('click', function () { apri(b.dataset.zona, b); });
    b.addEventListener('focus', function () {
      mettiPunti();                                    // posizioni aggiornate prima di decidere (frecce appena premute)
      if (b.classList.contains('fuori')) guarda(b);
      ultimoTocco = performance.now();
    });
  });
  chips.forEach(function (c) { c.addEventListener('click', function () { apri(c.dataset.zona, c); }); });
  [].forEach.call(palco.querySelectorAll('.wow-chiudi'), function (x) { x.addEventListener('click', function () { chiudi(); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && aperta) chiudi(); });

  // ---------- «Muovi il telefono»: solo col giroscopio, permesso di iOS chiesto SOLO al tocco, mai con «riduci movimento»
  var muovi = document.querySelector('.wow-muovi'), giro = null;
  function suOrientamento(e) {
    if (e.alpha == null || !giro) return;
    var girato = Math.abs((screen.orientation && screen.orientation.angle) || window.orientation || 0) === 90;
    if (giro.a0 == null) { giro.a0 = e.alpha; giro.b0 = girato ? e.gamma : e.beta; giro.yaw = vista.yaw; giro.pitch = vista.pitch; }
    var da = ((e.alpha - giro.a0 + 540) % 360) - 180, db = (girato ? e.gamma : e.beta) - giro.b0;
    vista.yaw = giro.yaw - da; vista.pitch = giro.pitch + (girato ? -db : db) * 0.8; limita(); ultimoTocco = performance.now();
  }
  function accendiGiro() {
    giro = { a0: null }; muovi.setAttribute('aria-pressed', 'true');
    window.addEventListener('deviceorientation', suOrientamento);
  }
  function spegniGiro() {
    giro = null; muovi.setAttribute('aria-pressed', 'false');
    window.removeEventListener('deviceorientation', suOrientamento);
  }
  if (muovi && !calmo && 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      muovi.hidden = false;                          // iPhone e iPad: il giroscopio c'è, il permesso si chiede al tocco
    } else {
      var prova = function (e) {                      // altri: il bottone compare solo se arriva davvero un dato del giroscopio
        if (e.alpha == null) return;                  // (senza sensore Chrome manda un evento vuoto: si aspetta ancora)
        window.removeEventListener('deviceorientation', prova);
        muovi.hidden = false;
      };
      window.addEventListener('deviceorientation', prova);
      setTimeout(function () { window.removeEventListener('deviceorientation', prova); }, 4000);   // nessun dato vero: si smette (f0)
    }
    muovi.addEventListener('click', function () {
      if (giro) { spegniGiro(); return; }
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(function (r) {
          if (r === 'granted') accendiGiro(); else muovi.remove();   // negato: il bottone sparisce, senza avvisi
        }).catch(function () { muovi.remove(); });
      } else {
        accendiGiro();
      }
    });
    palco.addEventListener('pointerdown', function () { if (giro) giro.a0 = null; });   // col dito si riparte da dove si è
  }

  // ---------- avvio: punti e zone visibili solo con il JS; panorama dopo il load e quando il palco si vede
  [].forEach.call(document.querySelectorAll('.wow-js'), function (x) { x.hidden = false; });
  // vista di partenza (uguale alle immagini ferme di prepara_media.py): sul PC cottura a sinistra e pass con la sala a destra,
  // sul telefono il pass con la sala
  var largo = matchMedia('(min-width: 900px)').matches;
  vista.yaw = largo ? 45 : 82; vista.pitch = largo ? -8 : -14;
  var gl_ok = preparaGL();
  if (!gl_ok) palco.classList.add('senza-3d');      // resta l'immagine ferma: niente punti sopra, le zone sotto funzionano
  window.addEventListener('resize', function () { sporco = true; riparti(); });
  document.addEventListener('visibilitychange', riparti);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (v) { visibile = v[0].isIntersecting; riparti(); }).observe(palco);
  }
  function parti() {
    mettiPunti();
    if (gl_ok) (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(caricaPanorama);
    riparti();
  }
  if (document.readyState === 'complete') parti(); else window.addEventListener('load', parti);
})();
