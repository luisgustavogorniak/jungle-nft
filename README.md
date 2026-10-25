# Kurio — Marketplace de NFTs

Marketplace de NFTs feito para o desafio frontend da Jungle Gaming: descoberta, compra e conta do colecionador, em desktop e mobile. Toda a API, a autenticação, as carteiras, os pagamentos e os eventos em tempo real são simulados com MSW (REST e Socket.IO), na camada de rede.

- **Aplicação publicada:** https://jungle-nft-eight.vercel.app (build de produção com os mocks e o tempo real ativos)
- **Repositório:** https://github.com/luisgustavogorniak/jungle-nft
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](./ARCHITECTURE.md)

## Stack

React 19, TypeScript, Vite, TanStack Router, TanStack Query, Axios, Socket.IO client, Tailwind CSS 4, shadcn/ui, MSW 2 (com `@mswjs/socket.io-binding`), Playwright e Lighthouse. Também: Zod, React Hook Form.

## Setup

Requisitos: Node 24+ e npm 11+.

```sh
npm install
npx playwright install chromium   # só para os testes E2E e o Lighthouse
npm run dev                       # http://localhost:5173, com mocks
```

Um checkout limpo roda sem nenhum serviço externo: o `.env` versionado já liga os mocks.

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` (arquivo `.env`) | Inicia o MSW (REST e Socket.IO) antes do app. Fica ligada também no build de produção e no deploy |

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com mocks |
| `npm run build` | Verificação de tipos + build de produção |
| `npm run preview` | Serve o build de produção |
| `npm run typecheck` | Verificação de tipos (TypeScript) |
| `npm run lint` | ESLint |
| `npm run test:unit` | Testes unitários (Node test runner) |
| `npm run test:e2e` | Todos os testes Playwright, funcionais e visuais (faz o build e sobe o app sozinho) |
| `npm run test:e2e:functional` | Tudo, menos a regressão visual |
| `npm run test:e2e:visual` | Só a regressão visual (`@visual`) |
| `npm run test:e2e:visual:update` | Regenera as baselines visuais |
| `npm run test:e2e:ui` | Modo UI do Playwright |
| `npm run test:e2e:report` | Abre o último relatório HTML |
| `npm run lighthouse` | Auditoria Lighthouse (3 execuções por página e perfil, mediana) |
| `npm run assets:optimize` | Regenera as variantes WebP das artes a partir de `design-assets/nfts/` |

## Credenciais fictícias

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Nova Sato (duas carteiras) | `nova@kurio.test` | `Kurio@2026` |
| Leo Arcos (sem carteira secundária) | `leo@kurio.test` | `Kurio@2026` |

Cupons: `KURIO10` (10%), `GENESIS25` (25%), `MINT2025` (expirado). Qualquer outro código é inválido.

## Cenários dos mocks e reset

Adicione parâmetros a qualquer URL. Eles são aplicados antes de o app iniciar e removidos da barra de endereço.

| Parâmetro | Efeito |
| --- | --- |
| `?scenario=<nome>` | Escolhe um cenário de rede. Persiste entre recargas até que outro seja escolhido |
| `?mock-reset` | Restaura os dados iniciais (catálogo, usuários, carrinhos, favoritos, carteiras, pedidos) |

O backend simulado guarda todo o estado (usuários, sessões, carrinhos, favoritos, carteiras, pedidos) no `localStorage` do navegador, na chave `kurio.mock.db`, então tudo o que você muda sobrevive ao refresh. O estado é por navegador e por origem. `?mock-reset` descarta esse estado e restaura os dados iniciais; também é o que se usa depois que a semente muda (uma versão de schema diferente dispara o mesmo reset).

Exemplo: `http://localhost:5173/?scenario=slow&mock-reset`.

### Cenários

