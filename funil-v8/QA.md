# QA Report — Funil Pós-Compra ElectroMapas V8 (`funil-v8/`)

- **Ramo Git**: `funil-v8` criado a partir de `origin/main` (`fb98155e8ffa2fde1a1afddc0ca98ad8db008980`)
- **Artefactos**: 7 páginas HTML (`upsell-pro.html`, `downsell-kits.html`, `upgrade-completo.html`, `obrigado-basico.html`, `obrigado-completo.html`, `entrega-pro.html`, `obrigado-kits.html`) + `funnel-v8.css` + `funnel-v8.js` + 7 imagens reais em `img/`
- **Status Geral**: `PASS` (Playwright 7 páginas × 3 viewports, linter `pt-PT` / anti-engano, teste de UTMs/Pixel e auditoria CRO — com 3 ofertas Hotmart pendentes de código `?off=` assinaladas como `PENDENTE_OFF_*`)

---

## 1. Skills Utilizadas e Alterações Concretas

| Skill | Aplicação no Funil V8 | Mudanças Concretas Geradas |
|---|---|---|
| `offers` | Diagnóstico da equação de valor e separação entre produto novo, exclusivo e reformatação | Evitou prometer 3 kits como "conteúdo inédito total": identificou que `Kit 1` (17 p.) e `Kit 2` (21 p.) extraem fichas do Atlas em A4 vertical, enquanto `Kit 3` (`PX01–PX10`) e a `App PRO` entregam valor realmente novo. |
| `pricing` | Correção da inversão de preço do funil anterior | Detetou que os 3 Kits a `12,97 €` custavam mais do que o Atlas Completo de 397 páginas (`11,87 €`); propôs escada coerente: Upgrade Completo `4,87 €`, Pacote PRO `17,87 €` e Downsell Kits `8,87 €`. |
| `marketing-psychology` | Alívio pós-compra antes da oferta, contraste honesto e ausência de manipulação | Inseriu barra discreta de 3 etapas e faixa verde de confirmação logo no topo, ordem mobile com card `+285 páginas` primeiro no `upgrade-completo.html`, zero barras falsas de "80%", zero contadores e zero escassez inventada. |
| `copywriting` & `copy-editing` | Redação em `pt-PT` clínico direto, zero tells de IA | Eliminou termos `pt-BR`, removeu `"PDF"` de todos os cabeçalhos/heros, substituiu listas de negação e frases de IA por factos concretos da marquesa ("densidade mA/cm²", "consulta com uma mão no telemóvel", "fichas A4 verticais"). |
| `elite-sales-page-architect` | Estrutura focada sem menus de fuga | Removeu barras de navegação externas, manteve um único objetivo por ecrã, colocou CTA acima da dobra no telemóvel (`heroCtaInFold: true`) e selos MB WAY / Multibanco / Apple Pay / Cartão junto ao botão. |
| `design-taste-frontend` & `impeccable` | Continuidade visual com `atlas/index.html` | Reutilizou paleta exata (`#FAF7F2`, `#0B1B2B`, `#DFA326`, `#127347`), fontes auto-hospedadas `Manrope` (800) e `Inter` (400–700) de `../atlas/fonts/`, e lightbox acessível com zoom `1,75×`. |
| `fisioterapeuta-revisor` | Auditoria clínica e de veracidade dos entregáveis | Conferiu contagens exatas dos PDFs (`112 p.`, `397 p.`, `17 p.`, `21 p.`, `14 p.`), auditou `app/index.html` (`16 protocolos`, `8 regiões`, `mA/cm²`, `SOAP`, `2 vídeos`), removeu qualquer menção a `"70 mapas na App"` ou `"validado por fisioterapeutas"`, e incluiu nota clínica não prescritiva. |
| `landing-page-conversion-audit` | Auditoria final orientada a atrito mobile e atribuição | Verificou botão acima da dobra em `360px`/`390px`, meios de pagamento visíveis antes do clique, persistência de UTMs/`fbclid` em `sessionStorage` + `localStorage` e passagem automática em links `data-carry`. |

---

## 2. Matriz Playwright (7 Páginas × 3 Viewports)

Executado via servidor HTTP local em `127.0.0.1` + Chromium Playwright (`390×844`, `360×780`, `1440×900`):

