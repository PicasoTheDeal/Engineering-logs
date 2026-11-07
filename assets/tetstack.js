(function () {
  var doc = document, root = doc.documentElement;
  root.classList.add('js');
  var g = doc.getElementById('grain');
  if (g) {
    var c = doc.createElement('canvas'); c.width = c.height = 200;
    var x = c.getContext('2d'), d = x.createImageData(200, 200), p = d.data;
    for (var i = 0; i < p.length; i += 4) { var v = Math.random() < 0.5 ? 0 : 255; p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = Math.random() * 80; }
    x.putImageData(d, 0, 0);
    g.style.backgroundImage = 'url(' + c.toDataURL('image/png') + ')';
  }
  var btn = doc.getElementById('theme') || doc.getElementById('theme-toggle'), lbl = doc.getElementById('theme-lbl'), meta = doc.querySelector('meta[name="theme-color"]');
  function apply(light, save) {
    root.classList.toggle('light', light);
    var t = light ? 'Dark' : 'Light';
    if (lbl) lbl.textContent = t; else if (btn) btn.textContent = t;
    if (btn) { btn.setAttribute('aria-pressed', light ? 'true' : 'false'); btn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme'); }
    if (meta) meta.setAttribute('content', light ? '#ebe3d2' : '#0c1118');
    if (save) { try { localStorage.setItem('tetstack-theme', light ? 'light' : 'dark'); } catch (e) {} }
  }
  if (btn) btn.addEventListener('click', function () { apply(!root.classList.contains('light'), true); });
  apply(root.classList.contains('light'), false);
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.08 }) : null;
  window.TS = {
    reveal: function (scope) {
      (scope || doc).querySelectorAll('.rv:not(.in)').forEach(function (el) { if (io) io.observe(el); else el.classList.add('in'); });
    }
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { TS.reveal(); }); else TS.reveal();
})();
