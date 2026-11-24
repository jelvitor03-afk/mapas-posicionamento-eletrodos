# QA Report & Build Receipt — `atlas/` (V8)

- **Branch**: `pagina-v8` (branched from `main` at `b818a80`; zero edits outside `atlas/`)
- **Target Artifact**: `site_clone/atlas/index.html` (`85,780 bytes`)
- **Product Basis**:
  - `ElectroMapas_Atlas_Inverno_397p_70_Mapas_v7_VERIFICADO.pdf` (`397` A4 landscape pages, `70` clinical maps + `70` practical sheets, `313` verified bibliographic references)
  - `ElectroMapas_Essencial_112p.pdf` (`112` pages, `44` maps across `5` core sections + base safety/bibliography)
- **Status**: `PASS` (Playwright 4 viewports + Lighthouse Mobile 89/100/100/100; two external pending inputs documented below)

---

## 1. Mandatory Skills Applied Across All 7 Stages

| Stage | Skills Applied | Concrete Changes Driven by Skills |
|---|---|---|
| 1. Market & Competitor Audit | `competitor-profiling`, `reverse-engineer-marketing`, `cro`, `landing-page-conversion-audit` | Audited `06_Metricas/RELATORIO_BIBLIOTECA_2026-11-20.md` and live DOM copy from Edfisicavisual, Gabi, Mappia, FocoDiario, and FisioVanta's historical baseline; kept only provable elements and rejected unverified dark-pattern fluff. |
| 2. Offer & Decoy Pricing | `offers`, `pricing`, `marketing-psychology`, `elite-sales-page-architect` | Structured 2-tier decoy architecture: **Atlas Completo — Edição Inverno (`11,87 €`)** stacked before **Atlas Essencial (`7,87 €`)** on mobile, highlighting `+4 €` difference for `397` vs `112` pages and `70` vs `44` maps. |
| 3. Copywriting & `pt-PT` | `copywriting`, `copy-editing` | Removed AI tells, removed `"PDF"` and EUR price from the Hero fold, used consistent clinical `pt-PT` (*tu*, *utente*, *marquesa*, *elétrodos*, *telemóvel*), `1,645` words, zero forbidden terms (`Ban hits: 0`). |
| 4. Clinical Review | `fisioterapeuta-revisor` | Verified exact PDF anatomy/parameter framing (`p.13, 15, 21, 31, 32, 49, 83, 87, 154, 258, 388`), `CH1`–`CH4` channel color convention, PubMed citation framing (`PMID 32631074` on `p.83`), and non-prescriptive educational disclaimer. |
| 5. Visual Design & Assets | `design-taste-frontend`, `impeccable`, `ui-ux-pro-max`, `banner-design`, `design` | Clinical navy/warm-cream palette (`#0B1B2B` / `#FAF7F2` / `#DFA326`), self-hosted `Manrope` (800) + `Inter` (400–700) `.woff2` fonts, 8 real 150-dpi PDF `.webp` previews, unclipped `PMID 32631074` evidence crop, device composite mockup, 3D cover + 3 anti-AI-face documentary PT clinic photos (`atlas/img/PROMPTS_FLOW.md` also provided). |
| 6. Engineering & Accessibility | `web-design-guidelines` | Skip-link, semantic landmarks, `<details>` accessible FAQ, ARIA-labeled `1.75×` zoom lightbox with keyboard `Escape`/arrow navigation & focus return, `>= 44 px` touch targets across nav/dots/sticky bar, `white-space: nowrap` currency formatting. |
| 7. Verification & Telemetry | `cro`, `landing-page-conversion-audit`, `web-design-guidelines` | Built Meta Pixel `1684602679908725` + Hotmart UTM/`fbclid`/`src`/`sck`/`xcod` forwarding, then iterated Playwright + Lighthouse Mobile until zero runtime regressions and Performance `>= 85`. |

---

## 2. Competitor Benchmark & Improvements Built

