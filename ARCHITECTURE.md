# Arquitetura

Marketplace de NFTs (Kurio) feito para o desafio frontend da Jungle Gaming. Toda a API, a autenticação, as carteiras, os pagamentos e os eventos em tempo real são simulados com MSW, na camada de rede. Este documento explica como as peças se encaixam, as decisões tomadas, os limites do ambiente de mocks e os desvios do Figma.

## Índice

1. [Organização do projeto](#1-organização-do-projeto)
2. [Contratos REST e eventos](#2-contratos-rest-e-eventos)
3. [Cliente HTTP](#3-cliente-http)
4. [Sessão](#4-sessão)
5. [Cache e estado remoto](#5-cache-e-estado-remoto)
6. [Catálogo, detalhe e favoritos](#6-catálogo-detalhe-e-favoritos)
7. [Carrinho](#7-carrinho)
8. [Checkout, pedidos e idempotência](#8-checkout-pedidos-e-idempotência)
9. [Tempo real e reconciliação com REST](#9-tempo-real-e-reconciliação-com-rest)
10. [Perfil e carteiras](#10-perfil-e-carteiras)
11. [Mocks](#11-mocks)
12. [Acessibilidade](#12-acessibilidade)
13. [Testes](#13-testes)
14. [Performance (Lighthouse)](#14-performance-lighthouse)
15. [Decisões técnicas](#15-decisões-técnicas)
16. [Desvios do Figma](#16-desvios-do-figma)
17. [Limitações conhecidas](#17-limitações-conhecidas)

## 1. Organização do projeto

| Caminho | Responsabilidade |
| --- | --- |
| `src/main.tsx` | Inicia o MSW (quando habilitado) e só então carrega o app com `import()` |
| `src/App.tsx` | Providers de QueryClient e Router; redirecionamento de sessão expirada |
| `src/routes/` | Rotas baseadas em arquivos (o plugin do TanStack Router gera `routeTree.gen.ts`) |
| `src/api/` | Cliente Axios, contratos REST (Zod) e funções tipadas por endpoint |
| `src/features/` | Lógica por funcionalidade: queries, mutations, formulários |
| `src/lib/` | Helpers sem dependência de framework (matemática de ETH, query client, erros de formulário, search params) |
| `src/realtime/` | Cliente Socket.IO, tratamento de eventos e anúncios |
| `src/mocks/` | Handlers MSW (REST e Socket.IO), banco em memória, cenários e fixtures |
| `src/components/ui/` | Componentes shadcn/ui adaptados à identidade da Kurio |
| `e2e/` | Testes Playwright (funcionais e regressão visual) |
| `scripts/` | Auditoria Lighthouse e otimização de imagens |

Como cada tecnologia obrigatória participa:

| Tecnologia | Onde |
| --- | --- |
| TanStack Router | Rotas file-based, `beforeLoad` nas rotas privadas, search params validados do catálogo, modal de pedido como rota |
| TanStack Query | Todas as consultas e mutations, cache por usuário e por parâmetros, atualização otimista, reconciliação |
| Axios | Único caminho das chamadas REST (`src/api/http.ts`) |
| Socket.IO | `socket.io-client` real, servidor simulado por MSW |
| MSW | Toda a API e os eventos; nenhum componente, hook ou o cliente Axios tem resposta fictícia |
| Tailwind + shadcn/ui | Estilo e componentes base, com os tokens do Figma |
| Playwright | E2E em Chromium desktop e mobile, regressão visual, relatório HTML e trace em falha |
| Lighthouse | `scripts/lighthouse.mjs`, 3 execuções por página e perfil |

## 2. Contratos REST e eventos

`src/api/contracts.ts` guarda os schemas Zod de todo recurso REST e de todo evento em tempo real. Os tipos TypeScript são inferidos deles (`z.infer`), e tanto o app quanto os handlers do MSW os importam: transporte, estado e interface compartilham uma única definição.

- **Valores em ETH** são strings decimais (`"1.19"`) e todo cálculo usa `bigint` em wei (`src/lib/eth.ts`). Ponto flutuante nunca toca dinheiro. Quantidades são inteiras.
- **Erros** usam sempre o mesmo envelope, `{ error: { code, message, fieldErrors?, details? } }`. O `code` dirige a interface: `VALIDATION_ERROR` 422, `UNAUTHENTICATED`/`SESSION_EXPIRED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT`/`AVAILABILITY_CONFLICT`/`QUOTE_CHANGED`/`IDEMPOTENCY_CONFLICT`/`WALLET_REJECTED` 409, `COUPON_INVALID`/`COUPON_EXPIRED` 422, `SERVICE_UNAVAILABLE` 503, `STORAGE_FULL` 507.
- **Eventos** carregam `eventId` (deduplicação), `resourceId`, `type`, `occurredAt` e um `version` monotônico por recurso (eventos antigos são descartados).
- **Pedidos** são snapshots: linhas, preços e totais são copiados na criação.

### Endpoints

| Recurso | Operações |
| --- | --- |
| Sessão e conta | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout` |
| NFTs | `GET /api/nfts` (busca, filtros, ordenação, paginação), `GET /api/nfts/:nftId` |
| Favoritos | `GET /api/favorites`, `PUT /api/favorites/:nftId`, `DELETE /api/favorites/:nftId` (idempotentes) |
| Carrinho | `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:nftId/:editionId` (quantidade absoluta), `DELETE /api/cart/items/:nftId/:editionId` |
| Cotação | `POST /api/quote` (cupom, disponibilidade, descontos, taxa de rede e total) |
| Pedidos | `POST /api/orders` (exige `Idempotency-Key`), `GET /api/orders` (filtro `status`), `GET /api/orders/:orderId` |
| Perfil | `GET /api/profile`, `PATCH /api/profile` (dados e avatar), `POST /api/profile/password` |
| Carteiras | `GET /api/wallets`, `PUT /api/wallets/:slot` (principal ou secundária), `POST /api/wallets/:walletId/connect` |

### Eventos Socket.IO

| Evento | Payload (`data`) | Efeito no cliente |
| --- | --- | --- |
| `nft.updated` | `{ price, oldPrice, editions: [{ id, available }] }` | Atualiza catálogo, detalhe e carrinho; anuncia a mudança; recarrega carrinho e cotação |
| `order.updated` | estado do pedido | Atualiza o pedido no cache; a confirmação ou a recusa aparece na tela; um pedido confirmado também invalida carrinho e cotação |

## 3. Cliente HTTP

`src/api/http.ts` (Axios):

- O interceptor de requisição adiciona `Authorization: Bearer <token>` e `X-Guest-Id`. O id de visitante é dono do carrinho de quem não está logado, até o merge no login.
- O interceptor de resposta transforma toda falha em `ApiError`: erros da API, `NETWORK_ERROR`, `TIMEOUT` e `CANCELED`. `isTransient` marca o que vale tentar de novo (conexão, timeout, 5xx).
- Quando uma requisição autenticada a um recurso privado recebe 401, os listeners de `onSessionExpired` são avisados. Os endpoints `/auth/*` ficam de fora: senha errada e a checagem de sessão no boot tratam o 401 por conta própria.
- Timeout de 10 s por requisição.

## 4. Sessão

- **Armazenamento.** O token fica em `localStorage` (`kurio.token`), então a sessão sobrevive ao refresh. Senhas existem só no corpo do login e do cadastro, e o mock guarda hashes SHA-256 com sal. Num backend real, um cookie `HttpOnly` seria preferível; com MSW não há servidor para defini-lo.
- **Boot.** A query `['session']` chama `GET /auth/session` quando há token. Um 401 descarta o token e o usuário segue como visitante (`null`), não como erro.
- **Duração.** 30 minutos (`SESSION_TTL_MS` no mock).
- **Guarda de rota.** `src/routes/_authenticated.tsx` é um layout sem caminho. O `beforeLoad` usa `ensureQueryData(sessionQueryOptions)` e redireciona para `/login?redirect=<url atual>`. Login e cadastro só aceitam caminhos do mesmo domínio em `redirect` (`safeRedirect`), o que evita redirecionamento aberto.
- **Token vencido é 401, nunca visitante.** No mock, só a ausência de token é visitante. Um token expirado ou desconhecido responde 401 em qualquer rota, inclusive carrinho e cotação. Antes, `optionalUser` convertia token vencido em visitante: o carrinho voltava vazio e o app nunca redirecionava ao login. Foi encontrado pelo teste de expiração no checkout.
- **Expiração durante a navegação e o checkout.** Uma requisição privada respondida com 401 dispara `onSessionExpired`. O `App.tsx` encerra a sessão local, mostra um toast e navega para `/login?redirect=<url atual>&reason=expired`. Depois de entrar de novo, o usuário volta à mesma URL. O estado do servidor (carrinho, pedido pendente) não é tocado, então o checkout pode ser retomado. Se a sessão expira ao confirmar a compra, nenhum pedido é criado.
- **Logout e troca de usuário.** `endSession` descarta o token, desconecta o socket e remove toda query em cache, exceto a de sessão. Ele não usa `queryClient.clear()`, que também apagaria o objeto da query de sessão e deixaria observers montados (o header) inscritos numa query morta. O login executa a mesma limpeza antes de guardar a nova sessão, então dados em cache de outro usuário ou do visitante nunca aparecem. O logout local é imediato, e a revogação do token no servidor é "melhor esforço". Fechar a aba logo depois de "Sair" não mantém o usuário logado.

## 5. Cache e estado remoto

Política em `src/lib/query-client.ts`:

| Regra | Valor |
| --- | --- |
| `staleTime` | 30 s |
| Retries de query | no máximo 2, com backoff, **só** em falhas transitórias (conexão, timeout, 5xx). Repetir um 4xx falharia igual |
| Retries de mutation | nenhum. Efeitos colaterais não podem ser duplicados |
| Chaves | incluem os parâmetros (`['nfts', 'list', query]`) e o id do usuário nos recursos privados, então nada vaza entre consultas ou usuários |
| Cancelamento | o `signal` do Axios aborta requisições superadas; `placeholderData` mantém a lista anterior na tela (esmaecida, `aria-busy`) enquanto a próxima carrega |
| Troca de usuário | `endSession` remove os dados privados do cache |

**Invalidação.** Mutations invalidam o que mudaram (salvar carteira invalida `['wallets', id]`, a mesma chave do checkout; salvar o perfil atualiza `['profile', id]` e a sessão, de onde o header lê o nome). Eventos de tempo real fazem patch no cache e invalidam o resto (ver seção 9). Não há polling.

**Atualização otimista com rollback.** Em favoritos e na edição de quantidade do carrinho. A interface muda na hora, o snapshot é restaurado em caso de erro (com toast explicando), e só a última mutation em voo reconcilia com o servidor.

## 6. Catálogo, detalhe e favoritos

- **Estado na URL.** `src/lib/search-params.ts` codifica os search params como query string simples (chaves repetidas para listas), em vez da codificação JSON do TanStack. `parseCatalogSearch` valida campo a campo com Zod, então um valor ruim não descarta o resto. O router mantém params desconhecidos junto dos validados, por isso `useCatalogSearch` sanitiza de novo. Busca, filtros, aba, ordenação e página sobrevivem a refresh e ao histórico; mudar qualquer filtro volta à página 1. Exemplo: `/?q=ape&categories=music&categories=3d-art&networks=ethereum&minPrice=0.5&sort=price-asc&page=2`.
- **Respostas fora de ordem.** O observer só segue a chave atual, então uma resposta antiga não sobrescreve uma escolha mais nova (coberto pelo cenário `out-of-order`).
- **Falhas.** O catálogo repete duas vezes com backoff (cerca de 3 s de skeletons) antes do painel de erro; "Tentar novamente" refaz a consulta.
- **Facetas** contam os NFTs que atendem a todos os filtros, exceto os do próprio grupo.
- **Skeletons com shimmer** reaproveitam o modelo de caixa dos cards e do detalhe (proporções, grid, espaçamentos), então o carregamento não desloca o conteúdo. No detalhe, a imagem do skeleton fica exatamente onde a real vai ficar (teste mede x, y, largura e altura em desktop e mobile). O shimmer cai para uma única execução instantânea sob `prefers-reduced-motion`.
- **Favoritos otimistas** (`useToggleFavorite`): atualiza o cache em `onMutate`, restaura em `onError` e só o último toggle em voo reconcilia. PUT e DELETE são idempotentes; visitante é enviado ao login e volta ao NFT.
- **Edição pré-selecionada:** derivada (primeira com estoque, ou a escolha do usuário enquanto tiver estoque), não guardada em estado. Sem estoque, os botões ficam desabilitados com um texto associado por `aria-describedby`.
- **Detalhe mobile sem tab bar** (como no Figma): a barra de compra fixa a substitui, e o toast "adicionado" traz a ação "Ver carrinho".

## 7. Carrinho

O carrinho vive no servidor (mock), por dono: `user:<id>` quando autenticado, `guest:<X-Guest-Id>` caso contrário. No login ou cadastro, o carrinho do visitante é mesclado ao do usuário, limitado pela disponibilidade. Preço e disponibilidade são juntados do catálogo vivo a cada leitura.

- **Totais** vêm sempre de `POST /api/quote`, nunca de conta no cliente. Enquanto uma nova cotação carrega, os valores anteriores ficam esmaecidos (`aria-busy`) e "Conectar e finalizar" fica desabilitado. Itens com problema de estoque aparecem na linha e bloqueiam a finalização.
- **Edição otimista** (`useCartEdit`): a linha muda na hora; em erro, volta o snapshot e um toast explica; só a última edição em voo recarrega carrinho e cotação. `PATCH` define a quantidade absoluta (409 se acima do estoque); `DELETE` é idempotente.
- **Cupom:** só é guardado depois que a API o aceita (`sessionStorage`, compartilhado entre carrinho e checkout). Inválido ou expirado mostra o motivo no campo; um cupom que expire depois é removido com aviso (`useCartQuote`). O logout o limpa, e a confirmação de um pedido também (`order.updated` com `confirmed`, em `applyOrderUpdated`): o carrinho seguinte começa sem cupom. Um pagamento recusado mantém o cupom, porque os itens voltam ao carrinho para uma nova tentativa.
- **Visitante:** o `guestId` identifica o carrinho; o merge no login e a persistência após refresh têm teste E2E.

## 8. Checkout, pedidos e idempotência

**Fluxo em etapas:** editar → conectar carteira → revisar → confirmar. Há um único botão principal, como no layout, com o rótulo da etapa atual.

- **Carteira simulada:** `POST /api/wallets/:id/connect` com provedor e rede. O cenário `wallet-rejected` recusa (`409 WALLET_REJECTED`). Trocar carteira, provedor ou rede invalida a conexão (comparação derivada, sem efeito); "Desconectar" volta ao início. A carteira principal vem pré-selecionada, com a rede e o provedor dela.
- **Revalidação antes de confirmar:** "Confirmar compra" relê a cotação. Se o conteúdo mudou desde a revisão, o pedido não é enviado e aparece o aviso com "Aceitar novo valor". O servidor mantém `409 QUOTE_CHANGED` como última barreira.
- **Cotação desatualizada:** o checkout guarda a cotação que o usuário revisou. Uma nova cotação com conteúdo diferente (linhas, preços unitários, quantidades, totais) desabilita "Confirmar compra" até o usuário aceitar. O alerta mostra o total anterior e o novo só quando o total mudou; se só os itens mudaram, diz isso. As cotações são comparadas por conteúdo, não por id, porque cada requisição gera um id novo. Problemas de disponibilidade não contam como mudança de valor: eles bloqueiam a compra por conta própria, com mensagem própria. A compra também fica bloqueada enquanto a cotação é refeita.
- **Reserva do próprio pedido:** um pedido pendente reserva as unidades, então a cotação do carrinho pode marcar a linha como esgotada. Quando a linha está num pedido pendente do usuário (`usePendingOrderFor`), carrinho e checkout mostram "Pedido em andamento" com link para ele, em vez de "esgotou". O aviso em tempo real segue a mesma regra: o `nft.updated` da própria reserva chega com a disponibilidade já reduzida, e `isHeldByOwnOrder` (`src/features/orders/queries.ts`) impede que isso seja anunciado como esgotamento. Ele cobre os três momentos em que o pedido existe sem a lista de pendentes saber dele: a tentativa com a primeira requisição em voo, a tentativa sem resposta (por isso a tentativa guarda as linhas que compra, já que o corpo só tem o `quoteId`) e o pedido pendente, que entra no cache de pendentes assim que a criação responde. Uma mudança de preço dessas linhas continua sendo anunciada, e um esgotamento causado por outra pessoa também.

### Pedidos (servidor simulado)

| Regra | Onde |
| --- | --- |
| A criação exige `Idempotency-Key`. A mesma chave com o mesmo corpo devolve o pedido original; com corpo diferente, `409 IDEMPOTENCY_CONFLICT`. A chave é checada **antes** da cotação: o retry de um pedido que já existe o recebe de volta mesmo com a cotação expirada ou o carrinho já esvaziado pela confirmação | `src/mocks/handlers/orders.ts` |
| A cotação precisa pertencer ao usuário e ainda bater com o preço atual do carrinho, senão `409 QUOTE_CHANGED` | `quoteStillValid` em `src/mocks/commerce.ts` |
| As unidades são reservadas na criação e liberadas se o pagamento for recusado | `src/mocks/orders.ts` |
| A liquidação acontece em `settleAt`, persistido. No boot o mock reagenda os pendentes, e `GET /api/orders/:id` liquida um pedido cujo prazo já passou | `resumePendingOrders`, `settleIfDue` |
| Confirmado e recusado são terminais. A confirmação remove do carrinho apenas as quantidades compradas | `settle` |
| O recibo é um snapshot (linhas, preços e totais copiados na criação), então mudanças posteriores no catálogo nunca o alteram | `OrderRecord` |
| O pedido de outro usuário responde 404, então ids não podem ser sondados | `GET /api/orders/:id` |

### Idempotência no cliente

Cada tentativa de compra é guardada em `sessionStorage` **antes** do envio: a chave de idempotência, o corpo exato da requisição e o id do usuário (`startAttempt` em `src/features/orders/queries.ts`). Ela só é descartada quando chega uma resposta definitiva: sucesso, ou um erro que prova que nenhum pedido foi criado (4xx). Depois de uma falha transitória (timeout, conexão, 5xx), ou de um reload com a requisição em voo, o pedido pode existir e a tentativa fica **não resolvida**.

Uma tentativa não resolvida substitui o formulário do checkout pelo painel "Pedido em andamento" (`UnresolvedOrder`). O "Tentar novamente" do painel reenvia o mesmo corpo com a mesma chave, recebe o pedido já criado (pendente ou confirmado) e navega até ele. O painel não depende do carrinho. Antes, o retry vivia no estado da mutation dentro do formulário: quando a confirmação chegava, o carrinho esvaziava, a página trocava o formulário por "carrinho vazio" e o retry sumia. Depois de um reload, só a chave sobrevivia, e um novo envio com outra cotação recebia 409. Guardar o corpo elimina esse 409. Se ele acontecer mesmo assim, a mensagem traz um link para o pedido pendente.

O painel usa `mutateAsync` e não `mutate` com callbacks: o sucesso encerra a tentativa e desmonta o painel no mesmo instante, e o TanStack Query descarta os callbacks de `mutate` de um componente desmontado. A promise resolve mesmo assim. A tentativa guarda o id do usuário, então outra conta no mesmo navegador não vê o painel.

**Clique repetido:** o botão fica desabilitado e um `ref` bloqueia a reentrada antes do re-render. Mesmo que duas requisições saíssem, a mesma chave devolveria o mesmo pedido. O teste E2E conta os `POST /api/orders` e exige um só.

### Estados do pedido

A confirmação é um modal no desktop e uma página no mobile, aberta pela própria rota `/orders/:id`. Por isso acesso direto e refresh funcionam: não existe estado de "modal aberto" fora da URL. Fechar leva ao início. Ao abrir, o foco vai para o título (`DialogTitle`, que também dá nome acessível ao diálogo), o Radix prende o foco e Esc fecha.

Há três estados com o mesmo layout: confirmado (envelope "THANK YOU", hash, "Ver no Etherscan"), pendente (spinner, "Aguardando" no lugar do hash) e recusado (título em `destructive`, link para o carrinho). O recibo vem só do snapshot do pedido. "Ver no Etherscan" não é um link: o hash é simulado, então o botão fica `aria-disabled` com a dica "Transação simulada" (no hover e no foco, ligada por `aria-describedby`).

**Recuperação.** O estado do pedido sempre vem de `GET /api/orders/:id` ao montar a página (`staleTime: 0`), e os eventos mantêm a mesma entrada de cache atualizada. Recarregar, reconectar ou perder o `order.updated` leva ao mesmo resultado, sem criar outra compra. `GET /api/orders?status=pending` lista os pendentes e alimenta o aviso de pedido pendente no carrinho e no checkout.

## 9. Tempo real e reconciliação com REST

Os eventos Socket.IO são produzidos por handlers do MSW (`src/mocks/realtime.ts`) via `ws.link` + `@mswjs/socket.io-binding`; o app usa o `socket.io-client` real. Nenhum setter, callback ou acesso direto ao cache simula evento.

### Transporte e limitações do ambiente de mocks

- **Só WebSocket.** O binding intercepta WebSocket, não long-polling HTTP, então o cliente usa `transports: ['websocket']`.
- **Handshake falso sem heartbeat.** O binding envia o pacote de abertura do Engine.IO (`pingInterval` 25 s, `pingTimeout` 5 s) mas nunca faz ping. O handler envia um ping cru (`"2"`) a cada 20 s; sem isso o cliente cairia e reconectaria a cada ~30 s.
- **Só o namespace padrão, sem salas nem helpers de broadcast.** O isolamento por usuário é implementado no handler (abaixo).
- **Link por origem.** O MSW remove o caminho `/socket.io/` antes de casar, então o link aponta para `window.location.origin` (com `ws`/`wss`).
- **O mock vive na página.** Um reload reinicia o servidor simulado. Por isso o que depende de tempo (liquidação de pagamento) usa timestamps persistidos, não só timers em memória.
- **O socket é carregado depois do `worker.start()`.** O `engine.io-client` guarda o construtor `WebSocket` quando o módulo é avaliado; importá-lo antes de o MSW iniciar faria o cliente usar o WebSocket nativo e furar o mock.

### Autenticação e escopo

O cliente passa `auth: (cb) => cb({ token: getToken() })`, então toda (re)conexão envia o token atual no pacote CONNECT (`40{"token":"..."}`). O mock lê o pacote, resolve a sessão e guarda o `userId` na conexão. `emitToUser(userId, …)` entrega eventos privados (`order.updated`) só às conexões daquele usuário; `broadcast` envia os públicos (`nft.updated`). Visitantes também conectam (sem token), porque também têm carrinho e veem o catálogo. Quando o usuário muda (login, logout, expiração), `useRealtime` remove os listeners, desconecta e abre uma nova conexão com o novo token, então eventos privados de uma sessão anterior nunca chegam ao próximo usuário. Os listeners também são liberados quando a raiz desmonta.

### Tratamento no cliente

`src/realtime/events.ts` valida todo evento contra o contrato, ignora `eventId` já visto e ignora eventos cuja `version` não é mais nova que o recurso em cache. Um `order.updated` confirmado também invalida carrinho e cotação, porque o servidor removeu os itens comprados.

Toda representação REST de um NFT carrega a mesma versão: `Nft.version` na lista e no detalhe, `CartItem.nftVersion` no carrinho. O cliente compara o evento com a maior versão encontrada em qualquer um desses caches, então, depois de uma reconciliação com REST, um evento tardio mais antigo que o estado buscado ainda é descartado. Um evento mais novo faz patch no detalhe e na lista (`setQueriesData`); se o NFT está no carrinho, a linha é atualizada, um aviso é anunciado e carrinho e cotação são relidos: os totais continuam vindo só da API.

O mock incrementa a versão e transmite `nft.updated` em toda mudança de catálogo: o controle `updateNft`, o cenário `price-change`, unidades reservadas por um pedido e unidades liberadas por um pagamento recusado. REST e eventos descrevem sempre o mesmo estado.

**Aviso.** O `LiveAnnouncer` (layout raiz) é uma região `role="status"` / `aria-live="polite"` sempre montada, então leitores de tela anunciam o texto inserido depois. Ele também é o aviso visível (com botão de fechar). Não se usa toast aqui porque o sonner tem a própria região live e a mensagem seria lida duas vezes.

### Reconciliação com REST

A cada `connect`, as queries ativas `['orders', …]` são invalidadas e relidas do REST. Numa reconexão (qualquer `connect` depois do primeiro daquela sessão de socket), catálogo, carrinho e cotação também são invalidados, recuperando o que mudou enquanto estava desconectado. Na primeira conexão, as páginas acabaram de buscar seus dados, então só os pedidos são relidos (um pagamento pode ser liquidado entre a busca e a conexão); reler tudo ali cancelaria e repetiria as requisições em voo a cada carregamento. Lacuna conhecida: um evento de catálogo enviado nos poucos milissegundos entre a primeira busca e a primeira conexão se perde até a próxima busca.

### Cenário obrigatório: preço muda com o item no carrinho

1. Um NFT está no carrinho. 2. O preço ou a disponibilidade muda (`nft.updated`). 3. Um aviso `aria-live` informa a alteração e o resumo é atualizado. 4. O checkout bloqueia a confirmação com a cotação antiga até "Aceitar novo valor". Coberto por testes E2E de preço e de edição esgotada, no carrinho e no checkout.

### Duplicados, antigos e desconexão

Evento duplicado (mesmo `eventId`) e evento antigo (versão menor, `eventId` novo) são entregues de verdade pelo socket e descartados pelo cliente; o teste prova que o aviso dispensado não volta e que o preço não regride. Uma desconexão com pedido pendente, com a liquidação ocorrendo enquanto o socket está fora, é recuperada na reconexão pela leitura do REST, sem segundo pedido.

## 10. Perfil e carteiras

- **Rotas.** `/profile` é um layout (`AccountLayout`) com duas filhas, `/profile` (dados, avatar e senha) e `/profile/wallets`. No desktop, a sidebar do Figma. Itens sem tela (Atividade, Ofertas, Arquivos baixados, Suporte) usam `OutOfScopeLink`; "Lista de interesse" leva a `/favorites`.
- **Contratos.** `profileFieldsSchema` e `walletInputSchema` são a única fonte das regras: os formulários derivam deles (`pick`/`extend`) e o mock valida o mesmo schema. A mensagem de erro do servidor é igual à do cliente.
- **Erros da API nos campos.** `applyServerErrors` mapeia `fieldErrors` para os campos (usuário ou e-mail duplicado, senha atual errada, endereço já usado por outra conta). Erros sem campo vão para `root.server`.
- **Avatar.** O arquivo (PNG, JPG ou WebP, até 5 MB) é recortado em quadrado e redimensionado para 256×256 via canvas, codificado em WebP (JPEG se o navegador não gera WebP). O data URL fica com poucos KB e o servidor recusa mais de 100 000 caracteres.
- **`localStorage` cheio.** `saveDb()` marca `QuotaExceededError`; ao fim da requisição, `withScenario` desfaz a mudança (volta ao último estado persistido) e responde `STORAGE_FULL` (507) com mensagem clara. Memória e storage nunca divergem.
- **Carteiras.** Um usuário tem uma principal e uma secundária (`PUT /wallets/:slot`). Um endereço não pode pertencer a duas contas; a principal e a secundária da mesma conta podem repetir o endereço ("Igual à carteira principal").
- **Senha.** Todo campo de senha (login, cadastro e troca) tem o botão de olho para mostrar ou ocultar, com `aria-label` ("Mostrar senha" / "Ocultar senha") e `aria-pressed`. O `TextField` o desenha ao detectar `type="password"`, então as telas herdam sem mudar. Cada campo tem seu próprio estado.

## 11. Mocks

| Arquivo | Papel |
| --- | --- |
| `src/mocks/db.ts` | Estado do backend (catálogo, usuários, sessões, carrinhos, favoritos, carteiras, cotações, pedidos), persistido em `localStorage` (`kurio.mock.db`). `resetDb()` restaura a semente. `SCHEMA_VERSION` descarta estado persistido antigo |
| `src/mocks/fixtures/` | Semente determinística: 36 NFTs (os 9 primeiros reproduzem a grade da home do layout), 2 usuários, carteiras, favoritos, cupons |
| `src/mocks/scenarios.ts` | Cenários de rede: latência (PRNG com semente), respostas fora de ordem e injeção de falhas por rota |
| `src/mocks/utils.ts` | `withScenario` (latência e falhas em volta de um resolver), envelope de erro, helpers de autenticação, serializadores |
| `src/mocks/images.ts` | Mapeia o nome de um arquivo de imagem para a URL do asset empacotado, com placeholder de reserva |
| `src/mocks/realtime.ts` | Servidor Socket.IO simulado (escopo por usuário, broadcast, reentrega, queda de conexão) |
| `src/mocks/browser.ts` | Aplica `?scenario` e `?mock-reset`, carrega o banco, inicia o worker e expõe `window.__kurioMock` |

O app nunca importa de `src/mocks/` além da chamada `startMocking()` em `main.tsx`. A camada é ativada por `VITE_ENABLE_MOCKS` e está presente no build de demonstração.

- **Consistência.** Catálogo, favoritos, carrinho, perfil, carteiras e pedidos compartilham o mesmo estado. Mudanças aparecem nas respostas REST e nos eventos.
- **Determinismo.** A latência vem de um PRNG com semente: a mesma sequência de requisições recebe sempre os mesmos atrasos. Os cenários cobrem sucesso e resultado vazio, latência variável e respostas fora de ordem, falha de conexão e HTTP 4xx/5xx, sessão expirada, conflito de cadastro, cupom inválido ou expirado, preço alterado ou edição esgotada, timeout após criar o pedido, pagamento confirmado e recusado. A lista completa e como reproduzir cada um está no README.
- **Consistência dos IDs.** O layout usa token IDs diferentes para o mesmo NFT em telas diferentes (Violet Nomad `#0009` e `#0314`). No mock o token ID vem sempre do número no nome (`Violet Nomad #314` → `#0314`), e toda tela lê da mesma fonte.
- **Imagens.** O layout tem quatro artes compartilhadas por vários NFTs. O mock guarda só o nome do arquivo (`ape-green.png`), nunca uma URL. As URLs são resolvidas a cada resposta via `import.meta.glob('/src/assets/nfts/*')`: o Vite versiona as URLs por build, então uma URL persistida ficaria velha, e um placeholder persistido esconderia imagens adicionadas depois. As artes são servidas em WebP (`npm run assets:optimize`).
- **Worker reiniciado pelo navegador.** O QA viu um `POST /api/quote` responder 405 vindo da Vercel, não do MSW. A causa: o `mockServiceWorker.js` guarda em memória a lista de abas ativas (`activeClientIds`), preenchida pela mensagem `MOCK_ACTIVATE` que o MSW envia uma única vez, no `worker.start()`. O Chrome para um worker ocioso, por exemplo numa aba em segundo plano, onde o keepalive de 5 s do MSW é estrangulado. O worker que sobe de novo começa com a lista vazia e deixa toda requisição seguir para a rede: o host devolve o `index.html` num GET e 405 num POST. A página continua "controlada", então nada no MSW percebe. Reproduzido com o CDP (`ServiceWorker.stopAllWorkers`). A hipótese de um deploy trocar o worker não se sustenta: o arquivo não muda desde o primeiro commit, e o navegador só instala um worker novo quando os bytes mudam. **Correção:** um interceptor de request do Axios, registrado só no build com mocks (`ensureMocking` em `browser.ts`), espera a página ter um `controller` e reenvia `MOCK_ACTIVATE` antes de cada requisição, aguardando o `MOCKING_ENABLED`. A mensagem é idempotente (um `Set.add` no worker) e custa uma ida e volta local. Ela também acorda o worker parado antes de a requisição sair. O E2E para o worker pelo CDP e confere que carrinho e cotação continuam vindo do MSW. O Socket.IO não passa pelo service worker: o MSW intercepta o WebSocket dentro da página.
- **Controles de teste** (`window.__kurioMock`): `reset`, `setScenario`, `getScenario`, `expireSessions`, `updateNft`, `dropConnections`, `replayLastEvent`, `emitStaleNftUpdate`, `settlePendingOrders`, `expireQuotes` e `receivedEvents`. Este último é um probe só do mock: registra, via `socket.onAny`, tudo o que o `socket.io-client` do app recebe. Ele só observa, e é o que permite provar que um evento *não* chegou (por exemplo, depois de trocar de usuário). `emitStaleNftUpdate` usa um `eventId` novo de propósito: assim só a checagem de versão pode rejeitar o evento, e não a deduplicação.

## 12. Acessibilidade

- Navegação por teclado em todos os fluxos; o primeiro `Tab` leva ao link "Pular para o conteúdo"; todo controle focável desenha um indicador de foco (o painel de abas do catálogo, que recebia foco sem anel, foi corrigido).
- Diálogos e drawers prendem o foco, fecham com Esc e devolvem o foco ao gatilho. O modal do pedido leva o foco ao título.
- Campos com `label`, `aria-invalid` e erro ligado por `aria-describedby`; o primeiro campo com erro recebe o foco.
- No checkout, o botão principal fica desabilitado enquanto a carteira conecta, e um botão desabilitado perde o foco para o `body`. Quando a conexão termina, o foco volta a esse botão, que já mostra o próximo passo ("Revisar pedido"). Na revisão, o foco vai para o título "Revise seu pedido".
- Avisos de tempo real e de mutations em regiões `aria-live` sempre montadas.
- Skeletons com `role="status"` e nome acessível; sem animação sob `prefers-reduced-motion`.
- Imagens relevantes com texto alternativo; decorativas com `alt=""`.
- Estados que não dependem só de cor (texto, ícone, `aria-current`, `aria-pressed`). O botão de texto do favorito troca o rótulo ("Favoritar" / "Remover dos favoritos") e por isso não usa `aria-pressed`, porque rótulo variável e estado pressionado se contradiriam. Os corações só com ícone mantêm o rótulo fixo com `aria-pressed`, o padrão de botão de alternância.
- O modal do recibo tem `aria-modal="true"`: o Radix esconde o resto da página das tecnologias assistivas, mas não marca o atributo.
- O aviso de tempo real (`LiveAnnouncer`) fica no topo: no mobile, colado à borda; no desktop, à direita, abaixo do header. No canto inferior direito ele cobria o "Aceitar novo valor" do checkout, que aparece junto com o aviso. Um E2E confere que os dois não se sobrepõem.
- "Ver no Etherscan" e ações fora do escopo não parecem funcionar: botão desabilitado com explicação, ou aviso "não faz parte da demonstração".

## 13. Testes

- **Unitários** (`npm run test:unit`, Node test runner): ETH, busca do catálogo, fixtures e tratamento de eventos.
- **E2E** (`npm run test:e2e`, Playwright, Chromium desktop 1440×900 e mobile Pixel 7): 12 cenários obrigatórios do enunciado, mais testes de escopo por usuário e de recuperação. O Playwright faz o build e serve com `vite preview` numa porta fixa, o mesmo artefato do deploy. O servidor nunca é reaproveitado: se a porta estiver ocupada, a execução para com um erro claro, para nunca testar um build velho.
- **Estado isolado.** Cada teste abre sua primeira página com `openFresh` (`?mock-reset&scenario=…`), que restaura a semente e escolhe o cenário, e cada teste ganha um contexto de navegador novo. `openFresh` faz o papel de fixture de reset; não há fixture customizada a mais.
- **Tempo e rede.** `page.clock` controla o relógio nos testes sensíveis a tempo (latência, regressão visual); os cenários controlam latência e falhas; os eventos passam pelo `socket.io-client` real, disparados pelos controles do mock.
- **Zero skipped.** A confirmação do pedido é modal no desktop e página no mobile; o teste verifica o formato de cada projeto em vez de pular um deles.
- **Relatório e trace.** Relatório HTML em `playwright-report/`; uma falha mantém trace, screenshot e contexto de erro em `test-results/`.
- **Regressão visual** (`e2e/visual.spec.ts`, tag `@visual`): início, detalhe, carrinho e pagamento, página inteira, desktop e mobile. Dados estáveis: reset, cenário `default`, `page.clock` com data fixa (os timers continuam correndo, senão o MSW não responderia), animações desligadas, fontes e imagens carregadas (as `loading="lazy"` viram `eager` antes da captura).
  - As baselines são versionadas **sem sufixo de plataforma** (`snapshotPathTemplate`), com tolerância de 2% de pixels (`maxDiffPixelRatio`) e `threshold: 0.2`. As fontes são empacotadas, então o que muda entre sistemas é a rasterização.
  - **O que não garante:** as baselines foram geradas no Windows 11; em macOS ou Linux a portabilidade é esperada, não verificada. O README explica como regenerar a baseline local. Um deslocamento de 1 a 2 px num elemento pequeno pode passar dentro dos 2%.

## 14. Performance (Lighthouse)

`npm run lighthouse` (`scripts/lighthouse.mjs`) audita início, detalhe, carrinho e pagamento, em mobile e desktop, com 3 execuções por página e perfil e a mediana de cada categoria, LCP, CLS e TBT. Os relatórios HTML e JSON da execução mediana, mais `summary.json` e `summary.md` (notas de todas as execuções, versões e ambiente), ficam versionados em `reports/lighthouse/`.

**Condições.** Build de produção servido por `vite preview`, mocks ligados, cenário `default`. Início e detalhe como visitante; carrinho e pagamento logados, com um item no carrinho. Para ter esse estado, o script abre o Chromium do Playwright com porta de depuração, faz o login e adiciona o item, e roda o Lighthouse nesse mesmo navegador com `disableStorageReset` (o `localStorage` e o service worker guardam a sessão e o backend simulado). Como esse flag também pula a limpeza do cache HTTP, o script a faz pelo CDP antes de cada execução: toda medição é de carga fria. Nada é simplificado para melhorar a nota.

**Resultados (mediana).** Todas as páginas e perfis atingem as metas (Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90):

| Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| mobile | 98 a 99 | 100 | 100 | 100 | 1,95 a 2,10 s | ≤ 0,003 | 6 a 93 ms |
| desktop | 100 | 100 | 100 | 100 | 0,61 a 0,81 s | ≤ 0,002 | 0 a 13 ms |

A tabela por página está no README e em `reports/lighthouse/summary.md`. As medições vêm de uma única máquina local; os valores absolutos variam entre máquinas, e as notas usam o throttling simulado do Lighthouse, menos sensível a isso.

**O que a primeira auditoria encontrou (e foi corrigido no app).** O carrinho no desktop saiu com Performance 87, por CLS 0,254. A causa não era o carregamento do carrinho em si:

1. O grupo de ações do header (busca, carrinho, "Entrar") só tinha 32 px de altura enquanto a sessão estava pendente e passava a 40 px (visitante) ou 36 px (logado) quando ela resolvia. A página inteira descia 4 a 8 px. Correção: altura fixa de 40 px no grupo, mais um espaço reservado para o botão enquanto a sessão carrega.
2. O footer, visível dentro da janela enquanto o conteúdo ainda era curto, era empurrado para baixo a cada etapa (esqueleto, carrinho, cotação, prateleira). Correção: `#main` com no mínimo uma tela de altura em `md` e acima, de modo que o footer (que tem margem superior própria) começa sempre abaixo da dobra.

CLS no desktop, medido com um probe de `layout-shift` antes e depois: início 0,081 → 0,002, detalhe 0,26 → 0,0002, carrinho 0,67 → 0,024 no probe sem throttling (0,254 → 0,001 no Lighthouse).

**Outros dois problemas que a auditoria achou, também corrigidos no app.**

3. **SEO 91 a 92: `robots.txt` inválido.** O app não tinha `robots.txt`. O `vite preview` (e qualquer servidor com fallback de SPA) devolve o `index.html` para essa rota, e o Lighthouse o lê como um robots.txt com 17 erros. Correção: `public/robots.txt` válido (`User-agent: *` / `Allow: /`). No Vercel, os arquivos estáticos têm prioridade sobre o rewrite do `vercel.json`, então o arquivo é servido de verdade.
4. **Acessibilidade 97 no pagamento (desktop): `link-in-text-block`.** O link "Aplique aqui" só se distinguia do texto pela cor, o que o enunciado proíbe ("estados não dependentes apenas de cor"). Correção: sublinhado permanente.

**Margem restante.** Nenhuma categoria fica abaixo de 98. O resíduo de CLS do carrinho num probe sem throttling (cerca de 0,02) é o resumo do pedido, 28 px mais alto que o skeleton dele; não foi corrigido por estar bem abaixo do limite de 0,1 (no Lighthouse o CLS do carrinho é 0,001).

## 15. Decisões técnicas

- **MSW 2 em vez de MSW 3.** O desafio recomenda `@mswjs/socket.io-binding`. A última versão dele (0.2.0) declara `msw@^2.10.2` como peer dependency, então o projeto usa MSW 2.15. Forçar o MSW 3 (`--legacy-peer-deps`) seria uma combinação sem suporte.
- **App carregado depois que o MSW inicia.** O `engine.io-client` captura `globalThis.WebSocket` quando o módulo é avaliado. Se o app (e portanto o `socket.io-client`) fosse importado estaticamente em `main.tsx`, ele manteria o WebSocket nativo e contornaria o MSW. O `main.tsx` espera o `worker.start()` e só então faz `import('./App')`.
- **Testes contra o build de produção.** O `webServer` do Playwright roda `build` + `preview`, então os E2E exercitam o mesmo artefato que vai ao ar, com mocks.
- **Token em `localStorage`.** Limitação do ambiente simulado (ver seção 4).
- **Totais só da API.** O cliente nunca soma preço; a cotação da API é a referência para finalizar.
- **Paginação numerada em vez de scroll infinito.** A página precisa viver na URL e sobreviver a refresh e histórico.

## 16. Desvios do Figma

| Figma | Implementação | Por quê |
| --- | --- | --- |
| Coleções fora de ordem alfabética | Ordenadas A–Z (pt-BR) | Comentário no arquivo pede |
| Filtros como lista simples | Checkboxes combináveis | O enunciado exige filtros combináveis |
| Faixa de preço só com slider | Slider + campos mín/máx + Aplicar | O slider é impreciso no mobile (comentário) |
| Scroll infinito no mobile | Paginação numerada | A página vive na URL |
| FAB central de scan na tab bar | Omitido | Sem ação definida (comentário) |
| Drawer de filtros mobile não desenhado | Sheet com o mesmo painel | Necessário no mobile |
| Medalhões W/C/D | Ícones | As letras não têm significado (comentário) |
| Ícones de marcas sociais | Chips de texto (FB, IG…) | O lucide v1 removeu ícones de marcas |
| Preços com vírgula no rótulo da faixa | Ponto em todo lugar | Consistente com os demais valores em ETH |
| Tablet não desenhado | Header cabe em 768; filtros viram drawer abaixo de 1280; 3 colunas | Breakpoints sugeridos na especificação |
| Páginas editoriais, newsletter, links de ajuda do footer | Aviso honesto "não faz parte da demonstração" | Ações fora do escopo não podem parecer funcionais |
| Detalhe: galeria com várias imagens | Repete a única arte da API; sem zoom nem "Compartilhar" | A API tem uma arte por NFT |
| Detalhe: aba Avaliações não desenhada | Aviso na aba | Fora do escopo |
| Detalhe: só o botão COMPRAR no desktop | Também o botão de carrinho | Adicionar sem comprar é um fluxo obrigatório |
| Carrinho mobile: lixeira sobrepõe o "+" | Lixeira na linha do nome | Problema apontado nos comentários |
| Tab bar em carrinho, detalhe e checkout mobile | Escondida | O frame não a desenha |
| Carrinho: coluna "Edições" | Mostra o stepper; a edição vai sob o nome | Legibilidade |
| Checkout desktop: campos de carteira editáveis | Só leitura, vindos da `Wallet` cadastrada; editar fica em Perfil/Carteiras | O mesmo dado não pode ter duas fontes. "Tipo de carteira" virou a escolha da carteira cadastrada, e o rádio "Usar outra carteira?" saiu por ser redundante |
| Checkout mobile sem o form do colecionador | Form em uma coluna depois das carteiras | O enunciado exige os dados |
| Checkout mobile: menu ⋮ e "Trocar carteira" nos cards | Não feitos | Os próprios cards trocam a carteira |
| Checkout mobile (M4) só com o total | Subtotal, desconto, taxa e total, como no desktop | Sem o detalhamento, um cupom ou uma taxa nova mudam o total sem explicação |
| Detalhe: breadcrumb termina em "Mercado" | Termina no nome do NFT (`aria-current="page"`) | O breadcrumb indica onde o usuário está, como no carrinho e no pagamento |
| Confirmação: só o estado "confirmado" desenhado | Variantes "pendente" e "recusado" com o mesmo layout | Estados exigidos pelo enunciado |
| Perfil, carteiras e confirmação sem frame mobile | Uma coluna; sidebar vira abas "Dados do perfil \| Carteiras"; "Sair" no fim | O enunciado exige que funcionem no mobile |
| Nome ENS: select ".eth" + input | Campo único com o nome completo (`nome.eth`), opcional | Simplicidade; o contrato aceita `null` |
| Apelido da carteira | Opcional no perfil | Idem |
| "Igual à carteira principal" como rádio | Checkbox; ao marcar, copia os dados | Pode ser desmarcado |
| Perfil e senha em um só "Salvar" | Botões próprios ("Salvar" e "Alterar senha") | O erro de um não bloqueia o outro |
| Input "Nome de usuário" com placeholder centralizado | Alinhado à esquerda | Inconsistência do frame |
| Textos de estado não desenhados (carregando, vazio, erro, esgotado, toasts, sessão expirada, pedido em andamento) | Textos próprios, no tom do layout | Estados exigidos pelo enunciado |
| Header: só "Entrar" (estado logado não desenhado) | Nome do usuário e "Sair" | O design deixa em aberto; o logout é um fluxo obrigatório |
| Início desktop: só o ícone de busca no header | Barra de busca acima das abas; o ícone do header leva a ela | A busca textual é exigida pelo enunciado |
| Início: opções de ordenação não definidas | "Listados recentemente", "Menor preço", "Maior preço", "Mais populares" | Lista sugerida pelo `design.md` |
| Início: texto do segundo promo cortado no card | Frase completada e limitada a poucas linhas (`line-clamp`) | O texto do frame vaza do card |
| Detalhe: a descrição cita "Kurio Editions" e a meta "Kurio Apes" | O Emerald Ape #042 usa os textos do frame ao pé da letra; os demais usam a coleção de cada NFT (`description`, `details` e `contract` vêm da API) | O frame se contradiz; o NFT desenhado fica idêntico e os outros ficam coerentes |
| Detalhe, aba: "Contrato" traz os 5% de direitos e "Direitos autorais" traz o endereço | Cada rótulo com o seu conteúdo: "Contrato" mostra o endereço ERC-721 e "Direitos autorais" os 5% | Os conteúdos estão trocados no frame |
| Detalhe, aba: o parágrafo cita "1/50" | Só o Emerald Ape #042 cita a edição; os demais omitem | A edição muda com a seleção, e o texto vem da API |
| Carrinho: valores "00.00" | `0.00`, o formato de todos os valores em ETH | Inconsistência do frame (`formatEth`) |
| Pagamento: selects começam em "Selecione uma rede/carteira" | Rede e carteira principal já selecionadas | Menos cliques para o caso comum (QA manual) |
| Pagamento: só "Confirmar compra" | Etapas "Conectar carteira", "Revisar pedido" e "Confirmar compra", com "Editar dados" e "Desconectar" | Conexão da carteira e revisão antes do envio exigidas pelo enunciado (§8) |
| Pagamento: primeira opção só com o chip "METAMASK • WALLETCONNECT • COINBASE" | "WalletConnect" com o chip | A opção precisa de nome; o frame mobile mostra que é a WalletConnect |
| Pagamento e recibo: "ID do token: #0042" | "ID do token: #0042 · Edição: 1/50" | O mesmo NFT pode estar em edições diferentes |
| Perfil: sem texto de ajuda do avatar | "PNG, JPG ou WebP, até 5 MB." | O upload tem limites que o usuário precisa conhecer |
| Perfil: campos de senha sem asterisco | Com asterisco | São obrigatórios para trocar a senha |
| Carteiras: "Adicionar" ao lado de "Carteira principal" | Não feito | O formulário da principal fica sempre aberto; o link não teria ação |
| Login e cadastro: campos só com placeholder | Rótulos visíveis sobre cada campo, além dos placeholders do frame | O placeholder some ao digitar e não substitui o rótulo (acessibilidade) |
| Login: "Esqueceu a senha?", "Continuar com Google" e "Continuar com Facebook" | Presentes, com o aviso "não faz parte da demonstração" | Recuperação de senha e login social estão fora do escopo; não podem parecer funcionais |

Os ajustes de acessibilidade em relação ao layout (foco visível em todo controle, avisos `aria-live`, "Pular para o conteúdo", rótulos e erros associados) estão na seção 12.

## 17. Limitações conhecidas

- **Mocks vivem na página.** O "servidor" é o navegador: sem multiusuário real, sem concorrência entre abas e com um limite de ~5 MB de `localStorage` (o `STORAGE_FULL` cobre o estouro).
- **Socket.IO só por WebSocket** e sem salas (ver seção 9).
- **Lacuna de milissegundos** entre a primeira busca de catálogo e a primeira conexão do socket (seção 9).
- **Regressão visual** validada apenas no Windows 11 (seção 13).
- **A altura total do detalhe muda** quando os dados chegam, porque o conteúdo abaixo da dobra só aparece depois; a imagem e o topo da página não se mexem.
- Perfis, carteiras e pagamentos são simulados; integrações reais (blockchain, extensões de carteira, gateways) estão fora do escopo do desafio.
