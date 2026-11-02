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
  var PASS_KEYS = /^(utm_[a-z0-9_]+|sck|src|fbclid|xcod|lang|name|email|phone|phone_number|phone_local_code|phone_ac|transaction|tx|hp|order|license)$/i;
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

  var NON_PAID_RE = /^(direct|site-direto|site_direto|ig-bio|instagram_bio|fb-org|facebook_organico|tt-org|tiktok_organico|google-org|google_organico|whatsapp)$/i;
  var STAGE_SUFFIX_RE = /\|(u1|d1|u2|u-us|u-lz|u-cm|ob1|ob2|ob3)$/i;
  var STAGE_ONLY_RE = /^(u1|d1|u2|u-us|u-lz|u-cm|ob1|ob2|ob3|funnel.*)$/i;
  var TRACKING_KEYS = ['em_first_sck', 'em_first_src', 'em_first_utm', 'em_first_time', 'em_last_sck', 'em_last_src', 'em_last_utm', 'em_last_time', 'em_sck', 'em_src', 'em_visit_fallback'];
  var COOKIE_KEYS = ['em_first_sck', 'em_first_src', 'em_last_sck', 'em_last_src', 'em_sck', 'em_src', 'em_visit_fallback'];
  var ATTR_PARAM_RE = /^(sck|src|xcod|fbclid|gclid|utm_[a-z0-9_]+)$/i;
  var FUNCTIONAL_KEYS = /^(lang|name|email|phone|phone_number|phone_local_code|phone_ac|transaction|tx|hp|order|license)$/i;

  function sanitizeToken(str) {
    if (!str) return '';
    var s = String(str).trim().replace(/_/g, '-');
    s = s.replace(/[^a-zA-Z0-9\-|]/g, '');
    s = s.replace(/-+/g, '-').replace(/\|+/g, '|');
    return s.replace(/^[|\-]+|[|\-]+$/g, '');
  }

  function compactNumericId(s) {
    var mMeta = s.match(/^120250(\d{8})0381$/);
    if (mMeta) return mMeta[1];
    var tail = s.slice(-14);
    var num = parseInt(tail, 10);
    if (!isNaN(num) && num > 0) return num.toString(36);
    return s.slice(-8);
  }

  function compactSource(raw) {
    var s = sanitizeToken(raw).toLowerCase().replace(/\|/g, '');
    if (!s) return '';
    var map = {
      'an': 'an', 'audiencenetwork': 'an', 'audience-network': 'an',
      'ig': 'ig', 'insta': 'ig', 'instagram': 'ig', 'ig-ad': 'ig',
      'fb': 'fb', 'facebook': 'fb', 'meta': 'fb', 'fb-ad': 'fb',
      'tt': 'tt', 'tiktok': 'tt',
      'gg': 'gg', 'google': 'gg', 'adwords': 'gg', 'gads': 'gg',
      'wa': 'wa', 'whatsapp': 'wa'
    };
    if (map[s]) return map[s];
    if (/^(fb|ig|an|tt|gg)-\d+/.test(s)) return s.slice(0, 2);
    return s.slice(0, 4).replace(/-+$/g, '');
  }

  function compactCampaign(raw) {
    var s = sanitizeToken(raw).toLowerCase().replace(/\|/g, '');
    if (!s) return '';
    var map = {
      'novos-criativos': 'nc',
      'criativos-abo-copia': 'caboc',
      'criativos-copia': 'caboc',
      'criativos-abo': 'cabo',
      'criativos': 'cr'
    };
    if (map[s]) return map[s];
    if (/^\d{10,}$/.test(s)) return compactNumericId(s);
    if (s.length <= 8) return s;
    if (s.indexOf('-') !== -1) {
      var words = s.split('-').filter(Boolean);
      var acr = words.map(function(w) {
        if (/^\d+$/.test(w)) return w;
        var num = w.match(/\d+/);
        return w.charAt(0) + (num ? num[0] : '');
      }).join('');
      if (acr.length >= 2 && acr.length <= 6) return acr;
    }
    return (s.slice(0, 4) + s.slice(-2)).replace(/-+/g, '');
  }

  function compactCreative(raw) {
    var s = sanitizeToken(raw).toLowerCase().replace(/\|/g, '');
    if (!s) return '';
    var map = {
      'criativo1': 'c1', 'criativo-1': 'c1',
      'criativo2': 'c2', 'criativo-2': 'c2',
      'criativo3': 'c3', 'criativo-3': 'c3', 'xriativo3': 'c3', 'xriativo-3': 'c3',
      'copia1': 'cp1', 'copia-1': 'cp1',
      'copia2': 'cp2', 'copia-2': 'cp2',
      'mapa-detlha': 'md', 'mapadetlha': 'md', 'mapa-detalhe': 'md',
      'mapa-detlha-copia': 'mdc', 'mapadetlha-copia': 'mdc', 'mapa-detalhe-copia': 'mdc'
    };
    if (map[s]) return map[s];
    var mCriativo = s.match(/^x?criativo-?(\d+)(?:-(copia\d*|c\d*))?$/);
    if (mCriativo) return 'c' + mCriativo[1] + (mCriativo[2] ? 'c' : '');
    var mCopia = s.match(/^copia-?(\d+)$/);
    if (mCopia) return 'cp' + mCopia[1];
    var mMapa = s.match(/^mapa-?det(?:lha|alhe)-?(\d+|copia\d*)$/);
    if (mMapa) return 'md' + (mMapa[1].indexOf('copia') === 0 ? 'c' + mMapa[1].slice(5) : mMapa[1]);
    if (/^\d{10,}$/.test(s)) return compactNumericId(s);
    if (s.length <= 12) return s;
    var parts = s.split('-').filter(Boolean);
    if (parts.length >= 2) {
      var first = parts[0].slice(0, 5);
      var last = parts[parts.length - 1].slice(-4);
      var mid = parts.slice(1, -1).map(function(w) { return w.charAt(0); }).join('').slice(0, 2);
      var comp = mid ? (first + '-' + mid + '-' + last) : (first + '-' + last);
      return comp.slice(0, 12).replace(/^-+|-+$/g, '');
    }
    return s.slice(0, 7) + '-' + s.slice(-4);
  }

  function normalizeBaseSck(rawSck, srcVal, rawCamp, rawCont) {
    var cleaned = sanitizeToken(rawSck).replace(STAGE_SUFFIX_RE, '');
    if (cleaned && !STAGE_ONLY_RE.test(cleaned)) {
      var segs = cleaned.split('|').filter(Boolean);
      if (segs.length >= 3) {
        return [compactSource(segs[0]), compactCampaign(segs[1]), compactCreative(segs.slice(2).join('-'))].filter(Boolean).join('|');
      } else if (segs.length === 2) {
        return [compactSource(segs[0]), compactCreative(segs[1])].filter(Boolean).join('|');
      } else if (segs.length === 1) {
        return NON_PAID_RE.test(segs[0]) ? segs[0].toLowerCase() : compactCreative(segs[0]);
      }
    }
    var parts = [];
    if (srcVal) parts.push(compactSource(srcVal));
    if (rawCamp) parts.push(compactCampaign(rawCamp));
    if (rawCont) parts.push(compactCreative(rawCont));
    return parts.filter(Boolean).join('|');
  }

  function formatCookie(name, value, maxAgeSec, proto) {
    var age = typeof maxAgeSec === 'number' ? maxAgeSec : 2592000;
    var p = proto || (window.location && window.location.protocol) || '';
    var sec = (p === 'https:') ? '; Secure' : '';
    return name + '=' + encodeURIComponent(value) + '; path=/; max-age=' + age + '; SameSite=Lax' + sec;
  }

  function setCookie(name, value, maxAgeSec) {
    try {
      document.cookie = formatCookie(name, value, maxAgeSec);
    } catch (e) {}
  }

  function deleteCookie(name) {
    try {
      document.cookie = formatCookie(name, '', 0);
    } catch (e) {}
  }

  function getCookie(name) {
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  }

  function getConsentState() {
    try {
      var c = localStorage.getItem('em_consent') || getCookie('em_consent');
      if (c === 'denied') return 'denied';
      if (c === 'granted') return 'granted';
    } catch (e) {}
    return 'granted';
  }

  function purgeTrackingStorage() {
    try {
      TRACKING_KEYS.forEach(function (k) {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
    } catch (e) {}
    COOKIE_KEYS.forEach(function (k) { deleteCookie(k); });
  }

  function resolveOrigin() {
    var consent = getConsentState();
    if (consent === 'denied') {
      purgeTrackingStorage();
      return { sck: '', src: '' };
    }
    if (consent !== 'granted') {
      // Estado 'pending': não ler/gravar storage nem transmitir SCK/SRC à Hotmart sem consentimento
      return { sck: '', src: '' };
    }

    var urlSck = params.get('sck') || params.get('xcod') || '';
    var urlSrc = params.get('src') || params.get('utm_source') || '';
    var urlCamp = params.get('utm_campaign') || '';
    var urlCont = params.get('utm_content') || '';

    var mCompSrc = urlSrc.match(/^(fb|ig|an|tt|gg)[_\-](\d{10,})[_\-](\d{10,})$/i);
    if (mCompSrc) {
      if (!urlCamp) urlCamp = mCompSrc[2];
      if (!urlCont) urlCont = mCompSrc[3];
    }

    var originSck = '';
    var originSrc = '';

    // 1. Se URL trouxe parâmetros de campanha/origem válidos e há consentimento ('granted'), normaliza e persiste
    if ((urlSck && !STAGE_ONLY_RE.test(sanitizeToken(urlSck))) || urlSrc || urlCamp || urlCont) {
      originSrc = compactSource(urlSrc || (urlSck ? urlSck.split('|')[0] : '')) || 'ad';
      originSck = normalizeBaseSck(urlSck, originSrc, urlCamp, urlCont) || originSrc;
      if (!NON_PAID_RE.test(originSck)) {
        var utmPayload = JSON.stringify({
          source: sanitizeToken(urlSrc),
          campaign: sanitizeToken(urlCamp),
          content: sanitizeToken(urlCont),
          medium: sanitizeToken(params.get('utm_medium')),
          raw_sck: urlSck,
          raw_src: urlSrc,
          raw_campaign: urlCamp,
          raw_content: urlCont
        });
        var nowIso = new Date().toISOString();
        try {
          var existingFirst = localStorage.getItem('em_first_sck') || getCookie('em_first_sck');
          if (!existingFirst || NON_PAID_RE.test(existingFirst)) {
            localStorage.setItem('em_first_sck', originSck);
            localStorage.setItem('em_first_src', originSrc);
            localStorage.setItem('em_first_utm', utmPayload);
            localStorage.setItem('em_first_time', nowIso);
            setCookie('em_first_sck', originSck);
            setCookie('em_first_src', originSrc);
          }
          localStorage.setItem('em_last_sck', originSck);
          localStorage.setItem('em_last_src', originSrc);
          localStorage.setItem('em_last_utm', utmPayload);
          localStorage.setItem('em_last_time', nowIso);
          localStorage.setItem('em_sck', originSck);
          localStorage.setItem('em_src', originSrc);
          sessionStorage.setItem('em_sck', originSck);
          sessionStorage.setItem('em_src', originSrc);
        } catch (e) {}
        setCookie('em_last_sck', originSck);
        setCookie('em_last_src', originSrc);
        setCookie('em_sck', originSck);
        setCookie('em_src', originSrc);
      }
      return { sck: originSck, src: originSrc };
    }

    // 2. Recuperar Last Paid Touch ou First Paid Touch do storage / cookie (consent === 'granted')
    try {
      originSck = localStorage.getItem('em_last_sck') || localStorage.getItem('em_first_sck') || sessionStorage.getItem('em_sck') || getCookie('em_last_sck') || getCookie('em_first_sck') || getCookie('em_sck') || '';
      originSrc = localStorage.getItem('em_last_src') || localStorage.getItem('em_first_src') || sessionStorage.getItem('em_src') || getCookie('em_last_src') || getCookie('em_first_src') || getCookie('em_src') || '';
    } catch (e) {}

    if (originSck) {
      originSck = normalizeBaseSck(originSck, originSrc, '', '');
      originSrc = NON_PAID_RE.test(originSrc) ? sanitizeToken(originSrc) : (compactSource(originSrc) || (originSck.split('|')[0] || 'direct'));
      return { sck: originSck, src: originSrc };
    }

    // 3. Fallback não-pago (sem contaminar em_first_sck / em_last_sck)
    var fb = 'direct';
    try {
      fb = localStorage.getItem('em_visit_fallback') || sessionStorage.getItem('em_visit_fallback') || getCookie('em_visit_fallback') || 'direct';
    } catch (e) {}
    return { sck: sanitizeToken(fb) || 'direct', src: sanitizeToken(fb) || 'direct' };
  }

  function syncFunnelConsentUI() {
    var banner = document.getElementById('em-consent-banner');
    if (!banner) return;
    var st = getConsentState();
    banner.hidden = (st === 'granted' || st === 'denied');
  }

  var CONSENT_POLICY_VERSION = 'RGPD-41-2004-v1.2.1';

  if (typeof window.emBootMetaPixel !== 'function') {
    window._emPixelBooted = false;
    window._emPixelRevoked = false;
    window.emBootMetaPixel = function () {
      window._emPixelRevoked = false;
      if (!window._emPixelBooted) {
        window._emPixelBooted = true;
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){
        if(window._emPixelRevoked && arguments[0] !== 'consent') return;
        n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        window.fbq('consent', 'grant');
        window.fbq('init', '1684602679908725');
      } else if (typeof window.fbq === 'function') {
        window.fbq('consent', 'grant');
      }
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'PageView');
        var tx = params.get('transaction') || params.get('order') || params.get('hp') || params.get('tx');
        if (tx) {
          var firedKey = 'fb_purchase_fired_' + tx;
          var already = false;
          try {
            already = !!(sessionStorage.getItem(firedKey) || localStorage.getItem(firedKey));
          } catch (e) {}
          if (!already) {
            window.fbq('track', 'Purchase', {
              value: 9.97,
              currency: 'EUR',
              content_name: '+58 Mapas Visuais de Posicionamento de Elétrodos'
            }, { eventID: 'purchase_' + tx });
            try {
              sessionStorage.setItem(firedKey, '1');
              localStorage.setItem(firedKey, '1');
            } catch (e) {}
          }
        }
      }
    };
  }
  if (typeof window.emRevokeMetaPixel !== 'function') {
    window.emRevokeMetaPixel = function () {
      window._emPixelRevoked = true;
      if (typeof window.fbq === 'function') {
        window.fbq('consent', 'revoke');
      }
    };
  }

  if (getConsentState() === 'granted' && typeof window.emBootMetaPixel === 'function') { window.emBootMetaPixel(); }
  window.emHasConsent = function () {
    return getConsentState() === 'granted';
  };
  window.emGetConsentState = getConsentState;
  window.emGetConsentProof = function () {
    try {
      var raw = localStorage.getItem('em_consent_proof') || getCookie('em_consent_proof');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };
  window.emFormatCookie = formatCookie;
  window.emOpenConsentBanner = function () {
    var banner = document.getElementById('em-consent-banner');
    if (banner) banner.hidden = false;
  };
  window.emSetConsent = function (choice) {
    var val = (choice === 'granted') ? 'granted' : 'denied';
    var proof = JSON.stringify({
      choice: val,
      timestamp: new Date().toISOString(),
      policy_version: CONSENT_POLICY_VERSION,
      surface: (window.location && window.location.pathname) || '/'
    });
    try {
      localStorage.setItem('em_consent', val);
      localStorage.setItem('em_consent_proof', proof);
    } catch (e) {}
    setCookie('em_consent', val, 15552000);
    setCookie('em_consent_proof', proof, 15552000);
    if (val === 'granted') {
      rewriteLinks();
      if (typeof window.emBootMetaPixel === 'function') {
        window.emBootMetaPixel();
      }
    } else {
      purgeTrackingStorage();
      rewriteLinks();
      if (typeof window.emRevokeMetaPixel === 'function') {
        window.emRevokeMetaPixel();
      }
    }
    syncFunnelConsentUI();
  };

  function composeSck(baseSck, stageTag) {
    var cleanBase = normalizeBaseSck(baseSck, '', '', '');
    var cleanStage = sanitizeToken(stageTag);
    if (!cleanBase) return cleanStage.slice(0, 30);
    if (!cleanStage) return cleanBase.slice(0, 30);
    var maxBaseLen = 30 - (cleanStage.length + 1);
    if (maxBaseLen < 1) {
      return (cleanBase + '|' + cleanStage).slice(0, 30).replace(/^[|\-]+|[|\-]+$/g, '');
    }
    if (cleanBase.length > maxBaseLen) {
      cleanBase = cleanBase.slice(0, maxBaseLen).replace(/[|\-]+$/, '');
    }
    var res = cleanBase + '|' + cleanStage;
    return res.length > 30 ? res.slice(0, 30) : res;
  }

  function detectStageTag(a) {
    if (a && a.getAttribute('data-stage')) return a.getAttribute('data-stage');
    var href = (a && (a.getAttribute('data-checkout') || a.getAttribute('href'))) || '';
    var path = (window.location.pathname || '').toLowerCase();
    if (path.indexOf('obrigado') !== -1) {
      if (href.indexOf('54lg83ib') !== -1) return 'ob1';
      if (href.indexOf('sobidfz5') !== -1) return 'ob2';
      if (href.indexOf('tymowbzs') !== -1) return 'ob3';
      return 'ob1';
    }
    if (path.indexOf('downsell') !== -1) return 'd1';
    if (path.indexOf('upsell-casos') !== -1) return 'u2';
    if (path.indexOf('upsell-ultrassom') !== -1) return 'u-us';
    if (path.indexOf('upsell-laser') !== -1) return 'u-lz';
    if (path.indexOf('upsell-comunicacao') !== -1) return 'u-cm';
    return 'u1';
  }

  function passthroughQuery(extra) {
    var out = new URLSearchParams();
    var consent = getConsentState();
    params.forEach(function (value, key) {
      if (consent === 'granted') {
        if (PASS_KEYS.test(key)) out.set(key, value);
      } else {
        if (FUNCTIONAL_KEYS.test(key)) out.set(key, value);
      }
    });

    if (consent === 'granted') {
      var origin = resolveOrigin();
      if (origin.sck) out.set('sck', origin.sck);
      if (origin.src) out.set('src', origin.src);
    }

    out.set('lang', lang);
    if (extra) Object.keys(extra).forEach(function (k) { out.set(k, extra[k]); });
    return out;
  }

  function rewriteLinks() {
    var consent = getConsentState();
    var origin = resolveOrigin();

    document.querySelectorAll('a[data-carry]').forEach(function (a) {
      var base = a.getAttribute('data-base') || a.getAttribute('href');
      a.setAttribute('data-base', base);
      var url = new URL(base, window.location.origin);
      // Limpar parâmetros de atribuição anteriores se sem consentimento
      if (consent !== 'granted') {
        var delCarry = [];
        url.searchParams.forEach(function (_, k) {
          if (ATTR_PARAM_RE.test(k)) delCarry.push(k);
        });
        delCarry.forEach(function (k) { url.searchParams.delete(k); });
      }
      passthroughQuery().forEach(function (v, k) { url.searchParams.set(k, v); });
      a.setAttribute('href', url.pathname + url.search + url.hash);
    });

    document.querySelectorAll('a[data-checkout], a[href*="pay.hotmart.com"]').forEach(function (a) {
      var base = a.getAttribute('data-checkout') || a.getAttribute('href');
      if (!a.getAttribute('data-checkout')) a.setAttribute('data-checkout', base);
      var url = new URL(base);
      url.searchParams.set('checkoutMode', '10');
      url.searchParams.set('locale', LOCALE[lang]);

      if (consent !== 'granted') {
        // Sem consentimento ('pending' ou 'denied'): remover qualquer SCK/SRC/XCOD/UTM/FBCLID (incluindo os estáticos do HTML)
        var toRemove = [];
        url.searchParams.forEach(function (_, k) {
          if (ATTR_PARAM_RE.test(k)) toRemove.push(k);
        });
        toRemove.forEach(function (k) { url.searchParams.delete(k); });
        params.forEach(function (value, key) {
          if (FUNCTIONAL_KEYS.test(key) && key.toLowerCase() !== 'lang') {
            url.searchParams.set(key, value);
          }
        });
        a.setAttribute('href', url.toString());
        return;
      }

      var stageTag = detectStageTag(a);
      var finalSck = composeSck(origin.sck, stageTag);
      url.searchParams.set('sck', finalSck);
      url.searchParams.set('xcod', finalSck);

      if (origin.src) {
        url.searchParams.set('src', origin.src);
      }

      params.forEach(function (value, key) {
        var lower = key.toLowerCase();
        if (PASS_KEYS.test(key) && lower !== 'lang' && lower !== 'sck' && lower !== 'src' && lower !== 'xcod') {
          url.searchParams.set(key, value);
        }
      });
      a.setAttribute('href', url.toString());
    });
  }

  function mountFunnelConsentUI() {
    var foot = document.querySelector('.foot') || document.querySelector('footer') || document.querySelector('main') || document.body;
    if (foot && !document.getElementById('em-open-consent')) {
      var p = document.createElement('p');
      p.style.cssText = 'text-align:center;font-size:11.5px;color:#64748b;margin:8px 0 20px;';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'em-open-consent';
      btn.textContent = 'Preferências de Privacidade e Cookies (RGPD / Revogar Consentimento)';
      btn.style.cssText = 'background:none;border:none;color:inherit;text-decoration:underline;cursor:pointer;font:inherit;padding:0;';
      btn.onclick = function () { if (window.emOpenConsentBanner) window.emOpenConsentBanner(); };
      p.appendChild(btn);
      if (foot.parentNode) {
        foot.parentNode.insertBefore(p, foot.nextSibling);
      } else {
        document.body.appendChild(p);
      }
    }
    if (!document.getElementById('em-consent-banner')) {
      var wrap = document.createElement('div');
      wrap.id = 'em-consent-banner';
      wrap.setAttribute('role', 'region');
      wrap.setAttribute('aria-label', 'Preferências de Privacidade e Cookies');
      wrap.style.cssText = 'position:fixed;left:14px;right:14px;bottom:76px;max-width:520px;z-index:1005;background:rgba(6,22,30,0.97);color:#f8fafc;border:1px solid rgba(0,229,255,0.35);border-radius:14px;padding:12px 14px;box-shadow:0 14px 34px rgba(0,0,0,0.45);font-size:12px;line-height:1.45;';
      wrap.innerHTML = '<div style="font-weight:800;color:#00e5ff;font-size:11.5px;text-transform:uppercase;margin-bottom:4px;">Privacidade, Cookies e Rastreamento (RGPD / Lei n.º 41/2004)</div>' +
        '<p style="margin:0;color:#e2e8f0;font-size:11.5px;">Com o teu consentimento, utilizamos armazenamento local e cookies (30 dias) para identificar o anúncio de origem, medir conversões com a <strong>Meta Platforms Ireland Ltd.</strong> e enviar o identificador de campanha (<code>SCK</code>/<code>SRC</code>/<code>UTM</code>) à <strong>Hotmart BV</strong> no checkout. Se recusares, nenhum rastreamento ou envio de <code>SCK</code> ocorre.</p>' +
        '<div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end;">' +
        '<button type="button" id="em-consent-reject" style="border-radius:8px;padding:5px 11px;font-size:11.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.08);color:#cbd5e1;border:1px solid rgba(255,255,255,0.2);">Recusar</button>' +
        '<button type="button" id="em-consent-accept" style="border-radius:8px;padding:5px 11px;font-size:11.5px;font-weight:700;cursor:pointer;background:#0d9488;color:#fff;border:1px solid transparent;">Aceitar</button>' +
        '</div>';
      document.body.appendChild(wrap);
      document.getElementById('em-consent-reject').onclick = function () { window.emSetConsent('denied'); };
      document.getElementById('em-consent-accept').onclick = function () { window.emSetConsent('granted'); };
    }
    syncFunnelConsentUI();
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
    if (fb) {
      fb.hidden = false;
      fb.style.display = 'block';
    }
    var host = document.getElementById('hotmart-sales-funnel');
    if (host && reason !== 'ready') {
      host.style.display = 'none';
    }
    if (window.console) console.info('[funnel] checkout active:', reason);
  }

  function hasHotmartFunnelParams() {
    // Only attempt 1-click widget when an explicit 1-click token is present.
    // 'transaction' is merely a receipt ID passed on normal thank-you redirects,
    // and passing it without a funnel token triggers 'funnel.invalid_upsell' error.
    return !!(params.get('token') || params.get('funnelToken'));
  }

  function mountHotmartWidget() {
    var host = document.getElementById('hotmart-sales-funnel');
    // Ensure the rock-solid direct checkout button is ALWAYS visible immediately
    showFallback('init');

    if (!host || !hasHotmartFunnelParams()) {
      showFallback('direct checkout mode');
      return;
    }

    var s = document.createElement('script');
    s.src = 'https://checkout.hotmart.com/lib/hotmart-checkout-elements.js';
    s.async = true;
    s.onload = function () {
      try {
        if (window.checkoutElements) {
          host.style.display = 'block';
          window.checkoutElements.init('salesFunnel').mount('#hotmart-sales-funnel');
          // NEVER hide the fallback button! Portuguese traffic relies on MB WAY / explicit checkout.
        } else {
          showFallback('checkoutElements missing');
        }
      } catch (e) {
        showFallback('mount error: ' + (e && e.message));
      }
    };
    s.onerror = function () { showFallback('widget script failed to load'); };
    document.head.appendChild(s);
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
    mountFunnelConsentUI();
    
    applyLang();
    mountHotmartWidget();
    bindSticky();
  });
})();
