# Spec de implementação: Kurio, marketplace de NFTs (React + Tailwind + shadcn/ui)

> Referência: Figma "Frontend Challenge", página "Marketplace de NFTs GreenMint", 15 frames (9 desktop + 6 mobile).
> Os valores vieram do painel Properties do Figma (estilos, variáveis e componentes). Onde aparece "≈", o valor foi medido no visual.
> A marca nas telas é **KURIO**, um wordmark só de texto, sem imagem de logo. Todo o conteúdo está em PT-BR. O tema é só escuro.

---

## 0. Notas de extração (leia antes)

- **Fonte única: Roboto Mono.** Ela está na variável `font/family` e vale para o arquivo inteiro.
- **Ícones:** Iconly, nas variantes Curved, Bold e Light-Outline. Exemplos: `Arrow-Right 2`, `Arrow-Left 2`, `Delete`, `Filter`, `Image 2`, `Hide`, `Star (Bold)` e `Home (Bold)`. No código, use `lucide-react` com equivalentes (stroke 1.5).
- **Frames desktop:** 1440 de largura, padding horizontal 120, topo e base 24, gap de 96 entre seções. O conteúdo útil fica em **1200px**.
- **Frames mobile:** 414×896 com radius 40. Esse radius é só a moldura do device e não deve ir para o layout.
- **Inconsistências do próprio arquivo:**
  - A descrição de alguns color styles aponta para a variável errada. O estilo "Surface Card" diz `color/text-primary`, mas o hex é #241612.
  - O style `Text/Coral` é #EA6B4F, só que a variável `color/text-coral` usada nos asteriscos é **#F0805F**.
  - Na dúvida, siga o hex que está aplicado no elemento.
- O próprio Figma documenta defeitos conhecidos no componente "Marketplace Page", usado atrás dos modais de auth: um label órfão "2.29 ETH" sobre um card e o chip "RARO" com canto reto vazando do card.

---

## 1. Design tokens

### 1.1 Cores (hex exato)

| Token (sugestão CSS var) | Hex | Uso observado |
|---|---|---|
| `--ink` (`color/ink`) | **#140D0A** | Fundo de página em todos os frames. Texto sobre botões primários. |
| `--surface-card` | **#241612** | Cards, sidebar de filtros, modais, sheets mobile, faixas do footer, linhas do carrinho |
| `--surface-raised` | **#2F1D15** | Botões-ícone circulares (voltar, favoritar, stepper mobile), fim de gradiente dos cards mobile |
| `--surface-dark` | **#38220F** | Faixa da marca no footer, input da newsletter |
| `--border` | **#3F2319** | Borda padrão de inputs, selects, textarea, paginação inativa, social buttons, opções de carteira |
| `--border-soft` | **#55321F** | Ícone desabilitado (minus do stepper com qty=1) |
| `--primary` | **#D28A4C** | Botões primários, bordas de foco/selecionado, sublinhado da nav, hairlines, badges, medalhões, dots ativos |
| `--primary-light` | #DD9A5F | Gradiente decorativo do hero mobile |
| `--primary-dark` | #C47B3E | Definido, não aparece aplicado. Use no hover do primário. |
| `--amber` | #E3A44E | Definido, sem uso visível |
| `--foreground` | **#F5F1EB** | Texto principal (títulos, labels, links do footer) |
| `--text-primary` | #F5F1EB | Títulos de seção (ex.: "Diário da Cunhagem") |
| `--text-secondary` | **#CFB28C** | Parágrafos, descrições, metadados, preço unitário no carrinho |
| `--text-accent` | **#E89B55** | Item ativo de nav/tab/filtro, preços, links ("Ler mais", "Esqueceu a senha?", "Adicionar") |
| `--secondary` (muted) | **#B39463** | Placeholders, "ID do token", preço antigo riscado, ícones secundários |
| `--text-coral` | **#F0805F** | Asterisco de campo obrigatório, separador das tabs do modal (style Text/Coral = #EA6B4F) |
| `--success` | #00A66C | Definido, sem uso nas telas (use em toasts e status "confirmado") |
| `--error` | #ED1B2E | Definido, sem uso nas telas (use em erro de form e status "recusado") |
| `--background-elevated` | #FBFBFB | Só em máscara interna, não use como superfície |
| `--white` / `--black` / `--gray-light` | #FFFFFF / #000000 / #EDEDED | Utilitários |
| Logos | Google: #4086F4, #59C36A, #FFDA2D, #FF641A (logo/orange). Facebook: #3B5999. Outros: #4175DF (blue), #03A9F4 (light-blue), #283593 (indigo) | Ícones dos social buttons |

**Gradientes, todos no mobile:**

- Botão primário pill: `linear-gradient(90deg, #D28A4C 100%, rgba(210,138,76,.8))`, com leve fade à direita.
- Botão de filtro e FAB: #D28A4C a 45%/40% de opacidade indo para #D28A4C sólido.
- Card de NFT mobile: `linear-gradient(#241612, #2F1D15)`.
- Círculos decorativos do hero mobile: #DD9A5F a 43% indo para #D28A4C a 4%.

### 1.2 Tipografia: Roboto Mono

Estilos aplicados nas telas (tamanho/line-height, peso):