| Cenário | Comportamento |
| --- | --- |
| `default` | Tudo funciona, latência de 150 a 450 ms. Pagamentos confirmam em 2 s |
| `slow-payment` | Pagamentos ficam pendentes por 8 s antes de confirmar: dá tempo de ver o estado pendente e recarregar a página do pedido |
| `wallet-rejected` | A carteira recusa toda tentativa de conexão no checkout |
| `order-timeout` | O pedido é criado, mas a resposta nunca chega; o cliente desiste após 10 s e o painel "Pedido em andamento" recupera o mesmo pedido com "Tentar novamente". O pagamento confirma em 15 s |
| `payment-declined` | Pagamentos são recusados após 2 s |
| `price-change` | 4 s depois da primeira cotação da página, o primeiro item do carrinho fica 10% mais caro (`nft.updated`) |
| `slow` | Latência de 2,5 a 3,5 s em toda requisição (skeletons e estados de carregamento) |
| `empty-catalog` | O catálogo não devolve resultados |
| `out-of-order` | As respostas do catálogo alternam 1,5 s e 0,1 s, então requisições antigas terminam por último |
| `offline` | As requisições do catálogo falham com erro de conexão |
| `server-error` | As requisições do catálogo falham com HTTP 500 |
| `favorites-error` | Adicionar ou remover favorito falha com HTTP 500 (atualização otimista e rollback) |
| `cart-error` | Alterar ou remover itens do carrinho falha com HTTP 500 (atualização otimista e rollback) |

A latência vem de um PRNG com semente, então a mesma sequência de requisições recebe sempre os mesmos atrasos.

### Controles no console

`window.__kurioMock` (disponível só no build com mocks):

| Controle | Efeito |
| --- | --- |
| `reset()` | Restaura os dados iniciais |
| `setScenario(nome)`, `getScenario()` | Troca ou lê o cenário |
| `expireSessions()` | Expira todas as sessões agora |
| `updateNft(nftId, { price?, editions? })` | Altera o NFT e transmite `nft.updated` pelo Socket.IO |
| `dropConnections()` | O servidor simulado fecha todos os sockets; o cliente reconecta e reconcilia com o REST |
| `replayLastEvent()` | Entrega o último evento de novo, com o mesmo `eventId` (duplicado) |
| `emitStaleNftUpdate(nftId, preço)` | Entrega um estado antigo tarde (versão menor, `eventId` novo); o registro não muda |
| `settlePendingOrders()` | Liquida agora todos os pedidos pendentes e emite `order.updated` ao dono |
| `expireQuotes()` | Expira agora todas as cotações emitidas |
| `receivedEvents()` | Todo evento que o `socket.io-client` do app recebeu desde o carregamento (probe só do mock, usado pelos testes) |

### Reproduzindo os fluxos de falha