| Reference | What Was Adapted | What We Built Better |
|---|---|---|
| **Edfisicavisual** (`12,90 €`, 91 PT ads) | Manual comparison (`60 € – 110 €` thick theory books vs quick chairside/marquesa lookup) and Iberian checkout clarity (`MB WAY`, `Multibanco`, `Apple Pay`, `Cartão`). | Replaced template dark-slop styling and aggressive urgency with crisp light editorial layout, zero price/PDF clutter above the Hero fold, and exact 397-page verified scope. |
| **Gabi** (2-tier decoy model) | Two-plan price contrast nudging buyers smoothly toward the complete edition via small delta (`+4 €`). | Physically stacked **COMPLETO (`11,87 €`)** first on mobile CSS Grid/Flex with honest itemized page/map counts (no fake timers or invented strikethrough pricing). |
| **Mappia** (`mappia.online/electrodos-fisioterapia/`) | Clear curriculum chapter breakdown and color-coded multi-channel framing. | Replaced vague summaries with real verified page ranges (`p.13-152`, `p.153-166` + `p.315-339`, `p.167-213`, `p.214-255`, `p.256-314`, `p.340-378`) and true `CH1`–`CH4` support. |
| **FocoDiario** (`focodiario.com/p/D6PK3T8GA8VUJCNQ/`) | Swipable 8-page real document preview carousel so visitors see what they buy before checkout. | Exported 8 actual 150-dpi `.webp` pages directly from `ElectroMapas_Atlas_Inverno_397p_70_Mapas_v7_VERIFICADO.pdf`, added `Ampliar` inside the dark slide footer (never covering PDF citations), plus a `1.75×` interactive lightbox. |
| **FisioVanta** (20 historical ads; winning `"mapa detlha"` angle) | Centered headline promise on practical electrode placement clarity (`Canais CH1 a CH4 por cor`, anatomical position, `Hz`, `µs`, time, PubMed source). | Backed the claim visually with a zoomed real-PDF `PMID 32631074` reference crop (`recorte-fonte-estudo.webp`) from `p.83`. |

---

## 3. Clinical Audit (`fisioterapeuta-revisor`) & Verified PDF Inventory

- **Language & Terminology**: Strict European Portuguese (`pt-PT`) verified (`tu`, `utente`, `marquesa`, `elétrodos`, `telemóvel`). Zero `pt-BR` terms.
- **Factuality vs Official PDFs**:
  - **Atlas Completo (`397` A4 landscape pages)**: `70` maps + `70` practical sheets (`p.13-152`, `140p`); Winter chapter + expanded Winter clinical guide (`p.153-166` & `p.315-339`, `39p` total); clinical condition guides (`p.167-213`, `47p`); currents/parameters/technique (`p.214-255`, `42p`); anatomy/palpation/motor points (`p.256-314`, `59p`); safety/evaluation/documentation (`p.340-378`, `39p`); intro/summary/checklist/glossary (`p.1-12`, `12p`); condition index/verification/notes/`313`-ref bibliography (`p.379-397`, `19p`).
  - **Atlas Essencial (`112` pages)**: `44` maps in `5` sections (`p.13-100`), safety/summary/glossary (`p.1-12`), notes (`p.101-102`), base bibliography (`p.103-112`).
- **Clinical & Compliance Guardrails (`qa_atlas.py`)**:
  - `Ban hits: 0` (no `"PDF"` or price in Hero fold, no fake timers, no `"restam X"`, no invented strikethrough price, no fake testimonials/stars, no `"+58 mapas"`, no `"validado/aprovado por fisioterapeutas"`, no `"protocolos garantidos"`, no AI tells).
  - Non-prescriptive framing: explicitly states educational reference support for qualified clinical judgment and manufacturer manual precedence (`TENS`, `NMES`, `IFC`, `FES`, `Russa`).
  - Zero external escape links outside Hotmart (`Escape external links (non-Hotmart): []`).

---

## 4. Empirical Verification Receipts (Final Build: `85,780 bytes`)

### 4.1 Playwright Multi-Viewport QA (`qa_atlas.py`)

| Viewport | Overflow (`scrollWidth <= innerWidth`) | Console / Page Errors | Loaded Images | Above-Fold / Total Local KB | `ctaInFold` / `coverInFold` | Min Button Height (`Primary` / `Nav`) | `COMPLETO` First on Mobile |
|---|---|---|---|---|---|---|---|
| `390x844` | `390 <= 390` (`PASS`) | `0` / `0` | `15 / 15` (`0` broken) | `377.1 KB` / `918.3 KB` | `true` / `true` | `52px` / `44px` | `true` (`6578 < 7507`) |
| `360x780` | `360 <= 360` (`PASS`) | `0` / `0` | `15 / 15` (`0` broken) | `377.1 KB` / `918.3 KB` | `true` / `true` | `52px` / `44px` | `true` (`6147 < 7076`) |
| `320x568` | `320 <= 320` (`PASS`) | `0` / `0` | `15 / 15` (`0` broken) | `206.3 KB` / `918.3 KB` | `true` / `false` (`vh=568`, CTA bottom `310`) | `58px` / `44px` | `true` (`5420 < 6438`) |
| `1440x900` | `1440 <= 1440` (`PASS`) | `0` / `0` | `15 / 15` (`0` broken) | `377.1 KB` / `918.3 KB` | `true` / `true` | `52px` / `48px` | side-by-side (`5952 == 5952`) |

