/* conteggio anonimo delle visite: niente cookie, niente IP salvati (vedi /privacy.html) */
try{if(navigator.sendBeacon&&navigator.doNotTrack!=='1'&&!navigator.globalPrivacyControl)navigator.sendBeacon('https://app.brigaplan.ai/api/visita',JSON.stringify({p:location.pathname,l:(document.documentElement.lang||'it').slice(0,2),r:document.referrer}))}catch(e){}