| Estilo | Uso |
|---|---|
| Display 43/70 Bold | H1 do hero desktop ("SEJA DONO DO FUTURO DA ARTE DIGITAL") |
| Display 32/100% Bold, ls 10% | Wordmark KURIO nas telas de auth mobile |
| Heading 28/100% Bold | Título do NFT (detalhe desktop), "Diário da Cunhagem" |
| Heading 24/32 Bold | "NFT EM DESTAQUE" (accent). Letra dos medalhões (W/C/D): 24 Bold, cor ink. |
| Title 22/16 Bold | Preço no detalhe desktop. "OFERTA LIMITADA" também é 22 Bold. |
| Title 20 Bold, lh 16 | Títulos mobile ("Carrinho de NFTs", "Entrar", nome do NFT, preço) |
| Title 20 Medium | Tabs "Entrar \| Criar conta" do modal |
| Title 20 Regular, lh 28 | Número do stepper desktop |
| Body Large 18 Bold, lh 16 | Títulos de bloco ("Coleções", "Resumo da carteira", colunas do footer), preço do card (accent), total, "Enviar", página ativa |
| Body Large 18 Regular | Preço antigo (secondary, riscado com linha de 1px na cor border) |
| Body Large 17 Bold | "Detalhes do NFT" (tab ativa), "Mais desta coleção", títulos de formulário, features do footer |
| Body Large 17 Regular | Tab inativa |
| Body Large 16 Bold/Medium/Regular | Nav ativa (Bold, accent) e inativa (Regular, foreground). "Entrar" do header (Medium). Nome do card (Regular). Botões (Bold, lh 20). |
| Body 15 Regular/Bold/Medium | Itens de filtro (15/40: Regular no label, Bold na contagem à direita), sort, breadcrumb (Bold), toolbar tabs (Medium), labels de campo (15/15) |
| Body 14 Regular/Bold/Medium | Parágrafos (14/24 e 14/22), placeholders (14/16 ou 14/15), botões compactos (Bold), eyebrow "Bem-vindo à Kurio" (14/16 Medium, **ls 10%**), wordmark do header (14 Bold, ls 10%) |
| Caption 13 Regular/Medium | Subtítulo dos modais, "Ou continue com", social buttons (Medium), descrição da newsletter (13/22) |
| Caption 12 Regular/Medium/Bold | Data/leitura do blog (12/16 Medium), excerpt, "Ler mais" (12/14 Bold), "Taxa estimada" (12/16 accent), placeholder do promo |
| Tiny 10 Medium | Contador do badge do carrinho |
| Tiny 9 Bold, ls 0.1px | Chip "METAMASK • WALLETCONNECT • COINBASE" |

Pesos usados: 400, 500 e 700. O Figma tem ~70 text styles redundantes. Na implementação, consolide numa escala de **12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32 e 43**.

### 1.3 Border-radius

| Valor | Onde |
|---|---|
| 0 | Fundo do card de NFT desktop (retângulo de 258×300), Sign In Modal |
| 3 | Inputs e selects dos forms de pagamento/perfil/carteiras, botões "Conectar e finalizar", "Salvar", "Salvar carteira" e opções de carteira desktop |
| 4 | Paginação, chips sociais do footer |
| 5 | Inputs e botões dos modais de auth, botão "Ver no Etherscan" |
| 6 | Botões primários do desktop (Explorar, Entrar do header, Aplicar, Comprar, Favoritar), input da newsletter, container da imagem principal do detalhe |
| 8 | Card do blog, Sign Up Modal, thumbnails do detalhe, botão "Confirmar compra" desktop |
| 10 | Inputs, botão Entrar e search bar do mobile |
| 14 / 15 | Botão de filtro mobile (14), itens de carrinho/carteira mobile (14/15), imagem do card desktop (15) |
| 16 / 20 | Imagem do hero mobile (16), card mobile (20) |
| 22 / 24 | Imagem do NFT em destaque (22), imagem do hero desktop e imagem principal do detalhe (24) |
| 32 / 40 / full | Chip de rating (32), pills mobile e topo de sheets (40), círculos (botões-ícone, medalhões 74px, stepper) |

Recomendação: normalize em `sm 3`, `md 6`, `lg 8`, `xl 14`, `2xl 24`, `pill 9999`.

### 1.4 Espaçamentos recorrentes

- **Desktop:**
  - Container de 1200px, gap de 96 entre seções.
  - Header: altura 45, nav com gap 40.
  - Hero: gap 32 (texto + imagem de 450×450). Stack de texto com gaps 4 → 32 → 44.
  - Produtos: sidebar 310 + gap 48 + grid 842.
  - Grid: 3 colunas de 258 com `justify-between` e gap vertical 72 entre linhas. Toolbar → grid: 32.
  - Card: imagem → textos 12.
  - Filtros: padding 20, gap 40 entre grupos, 12 dentro do grupo.
  - Blog: cards de 268 com gap 24. Conteúdo do card com padding 12/16/16/16 e gap 8.
  - Footer: faixas com padding 32.
  - Forms: 2 colunas de 369.5 com gap ≈24, gap vertical 12.
  - Modais: form com padding lateral 80 e gap 12.
- **Mobile:**
  - Padding lateral 24 a 28.
  - Gap 16 (home), 40 (auth), 10 a 12 (sheets).
  - Inputs de 50 de altura, botões de 60.
  - Sheets com padding 20 a 32 no topo e 24 nas laterais.

### 1.5 Sombras

- `--shadow-card`: `0 0 20px 0 rgba(10,6,4,.45)`. Aparece no input da newsletter, Buy Bar mobile e opções de carteira mobile.
- `--shadow-card-y`: `0 6px 20px 0 rgba(10,6,4,.45)`. Itens do carrinho e input promo mobile. Os cards de carteira usam `0 20px 20px`.
- `--shadow-tabbar`: `0 -10px 30px 0 rgba(10,6,4,.45)`.
- `--shadow-stepper`: `0 4px 12px -2px rgba(20,13,10,.15)` no desktop e `0 6.6px 19.8px -3.3px` no detalhe.
- Hairlines: 0.3px na cor primary (abaixo do header, abaixo das tabs, título "Mais desta coleção", sidebar do perfil). Use `border-b border-primary/40` com 1px.

---

