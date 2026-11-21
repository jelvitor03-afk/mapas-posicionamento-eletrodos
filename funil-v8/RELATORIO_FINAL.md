# Relatório Final — Funil Pós-Compra ElectroMapas V8 (Hotmart + Produção)

- **Data / Hora (UTC)**: `2026-11-21T00:47Z`
- **Status Geral**: `PASS` *(Funil V8 configurado na Hotmart, publicado em produção na Vercel e validado ao vivo; observações pendentes de webhook/KV documentadas abaixo sem prometer recursos não ativos)*
- **Domínio em Produção**: `https://mapas-posicionamento-eletrodos-two.vercel.app`
- **Commit Publicado (`origin/main`)**: `2f3e750` *(publicada apenas a pasta `funil-v8/`; `23` ficheiros de `entregaveis/`, página `/atlas/` e ofertas principais `11,87 €` / `7,87 €` preservados intactos)*

---

## 1. Ofertas Criadas na Hotmart (Preços Aprovados) e Ofertas Principais Preservadas

| Produto Hotmart | ID | Oferta | Preço (EUR, IVA incl.) | Código (`?off=`) | Link de Checkout Verificado ao Vivo | Estado |
|---|---|---|---|---|---|---|
| **Atlas Completo (397 p.)** | `8930829` | Preço base *(principal)* | `11,87 €` *(IVA incl. 0,67 €)* | `csi2p45d` | `https://pay.hotmart.com/K108418562E?off=csi2p45d` | **Intacta** (HTTP 200) |
| **Atlas Completo (397 p.)** | `8930829` | **Upgrade Pós-Compra Básico → Completo** *(nova)* | **`4,87 €`** *(IVA incl. 0,28 €)* | **`5k28agkz`** | `https://pay.hotmart.com/K108418562E?off=5k28agkz` | **Criada e verificada** |
| **Básico Essencial (112 p.)** | `9030792` | Preço base *(principal)* | `7,87 €` *(IVA incl. 0,45 €)* | `1aepdmuf` | `https://pay.hotmart.com/R108594424Y?off=1aepdmuf` | **Intacta** (HTTP 200) |
| **Pacote PRO (3 Kits + App)** | `8931029` | Preço base *(legado)* | `25,97 €` | `7efptb20` | — | **Intacta** |
| **Pacote PRO (3 Kits + App)** | `8931029` | **Pacote PRO Pós-Compra V8** *(nova)* | **`17,87 €`** *(IVA incl. 1,01 €)* | **`urgqavvm`** | `https://pay.hotmart.com/B108418889J?off=urgqavvm` | **Criada e verificada** |
| **Só os 3 Kits (52 p.)** | `8931107` | Preço base *(legado)* | `12,97 €` | `8ocd86ai` | — | **Intacta** |
| **Só os 3 Kits (52 p.)** | `8931107` | **3 Kits Downsell V8** *(nova)* | **`8,87 €`** *(IVA incl. 0,50 €)* | **`1enxjshv`** | `https://pay.hotmart.com/G108419033I?off=1enxjshv` | **Criada e verificada** |

---

## 2. Páginas de Obrigado Configuradas (Redirecionamento Externo)

Todas as configurações em **Ferramentas → Configurações da página de pagamento → Opções de Páginas de Obrigado → Página externa** (nos 3 campos: *Compras Aprovadas*, *Aguardando Pagamento* e *Aguardando Análise de Crédito*, compatível com MB WAY e Multibanco; widget de 1-clique **não** ativado):

| Produto Hotmart | ID | URL Configurado na Hotmart | Observação de Roteamento |
|---|---|---|---|
| **Básico Essencial** | `9030792` | `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/upgrade-completo` | Redireciona comprador de `7,87 €` para a oferta de upgrade `+4,87 €`. |
| **Atlas Completo** | `8930829` | `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/upsell-pro` | **Limitação nativa Hotmart**: a Página de Obrigado externa é por produto (não por oferta). Por isso, `funnel-v8.js` grava `em_v8_upgraded_ts` no clique do CTA de `upgrade-completo.html` e, quando o comprador regressa a `/funil-v8/upsell-pro`, redireciona automaticamente (`window.location.replace`) para `/funil-v8/obrigado-completo` com os parâmetros preservados. |
| **Pacote PRO** | `8931029` | `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/entrega-pro` | Entrega do acesso aos 3 Kits + botão para `/electromapas-pro-app`. |
| **Só os 3 Kits** | `8931107` | `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/obrigado-kits` | Entrega limpa dos 3 Kits + Atlas Completo na Hotmart. |

---

## 3. Meta Pixel `1627467939032653`

