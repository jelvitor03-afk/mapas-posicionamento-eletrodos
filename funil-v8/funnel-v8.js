(function () {
  'use strict';

  var TRACKED_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'fbclid',
    'src',
    'sck',
    'xcod'
  ];
  var STORAGE_MAP_KEY = 'em_funnel_utm_v8';
  var STORAGE_SRC_KEY = 'em_src';

  function readJsonStorage(key) {
    try {
      var raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function writeJsonStorage(key, obj) {
    try {
      var str = JSON.stringify(obj);
      sessionStorage.setItem(key, str);
      localStorage.setItem(key, str);
    } catch (e) {}
  }

  function readStringStorage(key) {
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
    } catch (e) {
      return '';
    }
  }

  function writeStringStorage(key, val) {
    try {
      sessionStorage.setItem(key, val);
      localStorage.setItem(key, val);
    } catch (e) {}
  }

  function inferReferrerSource() {
    var ref = (document.referrer || '').toLowerCase();
    if (ref.indexOf('instagram') !== -1) return 'instagram_bio';
    if (ref.indexOf('facebook') !== -1 || ref.indexOf('fb.com') !== -1) return 'facebook_organico';
    if (ref.indexOf('tiktok') !== -1) return 'tiktok_organico';
    if (ref.indexOf('google') !== -1) return 'google_organico';
    if (ref.indexOf('whatsapp') !== -1 || ref.indexOf('wa.me') !== -1) return 'whatsapp';
    return 'funil_v8';
  }

  function collectAttribution() {
    var currentParams = new URLSearchParams(window.location.search);
    var storedMap = readJsonStorage(STORAGE_MAP_KEY);
    var merged = {};

    TRACKED_KEYS.forEach(function (k) {
      var fromUrl = currentParams.get(k);
      if (fromUrl) {
        merged[k] = fromUrl;
      } else if (storedMap[k]) {
        merged[k] = storedMap[k];
      }
    });

    var srcValue = merged.src || merged.utm_source || readStringStorage(STORAGE_SRC_KEY);
    if (!srcValue) {
      srcValue = inferReferrerSource();
    }
    if (!merged.src) {
      merged.src = srcValue;
    }

    var sckParts = [srcValue];
    if (merged.utm_campaign) sckParts.push(merged.utm_campaign);
    if (merged.utm_content) sckParts.push(merged.utm_content);
    var defaultSck = sckParts.join('|').slice(0, 40);

    if (!merged.sck) merged.sck = defaultSck;
    if (!merged.xcod) merged.xcod = defaultSck;

    writeJsonStorage(STORAGE_MAP_KEY, merged);
    writeStringStorage(STORAGE_SRC_KEY, srcValue);

    return {
      params: merged,
      srcValue: srcValue,
      defaultSck: defaultSck
    };
  }

  function decorateHotmartLinks(attr) {
    document.querySelectorAll('a[href*="pay.hotmart.com"]').forEach(function (link) {
      try {
        var targetUrl = new URL(link.getAttribute('href'));
        TRACKED_KEYS.forEach(function (key) {
          if (attr.params[key] && !targetUrl.searchParams.has(key)) {
            targetUrl.searchParams.set(key, attr.params[key]);
          }
        });
        if (!targetUrl.searchParams.has('checkoutMode')) targetUrl.searchParams.set('checkoutMode', '10');
        if (!targetUrl.searchParams.has('locale')) targetUrl.searchParams.set('locale', 'pt_PT');
        if (!targetUrl.searchParams.has('src')) targetUrl.searchParams.set('src', attr.srcValue);
        if (!targetUrl.searchParams.has('sck')) targetUrl.searchParams.set('sck', attr.defaultSck);
        if (!targetUrl.searchParams.has('xcod')) targetUrl.searchParams.set('xcod', attr.defaultSck);
        link.href = targetUrl.toString();
      } catch (e) {}
    });
  }

  function decorateInternalLinks(attr) {
    document.querySelectorAll('a[data-carry]').forEach(function (link) {
      try {
        var rawHref = link.getAttribute('href');
        if (!rawHref) return;
        var targetUrl = new URL(rawHref, window.location.href);
        TRACKED_KEYS.forEach(function (key) {
          if (attr.params[key] && !targetUrl.searchParams.has(key)) {
            targetUrl.searchParams.set(key, attr.params[key]);
          }
        });
        link.setAttribute('href', targetUrl.pathname + targetUrl.search + targetUrl.hash);
      } catch (e) {}
    });
  }

  function bindCheckoutTracking() {
    document.querySelectorAll('.js-checkout-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (window.location.pathname.indexOf('upgrade-completo') !== -1) {
          writeStringStorage('em_v8_upgraded_ts', String(Date.now()));
        }
        if (typeof window.__bootFb === 'function') {
          window.__bootFb();
        }
        var val = parseFloat(this.getAttribute('data-value')) || 0;
        var plan = this.getAttribute('data-plan') || 'oferta';
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'InitiateCheckout', {
            value: val,
            currency: 'EUR',
            content_name: 'ElectroMapas Funil V8 - ' + plan
          });
        }
      });
    });
  }

  function bindSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var id = this.getAttribute('href');
        if (!id || id === '#') return;
        var target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function bindLightbox() {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    var lbImg = document.getElementById('lightbox-img');
    var lbTitle = document.getElementById('lightbox-title');
    var lbStage = document.getElementById('lightbox-stage');
    var lbClose = document.getElementById('lb-close');
    var lbZoom = document.getElementById('lb-zoom');
    var lbPrev = document.getElementById('lb-prev');
    var lbNext = document.getElementById('lb-next');
    var triggers = Array.prototype.slice.call(document.querySelectorAll('.preview-zoom-btn'));
    var currentIndex = -1;
    var lastTrigger = null;

    function setZoom(zoomed) {
      if (!lbStage || !lbZoom) return;
      lbStage.classList.toggle('is-zoomed', zoomed);
      lbZoom.setAttribute('aria-pressed', zoomed ? 'true' : 'false');
      lbZoom.textContent = zoomed ? 'Ajustar ao ecrã' : 'Ampliar 1,75×';
    }

    function openItem(src, caption, idx) {
      if (!lbImg) return;
      lbImg.src = src;
      lbImg.alt = caption || 'Pré-visualização do material';
      if (lbTitle) lbTitle.textContent = caption || 'Pré-visualização';
      currentIndex = typeof idx === 'number' ? idx : -1;
      if (lbPrev) lbPrev.style.display = triggers.length > 1 && currentIndex >= 0 ? 'inline-flex' : 'none';
      if (lbNext) lbNext.style.display = triggers.length > 1 && currentIndex >= 0 ? 'inline-flex' : 'none';
      setZoom(false);
      lightbox.hidden = false;
      lightbox.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      if (lightbox.hidden) return;
      lightbox.classList.remove('is-open');
      lightbox.hidden = true;
      document.body.style.overflow = '';
      setZoom(false);
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
    }

    triggers.forEach(function (btn, idx) {
      btn.addEventListener('click', function () {
        lastTrigger = this;
        openItem(this.getAttribute('data-src'), this.getAttribute('data-caption'), idx);
        if (lbClose) lbClose.focus();
      });
    });

    document.querySelectorAll('.preview-meta-zoom').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-idx'), 10);
        var trg = triggers[idx];
        if (trg) {
          lastTrigger = this;
          openItem(trg.getAttribute('data-src'), trg.getAttribute('data-caption'), idx);
          if (lbClose) lbClose.focus();
        }
      });
    });

    if (lbClose) lbClose.addEventListener('click', closeLightbox);

    if (lbZoom) {
      lbZoom.addEventListener('click', function () {
        var nextZoom = lbZoom.getAttribute('aria-pressed') !== 'true';
        setZoom(nextZoom);
      });
    }

    if (lbPrev) {
      lbPrev.addEventListener('click', function () {
        if (currentIndex < 0 || triggers.length === 0) return;
        var prevIdx = (currentIndex - 1 + triggers.length) % triggers.length;
        var trg = triggers[prevIdx];
        openItem(trg.getAttribute('data-src'), trg.getAttribute('data-caption'), prevIdx);
      });
    }

    if (lbNext) {
      lbNext.addEventListener('click', function () {
        if (currentIndex < 0 || triggers.length === 0) return;
        var nextIdx = (currentIndex + 1) % triggers.length;
        var trg = triggers[nextIdx];
        openItem(trg.getAttribute('data-src'), trg.getAttribute('data-caption'), nextIdx);
      });
    }

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox || e.target === lbStage) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (!lightbox.hidden) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight' && lbNext && currentIndex >= 0) lbNext.click();
        if (e.key === 'ArrowLeft' && lbPrev && currentIndex >= 0) lbPrev.click();
      }
    });
  }

  function maybeRedirectUpgradeToObrigado() {
    if (window.location.pathname.indexOf('upsell-pro') === -1) return false;
    var params = new URLSearchParams(window.location.search);
    var isUpgradeOff = params.get('off') === '5k28agkz';
    var ts = parseInt(readStringStorage('em_v8_upgraded_ts'), 10) || 0;
    var isRecentUpgrade = ts > 0 && (Date.now() - ts < 2 * 3600 * 1000);
    if (!isUpgradeOff && !isRecentUpgrade) return false;
    try {
      sessionStorage.removeItem('em_v8_upgraded_ts');
      localStorage.removeItem('em_v8_upgraded_ts');
    } catch (e) {}
    window.location.replace('/funil-v8/obrigado-completo' + window.location.search);
    return true;
  }

  function init() {
    if (maybeRedirectUpgradeToObrigado()) return;
    var attr = collectAttribution();
    decorateHotmartLinks(attr);
    decorateInternalLinks(attr);
    bindCheckoutTracking();
    bindSmoothAnchors();
    bindLightbox();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