| Página | Viewport | HTTP | Overflow Horizontal | Imagens (`ok / total`) | Hero CTA na 1.ª Dobra | Altura Mín. Botões (`CTA / Recusa / Zoom`) | Fontes Carregadas | Erros Console / Rede |
|---|---|---|---|---|---|---|---|---|
| `upsell-pro.html` | `390×844` | `200` | `false` (`390/390`) | `4 / 4` | `true` (`621 px`) | `56 / 72 / 44 px` | `2` (`Manrope`, `Inter`) | `0 / 0` |
| `upsell-pro.html` | `360×780` | `200` | `false` (`360/360`) | `4 / 4` | `true` (`674 px`) | `56 / 72 / 44 px` | `2` | `0 / 0` |
| `upsell-pro.html` | `1440×900` | `200` | `false` (`1440/1440`) | `4 / 4` | `true` (`546 px`) | `58 / 49 / 44 px` | `2` | `0 / 0` |
| `downsell-kits.html` | `390×844` | `200` | `false` (`390/390`) | `3 / 3` | `true` (`523 px`) | `56 / 72 / 44 px` | `2` | `0 / 0` |
| `downsell-kits.html` | `360×780` | `200` | `false` (`360/360`) | `3 / 3` | `true` (`600 px`) | `56 / 72 / 44 px` | `2` | `0 / 0` |
| `downsell-kits.html` | `1440×900` | `200` | `false` (`1440/1440`) | `3 / 3` | `true` (`474 px`) | `58 / 49 / 44 px` | `2` | `0 / 0` |
| `upgrade-completo.html` | `390×844` | `200` | `false` (`390/390`) | `3 / 3` | `true` (`614 px`) | `56 / 72 / 44 px` | `2` | `0 / 0` |
| `upgrade-completo.html` | `360×780` | `200` | `false` (`360/360`) | `3 / 3` | `true` (`668 px`) | `78 / 72 / 44 px` | `2` | `0 / 0` |
| `upgrade-completo.html` | `1440×900` | `200` | `false` (`1440/1440`) | `3 / 3` | `true` (`502 px`) | `58 / 49 / 44 px` | `2` | `0 / 0` |
| `obrigado-basico.html` | `390×844` / `360×780` / `1440×900` | `200` | `false` (`0` px extra) | `0 / 0` | N/A | N/A | `2` | `0 / 0` |
| `obrigado-completo.html` | `390×844` / `360×780` / `1440×900` | `200` | `false` (`0` px extra) | `0 / 0` | N/A | N/A | `2` | `0 / 0` |
| `entrega-pro.html` | `390×844` / `360×780` / `1440×900` | `200` | `false` (`0` px extra) | `0 / 0` | N/A | `78 / 78 / 58 px` | `2` | `0 / 0` |
| `obrigado-kits.html` | `390×844` / `360×780` / `1440×900` | `200` | `false` (`0` px extra) | `0 / 0` | N/A | N/A | `2` | `0 / 0` |

---

## 3. Verificações Funcionais, Tracking e Linter

- **Linter de Texto e Regras**:
  - Menções a `"PDF"` na dobra inicial (`header`, barra de confirmação, `h1`, subtítulo): **`0`** em todas as 7 páginas.
  - Termos `pt-BR` (`você`, `celular`, `tela`, `baixar`, `eletrodos`, `bônus`, `usuário`): **`0`** em todas as 7 páginas.
  - Urgência falsa / alegações proibidas / `hotmart-checkout-elements.js`: **`0`** em todas as 7 páginas e em `funnel-v8.js`.
- **Meta Pixel (`1627467939032653`)**:
  - `PageView`: disparado nas 7 páginas.
  - `ViewContent`: disparado **exclusivamente** nas 3 páginas de oferta (`17.87 EUR`, `8.87 EUR`, `4.87 EUR`); ausente nas 4 páginas de obrigado/entrega.
  - `InitiateCheckout`: verificado em clique simulado no CTA de `upsell-pro.html` (`17.87 EUR`).
  - `Purchase`: **`0`** ocorrências em todo o diretório `funil-v8/`.
