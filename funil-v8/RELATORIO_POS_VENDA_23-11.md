# Relatório de Execução — Pós-Venda Aprovado (23/11)

- **Data / Hora (UTC)**: `2026-11-23T22:10Z`
- **Status Geral**: `PARTIAL` *(Item 1 implementado, publicado em `origin/main` e verificado ao vivo em `390×844` e `1440×900` com `PASS`; cópia local do PDF do Item 3 preparada com SHA-256 idêntico; operações nos painéis externos Hotmart e Microsoft Clarity encontram-se `BLOCKED` porque ambas as sessões no navegador estão expiradas/desconectadas e exigem login interativo do Jel)*
- **Commit Base (`origin/main`)**: `3dc5e29`
- **Commit de Código (`origin/main`)**: `ef4f207`
- **Restrições Respeitadas (`VERIFIED RESULT`)**:
  - `atlas/index.html`: **0 alterações** (`git diff 3dc5e29 HEAD -- atlas/index.html` vazio; HTTP `200` em produção).
  - Preços e ofertas mantidos intactos: `8,97 €` (`urgqavvm`), `4,97 €` (`1enxjshv`), `+ 4,87 €` (`5k28agkz`), `11,87 €`, `7,87 €`.
  - Anúncios Meta: **não tocados**.
  - Publicação segura: worktree isolada a partir de `origin/main` com `git push origin HEAD:main` (sem `merge` nem `push` do `main` local).

---

## 1. Matriz de Estado dos 5 Itens

| Item | Escopo | Estado | Evidência Empírica (`FACT` / `VERIFIED RESULT`) |
|---|---|---|---|
| **1. `funil-v8/upsell-pro.html` (e `?mbway=1`)** | Topo `"✅ Compra do Atlas confirmada!..."` + 4 pedaços + App PRO na 1.ª dobra; aviso MB WAY em 1 linha; sem timers/escassez falsa | **`PASS`** | Publicado no commit `ef4f207` (`origin/main`) e verificado ao vivo na Vercel em `390×844` (normal + `?mbway=1`) e `1440×900` com `0` erros e `0` overflow. |
| **2. Hotmart `8930829` & `9030792` — Páginas de Obrigado** | Preencher `"Aguardando Análise de Crédito"` com o mesmo URL de `"Aguardando Pagamento"` sem alterar outros campos | **`BLOCKED`** | Aba 0 do Playwright redirecionada para `sso.hotmart.com/login` (`Login - Hotmart`); variável `HOTMART_AT` ausente no ambiente (`HOTMART_AT_SET=no`). |
| **3. Hotmart `8930829` & `9030792` — PDF de Acesso Renomeado** | Renomear/reenviar PDF de acesso como `00_COMECA_AQUI_ACESSO_CLUB_E_PACOTE_PRO_8_97.pdf` (mesmo conteúdo) sem apagar Atlas/bónus | **`PARTIAL`** | Ficheiro local gerado em `PACOTE_HOTMART_PRONTO/1_Produto_Principal/00_COMECA_AQUI_ACESSO_CLUB_E_PACOTE_PRO_8_97.pdf` (`92 722` bytes, SHA-256 idêntico ao original). Envio na Hotmart `BLOCKED` por login pendente. |
| **4. Clube `FisioVanta` — Ocultar produtos da vitrine** | Ocultar `SéniorAtivo/Dias com Sentido` e `Shadow Fighter` dos compradores de ElectroMapas (sem apagar nem remover acesso) | **`BLOCKED`** | Aba 0 do Playwright em `sso.hotmart.com/login` (login interativo necessário). |
| **5. Microsoft Clarity `zhnyhnfrgq`** | Funil `atlas → upsell-pro → pay.hotmart` (só medir) | **`BLOCKED`** | Aba 1 do Playwright em `clarity.microsoft.com/projects/view/zhnyhnfrgq/dashboard` exibe *"Sua sessão expirou, entre novamente"* com OAuth Microsoft/Facebook/Google. |

---

## 2. O Que Mudou no Código (`ef4f207` — `funil-v8/upsell-pro.html`)

1. **Topo de confirmação unificado (`#approved-confirm-banner`)**:
   - Removido o ícone SVG duplicado; `#confirm-banner-text` exibe tanto sem parâmetros quanto com `?mbway=1` / `?status=pendente`:
     `✅ Compra do Atlas confirmada! O teu acesso de 397 páginas já foi enviado por e-mail pela Hotmart. Enquanto abre, completa o teu gabinete…`
2. **4 Pedaços + App PRO na 1.ª dobra (`.fold-pack-grid` acima de `.hero-offer-box`)**:
   - `1. Testes Ortopédicos` (`14 pranchas Sn/Sp + 4 fichas A4 (24 p.)`)
   - `2. Ultrassom 1/3 MHz` (`12 mapas ERA e combinada (18 p.)`)
   - `3. Laser WALT & LED` (`12 grades + tabela t = E/P (18 p.)`)
   - `4. Bandagem & 20 Casos` (`Raciocínio clínico + taping (24 p.)`)
   - `+ App ElectroMapas PRO (offline) + 3 Kits A4` (`70 mapas em 5s, calculadora mA/cm² e gerador SOAP no telemóvel` · badge `VITALÍCIO`)
3. **Aviso MB WAY compacto + propagação `?mbway=1`**:
   - `<p class="mbway-inline-note" id="mbway-inline-note" role="note">` permanece oculto (`display: none`) por omissão e fica visível (`display: block`) abaixo do botão CTA apenas com `?mbway=1` ou `?status=pendente`.
   - Links `./downsell-kits.html` continuam a receber `mbway=1` automaticamente quando o parâmetro está presente.