- **`8930829` (Atlas Completo)** e **`9030792` (Básico Essencial)**: já possuíam `1627467939032653` configurado via Web (`Vendas realizadas`, `Todos os métodos de pagamento`, `Valor da transação`).
- **`8931029` (Pacote PRO)** e **`8931107` (Só os 3 Kits)**: Pixel **`1627467939032653`** adicionado e verificado em *Pixels configurados* com **Evento via Web** (`Vendas realizadas` + `Visitas na Página de pagamento`, `Todos os métodos de pagamento`, `Valor da transação`). O pixel legado `1684602679908725` foi mantido intacto.
- Nas 7 páginas de `funil-v8/`: apenas `PageView`, `ViewContent` e `InitiateCheckout` (sem evento `Purchase` duplicado no navegador).

---

## 4. Conteúdo dos Produtos (`8931029` e `8931107`)

- **Produto `8931107` (Só os 3 Kits)**: os **3 PDFs** já se encontram carregados em *Conteúdo do Produto* (`1.3 MB de 250 MB`):
  - `ElectroMapas_Kit1_Bolso1.pdf` (`453.9 KB`)
  - `ElectroMapas_Kit2_Clinica2.pdf` (`562.1 KB`)
  - `ElectroMapas_Kit3_Pacientes_Inverno3.pdf` (`308.9 KB`)
- **Produto `8931029` (Pacote PRO)**: os **3 PDFs** já se encontram carregados (`3 de 20 arquivos · 1.29 MB de 250 MB`):
  - `ElectroMapas_Kit1_Bolso.pdf` (`453.87 KB`)
  - `ElectroMapas_Kit2_Clinica.pdf` (`562.11 KB`)
  - `ElectroMapas_Kit3_Pacientes_Inverno.pdf` (`308.93 KB`)
  - **Nota sobre o formato**: `8931029` está registado na Hotmart como *eBooks, Documentos* (não curso Hotmart Club), pelo que não tem campo de módulo/link externo dentro de *Conteúdo do Produto*. O acesso imediato à App PRO (`https://mapas-posicionamento-eletrodos-two.vercel.app/electromapas-pro-app`) é entregue diretamente na página pós-compra **`/funil-v8/entrega-pro`**.

---

## 5. Verificação ao Vivo Após Deploy (Vercel + Hotmart + App PRO)

### 5.1 Páginas Publicadas (HTTP 200 + QA Mobile `390×844` sem overflow)
- `https://mapas-posicionamento-eletrodos-two.vercel.app/` → `200` (redireciona para `/atlas/`)
- `https://mapas-posicionamento-eletrodos-two.vercel.app/atlas/` → `200` (links intactos: Básico `R108594424Y?off=1aepdmuf` e Completo `K108418562E?off=csi2p45d`)
- `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/upgrade-completo` → `200` (CTA aponta para `K108418562E?off=5k28agkz` com repasse de `utm_*`, `fbclid`, `src`, `sck`, `xcod`; recusa navega para `/funil-v8/obrigado-basico`)
- `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/upsell-pro` → `200` (CTA aponta para `B108418889J?off=urgqavvm`; recusa navega para `/funil-v8/downsell-kits`)
- `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/downsell-kits` → `200` (CTA aponta para `G108419033I?off=1enxjshv`; recusa navega para `/funil-v8/obrigado-completo`)
- `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/obrigado-basico` → `200`
- `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/obrigado-completo` → `200`
- `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/entrega-pro` → `200` (botão abre `/electromapas-pro-app` → `/app/`)
- `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/obrigado-kits` → `200`
- `https://mapas-posicionamento-eletrodos-two.vercel.app/electromapas-pro-app` → `200` (`/app/` carregado em `390×844` com modal *Desbloqueio ElectroMapas PRO*)

### 5.2 Redirecionamento Inteligente do Upgrade (`funnel-v8.js`)
- Verificado ao vivo em navegador mobile (`390×844`): após clique no CTA de `/funil-v8/upgrade-completo`, abrir `/funil-v8/upsell-pro?utm_source=meta&utm_campaign=qa_live_v8` redirecionou automaticamente para `/funil-v8/obrigado-completo?utm_source=meta&utm_campaign=qa_live_v8`.

### 5.3 Teste de Desbloqueio da App PRO (`/api/verify-license`)
- Chamada `POST https://mapas-posicionamento-eletrodos-two.vercel.app/api/verify-license` com `{"action":"activate","email":"teste.clinico@electromapas.pt","deviceId":"qa-test-device-v8"}` retornou HTTP `200` com `"valid": true`, `"sessionToken"` assinado por HMAC e `"storageMode": "resilient_ledger"`.

---

## 6. Pendências / Limitações Conhecidas (Transparência Técnica)

