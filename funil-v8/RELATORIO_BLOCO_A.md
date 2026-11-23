# Relatório de Execução — Pós-Compra Bloco A (`funil-v8`)

- **Data / Hora (UTC)**: `2026-11-23T21:53Z`
- **Status Geral**: `PARTIAL` *(Tarefas 1, 2, 4 e QA ao vivo em `390×844` concluídas com `PASS`; Tarefa 3 no Microsoft Clarity `zhnyhnfrgq` encontra-se `BLOCKED` porque a sessão OAuth do painel Clarity expirou e exige login interativo do Jel)*
- **Commit Base (`origin/main`)**: `0147a8b` (`332` ficheiros rastreados)
- **Commit de Código (`origin/main`)**: `4f8c1f3`
- **Escopo Respeitado (Ordem do Jel)**:
  - **Modificados apenas**: `funil-v8/upsell-pro.html`, `funil-v8/downsell-kits.html`, `funil-v8/upgrade-completo.html` e este relatório `funil-v8/RELATORIO_BLOCO_A.md`.
  - **NÃO tocados**: produto principal `8930829`, Básico `9030792`, `atlas/index.html`, `funil-v8/funnel-v8.js`, `funil-v8/funnel-v8.css`, `vercel.json`, anúncios Meta, preços (`8,97 €`, `4,97 €`, `+ 4,87 €`) e códigos de checkout Hotmart.
  - **Publicação segura**: executada a partir de worktree isolada (`git worktree add --detach ... origin/main`) com `git push origin HEAD:main`, sem `merge` nem `push` do `main` local.

---

## 1. O Que Mudou e Onde (Commit `4f8c1f3`)

### 1.1 `funil-v8/upsell-pro.html`
- **Remoção do alerta de MB WAY no topo**: eliminado o bloco `#mbway-pending-banner` ("Passo 1: Confirma o MB WAY no telemóvel... Volta a este ecrã após aprovares") e as classes CSS `.mbway-alert*`.
- **Topo unificado com confirmação + oferta**: `#approved-confirm-banner` permanece sempre visível no topo da dobra.
  - Sem `?mbway=1`: `"Encomenda confirmada ✓ O teu Atlas (397 p. + 6 bónus) está garantido na Hotmart. Vê esta condição para membros (não existe na página principal)."`
  - Com `?mbway=1` ou `?status=pendente`: `"Encomenda recebida ✓ O teu Atlas (397 p. + 6 bónus) está registado na Hotmart. Vê esta condição para membros (não existe na página principal)."`
- **Aviso MB WAY em 1 linha discreta abaixo do botão CTA**: adicionado `<p class="mbway-inline-note" id="mbway-inline-note" role="note">MB WAY/Multibanco: aprova o pagamento inicial no teu banco — o Atlas segue por e-mail.</p>` imediatamente após o `.btn-primary` do hero (oculto por omissão, visível apenas com `?mbway=1` ou `?status=pendente`).
- **Propaga `?mbway=1` para o downsell**: o script inline acrescenta `mbway=1` aos links `./downsell-kits.html` quando o visitante chega com `?mbway=1` ou `?status=pendente`.
- **Limpeza de urgência/escassez falsa** (0 timers existentes): substituídas expressões como `"Oferta Única"`, `"Condição Única Pós-Compra"`, `"inclusa hoje"` e `"ativar a App PRO hoje"` por `"Condição para Membros"`, `"Condição Pós-Compra"`, `"inclusa neste pacote"` e `"com a App PRO"`, preservando `"uma única vez"` (pagamento único vs. mensalidade) e o preço `8,97 €`.

### 1.2 `funil-v8/downsell-kits.html`
- Adicionado `id="confirm-banner-text"` ao banner superior e `<p class="mbway-inline-note" id="mbway-inline-note" role="note">MB WAY/Multibanco: aprova o pagamento inicial no teu banco — o Atlas segue por e-mail.</p>` imediatamente abaixo do botão CTA do hero.
- Com `?mbway=1` ou `?status=pendente`, o topo passa a exibir `"Encomenda recebida ✓ O teu Atlas está registado na Hotmart. Se não precisas da App PRO, podes levar só os 4 novos manuais e os 3 kits em PDF (136 páginas) por 4,97 €."` e a nota discreta abaixo do CTA fica visível (`display: block`). Sem `?mbway=1`, o texto original e o layout permanecem inalterados.