## 2. Frames (15)

> Todos os frames desktop são **páginas**, menos Login, Cadastro e Confirmação, que são **modais**. Os frames mobile são todos páginas.

### D1. Desktop / Início (1440×3668, página)

1. **Header With Divider** (componente)
   - KURIO à esquerda.
   - Nav centralizada: Início (ativo, accent, Bold, sublinhado primary) · Mercado · Criadores · Aprenda.
   - À direita: busca, carrinho com badge "6" (círculo primary, texto ink 10px) e botão **Entrar** (100×35, r6, primary, ícone de login + texto ink 16 Medium).
   - Hairline 0.3px primary embaixo.
2. **Hero** (texto 600px + imagem 450×450 r24)
   - Eyebrow "Bem-vindo à Kurio".
   - H1 "SEJA DONO DO FUTURO DA ARTE DIGITAL".
   - Texto: "Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet."
   - Botão **EXPLORAR** (140×40, r6, primary, padding 10/36/10/28).
   - 3 dots de 8px (carousel). Ativo em primary, os outros mais apagados.
3. **Products** (horizontal, gap 48)
   - **Sidebar (310)**
     - Card **Filters** (surface-card, padding 20).
       - **Coleções**: Arte digital (33) ativo em accent; Fotografia (12), Música (65), Arte 3D (39), Colecionáveis (23), Generativa (17), Jogos (19), Assinaturas (13) e Utilidade (18) em text-secondary. A contagem fica alinhada à direita.
       - **Faixa de preço**: slider duplo (trilho de 4px primary, handles de 15px primary com borda ink de 3px), texto "Preço: 0,02 - 12,30 ETH" e botão **Aplicar** (r6, padding 8/12).
       - **Rede**: Ethereum (119), Polygon (78), Solana (86).
     - Abaixo do card, **NFT EM DESTAQUE** / "OFERTA LIMITADA" (centralizado) e imagem de 310×368 r22.
   - **Main (842)**
     - **Toolbar**:
       - Tabs à esquerda: Todos os NFTs (accent), Novos lançamentos, Em alta. Gap 20.
       - "Ordenar por: Listados recentemente ▾" à direita.
     - **Grid 3×3** de cards (258 de largura).
       - Linha 1: Emerald Ape #042 (1.19 ETH) · Sage Nomad #009 (1.69 ETH) · Neon Vessel #552 (1.99 ETH, com preço antigo riscado 2.29 ETH).
       - Linha 2: Cosmic Bloom #118 (1.29) · Violet Nomad #314 (1.39) · Ivory Baron #088 (1.79).
       - Linha 3: Golden Beat #207 (0.99) · *[card do meio sem nome/preço. Bug. Na tela de Login aparece "Golden Frequency #071, 0.59 ETH"]* · Golden Signal #160 (0.39).
     - **Paginação** à direita: 1 (ativo: 35×35, r4, primary, texto ink Bold), 2, 3, 4 (borda border de 1px, texto foreground), seta →.
4. **Promos** (2 cards de 586×250, `justify-between`). Imagem à esquerda, texto alinhado à direita, botão "Explorar →" (primary, r6).
   - "Lançamentos gênesis de edição limitada" / "Colecione edições escassas diretamente dos criadores antes da revelação pública."
   - "Arte digital selecionada e muito mais" / "Explore novos artistas, coleções verificadas e obras digitais que definem a…" O texto vaza do card. Corrija com line-clamp.
5. **Blog**
   - Título "Diário da Cunhagem" (centralizado) e subtítulo "Histórias, guias e insights para colecionadores sobre o universo da propriedade digital."
   - 4 cards (268, r8, surface-card, imagem de 195 de altura):
     - "12 de setembro | Leitura de 6 min" · **Como funciona a propriedade de NFTs** · "Aprenda a colecionar, negociar e verificar ativos digitais."
     - "13 de setembro | Leitura de 2 min" · **10 artistas digitais para acompanhar** · "Conheça criadores que moldam a cultura digital."
     - "15 de setembro | Leitura de 3 min" · **Raridade, atributos e procedência** · "Entenda raridade, procedência, direitos autorais e utilidade."
     - "15 de setembro | Leitura de 2 min" · **Como proteger sua carteira** · "Proteja sua carteira, seus ativos e sua identidade."
   - CTA de cada card: "Ler mais →".
   - Os 4 cards somam 1144 de 1200 e ficam encostados à esquerda. Centralize ou use grid de 4 colunas.
6. **Footer** (componente, ver §3).

### D2. Desktop / Detalhes do NFT (1440×2246, página)

1. Header **sem divider**, com "Mercado" ativo.
2. Breadcrumb "Início / Mercado" (15 Bold).
3. **Galeria**
   - Coluna de 4 thumbnails de 100×100 (r8, gap 16).
   - Imagem principal: container de 444×444 (surface-card, padding 16, r6) com imagem de 404 (r24). Ícone de zoom/busca no canto superior direito.
4. **Info**
   - "Emerald Ape #042" (28 Bold).
   - "1.19 ETH" (22 Bold accent) + 5 estrelas primary + "19 avaliações de colecionadores".
   - "Sobre este NFT:" + "Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores."
   - "Edição:" com chips 1/1 · 1/10 · **1/50** (selecionado: pill com borda primary, texto accent 14 Medium) · ABERTA. Os outros chips não têm borda e usam text-secondary.
   - Stepper: círculo "−" · "1" · círculo "+". Círculos primary com sombra do stepper.
   - Botões **COMPRAR** (130×40, r6, primary, texto ink 14 Bold) e **♡ Favoritar** (130×40, r6, outline primary de 1px, texto accent).
   - Meta em secondary 15: "ID do token: #0042", "Coleção: Kurio Apes", "Atributos: Óculos, Esmeralda, Raro".
   - "Compartilhar este NFT:" com ícones LinkedIn, e-mail e Twitter.