1. **Webhook Hotmart (`8931029`) & Redis/KV (`api/hotmart-webhook.js`)**:
   - Na Hotmart (`https://app.hotmart.com/tools/webhook`), existem atualmente **`0 configurações`** (nenhum webhook registado para `https://mapas-posicionamento-eletrodos-two.vercel.app/api/hotmart-webhook`).
   - O endpoint `/api/verify-license` respondeu em modo **`resilient_ledger`** (sem Redis/Upstash KV persistente ativo na Vercel). Isto significa que o comprador do Pacote PRO **consegue ativar a App PRO normalmente** por e-mail ou código `HP...`, mas a revogação automática por reembolso via webhook e o bloqueio persistente entre instâncias serverless só ficam ativos depois de configurar o Webhook na Hotmart + variáveis `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` / `HOTMART_HOTTOK` na Vercel.
2. **Notas menores fora da pasta `funil-v8/` (não alteradas para preservar a produção)**:
   - O modal de licença em `/app/` ainda contém um link de rodapé legado para `/upsell.html` (`14,97 €`) e uma chamada abortada para `/assets/videos/video_joelho_pt_pt.mp4`. *(Resolvido na atualização V8.1 abaixo — commits `dd60548` e `f106928`.)*
   - Em `8931029` (*eBooks, Documentos*), caso deseje que o comprador também tenha o link da App PRO dentro da Área de Membros Hotmart (além da página `entrega-pro`), basta subir um PDF simples de 1 página com o botão clicável para `/electromapas-pro-app`.

---

## Auditoria e Otimização V8.1 — 2026-11-21

### 1. Diagnóstico Real na Hotmart (Fatos Empíricos de `2026-11-21`)

- **Vendas na oferta principal (`8930829`, `csi2p45d` — `11,87 €` bruto / `9,71 €` líquido)**: **4 transações reais** registadas hoje entre `09:27` e `11:38`:
  1. `HP1041991886` (`11:38:35`, aprovada `12:03:35`) — `Aprovada` — **Multibanco** (`ig`)
  2. `HP1438283253` (`11:30:47`, aprovada `11:31:35`) — `Aprovada` — **MB WAY** (`ig`)
  3. `HP2417637770` (`11:12:13`, aprovada `11:12:30`) — `Aprovada` — **MB WAY** (`meta`)
  4. `HP1896287686` (`09:27:07`) — `Aguardando Pagamento` — **Multibanco** (`meta`)
- **Produtos `9030792`, `8931029` e `8931107`**: **0 vendas**, **0 carrinhos abandonados**, **0 cartões recusados** nos últimos 7 dias.
- **Método de pagamento dominante**: **100% dos pedidos em `2026-11-21`** usaram **MB WAY (2)** ou **Multibanco (2)** — `0` via Cartão de Crédito.
- **Porque o funil não aparece em `Funil de Vendas` nativo da Hotmart**: o funil de 1-clique nativo da Hotmart **não suporta MB WAY**. O funil V8 está ativo e confirmado via **Opções de Páginas de Obrigado → Página externa** nos 4 produtos.
- **Nota externa**: a inspeção ao Meta Ads Manager foi redirecionada para ecrã de login (`business.facebook.com/business/loginpage`), pelo que não foi consultada nesta auditoria.

### 2. Correções Executadas (Hotmart + Código em Produção)

- **Limpeza de Fricção nos Checkouts Hotmart (`8931029`, `8931107`, `9030792`)** — salvos e confirmados após recarregamento (`8930829` e preços principais preservados intactos):
  - `Mostrar opção de Inserir Cupom`: **desmarcado** em `8931029`, `8931107` e `9030792`.
  - `GooglePay`: **ativado** em `8931029`, `8931107` e `9030792` (junto de Cartão, MB WAY, Multibanco e Apple Pay).
  - `Idioma`: confirmado **`Português (Portugal)`** nos 3 produtos.
  - `Página externa`: confirmada nos 3 estados (`/funil-v8/entrega-pro`, `/funil-v8/obrigado-kits`, `/funil-v8/upgrade-completo`).
- **Correções de Conversão em `funil-v8/` (commits `dd60548` e `f106928`)**:
  - Banner superior alterado para `.confirm-banner.is-hold` ("Passo 1 registado · Não feches esta página antes de concluir o Passo 2"), eliminando a fuga imediata para o e-mail.
  - Bloco `.hero-offer-box` (preço + botão direto para checkout + métodos reais) colocado acima da dobra — e em `upsell-pro.html` posicionado antes da lista de 3 benefícios para garantir CTA visível na primeira tela do telemóvel (`390×844`) e computador (`1440×900`).
  - Removido o bloco autossabotador `.info-note` ("Transparência sobre sobreposição") imediatamente acima do botão de compra em `upsell-pro.html`.
  - Adicionada barra fixa mobile `#sticky-mobile` (visível apenas após sair do hero no telemóvel e oculta ao entrar em `#oferta`) e repasse de pré-preenchimento (`name`, `email`/`buyer_email`, `phonenumber`/`phone` em `sessionStorage`) para links `pay.hotmart.com` em `funnel-v8.js`.
