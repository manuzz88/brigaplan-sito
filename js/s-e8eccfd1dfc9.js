(function () {
  var video = document.querySelectorAll(".esempio video");
  var fermo = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fermo || !("IntersectionObserver" in window)) return;
  var oss = new IntersectionObserver(function (voci) {
    voci.forEach(function (v) {
      if (v.isIntersecting) { var p = v.target.play(); if (p && p.catch) p.catch(function () {}); }
      else { v.target.pause(); }
    });
  }, { threshold: 0.5 });
  video.forEach(function (v) { oss.observe(v); });
})();