5. **Tabs**: "Detalhes do NFT" (ativa, accent, sublinhada) | "Avaliações de colecionadores (19)", com hairline de 1200.
   - Conteúdo:
     - Parágrafo 1: "Emerald Ape #042 é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras."
     - Parágrafo 2: "A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade."
     - **Rede:** "Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS."
     - **Contrato:** "Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis."
     - **Direitos autorais:** "0x7A42...19E8 • Contrato inteligente ERC-721 verificado."
   - O estado da aba Avaliações não está desenhado.
6. **Mais desta coleção** (17 Bold accent + hairline)
   - 5 cards de 220×255: Cosmic Bloom #118 1.29, Violet Nomad #314 1.39, Ivory Baron #088 1.79, Golden Beat #207 0.99, Golden Signal #160 0.39.
   - Dots do carrossel: 3 de 12px. O ativo é preenchido em primary, os outros só têm contorno primary de 1.3px.
7. Footer.

### D3. Desktop / Carrinho de NFTs (1440×1754, página)

1. Header sem divider (Mercado ativo). Breadcrumb "Início / Mercado / Carrinho".
2. **Tabela (782)**
   - Cabeçalho: NFTs · Preço · Edições · Total (16 Bold).
   - Linhas de 782×70 (surface-card, gap 12): thumb, nome (16 Bold), "ID do token: #…" (14 secondary), preço unitário (16 Bold text-secondary), stepper, total (16 Bold accent) e lixeira (secondary).
     - Emerald Ape #042 · #0042 · 1.19 · ×2 · 2.38 ETH
     - Violet Nomad #314 · #0009 · 1.39 · ×6 · 8.34 ETH
     - Ivory Baron #088 · #0552 · 1.79 · ×9 · 16.11 ETH
3. **Resumo (332, à direita)**
   - "Resumo da carteira" + hairline.
   - "Código promocional": input (borda primary de 1px, r3, 40 de altura, placeholder "Digite o código promocional…") com botão **Aplicar** primary colado.
   - Subtotal 26.83 ETH · Desconto do lançamento (-) 00.00 · Taxa de rede 0.016 ETH + "Taxa estimada" (12 accent, à direita).
   - **Total 26.846 ETH** (accent).
   - Botão **Conectar e finalizar** (332×40, r3, primary).
   - Link "Continuar explorando" (accent, centralizado).
4. **Colecionadores também viram**: os mesmos 5 cards + dots.
5. Footer.

### D4. Desktop / Pagamento (1440×1657, página)

1. Header sem divider. Breadcrumb "Início / Mercado / Pagamento".
2. **Form "Perfil do colecionador"** (763, 2 colunas)
   - Nome de exibição\*, Nome de usuário\*
   - Rede\* (select "Selecione uma rede"), Nome do perfil\*
   - Endereço da carteira\* ("Endereço 0x da carteira"), *(sem label)* "ENS ou carteira secundária (opcional)"
   - Tipo de carteira\* (select "Selecione uma carteira"), Código de indicação\*
   - E-mail\*, Nome ENS\* (select ".eth" + input)
   - Radio "Usar outra carteira?"
   - Textarea "Observação do colecionador (opcional)" (350×152)
   - Inputs: 40 de altura, r3, borda border de 1px, sem fill, padding 12. Labels em 15 foreground, asterisco coral 22.
3. **Coluna direita (405)**
   - "Seus NFTs", com cabeçalho NFTs · Subtotal.
   - 3 linhas (surface-card, 70 de altura): thumb + nome + ID + "(x 2)" + subtotal accent. IDs **#0042, #0314, #0088**, diferentes dos do carrinho (ver §5).
   - "Tem um código promocional? Aplique aqui" (centralizado).
   - Subtotal, Desconto, Taxa de rede, Taxa estimada, **Total 26.846 ETH**.
   - "Carteira e rede" (centralizado).
   - 3 opções radio (405×45, r3):
     - Chip "METAMASK • WALLETCONNECT • COINBASE"
     - MetaMask
     - **Coinbase Wallet** (selecionada: borda primary e radio preenchido)
     - As não selecionadas têm borda border.
   - Botão **Confirmar compra** (405×45, r8, primary).
4. Footer.

### D5. Desktop / Confirmação de Pedido (1440×1657, MODAL)

- Página vazia em #140D0A, sem header e sem footer. O modal fica centralizado no eixo X, perto do topo.
- **Order Confirmation Modal** (578 de largura, surface-card, r0)
  - X de fechar (primary) no topo à direita.
  - Ícone de envelope "THANK YOU" (primary, ≈65×80).
  - "Seus NFTs agora estão na sua carteira" (16 Bold text-secondary) + hairline.
  - Faixa de meta em 4 colunas separadas por divisores: ID da transação **0xA91F…E82C** · Data **29 Jul, 2026** · Total **26.846 ETH** · Carteira **MetaMask**.
  - "Detalhes da transação", com cabeçalho NFTs · Edições · Subtotal. Linhas: Emerald Ape #042 (x 2) 2.38 ETH, Violet Nomad #314 (x 6) 8.34, Ivory Baron #088 (x 9) 16.11.
  - Taxa de rede 0.016 ETH, **Total 26.846 ETH**.
  - Texto: "Transação confirmada na Ethereum. A propriedade foi transferida para sua carteira conectada e registrada na rede."
  - Botão **Ver no Etherscan** (r5, padding 16, primary).
  - Barra de 10px primary na base do modal.
- **Só o estado "confirmado" foi desenhado.** Crie as variantes "pendente" (spinner, texto de aguardando) e "recusado" (cor error) reaproveitando o layout.