- **Correções Técnicas na App PRO (`/app/` — commits `dd60548` e `f106928`)**:
  - `app/index.html`: corrigidos caminhos relativos `../assets/` para `/assets/`, carregamento lazy do `<video id="layer-video-player">` (`preload="none"`, `src=""` até o utilizador abrir a aba de vídeo), removido o botão antigo de acesso grátis permanente (`Ativar Avaliação Completa PRO`) do modal `#modal-license-gate` e atualizado o link inferior para `/funil-v8/upsell-pro` (`17,87 €`).
  - `app/sw.js` e `vercel.json`: versão de cache atualizada para **`electromapas-pro-v8-1`** com estratégia *Network-First* para documentos HTML e `Cache-Control: public, max-age=0, must-revalidate` em `/app`, `/app/`, `/app/index.html` e `/app/sw.js`.

### 3. Provas de Verificação ao Vivo Após Publicação (`f106928`)

- **HTTP / Headers em Produção**:
  - Todas as 10 rotas principais (`/`, `/atlas/`, `/funil-v8/*`, `/electromapas-pro-app`, `/app/`) devolveram **HTTP `200`**.
  - `/app/` e `/app/sw.js` servidos com `Cache-Control: public, max-age=0, must-revalidate`, `electromapas-pro-v8-1` e `/funil-v8/upsell-pro` ativo.
  - `POST /api/verify-license` (`{"code":"HP123456789012","deviceId":"qa-device-v81"}`) retornou **HTTP `200`** com `"valid": true` e `"storageMode": "resilient_ledger"`.
  - `/atlas/` intacta (`11,87 €` e `7,87 €`), `0` erros de consola e `0` overflow em `390×844` e `1440×900`.
  - Repositório: **`23`** ficheiros rastreados em `entregaveis/` preservados sem alteração.
- **QA ao Vivo em Navegador (Telemóvel `390×844` e Computador `1440×900`)**:
  - **`/funil-v8/upsell-pro`**: `0` erros de consola, `0` overflow horizontal, `0` eventos `Purchase` no Pixel, CTA da primeira dobra (`17,87 €`) com `bottom = 750.93px` em `390×844` (`<= 844`) e `.hero-offer-box` com `bottom = 705.60px` em `1440×900` (`<= 900`), pré-preenchimento (`name`, `email`, `phonenumber`, `utm_source`) repassado para `pay.hotmart.com/B108418889J?off=urgqavvm`, barra `#sticky-mobile` e link de recusa funcionais.
  - **`/funil-v8/downsell-kits`** e **`/funil-v8/upgrade-completo`**: `0` erros, `0` overflow, `0` eventos `Purchase`, CTA na primeira dobra mobile (`<= 844`), `#sticky-mobile` funcional, redirecionamento automático de `upgrade-completo` → `/funil-v8/upsell-pro` → `/funil-v8/obrigado-completo` verificado.
  - **Checkouts públicos Hotmart (somente leitura)**: `B108418889J?off=urgqavvm` (`17,87 €`), `G108419033I?off=1enxjshv` (`8,87 €`) e `K108418562E?off=5k28agkz` (`4,87 €`) validados ao vivo com **zero campo de cupom** e **MB WAY**, **Multibanco**, **Google Pay**, **Cartão**, **PayPal** e **Klarna** visíveis.
  - **`/app/` após reload limpo**: `0` erros de consola, **`0` pedidos `.mp4` disparados na abertura**, vídeo `video_joelho_pt_pt.mp4` carregado em `206` apenas ao clicar em `🎬 Vídeo Joelho (VMO)`, modal `#modal-license-gate` sem botão de avaliação grátis e com link para `/funil-v8/upsell-pro` (`17,87 €`).

### 4. Próximas Decisões que Dependem da Aprovação do Jel

1. **Adicionar um *Order Bump* no checkout do Atlas Completo (`8930829`)**: como 100% dos compradores de hoje usaram MB WAY ou Multibanco (e não Cartão 1-clique), um Order Bump dentro do mesmo checkout aproveita a **única autorização bancária** e tende a converter muito acima do upsell pós-compra externo.
2. **Corrigir capa cinzenta (`placeholder`) e descritor da fatura (`HTM*HT`) no produto `8930829`**.
3. **Configurar `HOTMART_HOTTOK` + Upstash Redis/KV (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) na Vercel** e registar `https://mapas-posicionamento-eletrodos-two.vercel.app/api/hotmart-webhook` na Hotmart (`0` webhooks ativos atualmente) para persistência real das licenças e revogação automática em caso de reembolso.