### 1.3 `funil-v8/upgrade-completo.html`
- Adicionado `id="confirm-banner-text"` ao banner superior e `<p class="mbway-inline-note" id="mbway-inline-note" role="note">MB WAY/Multibanco: aprova o pagamento inicial no teu banco — o acesso segue por e-mail.</p>` imediatamente abaixo do botão CTA do hero.
- Com `?mbway=1` ou `?status=pendente`, o topo passa a exibir `"Encomenda recebida ✓ O teu Atlas Essencial está registado na Hotmart. Podes completar para o Atlas de 397 páginas pagando apenas a diferença."` e a nota discreta abaixo do CTA fica visível (`display: block`). Sem `?mbway=1`, o texto original e o layout permanecem inalterados.

---

## 2. Prova Empírica ao Vivo (Vercel Produção · Mobile `390×844` via Playwright)

Testado ao vivo após o deploy do commit `4f8c1f3` em `https://mapas-posicionamento-eletrodos-two.vercel.app`:

| URL Testado (`390×844`) | HTTP | Erros Consola | Overflow Horizontal (`scrollWidth / innerWidth`) | Texto no Topo (`#confirm-banner-text`) | Nota MB WAY (`#mbway-inline-note`) | Link CTA Principal / Preço / Link Recusa |
|---|---:|---:|---|---|---|---|
| `/funil-v8/upsell-pro` | `200` | `0` | `390 / 390` (`false`) | `Encomenda confirmada ✓ O teu Atlas (397 p. + 6 bónus) está garantido na Hotmart...` | `display: none` (`#mbway-pending-banner` ausente) | `pay.hotmart.com/B108418889J?off=urgqavvm...` · `8,97 €` · `/funil-v8/downsell-kits.html?...` |
| `/funil-v8/upsell-pro?mbway=1` | `200` | `0` | `390 / 390` (`false`) | `Encomenda recebida ✓ O teu Atlas (397 p. + 6 bónus) está registado na Hotmart...` | `display: block` (`top=830px` > `cta.bottom=822px`) | `pay.hotmart.com/B108418889J?off=urgqavvm...` · `8,97 €` · `/funil-v8/downsell-kits.html?mbway=1&...` |
| `/funil-v8/downsell-kits` | `200` | `0` | `390 / 390` (`false`) | `O teu Atlas está encaminhado na Hotmart...` | `display: none` | `pay.hotmart.com/G108419033I?off=1enxjshv...` · `4,97 €` · `hotmart.com/.../jel-vitor-sao-pedro-mendes-1` |
| `/funil-v8/downsell-kits?mbway=1` | `200` | `0` | `390 / 390` (`false`) | `Encomenda recebida ✓ O teu Atlas está registado na Hotmart...` | `display: block` (`top=736px` > `cta.bottom=728px`) | `pay.hotmart.com/G108419033I?off=1enxjshv...` · `4,97 €` · `hotmart.com/.../jel-vitor-sao-pedro-mendes-1` |
| `/funil-v8/upgrade-completo` | `200` | `0` | `390 / 390` (`false`) | `Compra aprovada. O teu Atlas Essencial está disponível na Hotmart...` | `display: none` | `pay.hotmart.com/K108418562E?off=5k28agkz...` · `+ 4,87 €` · `hotmart.com/.../jel-vitor-sao-pedro-mendes-1` |
| `/funil-v8/upgrade-completo?mbway=1` | `200` | `0` | `390 / 390` (`false`) | `Encomenda recebida ✓ O teu Atlas Essencial está registado na Hotmart...` | `display: block` (`top=737px` > `cta.bottom=729px`) | `pay.hotmart.com/K108418562E?off=5k28agkz...` · `+ 4,87 €` · `hotmart.com/.../jel-vitor-sao-pedro-mendes-1` |

- **Verificação adicional de integridade**:
  - `https://mapas-posicionamento-eletrodos-two.vercel.app/atlas/` devolveu HTTP `200` sem alterações.
  - Verificação automática de termos de escassez falsa (`só hoje`, `inclusa hoje`, `ativar a App PRO hoje`, `oferta única`) retornou `0` ocorrências (`[]`) nas 6 renderizações.

---

## 3. Tarefa 3 — Microsoft Clarity `zhnyhnfrgq` (`BLOCKED`)