| Fluxo | Como |
| --- | --- |
| Credenciais erradas | Entre com qualquer senha errada |
| Conflito de cadastro | Cadastre com `nova@kurio.test` ou com o usuário `novasato` |
| Sessão expirada ao navegar | Entre, rode `__kurioMock.expireSessions()` no console e abra "Meu perfil" |
| Sessão expirada no checkout | Com itens no carrinho, no passo de revisão rode `__kurioMock.expireSessions()` e clique em "Confirmar compra": você vai ao login e volta ao checkout, sem pedido criado |
| Rota privada como visitante | Abra `/profile` sem entrar: você vai ao login e volta depois de autenticar |
| Pedido pendente recuperado após reload | Abra `/?scenario=slow-payment`, compre algo e recarregue a página do pedido enquanto ele está pendente: o estado volta da API e a confirmação chega pelo Socket.IO |
| Conexão de carteira recusada | Abra `/checkout?scenario=wallet-rejected` logado, com itens no carrinho, e clique em "Conectar carteira". Volte com `__kurioMock.setScenario('default')` para conectar |
| Timeout depois de criar o pedido | Abra `/checkout?scenario=order-timeout`, conecte, revise e confirme. Após 10 s o checkout troca o formulário pelo painel "Pedido em andamento". "Tentar novamente" reenvia a mesma requisição com a mesma chave e abre o mesmo pedido (sem duplicar): pendente antes de 15 s, confirmado depois. Funciona também depois de recarregar a página ou de o carrinho esvaziar com a confirmação |
| Aviso de pedido pendente | Com `slow-payment`, compre algo e abra o carrinho em até 8 s: um aviso leva ao pedido pendente |
| Pagamento recusado | Abra `/?scenario=payment-declined` e compre algo: o pedido é recusado e os itens ficam no carrinho |
| Preço muda com o item no carrinho | Adicione um NFT ao carrinho e abra `/cart?scenario=price-change` (ou `/checkout?scenario=price-change` logado). Cerca de 4 s depois o primeiro item fica 10% mais caro via `nft.updated`: um aviso é anunciado (`aria-live`), o resumo é recalculado e, no checkout, "Confirmar compra" fica desabilitado até "Aceitar novo valor". Dispara uma vez por carregamento; recarregue para repetir. Para um valor exato: `__kurioMock.updateNft('emerald-ape-042', { price: '1.50' })` |
| Esgotou com o item no carrinho | `__kurioMock.updateNft('emerald-ape-042', { editions: [{ id: '1-50', available: 0 }] })` com essa edição no carrinho |
| Eventos perdidos numa reconexão | No carrinho, rode `__kurioMock.dropConnections(); __kurioMock.updateNft('emerald-ape-042', { price: '1.50' })`: nenhum evento é entregue, e o novo preço chega do REST quando o socket reconecta |
| Evento duplicado | Mude um preço com `updateNft`, dispense o aviso e rode `__kurioMock.replayLastEvent()`: o evento chega (`receivedEvents()` mostra duas entradas), mas o aviso não volta |
| Evento antigo | Depois de `updateNft('emerald-ape-042', { price: '1.50' })`, rode `__kurioMock.emitStaleNftUpdate('emerald-ape-042', '0.10')`: o preço não regride |
| Falha de mutation com rollback | `/?scenario=favorites-error` e favorite um NFT, ou `scenario=cart-error` e mude a quantidade de um item |

## Testes

```sh
npm run test:unit   # Node test runner
npm run test:e2e    # Playwright, Chromium desktop (1440×900) e mobile (Pixel 7)
```

O Playwright faz o build do app e o serve com `vite preview` na porta 4173, o mesmo artefato que vai ao ar. O servidor nunca é reaproveitado: se algo já estiver escutando na 4173 (um `npm run preview` antigo, por exemplo), a execução para com o erro "port already used". Encerre o processo e rode de novo. Isso é de propósito, para os testes nunca rodarem contra um build velho.

**Cobertura.** Os 12 cenários do enunciado: busca, filtros e histórico; detalhe direto e NFT inexistente; cadastro, login, expiração (navegação e checkout), logout e troca de usuário; favoritos com falha e recuperação; carrinho, cupom e persistência; compra completa; pagamento recusado, clique repetido e timeout com a mesma chave; perfil, avatar, senha e carteiras; preço e disponibilidade via Socket.IO no checkout; eventos duplicados, antigos, desconexão e retomada de pedido; teclado, foco e validação; skeletons, falha e retry. Os testes de tempo real passam pelo `socket.io-client`, e os de REST, pelos handlers do MSW.

**Estado isolado.** Cada teste abre sua primeira página com `openFresh` (`?mock-reset&scenario=…`), que restaura os dados iniciais e escolhe o cenário, e cada teste ganha um contexto de navegador novo (`localStorage` vazio). Os testes sensíveis a tempo usam `page.clock`.

**Zero skipped.** A confirmação do pedido é um modal no desktop e uma página no mobile, então o teste confere o formato de cada projeto em vez de pular um deles.

**Instabilidade conhecida.** O Playwright está com `retries: 1`. Ao longo de várias execuções completas da suíte, um teste (`profile.spec.ts`, "shows validation and API errors on the fields", desktop) falhou uma vez, durante uma rodada completa com 3 workers, e não voltou a falhar: passou em 16 de 16 execuções isoladas em paralelo e em todas as rodadas completas seguintes. Investiguei o teste e o código: o formulário só monta depois de o perfil carregar e usa `defaultValues` no mount, sem `reset` que sobrescreva o que foi digitado, e as asserções esperam o resultado do save, então não encontrei uma corrida como a do teste de sessão expirada (que já foi corrigida). A causa não foi identificada; a hipótese é carga de CPU na máquina durante a rodada. O retry evita que uma falha rara derrube a suíte, mas não esconde nada: um teste que só passa na segunda tentativa aparece como **flaky** na linha de resumo (`N flaky`) e no relatório HTML. Se a linha de resumo mostrar `flaky`, abra o trace da primeira tentativa.