- **Propagação de UTMs, `fbclid`, `src`, `sck` e `xcod`**:
  - Entrada em `upsell-pro.html?utm_source=fb&utm_medium=paid&utm_campaign=v8_test&utm_content=reel1&fbclid=FBTEST123`:
    - CTA Hotmart decorado para `https://pay.hotmart.com/B108418889J?off=PENDENTE_OFF_PRO_1787&utm_source=fb&utm_medium=paid&utm_campaign=v8_test&utm_content=reel1&fbclid=FBTEST123&src=fb&sck=fb%7Cv8_test%7Creel1&xcod=fb%7Cv8_test%7Creel1&checkoutMode=10&locale=pt_PT`.
    - Clique em "Não, obrigado" levou todos os parâmetros até `downsell-kits.html` (incluindo o CTA `G108419033I?off=PENDENTE_OFF_KITS_887`) e, no segundo clique em "Não, obrigado", até `obrigado-completo.html`.
    - Fluxo `upgrade-completo.html` → CTA `K108418562E?off=PENDENTE_OFF_UPGRADE_487` e recusa → `obrigado-basico.html` preservou 100% dos parâmetros.
- **Lightbox de Prévia**: aberto via clique, ampliado (`is-zoomed: true`) e fechado via tecla `Escape` (`lb_closed: true`).

---

## 4. Problemas Encontrados e Corrigidos Durante o QA

1. **Imagens abaixo da dobra em branco na captura completa**: as 3–4 miniaturas de prévia usavam `loading="lazy"`, fazendo o navegador adiar o carregamento/pintura até haver scroll. **Correção**: removido `loading="lazy"` dessas 3–4 imagens WebP leves (~35–100 KB cada) e definido `decoding="sync"` + borda sutil `#EAE4D8`, garantindo pintura imediata nas 3 páginas de oferta.
2. **Quebra de palavra na 3.ª etapa em `360px` / `390px`**: o rótulo `"3. Acesso no teu e-mail"` partia `"e-\nmail"`. **Correção**: ajustado para rótulos curtos (`"1. Atlas confirmado"`, `"2. Complemento"`, `"3. Acesso e-mail"`) e tamanho de fonte responsivo no CTA abaixo de `400px`.

---

## 5. Auditoria de Conversão (`landing-page-conversion-audit`)

### Verdict
A arquitetura V8 elimina os dois maiores vazamentos estruturais identificados no funil anterior: a ausência de oferta de upgrade para o comprador do Básico (`7,87 €`) e a inversão de preço do downsell (`12,97 €` > `11,87 €` do Atlas Completo). Tecnicamente está pronta para tráfego pago mobile em Portugal, dependente apenas da criação das 3 ofertas na Hotmart pelo Claude e do carregamento dos PDFs no produto `8931107`.

### Fix now (resolvido antes do commit)
1. Carregamento imediato das prévias reais (`decoding="sync"`) — resolvido.
2. Remoção do widget one-click `hotmart-checkout-elements.js` (incompatível com MB WAY no fluxo direto) — resolvido.
3. Persistência de `utm_*`, `fbclid`, `src`, `sck`, `xcod` entre páginas e botões de recusa — resolvido.

### Test, don't guess
1. `Pacote PRO` a `17,87 €` (atual V8) vs. `25,97 €` (após adicionar `Casos Clínicos` revisto + `Guia de Aparelhos` + App com 70 mapas): medir taxa de aceitação pós-compra em 100 vendas.
2. `Upgrade Essencial → Completo` a `4,87 €` vs. `3,97 €`: medir taxa de aceitação nos compradores do plano de `7,87 €`.

### Not a problem
- Layout sem menus de fuga, contraste tipográfico AA/AAA, zero overflow em `360px`/`390px`/`1440px`, garantia de 15 dias clara e notas transparentes de entrega MB WAY / Multibanco.

### Could not check
- Fluxo real pós-checkout no servidor da Hotmart (credenciais externas fora do escopo autónomo) e disparo real do webhook `api/hotmart-webhook.js` com `UPSTASH_REDIS_REST_URL` em produção.

---

## 6. Capturas Guardadas em `funil-v8/qa/`

`upsell-pro-390.png`, `upsell-pro-360.png`, `upsell-pro-1440.png`, `downsell-kits-390.png`, `downsell-kits-360.png`, `downsell-kits-1440.png`, `upgrade-completo-390.png`, `upgrade-completo-360.png`, `upgrade-completo-1440.png`, `obrigado-basico-390.png`, `obrigado-completo-390.png`, `entrega-pro-390.png`, `obrigado-kits-390.png`.