### D6. Desktop / Login (1440×1981, MODAL sobre a home)

- Fundo: componente **Marketplace Page** (hero + grid + filtros da home).
  - Ele inclui o card em **hover**: ícones carrinho, ♡ e lupa sobre a imagem, embaixo à direita.
  - Também inclui o badge **RARO** (80×29, primary, texto ink 16 Medium) no card Neon Vessel.
- Não existe scrim: a camada "BG" está sem fill. Adicione overlay `bg-black/60`.
- **Sign In Modal** (500×600, surface-card, r0)
  - Tabs "**Entrar** | Criar conta" (ativa em accent, separador de 1px coral).
  - Subtítulo "Entre para gerenciar sua carteira, coleção e perfil de criador."
  - Inputs de 340×40, r5, padding 12/16:
    - Email Input (placeholder "contato@email.com", borda border)
    - Password Input "***********", no estado **focus**: borda primary e ícone de olho riscado
  - "Esqueceu a senha?" (accent, à direita).
  - Botão **Entrar** (340×45, r5, primary).
  - Divisor de largura total com "Ou continue com".
  - Social Buttons "Continuar com Google" e "Continuar com Facebook" (340×40, r5, borda border, texto 13 Medium text-secondary).
  - Barra de 10px primary na base. X no topo à direita.

### D7. Desktop / Cadastro (1440×1981, MODAL)

- Mesmo fundo do Login.
- **Sign Up Modal** (500×656, **r8**)
  - Tabs "Entrar | **Criar conta**".
  - Subtítulo "Crie seu perfil de colecionador e conecte uma carteira quando quiser."
  - Inputs: Nome de usuário, Digite seu e-mail, Senha (com olho), Confirmar senha.
  - Botão **Criar conta**, divisor, social buttons e barra de base.
- Os dois modais (r0 e r8) devem ter o mesmo radius. Use 8.

### D8. Desktop / Perfil do Colecionador (1440×1080, página, sem footer)

1. Header **com divider** (Início ativo).
2. **Account Sidebar** (310, surface-card, padding vertical 8)
   - Título "Meu perfil".
   - Itens de 45 de altura, padding 16, ícone + texto 15 accent:
     - **Dados do perfil**, ativo, com borda esquerda de 6px primary
     - Carteiras · Atividade · Lista de interesse · Ofertas · Arquivos baixados · Suporte
   - Hairline e **Sair** (15 Bold accent, ícone de logout).
3. **Profile Form** (862)
   - "Perfil do colecionador".
   - Campos: Nome de exibição\*, Nome de usuário\*, E-mail\*, Nome ENS\* (.eth + input), Apelido da carteira\*.
   - Avatar: círculo com ícone de imagem + botão **Alterar** (primary, 14 Bold ink) + link "Remover".
   - "Alterar senha": Senha atual, Nova senha, Confirmar nova senha. Inputs com olho, meia largura.
   - Botão **Salvar** (131×40, r3, primary).

### D9. Desktop / Carteiras (1440×1080, página, sem footer)

- Mesma sidebar, com **Carteiras** ativa.
- "Carteira principal" + link "Adicionar" (16 Medium accent) à direita.
- Descrição "Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
- Form em 2 colunas: Nome de exibição\*, Apelido da carteira\*, Rede\* (select), Nome do perfil\*, Endereço da carteira\*, ENS ou carteira secundária (opcional), Tipo de carteira\* (select), Código de indicação\*, E-mail\*, Nome ENS\*.
- Botão **Salvar carteira** (131×40, r3).
- "Carteira secundária" + radio "Igual à carteira principal" + "Adicionar".
- Estado vazio: "Você ainda não adicionou uma carteira secundária."

### M1. Mobile / Início (414×896, página)

1. **Busca** (313×45, r10, surface-card) com ícone + "Explorar coleções" (14 Bold secondary).
   - Ao lado, **botão de filtro** 45×45 (r14, gradiente primary, ícone ink).
2. **Hero card** (366×190, fundo marrom com círculos em gradiente)
   - "Bem-vindo à Kurio"
   - **"SEJA DONO DA CULTURA DIGITAL"** (18/29 Bold)
   - "Descubra NFTs selecionados de criadores do mundo todo." (12/18 text-secondary)
   - "EXPLORAR →" (12 Bold accent)
   - Imagem de 138 (r16) com miniatura sobreposta, e 3 dots.
3. **Tabs**: Todos os NFTs (14 Bold accent, sublinhado) · Novos lançamentos · Em alta.
4. **Grid em 2 colunas escalonado (masonry)**: a coluna da direita começa ≈24px mais abaixo.
   - Card: 175 de largura, container da imagem com 200 de altura (r20, gradiente surface-card → surface-raised).
   - Botão ♡ de 28px (surface-raised, borda border) no canto.
   - Nome em 15 foreground, preço em 16 Bold accent.
   - Itens: Emerald Ape #042 1.19 ETH, Sage Nomad #009 1.69 ETH, Ivory Baron (com badge RARO), Golden Beat…
5. **Tab Bar** fixa (414×126, surface-card com recorte curvo central, shadow-tabbar)
   - Home (ativo, accent) · ♡ · **FAB central** de 65px (gradiente primary, ícone de scan) · Carrinho · Perfil.

### M2. Mobile / Detalhes do NFT (página)

- Sem header. Botões flutuantes de 35px: voltar (‹) e ♡ (surface-raised, borda border).
- Imagem de 361×356 (r24).
- **Details Sheet** (414×504, r31 no topo, surface-card, padding 32/24)
  - "Emerald Ape #042" (20 Bold) + chip de rating "★ 4.8 (19)" (pill r32, borda primary).
  - Descrição curta.
  - "Edição:" com chips **1/10 · 1/10 · 1/50 (sel.) · ABERTA**. O 1/10 está duplicado e falta o 1/1. Use os mesmos chips do desktop.
  - ID do token: #0042 · Coleção: Kurio Apes · Atributos: Óculos, Esmeralda, Raro.