**Relatório e traces.** Toda execução grava um relatório HTML em `playwright-report/` (`npm run test:e2e:report` o abre). Um teste que falha mantém o trace, um screenshot e o contexto de erro em `test-results/<teste>/`; abra um trace com `npx playwright show-trace test-results/<teste>/trace.zip` ou pelo relatório.

### Regressão visual

`e2e/visual.spec.ts` captura início, detalhe, carrinho e pagamento, página inteira, em desktop e mobile. Os dados são estáveis: reset da semente, cenário `default`, `page.clock` com data fixa, animações desligadas, fontes e imagens carregadas antes da captura.

As baselines são versionadas em `e2e/__screenshots__/visual.spec.ts/<projeto>/`. Elas **não** têm sufixo por sistema operacional (veja `snapshotPathTemplate` em `playwright.config.ts`), então um checkout em macOS ou Linux compara com as mesmas imagens em vez de falhar por falta de baseline. A renderização de fonte ainda difere entre sistemas, então a comparação tolera 2% de pixels diferentes (`maxDiffPixelRatio`, `threshold: 0.2`). Isso absorve antialiasing e hinting, mas ainda pega uma seção sumida, uma cor errada ou um layout quebrado.

As baselines foram geradas no Windows 11 com o Chromium que acompanha o Playwright 1.64. A tolerância só foi exercitada nessa máquina, então a portabilidade para macOS e Linux é esperada, não verificada. Se um teste visual falhar em outro sistema sem nenhuma mudança na interface, gere uma baseline local e rode de novo:

```sh
npm run test:e2e:visual:update   # reescreve as baselines para esta máquina
npm run test:e2e
```

Para pular os testes visuais, use `npm run test:e2e:functional`. Não versione baselines regeneradas em outra máquina sem revisar a diferença.

## Lighthouse

`npm run lighthouse` faz o build, serve o app numa porta própria e audita **início, detalhe, carrinho e pagamento** nos perfis **mobile** e **desktop**: 3 execuções por página e perfil, com a **mediana** de cada categoria e de LCP, CLS e TBT. Leva uns 10 a 15 minutos.

As condições: build de produção, mocks ligados, cenário `default`. Início e detalhe são medidos como visitante; carrinho e pagamento, logados como Nova Sato com um item no carrinho (o script faz o login com o Chromium do Playwright e audita esse mesmo navegador). O cache HTTP é limpo antes de cada execução, então toda medição é de carga fria; o `localStorage` e o service worker são mantidos porque guardam a sessão e o backend simulado. Nada é simplificado para melhorar a nota: imagens, fontes, mocks e tempo real ficam ativos.

Os relatórios ficam em [`reports/lighthouse/`](./reports/lighthouse): o HTML e o JSON da execução mediana de cada página e perfil, mais `summary.json` e `summary.md` com as notas de todas as execuções, as medianas, as versões das ferramentas e o ambiente.

### Resultados (mediana de 3 execuções)

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. **Todas as páginas e perfis atingem as metas.**

| Página | Perfil | Perf. | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | 98 | 100 | 100 | 100 | 1948 ms | 0,002 | 6 ms |
| Início | desktop | 100 | 100 | 100 | 100 | 716 ms | 0,002 | 13 ms |
| Detalhe | mobile | 99 | 100 | 100 | 100 | 1983 ms | 0 | 66 ms |
| Detalhe | desktop | 100 | 100 | 100 | 100 | 608 ms | 0 | 0 ms |
| Carrinho | mobile | 99 | 100 | 100 | 100 | 2018 ms | 0,003 | 80 ms |
| Carrinho | desktop | 100 | 100 | 100 | 100 | 762 ms | 0,001 | 0 ms |
| Pagamento | mobile | 98 | 100 | 100 | 100 | 2100 ms | 0 | 93 ms |
| Pagamento | desktop | 100 | 100 | 100 | 100 | 810 ms | 0 | 0 ms |