### 4.2 Interactive & Tracking Checks (`mobile_390`)
- **8-Page Carousel**: `#carousel-counter` transitions `"1 / 8"` -> `"2 / 8"`.
- **Lightbox**: Opens cleanly (`lb_open: true`) with natural image loaded and closes via `Escape` (`lb_closed: true`).
- **Sticky Mobile Bar**: Visible mid-scroll (`sticky_mid: true`) and hides inside `#planos` (`sticky_at_planos: false`).
- **Hotmart URL Decoration**: Verified query pass-through on `?utm_source=fb&utm_campaign=atlas_v8&utm_content=mapa_detalhe&fbclid=TESTFB123` -> `https://pay.hotmart.com/K108418562E?off=csi2p45d&utm_source=fb&utm_campaign=atlas_v8&utm_content=mapa_detalhe&fbclid=TESTFB123&checkoutMode=10&locale=pt_PT&src=fb&sck=fb%7Catlas_v8%7Cmapa_detalhe&xcod=fb%7Catlas_v8%7Cmapa_detalhe`. Básico CTA preserves literal `{{CHECKOUT_BASICO}}`.
- **Meta Pixel (`1684602679908725`)**:
  - Synchronous stub queues `PageView` + `ViewContent` (`11.87 EUR`), fires `Clique_Ir_Para_Planos` on `#planos` CTA click and `InitiateCheckout` on `.js-checkout-btn` click, plus `<noscript>` `PageView` pixel.
  - External `https://connect.facebook.net/en_US/fbevents.js` loads once via `window.__bootFb` on first interaction (`pointerdown`, `touchstart`, `scroll`, `keydown`, `mousemove`) or `.js-checkout-btn` click or `3500ms` post-`load`. Playwright verified `fbq_loaded: true` and confirmed outbound fetches to `https://connect.facebook.net/en_US/fbevents.js` and `https://connect.facebook.net/signals/config/1684602679908725?...`.

### 4.3 Lighthouse Mobile (`http://127.0.0.1:8765/atlas/`)
- **Performance**: **`89`** (target `>= 85`)
- **Accessibility**: **`100`** (target `>= 95`)
- **Best Practices**: **`100`** (target `>= 95`)
- **SEO**: **`100`** (target `>= 90`)
- **Core Web Vitals**: `FCP: 1.4 s` | `LCP: 1.5 s` | `CLS: 0.006` | `TBT: 420 ms` | `SI: 1.5 s`

### 4.4 Screenshots Saved in `atlas/qa/`
`mobile-390-hero.png`, `mobile-390-carousel.png`, `mobile-390-lightbox.png`, `mobile-390-planos.png`, `mobile-390-full.png`, `mobile-360-hero.png`, `mobile-360-planos.png`, `desktop-1440-hero.png`, `desktop-1440-planos.png`, `desktop-1440-full.png` (`lighthouse-mobile.json` removed before commit).

---

## 5. Issues Found & Fixed During QA Iterations
1. **Mobile currency wrap**: Added `white-space: nowrap` on `.num` so `11,87 €` stays single-line at `320px`/`360px`/`390px`.
2. **Carousel pagination wrapping & small hitboxes**: Adjusted `.carousel-dot` (`width: 26px`, `height: 44px`) and `.carousel-nav-btn` (`>= 44px`) to stay on a single line and hit Lighthouse Accessibility `100`.
3. **Zoom badge covering PDF citation footer**: Relocated the `Ampliar` button inside `.slide-meta` below the preview image so real page numbers and `PMID` footers remain unobstructed.
4. **Compact hero spacing (`360px`) & punctuation**: Tightened payment pill wrapping and removed em-dash punctuation in the Hero headline.
5. **Lighthouse Mobile `Performance 76` -> `89`**: Removed competing `<link rel="preload">` on `inter-latin.woff2` (`48,256 bytes`), added `fetchpriority="low"` to all `14` lazy below-fold images (dropping `LCP` from `3.1 s` to `1.5 s`), and switched external `fbevents.js` loading from `window.load` (with `autoConfig:false` which still ran `signals/config` long tasks during TTI) to `window.__bootFb` triggered on first interaction / checkout click / `3500ms` post-`load` (dropping `TBT` from `720 ms` to `420 ms`).

---

## 6. Pending / External Items (Out of Autonomous Scope)
1. **`{{CHECKOUT_BASICO}}`**: Placeholder intentionally left on the Essencial (`7,87 €`) button until the Hotmart offer URL for `7,87 €` is provided.
2. **Optional Google Flow Photo Swaps**: Current 3D cover (`capa-arte-anatomia.webp`) and 3 realistic Portuguese clinic photos (`foto-clinica-tablet.webp`, `foto-clinica-telemovel.webp`, `foto-estudante-impresso.webp`) are generated, visually audited, and bundled. Complete copy-paste Flow prompts are saved in `atlas/img/PROMPTS_FLOW.md` if manual Flow re-shoots are ever desired.