4. **Zero timers / zero escassez falsa**:
   - Mantidos `0` contadores regressivos e `0` expressões de falsa urgência; mantida a oferta `8,97 €` (`pay.hotmart.com/B108418889J?off=urgqavvm`).

---

## 3. Prova Empírica ao Vivo (Vercel Produção · Playwright)

| URL & Viewport | HTTP | Erros Consola | Overflow Horizontal | Banner Topo (`top–bottom`) | H1 + 4 Manuais + App PRO (`bottom`) | Offer Box / CTA (`top–bottom`) | MB WAY Note (`display` / `top–bottom`) |
|---|---:|---:|---|---|---|---|---|
| `/funil-v8/upsell-pro` (`390×844`) | `200` | `0` | `390 / 390` (`false`) | `123–191 px` | H1 `245 px` · 4 manuais `313–378 px` · App PRO `461 px` | Box `470–714 px` · CTA `542–588 px` · Recusa `643–701 px` | `none` |
| `/funil-v8/upsell-pro?mbway=1` (`390×844`) | `200` | `0` | `390 / 390` (`false`) | `123–191 px` | H1 `245 px` · 4 manuais `313–378 px` · App PRO `461 px` | Box `470–751 px` · CTA `542–588 px` · Recusa `680–738 px` | `block` (`594–625 px`) |
| `/funil-v8/upsell-pro?mbway=1` (`1440×900`) | `200` | `0` | `1440 / 1440` (`false`) | Visível na dobra | Visível na dobra | Offer Box `bottom = 766 px` (`<= 900 px`) | `block` |
| `/atlas/` (integridade) | `200` | — | — | — | — | — | Intacto (`0` diffs desde `3dc5e29`) |

- **Verificação automática de escassez falsa (`upsell-pro` e `upsell-pro?mbway=1`)**: `[]` (`0` ocorrências de `só hoje`, `última chance`, `oferta única`, `inclusa hoje`, `expira em`, `escassez`, `cronómetro`).
- **Propagação para downsell (`?mbway=1`)**: verificada ao vivo em `/funil-v8/downsell-kits.html?mbway=1&src=funil_v8&sck=v8&xcod=v8`.

---

## 4. Recibo Local do PDF Renomeado (Item 3 — Pronto para Upload)

- **Ficheiro original (preservado)**: `D:\MEU MUNDO\Produtos\Mapas_Posicionamento_Eletrodos\PACOTE_HOTMART_PRONTO\1_Produto_Principal\00_ABRIR_AREA_DE_MEMBROS_NETFLIX.pdf`
- **Ficheiro renomeado (novo)**: `D:\MEU MUNDO\Produtos\Mapas_Posicionamento_Eletrodos\PACOTE_HOTMART_PRONTO\1_Produto_Principal\00_COMECA_AQUI_ACESSO_CLUB_E_PACOTE_PRO_8_97.pdf`
- **Tamanho**: `92 722` bytes (ambos idênticos)
- **SHA-256 (ambos idênticos)**: `6D0DD9E2DDA45C278708651993996562A7567729D609EB2083FFA8F3FCA01008`

---

## 5. Rollback Seguro de Cada Item

1. **Item 1 (`funil-v8/upsell-pro.html`, commit `ef4f207`)**:
   ```powershell
   cd "D:\MEU MUNDO\Produtos\Mapas_Posicionamento_Eletrodos\site_clone"
   git fetch origin main
   git worktree add --detach "$env:TEMP\wt_rollback_23_11" origin/main
   git -C "$env:TEMP\wt_rollback_23_11" revert --no-edit ef4f207
   git -C "$env:TEMP\wt_rollback_23_11" push origin HEAD:main
   git worktree remove "$env:TEMP\wt_rollback_23_11"
   ```
2. **Item 2 (Hotmart `8930829` & `9030792` — Página de Obrigado `"Aguardando Análise de Crédito"`)**:
   - Quando aplicado, basta limpar o campo `"Aguardando Análise de Crédito"` e salvar mantendo `"Compras Aprovadas"` e `"Aguardando Pagamento"` inalterados.
3. **Item 3 (Hotmart `8930829` & `9030792` — PDF de acesso)**:
   - Local: apagar apenas `00_COMECA_AQUI_ACESSO_CLUB_E_PACOTE_PRO_8_97.pdf` (o ficheiro original `00_ABRIR_AREA_DE_MEMBROS_NETFLIX.pdf` não foi apagado nem modificado).
   - Hotmart (após upload): reenviar `00_ABRIR_AREA_DE_MEMBROS_NETFLIX.pdf` e remover `00_COMECA_AQUI_ACESSO_CLUB_E_PACOTE_PRO_8_97.pdf`.
4. **Item 4 (Clube `FisioVanta` — Vitrine)**:
   - Quando aplicado, reativar a exibição na vitrine para `SéniorAtivo/Dias com Sentido` e `Shadow Fighter` nas definições da vitrine do Hotmart Club.
5. **Item 5 (Clarity `zhnyhnfrgq`)**:
   - Quando criado, eliminar o funil `atlas → upsell-pro → pay.hotmart` em *Funnels* (não altera código do site nem dados já recolhidos).

---

## 6. Próximo Passo Para Desbloquear Itens 2–5

As abas de login já estão abertas no navegador Playwright:
- **Aba 0**: `sso.hotmart.com/login` (para executar os Itens 2, 3 e 4 diretamente em `8930829`, `9030792` e `FisioVanta`).
- **Aba 1**: `clarity.microsoft.com/projects/view/zhnyhnfrgq/dashboard` (para criar o funil do Item 5).

Assim que iniciar sessão nessas duas abas e avisar, os Itens 2, 3 (upload), 4 e 5 podem ser concluídos de imediato.
