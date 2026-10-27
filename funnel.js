/* ElectroMapas post-purchase funnel — shared behaviour.
 * - Language: ?lang= > saved choice (shared with landing page key) > browser > pt
 * - i18n: elements with data-i18n (text) / data-i18n-html (trusted static markup from PAGE_I18N)
 * - Hotmart 1-click widget with automatic fallback to the classic checkout link
 * - Query-string passthrough (utm_*, sck, src, fbclid, lang) on internal links and checkout fallback
 */
(function () {
  'use strict';

  var SUPPORTED = ['pt', 'es', 'en'];
  var LOCALE = { pt: 'pt_PT', es: 'es_ES', en: 'en_US' };
  var STORAGE_KEY = 'fv_lang_choice';
  var PASS_KEYS = /^(utm_[a-z]+|sck|src|fbclid|xcod|lang)$/i;
  var WIDGET_TIMEOUT_MS = 3500;

  var params = new URLSearchParams(window.location.search);
  var dict = window.PAGE_I18N || {};

  function normalize(code) {
    code = String(code || '').toLowerCase().slice(0, 2);
    if (SUPPORTED.indexOf(code) !== -1) return code;
    if (code === 'fr' || code === 'it' || code === 'de') return 'en';
    return null;
  }

  function detectLang() {
    var fromUrl = normalize(params.get('lang'));
    if (fromUrl) return fromUrl;
    try {
      var saved = normalize(localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch (e) { /* storage blocked (private mode) — fall through */ }
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'pt';
    return normalize(nav) || 'pt';
  }

  var lang = detectLang();

  function t(key) {
    var table = dict[lang] || {};
    if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
    return null;
  }

  function applyLang() {
    document.documentElement.lang = lang === 'pt' ? 'pt-PT' : lang === 'es' ? 'es-ES' : 'en';
    var title = t('title');
    if (title) document.title = title;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (v !== null) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-html'));
      if (v !== null) el.innerHTML = v; // static, author-controlled strings only
    });
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
    rewriteLinks();
  }

  function passthroughQuery(extra) {
    var out = new URLSearchParams();
    params.forEach(function (value, key) {
      if (PASS_KEYS.test(key)) out.set(key, value);
    });
    out.set('lang', lang);
    if (extra) Object.keys(extra).forEach(function (k) { out.set(k, extra[k]); });
    return out;
  }

  function rewriteLinks() {
    document.querySelectorAll('a[data-carry]').forEach(function (a) {
      var base = a.getAttribute('data-base') || a.getAttribute('href');
      a.setAttribute('data-base', base);
      var url = new URL(base, window.location.origin);
      passthroughQuery().forEach(function (v, k) { url.searchParams.set(k, v); });
      a.setAttribute('href', url.pathname + url.search + url.hash);
    });
    document.querySelectorAll('a[data-checkout]').forEach(function (a) {
      var base = a.getAttribute('data-checkout');
      var url = new URL(base);
      url.searchParams.set('checkoutMode', '10');
      url.searchParams.set('locale', LOCALE[lang]);
      params.forEach(function (value, key) {
        if (PASS_KEYS.test(key) && key.toLowerCase() !== 'lang') url.searchParams.set(key, value);
      });
      a.setAttribute('href', url.toString());
    });
  }

  function bindLangSwitch() {
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.addEventListener('click', function () {
        lang = b.getAttribute('data-lang');
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
        applyLang();
      });
    });
  }

  function showFallback(reason) {
    var fb = document.querySelector('.fallback');
    if (fb && fb.hidden) {
      fb.hidden = false;
      if (window.console) console.info('[funnel] classic checkout shown:', reason);
    }
  }

  function hasHotmartFunnelParams() {
    var keys = ['token', 'hsrc', 'transaction', 'order', 'funnel', 'Funnel'];
    for (var i = 0; i < keys.length; i++) {
      if (params.has(keys[i]) && params.get(keys[i])) return true;
    }
    return false;
  }

  function mountHotmartWidget() {
    var host = document.getElementById('hotmart-sales-funnel');
    if (!host) return;
    // Only mount the Hotmart 1-click iframe when the visitor arrives with real Hotmart funnel parameters.
    // Otherwise Hotmart's script injects an error iframe and hides the fallback checkout button.
    if (!hasHotmartFunnelParams()) {
      showFallback('direct visit without Hotmart funnel token');
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://checkout.hotmart.com/lib/hotmart-checkout-elements.js';
    s.async = true;
    s.onload = function () {
      try {
        if (window.checkoutElements) {
          window.checkoutElements.init('salesFunnel').mount('#hotmart-sales-funnel');
        } else {
          showFallback('checkoutElements missing');
        }
      } catch (e) {
        showFallback('mount error: ' + (e && e.message));
      }
    };
    s.onerror = function () { showFallback('widget script failed to load'); };
    document.head.appendChild(s);
    setTimeout(function () {
      if (!host.children.length || host.offsetHeight < 20) showFallback('widget empty after timeout');
    }, WIDGET_TIMEOUT_MS);
  }

  function bindSticky() {
    var bar = document.querySelector('.sticky');
    var target = document.getElementById('oferta');
    if (!bar || !target || !('IntersectionObserver' in window)) return;
    var hero = document.querySelector('h1');
    var heroGone = false;
    var offerVisible = false;
    function update() { bar.classList.toggle('show', heroGone && !offerVisible); }
    new IntersectionObserver(function (e) { heroGone = !e[0].isIntersecting && e[0].boundingClientRect.top < 0; update(); }).observe(hero);
    new IntersectionObserver(function (e) { offerVisible = e[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(target);
  }

  // The HTML is authored in pt-PT; snapshot it so switching back to PT restores the original copy.
  function snapshotDefaults() {
    var pt = dict.pt = dict.pt || {};
    if (!pt.title) pt.title = document.title;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (!(k in pt)) pt[k] = el.textContent;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-html');
      if (!(k in pt)) pt[k] = el.innerHTML;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    snapshotDefaults();
    bindLangSwitch();
    applyLang();
    mountHotmartWidget();
    bindSticky();
  });
})();