Ferramentas: Lighthouse 13.5.0, Chromium 156 (Playwright 1.64.1), Node 24.22, Windows 11, Intel i5-9400F. Throttling simulado do Lighthouse (mobile: 4G lento e CPU 4× mais lenta).

A auditoria também serviu para achar problemas reais, corrigidos no app e não no script. A primeira rodada deixou o carrinho no desktop abaixo da meta (Performance 87, CLS 0,254) por deslocamentos de layout no header e no footer durante o carregamento. O SEO ficou em 91 e 92 porque o app não tinha `robots.txt`: o `vite preview` devolvia o `index.html` no lugar, e o Lighthouse o lia como um robots.txt inválido. E o pagamento no desktop tinha 97 em acessibilidade por um link distinguível só pela cor ("Aplique aqui"), agora sublinhado. Os detalhes estão em [ARCHITECTURE.md](./ARCHITECTURE.md#14-performance-lighthouse).

## Deploy

Vercel, build de produção do Vite, com os mocks ligados (`VITE_ENABLE_MOCKS=true` no `.env` versionado) e o Socket.IO simulado funcionando no navegador. O `vercel.json` reescreve toda rota para `/index.html`, então acesso direto e refresh de qualquer rota funcionam. URL: https://jungle-nft-eight.vercel.app.

## Imagens dos NFTs

Os originais ficam em `design-assets/nfts/` (4 artes em PNG compartilhadas por vários NFTs, como no layout). `npm run assets:optimize` gera `src/assets/nfts/<nome>-480.webp` (cards) e `-960.webp` (hero e detalhe), que são o que o app serve (16 a 69 KB em vez de ~2 MB). Os nove primeiros NFTs seguem o mapeamento do layout e os demais alternam entre as quatro (`src/mocks/fixtures/nfts.ts`).

## URL do catálogo

Busca, filtros, aba, ordenação e página vivem na URL, por exemplo `/?q=ape&categories=music&categories=3d-art&networks=ethereum&minPrice=0.5&sort=price-asc&page=2`. Valores inválidos são ignorados. Mudar qualquer filtro volta à página 1.

## O que ficou de fora e por quê

- **Integrações reais** (blockchain, extensões de carteira, gateway de pagamento): fora do escopo do enunciado. Tudo é simulado, e o recibo e o link "Ver no Etherscan" (desabilitado, com a dica "Transação simulada") deixam isso explícito.
- **Páginas editoriais, suporte, atividade, ofertas e downloads**: não fazem parte da entrega. Os links levam a um aviso "não faz parte da demonstração", para não parecerem funcionais.
- **Aba "Avaliações" do detalhe, zoom e "Compartilhar"**: não estão desenhados no Figma. A galeria repete a única arte que a API tem por NFT.
- **Tablet (768 px)**: funcional e sem overflow, mas sem frame no Figma, então não é pixel-perfect.
- **Token de sessão em `localStorage`**: com MSW não há servidor para definir um cookie `HttpOnly`, que seria o certo num backend real.
- **Mocks no navegador**: sem multiusuário real nem concorrência entre abas, e com o limite de ~5 MB do `localStorage` (o estouro é tratado com `STORAGE_FULL` e rollback).
- **Socket.IO só por WebSocket e sem salas**: é a limitação do `@mswjs/socket.io-binding`. O isolamento por usuário foi feito no handler.
- **Regressão visual validada só no Windows 11**: veja a seção de testes.
- **Verificação automática de acessibilidade com axe**: não incluída para evitar uma dependência a mais. A acessibilidade é coberta por testes de teclado, foco, rótulos e erros associados, e pela categoria Accessibility do Lighthouse.
- **Medições do Lighthouse feitas numa máquina local**: os valores absolutos variam entre máquinas.

Os desvios do Figma estão em [ARCHITECTURE.md](./ARCHITECTURE.md#16-desvios-do-figma).