- **Buy Bar** fixa (414×164, r40 no topo, shadow-card)
  - "Qtd." com stepper (− 1 +) e "1.19 ETH" (20 Bold accent) à direita.
  - **Comprar NFT** (196×60, pill, gradiente primary) e botão de carrinho de 60×60 (pill, surface-raised, borda border).

### M3. Mobile / Carrinho de NFTs (página)

- ‹ voltar + "Carrinho de NFTs" (20 Bold, centralizado).
- Itens de 358×100 (r14, surface-card, shadow): thumb, nome (Bold), "Edição: x/y" (14 text-secondary), preço (18 Bold accent) e stepper com círculos de 24px surface-raised.
  - **Estado desabilitado:** "−" com qty=1 usa ícone border-soft.
  - Itens:
    - Emerald Ape #042: Edição 1/50, 1.19, ×1
    - Violet Nomad #314: 1/1, 1.39, ×1
    - Ivory Baron #088: 1/10, 3.58, ×2, com a **lixeira sobreposta ao "+"** (bug)
    - Golden Beat #207: 1/50, 1.98, ×2
- **Payment Summary** (sheet r40 no topo, surface-card)
  - Input promo pill (50 de altura, r40, borda border, sombra) com **Aplicar** pill primary dentro.
  - Subtotal 8.92 ETH · Desconto (-) 00.00 · Taxa de rede 0.016 ETH · Taxa estimada · **Total 8.936 ETH**.
  - **Conectar e finalizar** (pill de 60, gradiente).
  - A soma dos itens exibidos dá 8.14, não 8.92. Calcule dinamicamente.

### M4. Mobile / Pagamento (página)

- ‹ + "Pagamento com carteira".
- "Carteira conectada" + "Trocar carteira" (accent).
- Cards de carteira de 358×93 (r14, surface-card, shadow), com radio, título Bold, linhas em text-secondary e menu ⋮:
  - **Reserva** (selecionada): "nova.kurio.eth" / "Rede Polygon"
  - Principal: "0xA91F…E82C" / "Rede principal Ethereum"
- "Carteira e rede": opções de 359×65 (r15, surface-card, sombra) com medalhão (W/M/ícone), nome e radio à direita:
  - WalletConnect
  - MetaMask
  - **Coinbase Wallet** (selecionada)
- "Total: 8.936 ETH" (à direita).
- **Confirmar compra** (358×60, pill, gradiente) no rodapé.
- O mobile **não tem** o form "Perfil do colecionador" do desktop (ver §5).

### M5. Mobile / Login (página)

- Padding 80/28/24, gap 40.
- **KURIO** (32 Bold, ls 10%, centralizado) e "Entrar" (20 Bold).
- Inputs de 358×50 (r10, borda border): e-mail; senha em focus (borda primary, ícone de olho).
- "Esqueceu a senha?" (accent, à direita).
- **Entrar** (358×60, r10, primary).
- Divisor "Ou continue com" + Mobile Social Block (Google, Facebook).
- "Novo na Kurio? Crie uma conta" (text-secondary).

### M6. Mobile / Cadastro (página)

- KURIO, "Criar perfil de colecionador".
- Inputs: Nome de usuário (placeholder **centralizado**, inconsistente; alinhe à esquerda), Digite seu e-mail, Senha (olho), Confirmar senha (olho).
- **Criar perfil**, social e "Já tem uma conta? Entre".

---

## 3. Componentes reutilizáveis

### NFTCard

Props: `image`, `name`, `price`, `oldPrice?`, `badge?: "RARO"`, `variant`.

- `default` (desktop, home): 258 de largura. Fundo surface-card de 258×300 com imagem de 250 (r15) centralizada (padding ≈28/4/24). Nome em 16 Regular foreground, preço em 18 Bold accent, preço antigo em 18 Regular secondary riscado. Gap de 12.
- `compact` (relacionados/carrinho): 220×255, nome em 15.
- `mobile`: 175 de largura, container de 200 de altura com r20 e gradiente, botão ♡ de 28px, nome em 15, preço em 16 Bold.
- **Estados:**
  - `hover`: overlay de ícones (carrinho, ♡, lupa) no canto inferior direito da imagem. É o único estado de hover desenhado.
  - `rare`: badge primary no topo à esquerda, com radius igual ao do card.
  - `favorited`: ♡ preenchido. Não desenhado, deduza.

### Button (variantes cva)

- `primary`: bg primary, texto ink Bold, r6 (desktop). Alturas 35/36/40/45.
- `outline`: borda primary de 1px, texto accent, com ícone opcional (Favoritar).
- `link`: texto accent, sem fundo ("Ler mais →", "Continuar explorando", "Adicionar", "Trocar carteira").
- `pill` (mobile): 60 de altura, r9999, gradiente primary.
- `icon-circle`: 35/28/60px, surface-raised + borda border (voltar, ♡, carrinho).
- `social`: largura total, 40 de altura, r5, borda border, logo + texto 13 Medium text-secondary.
- `stepper-btn`: círculo primary (desktop) ou surface-raised 24px (mobile). Estado disabled em border-soft.
- Padronize os radius 3/5/6/8 que hoje estão misturados.

### Input / Select / Textarea (shadcn)

- Desktop: 40 de altura, padding 12, r3 (forms) ou r5 (auth), borda border de 1px, sem fill. Placeholder em 14 secondary.
- Mobile: 50 de altura, r10.
- Estados:
  - `focus`: borda primary
  - `password`: com toggle de olho
  - `required`: asterisco coral no label
  - `error`: não desenhado. Use borda error e mensagem em 12 error.
