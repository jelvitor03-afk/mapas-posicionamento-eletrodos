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
   - O modal de licença em `/app/` ainda contém um link de rodapé legado para `/upsell.html` (`14,97 €`) e uma chamada abortada para `/assets/videos/video_joelho_pt_pt.mp4`.
   - Em `8931029` (*eBooks, Documentos*), caso deseje que o comprador também tenha o link da App PRO dentro da Área de Membros Hotmart (além da página `entrega-pro`), basta subir um PDF simples de 1 página com o botão clicável para `/electromapas-pro-app`.
