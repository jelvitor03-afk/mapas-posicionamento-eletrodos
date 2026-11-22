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
  var STORAGE_PREFILL_KEY = 'em_funnel_prefill_v8';
  var PREFILL_KEYS = ['name', 'email', 'phonenumber'];

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

  function cleanParamVal(val) {
    if (!val) return '';
    var t = String(val).trim();
    if (!t || t.toLowerCase() === 'fbclid' || t.indexOf('{{') !== -1 || t.indexOf('}}') !== -1) return '';
    return t;
  }

  function slugToken(val, maxLen) {
    if (!val) return '';
    return String(val)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, maxLen || 16);
  }

  function compactCampaignToken(camp) {
    var c = cleanParamVal(camp);
    if (!c) return '';
    var upper = c.toUpperCase();
    var dateM = upper.match(/(\d{2})[-_/]?(\d{2})(?:\s*$)/);
    var dateTag = dateM ? (dateM[1] + dateM[2]) : '';
    var prefix = 'CMP';
    if (upper.indexOf('TESTE') !== -1 && upper.indexOf('V2') !== -1) prefix = 'T2';
    else if (upper.indexOf('TESTE') !== -1) prefix = 'TST';
    else if (upper.indexOf('VENDAS') !== -1) prefix = 'V1';
    else if (upper.indexOf('RETARGET') !== -1) prefix = 'RT';
    else prefix = slugToken(c, 6).toUpperCase() || 'CMP';
    return dateTag ? (prefix + '_' + dateTag) : prefix;
  }

  function compactAdToken(content) {
    var c = cleanParamVal(content);
    if (!c) return '';
    var m = c.match(/\b(AD\d+)\b[\s._-]*(.*)/i);
    if (m) {
      var adId = m[1].toUpperCase();
      var rest = slugToken(m[2], 14).toLowerCase();
      return rest ? (adId + '_' + rest) : adId;
    }
    return slugToken(c, 18);
  }

  function compactSrcToken(src) {
    var s = cleanParamVal(src).toLowerCase();
    if (!s) return 'dir';
    if (s === 'meta' || s === 'facebook' || s === 'fb' || s === 'facebook_ads') return 'm';
    if (s === 'instagram' || s === 'ig') return 'ig';
    if (s === 'instagram_bio') return 'igb';
    if (s === 'facebook_organico') return 'fbo';
    if (s === 'site_direto') return 'dir';
    if (s === 'funil_v8') return 'v8';
    return slugToken(s, 6).toLowerCase() || 'v8';
  }

  function buildCompactSck(srcVal, campVal, adVal) {
    var parts = [compactSrcToken(srcVal)];
    var adTok = compactAdToken(adVal);
    var campTok = compactCampaignToken(campVal);
    if (adTok) parts.push(adTok);
    if (campTok) parts.push(campTok);
    return parts.join('|').slice(0, 40);
  }

  function collectAttribution() {
    var currentParams = new URLSearchParams(window.location.search);
    var storedMap = readJsonStorage(STORAGE_MAP_KEY);
    var merged = {};

    TRACKED_KEYS.forEach(function (k) {
      var fromUrl = cleanParamVal(currentParams.get(k));
      var fromStore = cleanParamVal(storedMap[k]);
      if (fromUrl) {
        merged[k] = fromUrl;
      } else if (fromStore) {
        merged[k] = fromStore;
      }
    });

    var srcValue = merged.src || merged.utm_source || cleanParamVal(readStringStorage(STORAGE_SRC_KEY));
    if (!srcValue) {
      srcValue = inferReferrerSource();
    }
    merged.src = srcValue;

    var hasFreshCampaignOrAd = Boolean(cleanParamVal(currentParams.get('utm_campaign')) || cleanParamVal(currentParams.get('utm_content')));
    var urlSck = cleanParamVal(currentParams.get('sck'));
    var urlXcod = cleanParamVal(currentParams.get('xcod'));
    var defaultSck = urlSck ? urlSck.slice(0, 40) : buildCompactSck(srcValue, merged.utm_campaign, merged.utm_content);

    if (hasFreshCampaignOrAd || !merged.sck) {
      merged.sck = defaultSck;
    } else {
      merged.sck = merged.sck.slice(0, 40);
    }
    if (urlXcod) {
      merged.xcod = urlXcod.slice(0, 40);
    } else if (hasFreshCampaignOrAd || !merged.xcod) {
      merged.xcod = merged.sck;
    } else {
      merged.xcod = merged.xcod.slice(0, 40);
    }

    writeJsonStorage(STORAGE_MAP_KEY, merged);
    writeStringStorage(STORAGE_SRC_KEY, srcValue);

    var storedPrefill = {};
    try {
      var rawPrefill = sessionStorage.getItem(STORAGE_PREFILL_KEY);
      if (rawPrefill) {
        var parsedPrefill = JSON.parse(rawPrefill);
        if (parsedPrefill && typeof parsedPrefill === 'object') storedPrefill = parsedPrefill;
      }
    } catch (e) {}

    var prefill = {};
    PREFILL_KEYS.forEach(function (k) {
      var v = currentParams.get(k);
      if (!v && k === 'email') v = currentParams.get('buyer_email');
      if (!v && k === 'phonenumber') v = currentParams.get('phone');
      if (v) {
        prefill[k] = v;
      } else if (storedPrefill[k]) {
        prefill[k] = storedPrefill[k];
      }
    });

    try {
      sessionStorage.setItem(STORAGE_PREFILL_KEY, JSON.stringify(prefill));
    } catch (e) {}

    return {
      params: merged,
      prefill: prefill,
      srcValue: srcValue,
      defaultSck: merged.sck || defaultSck
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
        if (attr.prefill) {
          PREFILL_KEYS.forEach(function (key) {
            if (attr.prefill[key] && !targetUrl.searchParams.has(key)) {
              targetUrl.searchParams.set(key, attr.prefill[key]);
            }
          });
        }
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
      btn.setAttribute('data-orig-html', btn.innerHTML);
      btn.addEventListener('click', function () {
        this.style.opacity = '0.9';
        this.setAttribute('aria-busy', 'true');
        this.innerHTML = '<span>A abrir pagamento seguro Hotmart…</span>';
        if (window.location.pathname.indexOf('upgrade-completo') !== -1) {
          writeStringStorage('em_v8_upgraded_ts', String(Date.now()));
        }
        if (typeof window.__bootFb === 'function') {
          window.__bootFb();
        }
        var val = parseFloat(this.getAttribute('data-value')) || 0;
        var plan = this.getAttribute('data-plan') || 'oferta';
        var dedupKey = plan === 'pacote-pro'
          ? 'em_ic_upsell_fired'
          : (plan === 'downsell-kits' ? 'em_ic_downsell_fired' : 'em_ic_v8_' + plan);
        var alreadyFired = false;
        try {
          alreadyFired = sessionStorage.getItem(dedupKey) === '1';
          if (!alreadyFired) {
            sessionStorage.setItem(dedupKey, '1');
          }
        } catch (e) {}
        if (!alreadyFired && typeof window.fbq === 'function') {
          window.fbq('track', 'InitiateCheckout', {
            value: val,
            currency: 'EUR',
            content_name: 'ElectroMapas Funil V8 - ' + plan
          });
        }
      });
    });
    window.addEventListener('pageshow', function () {
      document.querySelectorAll('.js-checkout-btn[aria-busy="true"]').forEach(function (btn) {
        btn.style.opacity = '';
        btn.removeAttribute('aria-busy');
        var orig = btn.getAttribute('data-orig-html');
        if (orig) btn.innerHTML = orig;
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

  function markProOfferSeenOnce() {
    if (window.location.pathname.indexOf('upsell-pro') === -1) return;
    try {
      sessionStorage.setItem('em_v8_pro_offer_seen', '1');
      sessionStorage.removeItem('em_v8_upgraded_ts');
      localStorage.removeItem('em_v8_upgraded_ts');
    } catch (e) {}
  }

  function bindAppProDemo() {
    var root = document.getElementById('app-demo-widget');
    if (!root) return;

    var CASE_MAP = {
      I01: {
        patient: 'M.S., 64 anos · Gonartrose medial bilateral',
        protocol: 'Mapa I01 · TENS Joelho (4 elétrodos periarticulares) · 80 Hz · 150 µs · 25 min',
        finding: 'Testes pré-aplicação: dor medial à carga e flexão 105°, sem bandeiras vermelhas.',
        eva: 'EVA 7 → 4 após sessão',
        next: 'Manter Mapa I01 + exercício de quadríceps em cadeia aberta; entregar folheto PX04.'
      },
      S01: {
        patient: 'A.R., 42 anos · Cervicalgia crónica inespecífica',
        protocol: 'Mapa S01 · TENS Quadripolar Cervical · 100 Hz · 100 µs · 30 min',
        finding: 'Triagem pré-sessão: amplitude cervical limitada em rotação D, sem irradiação radicular.',
        eva: 'EVA 6 → 3 após sessão',
        next: 'Combinar Mapa S01 com mobilidade cervical suave + controlo postural no trabalho.'
      },
      L02: {
        patient: 'J.P., 49 anos · Lombalgia crónica T12–S1',
        protocol: 'Mapa L02 · Corrente Interferencial Tetrapolar · AMF 90 Hz · 25 min',
        finding: 'Cluster de Laslett negativo; rigidez matinal sem défice motor ou perda de força.',
        eva: 'EVA 7 → 4 após sessão',
        next: 'Progredir estabilidade lombo-pélvica e rever tolerância cutânea na próxima consulta.'
      }
    };

    var state = { code: 'I01', area: 25, ma: 35 };
    var densityEl = document.getElementById('demo-density-value');
    var safetyEl = document.getElementById('demo-density-badge');
    var soapEl = document.getElementById('demo-soap-output');
    var copyBtn = document.getElementById('demo-copy-btn');

    function renderDemo() {
      var info = CASE_MAP[state.code] || CASE_MAP.I01;
      var density = state.ma / state.area;
      var densityFmt = density.toFixed(2).replace('.', ',');
      var isHigh = density > 2.0;

      if (densityEl) densityEl.textContent = densityFmt + ' mA/cm² (' + state.ma + ' mA / ' + state.area + ' cm²)';
      if (safetyEl) {
        safetyEl.textContent = isHigh
          ? 'ATENÇÃO (> 2,0 mA/cm²) — usar elétrodo 5×9 cm (45 cm²)'
          : 'DENSIDADE SEGURA (≤ 2,0 mA/cm²)';
        safetyEl.className = 'app-demo-badge ' + (isHigh ? 'is-warn' : 'is-safe');
      }

      if (soapEl) {
        soapEl.textContent =
          'REGISTO CLÍNICO SOAP · ELECTROMAPAS PRO\n' +
          'Utente (exemplo fictício): ' + info.patient + '\n' +
          'S: Queixa principal na consulta atual; dor moderada a elevada (' + info.eva + ').\n' +
          'O: ' + info.finding + '\n' +
          'A: ' + info.protocol + ' | ' + state.ma + ' mA em elétrodo ' + state.area + ' cm² → ' + densityFmt + ' mA/cm² (' + (isHigh ? 'Reduzir amplitude ou ampliar área' : 'Dentro do limiar cutâneo seguro') + ').\n' +
          'P: ' + info.next;
      }
    }

    root.querySelectorAll('.js-demo-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = this.getAttribute('data-group');
        var val = this.getAttribute('data-val');
        if (group === 'code') state.code = val;
        if (group === 'area') state.area = parseInt(val, 10) || 25;
        if (group === 'ma') state.ma = parseInt(val, 10) || 35;

        root.querySelectorAll('.js-demo-btn[data-group="' + group + '"]').forEach(function (other) {
          var active = other === btn;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        renderDemo();
      });
    });

    if (copyBtn && soapEl) {
      copyBtn.addEventListener('click', function () {
        var text = soapEl.textContent || '';
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(text).catch(function () {});
        }
        var prev = copyBtn.textContent;
        copyBtn.textContent = 'Nota de exemplo gerada e copiada ✓';
        setTimeout(function () {
          copyBtn.textContent = prev;
        }, 2000);
      });
    }

    renderDemo();
  }

  function bindStickyBar() {
    var sticky = document.getElementById('sticky-mobile');
    var hero = document.querySelector('.hero-funnel');
    var oferta = document.getElementById('oferta');
    if (!sticky || !hero || !oferta || !('IntersectionObserver' in window)) return;

    var pastHero = false;
    var inOferta = false;

    function syncSticky() {
      var isMobile = window.innerWidth <= 720;
      sticky.classList.toggle('is-visible', isMobile && pastHero && !inOferta);
    }

    new IntersectionObserver(function (entries) {
      pastHero = !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0;
      syncSticky();
    }, { threshold: 0 }).observe(hero);

    new IntersectionObserver(function (entries) {
      inOferta = entries[0].isIntersecting;
      syncSticky();
    }, { threshold: 0.08 }).observe(oferta);

    window.addEventListener('resize', syncSticky, { passive: true });
    syncSticky();
  }

  function bindClinicChallenge() {
    var btns = document.querySelectorAll('.js-quiz-opt');
    var box = document.getElementById('quiz-feedback');
    if (!btns.length || !box) return;

    var FEEDBACK = {
      A: '<strong>Atenção: risco clínico e retrabalho.</strong> Ligar TENS sem executar primeiro Neer/Hawkins (Prancha T03) nem despistar bandeiras vermelhas falha na diferenciação entre conflito subacromial e rotura maciça/luxação. O sequenciamento completo do Pacote PRO garante triagem segura em menos de 1 minuto.',
      B: '<strong>Sequência clínica exata de gabinete!</strong> 1) Confirmas o cluster subacromial na <strong>Prancha T03</strong> (Neer/Hawkins, <em>PMID 22289231</em>); 2) Preparas o tendão com <strong>Ultrassom 3 MHz (US01)</strong> ou <strong>Laser WALT 4–8 J/pt (PB03)</strong>; 3) Aplicas o <strong>Mapa S09 do teu Atlas</strong>; 4) Fechas com <strong>Bandagem em Y do deltoide a 15–25% (Caso CC03)</strong> + exercício de coifa.',
      C: '<strong>Erro comum de dosimetria térmica.</strong> Aplicar Ultrassom 1 MHz parado sobre o acrómio causa dor periosteal imediata por reflexão óssea. No <strong>Guia US01</strong> aprendes a usar 3 MHz contínuo ou pulsado com varrimento a ~4 cm/s em 2–3× ERA e rotação interna do ombro para expor o supraespinhoso.'
    };

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var opt = this.getAttribute('data-opt') || 'B';
        btns.forEach(function (b) {
          b.classList.remove('is-selected', 'is-correct', 'is-wrong');
          b.setAttribute('aria-pressed', 'false');
        });
        this.classList.add('is-selected', opt === 'B' ? 'is-correct' : 'is-wrong');
        this.setAttribute('aria-pressed', 'true');
        box.innerHTML = FEEDBACK[opt] || FEEDBACK.B;
        box.hidden = false;
      });
    });
  }

  function init() {
    markProOfferSeenOnce();
    var attr = collectAttribution();
    decorateHotmartLinks(attr);
    decorateInternalLinks(attr);
    bindCheckoutTracking();
    bindSmoothAnchors();
    bindLightbox();
    bindStickyBar();
    bindClinicChallenge();
    bindAppProDemo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