- Select: chevron (Iconly Arrow-Down) à direita. Select inline ".eth" acoplado ao input ENS.
- Variante promo: input + botão colado (desktop) ou pill com botão interno (mobile).

### Header (`HeaderRow` + `HeaderWithDivider`)

- Props: `active: "home" | "market"`, `cartCount`.
- Use com divider em Início, Perfil, Carteiras e auth. Sem divider nas 3 telas de Mercado (Detalhes, Carrinho, Pagamento). O próprio Figma documenta assim.
- Ponto em aberto (comentário): o que substitui "Entrar" quando o usuário está logado? Sugestão: avatar com dropdown.

### Footer (componente fixo)

1. **Faixa 1** (surface-card, 250 de altura, padding 32)
   - 3 features com medalhão de 74px primary (W/C/D 24 Bold ink), título 17 Bold e texto 14/22 text-secondary.
   - Divisores verticais em primary.
   - Newsletter: "Antecipe-se ao próximo lançamento", input surface-dark (r6, sombra) + "Enviar" primary (r6 só à direita) e texto 13/22.
2. **Faixa 2** (surface-dark, 88 de altura): KURIO · "Feito para colecionadores, criadores e cultura" · contato@email.com · +55 11 4002 8922.
3. **Faixa 3** (surface-card, 236 de altura): 4 colunas.
   - Meu perfil: Meu perfil, Minha coleção, Atividade, Estúdio do criador, Lista de interesse.
   - Central de ajuda: Central de ajuda, Como comprar NFTs, Carteira e segurança, Política do mercado, Denunciar item.
   - Coleções: Arte digital, Fotografia, Música, Arte 3D, Utilidade.
   - Redes sociais: 5 chips de 30×30 (r4, borda primary; FB, IG, X, LinkedIn, YouTube) e "Carteiras compatíveis" com o chip "METAMASK • WALLETCONNECT • COINBASE" (9 Bold accent).
   - Links em 14/30 foreground.
4. **Copyright**: "© 2026 Kurio. Propriedade digital para todos." (14/30, centralizado).

Em telas com modal, o footer fica **abaixo** do scrim.

### Filters (sidebar)

- 310 de largura, surface-card, padding 20, grupos com gap 40.
- **Coleções** e **Rede**: lista "label (contagem)". O ativo fica em accent, os outros em text-secondary. A descrição do componente fala em checkboxes. Implemente como **checkbox** (filtros combináveis, múltipla seleção), com o mesmo visual e um check visível.
- **Faixa de preço**: slider duplo (Radix Slider) + inputs min/max (sugestão dos comentários) + botão Aplicar.
- Mobile: o botão de filtro abre um **Sheet/Drawer** com o mesmo conteúdo. Não está desenhado.

### Toolbar / Tabs / Sort

- Tabs de texto: ativa em accent, inativa em foreground. Sublinhado primary no mobile e na tab de detalhe.
- Sort: "Ordenar por:" + Select. Opções não definidas no Figma. Sugestão: Listados recentemente, Menor preço, Maior preço, Mais populares.

### Pagination

- Itens de 35×35 r4. Ativo: primary, texto ink 18 Bold. Inativo: borda border de 1px, texto foreground 18 Regular.
- Seta "→" (Iconly). Adicione "←" a partir da página 2.

### Outros

- **Stepper**: −/valor/+ (mínimo 1, com "−" desabilitado).
- **EditionChips**: radio-group em pill.
- **Rating**: estrelas primary + contagem.
- **Breadcrumb**: 15 Bold, separador "/".
- **CarouselDots**: 12px, ativo preenchido, inativos só com contorno.
- **Modal shell** (Dialog):
  - surface-card, barra de base de 10px primary, X primary no topo à direita
  - overlay `rgba(0,0,0,.6)`
  - usado por Sign In, Sign Up e Order Confirmation
- **AuthTabs**: "Entrar | Criar conta", com separador coral de 1px.
- **WalletOption**: radio + medalhão/logo + nome. Selecionado com borda primary (desktop) ou radio preenchido (mobile).
- **WalletCard** (mobile): radio + título + endereço + rede + menu ⋮.
- **AccountSidebar**: itens com ícone. Ativo com border-left de 6px primary.
- **CartItemRow**: desktop em tabela de 70 de altura, mobile em card de 100 de altura com sombra.
- **OrderSummary**: linhas label/valor + total em accent + nota "Taxa estimada".
- **TabBar** (mobile): 5 slots com FAB central.
- **BlogCard** e **PromoCard**: conforme D1.

---

## 4. Desktop × Mobile

| Aspecto | Desktop | Mobile |
|---|---|---|
| Navegação | Header horizontal (nav 4 itens, busca, carrinho com badge, Entrar) | Sem header. **Tab bar** inferior com FAB central. Botões de voltar flutuantes. |
| Busca e filtros | Ícone de busca no header, sidebar de filtros fixa (310) | Barra de busca no topo + botão de filtro (abre drawer, não desenhado) |
| Hero | 2 colunas, H1 43px, CTA em botão | Card compacto, H1 18px, CTA em link "EXPLORAR →" |
| Grid | 3 colunas fixas de 258 + paginação numerada | 2 colunas escalonadas (masonry), sem paginação (scroll infinito) |
| Card | Fundo retangular sem radius, sem botão ♡ | Container r20 com gradiente e botão ♡ |
| Detalhe | Galeria com thumbnails, info ao lado, tabs de descrição e relacionados | Imagem grande + sheet de detalhes + **Buy Bar fixa**. Sem thumbnails, sem tabs, sem relacionados. |
| Botões | r3 a r8, 40 a 45 de altura, cor sólida | Pill r40, 60 de altura, gradiente |
| Inputs | 40 de altura, r3/r5 | 50 de altura, r10 |
| Stepper | Círculos primary com sombra | Círculos surface-raised de 24px (unifique com o desktop, ver comentários) |
| Carrinho | Tabela + resumo lateral + relacionados | Lista de cards + sheet de resumo fixa |
| Pagamento | Form completo + resumo de NFTs + escolha de carteira | Só escolha de carteira conectada e provedor, sem o form |
| Auth | Modal sobre a home (tabs Entrar/Criar conta) | Página cheia com wordmark grande e link para alternar |
| Footer | Footer completo | Não existe |
| Telas sem versão | n/a | Confirmação, Perfil e Carteiras. Também não há tablet. |

