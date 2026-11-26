/* Barra della lingua (schizzo della Chat sito, 26/11/2026; regia + sì di Manuel). Per tutte le pagine del sito.
   Se la prima delle lingue del browser che abbiamo è diversa da quella della pagina, e la pagina esiste in quella lingua
   (link hreflang della pagina stessa), compare una barra fissa in alto, nella lingua del browser, con il link e una X.
   Niente spostamento automatico, niente cookie: la chiusura si ricorda solo per la sessione (sessionStorage, in try/catch).
   Fissa sopra la testata: non sposta il contenuto. */
(function () {
  'use strict';
  try {
    var CSS = '.lingua-barra{position: fixed;z-index: 1000;top: 0;left: 0;right: 0;display: flex;align-items: center;gap: 6px 14px;flex-wrap: wrap;padding: 8px 56px 8px max(16px, env(safe-area-inset-left, 0px));padding-top: max(8px, env(safe-area-inset-top, 0px));background: var(--lime);color: var(--nero);font: 600 .9rem/1.3 var(--f-body);box-shadow: 0 6px 24px rgba(0,0,0,.3);} .lingua-barra p{margin: 0;} .lingua-barra a{color: var(--nero);font-weight: 800;text-decoration: underline;text-underline-offset: 3px;min-height: 32px;display: inline-flex;align-items: center;} .lingua-barra a:focus-visible, .lingua-x:focus-visible{outline: 2px solid var(--nero);outline-offset: 2px;} .lingua-x{position: absolute;right: 6px;top: 50%;transform: translateY(-50%);width: 44px;height: 44px;border: 0;border-radius: 50%;background: transparent;color: var(--nero);cursor: pointer;display: grid;place-items: center;} .lingua-x svg{width: 20px;height: 20px;}';
    var T = {
      it: ['Questa pagina c’è anche in italiano.', 'Passa all’italiano', 'Chiudi'],
      en: ['This page is also available in English.', 'Switch to English', 'Close'],
      de: ['Diese Seite gibt es auch auf Deutsch.', 'Zu Deutsch wechseln', 'Schließen'],
      fr: ['Cette page existe aussi en français.', 'Passer au français', 'Fermer'],
      es: ['Esta página también está en español.', 'Cambiar a español', 'Cerrar'],
      nl: ['Deze pagina is er ook in het Nederlands.', 'Naar het Nederlands', 'Sluiten'],
      zh: ['本页面也有中文版。', '切换到中文', '关闭']
    };
    var pagina = (document.documentElement.lang || 'it').slice(0, 2).toLowerCase();
    var prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']);
    var lg = null;
    for (var i = 0; i < prefs.length; i++) {
      var c = String(prefs[i] || '').slice(0, 2).toLowerCase();
      if (T[c]) { lg = c; break; }                // la prima lingua del browser che abbiamo
    }
    if (!lg || lg === pagina) return;
    var KEY = 'bp-lingua-chiusa';
    try { if (sessionStorage.getItem(KEY) === lg) return; } catch (e) { }
    var alt = null;
    [].forEach.call(document.querySelectorAll('link[rel="alternate"][hreflang]'), function (l) {
      var h = l.getAttribute('hreflang').toLowerCase();
      if (h !== 'x-default' && h.slice(0, 2) === lg) alt = l.getAttribute('href');
    });
    if (!alt) return;                               // la pagina non c'è in quella lingua
    var t = T[lg];
    var barra = document.createElement('div');
    barra.className = 'lingua-barra';
    barra.setAttribute('role', 'region');
    barra.setAttribute('aria-label', t[1]);
    barra.lang = lg === 'zh' ? 'zh-Hans' : lg;
    barra.innerHTML = '<p></p><a></a><button type="button" class="lingua-x"><svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>';
    barra.querySelector('p').textContent = t[0];
    var a = barra.querySelector('a');
    a.textContent = t[1] + ' →'; a.href = alt; a.hreflang = barra.lang;
    var x = barra.querySelector('button');
    x.setAttribute('aria-label', t[2]);
    x.addEventListener('click', function () {
      barra.remove();
      try { sessionStorage.setItem(KEY, lg); } catch (e) { }
    });
    if (!document.getElementById('lingua-barra-stile')) {         // stile dentro lo script: niente pagine.css vecchio in cache
      var st = document.createElement('style'); st.id = 'lingua-barra-stile';
      st.textContent = CSS; document.head.appendChild(st);
    }
    document.body.insertBefore(barra, document.body.firstChild);   // primo nel giro del tabulatore, senza rubare il fuoco
  } catch (e) { }
})();