- **Estado**: `BLOCKED` (autenticação interativa necessária).
- **Prova observada**: ao navegar para `https://clarity.microsoft.com/projects/view/zhnyhnfrgq/dashboard` no Playwright, a página apresentou o aviso *"Sua sessão expirou, entre novamente"* com botões OAuth (*Entrar no Microsoft*, *Entrar no Facebook*, *Entrar no Google*). Por regra de segurança, não se contorna autenticação sem sessão ativa do Jel.
- **Configuração pronta a aplicar após login do Jel no Clarity (`zhnyhnfrgq` → Funnels → New Funnel)**:
  1. **Passo 1 (Página de venda)**: URL contains `/atlas`
  2. **Passo 2 (Upsell PRO)**: URL contains `/funil-v8/upsell-pro`
  3. **Passo 3 (Ida para checkout PRO `pay.hotmart`)**: como `pay.hotmart.com` é um domínio externo onde a tag `zhnyhnfrgq` não corre, configurar o Passo 3 como **Smart Event / Click** no link `a[href*="pay.hotmart.com/B108418889J"]` (ou `Clicked element` correspondente ao botão `SIM, ATIVAR APP PRO + 7 EXTRAS · 8,97 €` em `/funil-v8/upsell-pro`).

---

## 4. Tarefa 4 — Pendências no Produto Principal (LISTADO APENAS · NÃO EXECUTADO)

Conforme ordem explícita do Jel, **nada abaixo foi alterado**. Lista exata do que fica pendente para uma missão futura aprovada:

1. **Hotmart `8930829` (Atlas Completo) e `9030792` (Básico Essencial) — campo "Aguardando Análise de Crédito" ("Em análise") vazio**:
   - Em `8930829`, preencher o redirecionamento externo "Em análise" com `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/upsell-pro?mbway=1`.
   - Em `9030792`, confirmar/preencher "Em análise" com `https://mapas-posicionamento-eletrodos-two.vercel.app/funil-v8/upgrade-completo?mbway=1`.
2. **Ordem do PDF de acesso na entrega Hotmart (`8930829` e `9030792`)**:
   - O ficheiro de boas-vindas/acesso (`00_ABRIR_AREA_DE_MEMBROS_NETFLIX.pdf`) aparece atualmente como último da lista de ficheiros do produto; mover para o 1.º lugar (ex.: `01_COMECA_AQUI_Acesso_e_Oferta_de_Membro.pdf`) com ligação direta para a oferta PRO `8,97 €` na 1.ª página.
3. **E-mail pós-compra na Hotmart (mensagem automática ao comprador)**:
   - Incluir no e-mail pós-compra o acesso direto ao material + o link direto da condição de membro da App PRO (`8,97 €` / `pay.hotmart.com/B108418889J?off=urgqavvm`).
4. **Promessa de "vídeo" em `atlas/index.html` (sem entrega em vídeo real na área de membros 9039471)**:
   - Linhas citadas no pedido (`L409`, `L631`, `L703-704`) correspondem no `origin/main` atual (`0147a8b`) às seguintes ocorrências exatas em `atlas/index.html`:
     - **`L404`** (bloco hero, logo antes de `L409`): `<span><strong>Inclui Guia em Vídeo</strong> na área de membros</span>`
     - **`L626`** (bloco de planos, logo antes de `L631`): `BÓNUS 1: Guia Prático em Vídeo na Marquesa (Hotmart Club)`
     - **`L689` / `L696` / `L698` / `L699`** (cartão Bónus 1 do carrossel, logo antes de `L703-704`): `"7 aulas vídeo"`, `"Guia Prático em Vídeo na Marquesa"` e `"Demonstrações em vídeo por região anatómica abertas para experimentar grátis dentro da tua área de membros FisioVanta."`
     - **`L880`** (secção Área de Membros FisioVanta): `"tens acesso ao Guia Prático em Vídeo gratuito."`
     - **`L897`** (resumo final do plano): `"+ Vídeo, Kit Utente e Pocket Card."`

---

## 5. Rollback (Reversão Segura Sem `main` Local)

Se for necessário reverter a alteração de código (`4f8c1f3`) mantendo intactos todos os restantes ficheiros de `origin/main`:

```powershell
cd "D:\MEU MUNDO\Produtos\Mapas_Posicionamento_Eletrodos\site_clone"
git fetch origin main
git worktree add --detach "$env:TEMP\wt_rollback_bloco_a" origin/main
cd "$env:TEMP\wt_rollback_bloco_a"
git revert --no-edit 4f8c1f3
git push origin HEAD:main
cd "D:\MEU MUNDO\Produtos\Mapas_Posicionamento_Eletrodos\site_clone"
git worktree remove "$env:TEMP\wt_rollback_bloco_a"
```