**Breakpoints sugeridos:**

- `<768`: layout mobile.
- `768 a 1279`: tablet. Grid de 2 a 3 colunas, sidebar vira drawer, header com menu hambúrguer.
- `≥1280`: desktop com container de 1200.

---

## 5. Problemas apontados nos comentários (resumo)

**Alinhamento e espaçamento (maioria, do revisor "tk" e outros)**

- O menu central do header está desalinhado na vertical em relação ao logo e aos botões. Use `items-center` em todo o header.
- A 1ª coluna de cards ("Cosmic Bloom #118") está desalinhada do card de cima e do título "Coleções". O gap vertical entre as fileiras de cards é assimétrico. Use CSS grid com gap uniforme.
- Faltam centralização, margin e padding em vários pontos:
  - Ícones fora de centro dentro de botões e círculos.
  - Texto de botão não centralizado (ex.: COMPRAR usa `justify-between`).
  - Containers não centralizados (blog empurrado à esquerda, modais de auth deslocados).
- Itens sem nivelamento (linhas da confirmação e ícones da sidebar do perfil) e "texto muito próximo" do título.
- O fundo do card vaza ou está descentralizado em relação à imagem. Há background de cor diferente no card de NFT (perguntam se devem manter).
- Radius inconsistente: "botão sem radius", "badge com round não necessário", RARO com canto reto vazando do card. Falta unificar fundos e "uniformizar a UI".
- No cadastro mobile, um placeholder está centralizado e os outros não.
- Ícone desproporcional ao botão. Sugestão de botão full-width em um CTA.
- O seletor de imagem (thumbnails/dots) está muito perto da imagem e pode ser coberto por animações. Afaste-o.
- Uma imagem "não deveria estar ali" e o texto copiado mostra "cultura", que não aparece no design. É o texto do footer "Feito para colecionadores, criadores e cultura", que precisa caber sem cortar.

**Modais e camadas**

- O modal "Criar conta" não tem overlay. Adicione backdrop preto a ~60%.
- O header de uma das telas tem border-bottom e as outras não. Padronize conforme §3 (Header).

**Dados inconsistentes**

- O mesmo item tem IDs diferentes no carrinho e no pagamento: Violet Nomad #0009 vs #0314, Ivory Baron #0552 vs #0088. Escolha uma fonte única (mock central).
- O subtotal do carrinho mobile (8.92) não bate com a soma dos itens (8.14).
- As edições mobile repetem "1/10" e omitem "1/1".
- O 2º card da 3ª linha da home está sem nome e sem preço.
- As coleções do filtro estão fora de ordem alfabética. Perguntam se podem ordenar.

**UX e regras**

- Filtros precisam ser combináveis. Use checkboxes no lugar de lista simples.
- O slider de preço é impreciso no mobile. Use inputs min/max (com o slider opcional).
- As opções de ordenação não estão definidas.
- O botão "voltar" da paginação deve aparecer na página 2+.
- O stepper deve ficar desabilitado no mínimo (1) por acessibilidade.
- Não há espaço para o botão excluir no item do carrinho mobile (a lixeira sobrepõe o "+").
- Os steppers mobile devem ser iguais aos do desktop.
- Os medalhões W/C/D usam letras sem significado. Use ícones ilustrativos.
- ENS é só Ethereum, então o dropdown ".eth" é desnecessário.
- As miniaturas do detalhe não deixam claro se são edições ou variações, nem se mudam as infos exibidas.
- Um botão sem função clara ("o que esse botão faz?"), provavelmente o FAB ou filtro mobile. Defina ação ou remova.
- O que acontece com o botão "Entrar" depois do login.
- Tema claro: só existe paleta escura (pergunta em aberto).

**Escopo faltante**

- Só o estado "confirmado" da confirmação está desenhado. Faltam "pendente" e "recusado".
- O pagamento mobile não tem o form "Perfil do colecionador" (10 campos). Não está claro se fica numa etapa anterior ou não é exigido.
- Não há mobile de Confirmação, Perfil e Carteiras, nem referências de tablet.

---

## 6. Decisões de implementação (sobrepõem o Figma)

- **Pagamento mobile:** o enunciado exige "dados do colecionador", então o form do desktop é reaproveitado em uma coluna no mobile. Registrar como desvio no `ARCHITECTURE.md`.
- **Dados:** os IDs, preços e totais vêm sempre do mock central (MSW). Valores fixos do Figma que se contradizem (IDs do carrinho vs pagamento, subtotal mobile) são ignorados.
- **Modais:** Login, Cadastro e Confirmação usam o mesmo Dialog com radius 8 e overlay `bg-black/60`.
- **Filtros:** checkboxes combináveis. No mobile, a sidebar vira Sheet.
- **Confirmação:** variantes pendente e recusado criadas a partir do layout do confirmado.
- **Correções dos comentários (§5):** aplicar todas as de alinhamento, radius e overflow. Cada correção relevante entra na seção "Desvios do Figma" do `ARCHITECTURE.md`.