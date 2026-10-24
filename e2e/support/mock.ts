import { expect, type Page } from '@playwright/test'

type MockControls = {
  reset: () => Promise<void>
  setScenario: (name: string) => void
  getScenario: () => string
  expireSessions: () => void
  updateNft: (nftId: string, changes: NftChanges) => void
  dropConnections: () => void
  settlePendingOrders: () => void
  receivedEvents: () => ReceivedEvent[]
}

export type ReceivedEvent = { event: string; payload: { resourceId?: string }; at: string }

type NftChanges = { price?: string; editions?: { id: string; available: number }[] }

export const users = {
  nova: { email: 'nova@kurio.test', password: 'Kurio@2026', displayName: 'Nova Sato' },
  leo: { email: 'leo@kurio.test', password: 'Kurio@2026', displayName: 'Leo Arcos' },
} as const

/** Opens a path with fresh mock data (and optionally a scenario). */
export async function openFresh(page: Page, path: string, scenario = 'default') {
  const url = new URL(path, 'http://placeholder')
  url.searchParams.set('mock-reset', '')
  url.searchParams.set('scenario', scenario)
  await page.goto(`${url.pathname}${url.search}`)
}

export async function mockControls(page: Page, action: 'reset' | 'expireSessions') {
  await page.evaluate(
    (name) => (window as unknown as { __kurioMock: MockControls }).__kurioMock[name](),
    action,
  )
}

export async function login(page: Page, user: { email: string; password: string }) {
  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel(/^Senha\*?$/).fill(user.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768

/** Desktop shows the name in the header; mobile labels the tab bar profile link with it. */
export async function expectSignedIn(page: Page, displayName: string) {
  await expect(page.getByRole('link', { name: new RegExp(displayName) })).toBeVisible()
}

export async function expectSignedOut(page: Page) {
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
}

export async function openProfile(page: Page, displayName: string) {
  await page.getByRole('link', { name: new RegExp(displayName) }).click()
}

/** Header button on desktop, profile page button on mobile (no header there). */
export async function logout(page: Page, displayName: string) {
  if (isMobile(page)) await openProfile(page, displayName)
  // The profile page also has "Sair" in its sidebar (desktop): any of them logs out.
  await page.getByRole('button', { name: 'Sair' }).first().click()
}

export async function openCart(page: Page) {
  await page.getByRole('link', { name: /^Carrinho/ }).click()
}

export async function setScenario(page: Page, name: string) {
  await page.evaluate((scenario) => (window as unknown as { __kurioMock: MockControls }).__kurioMock.setScenario(scenario), name)
}

/** Sidebar on desktop, drawer on mobile. */
export async function openFilters(page: Page) {
  if (isMobile(page)) {
    await page.getByRole('button', { name: /^Filtros/ }).click()
    return page.getByRole('dialog', { name: 'Filtros' })
  }
  return page.getByRole('complementary', { name: 'Filtros' })
}

export async function closeFilters(page: Page) {
  if (isMobile(page)) await page.keyboard.press('Escape')
}

export async function selectSort(page: Page, option: string) {
  await page.getByRole('combobox', { name: /Ordenar por/ }).click()
  await page.getByRole('option', { name: option }).click()
}

/** Opens the filters (drawer on mobile), runs the actions and closes them again. */
export async function withFilters(page: Page, actions: (scope: Awaited<ReturnType<typeof openFilters>>) => Promise<void>) {
  const scope = await openFilters(page)
  await actions(scope)
  await closeFilters(page)
}

/** Edition chips hide their radio input; the visible target is the label. */
export async function selectEdition(page: Page, label: string) {
  await page.locator('label', { hasText: label }).click()
  await expect(page.getByRole('radio', { name: new RegExp('^' + label.replace('/', '[/]') + ' ') })).toBeChecked()
}

/** Changes an NFT in the mock backend, which broadcasts `nft.updated` through the socket. */
export async function updateNft(page: Page, nftId: string, changes: NftChanges) {
  await page.evaluate(
    ([id, value]) => (window as unknown as { __kurioMock: MockControls }).__kurioMock.updateNft(id, value),
    [nftId, changes] as const,
  )
}

/** Drops the socket and changes the NFT while the client is offline, so no event is delivered. */
export async function updateNftWhileDisconnected(page: Page, nftId: string, changes: NftChanges) {
  await page.evaluate(
    ([id, value]) => {
      const mock = (window as unknown as { __kurioMock: MockControls }).__kurioMock
      mock.dropConnections()
      mock.updateNft(id, value)
    },
    [nftId, changes] as const,
  )
}

/** The primary wallet comes selected: a select on desktop, a card on mobile. */
export async function expectPrimaryWallet(page: Page) {
  if (isMobile(page)) await expect(page.getByRole('radio', { name: /Principal/ })).toBeChecked()
  else await expect(page.getByLabel('Tipo de carteira')).toHaveValue(/primary/)
}

/** Checkout: connect the selected wallet and open the review step. */
export async function connectAndReview(page: Page) {
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText(/conectada ·/)).toBeVisible()
  await page.getByRole('button', { name: 'Revisar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Revise seu pedido' })).toBeFocused()
}

/** Orders of the logged-in user, read from the API like the app does. */
export async function listOrders(page: Page): Promise<{ id: string; status: string }[]> {
  return page.evaluate(async () => {
    const response = await fetch('/api/orders', { headers: { Authorization: `Bearer ${localStorage.getItem('kurio.token')}` } })
    return (await response.json()) as { id: string; status: string }[]
  })
}

/** Settles every pending order now: the mock emits `order.updated` to the owner's sockets. */
export async function settlePendingOrders(page: Page) {
  await page.evaluate(() => (window as unknown as { __kurioMock: MockControls }).__kurioMock.settlePendingOrders())
}

/** Events received by the app's socket.io-client since the page loaded (mock-only probe). */
export async function receivedEvents(page: Page): Promise<ReceivedEvent[]> {
  return page.evaluate(() => (window as unknown as { __kurioMock: MockControls }).__kurioMock.receivedEvents())
}

/** Waits until the client received an event of this type for this resource. */
export async function expectEventReceived(page: Page, event: string, resourceId: string) {
  await expect
    .poll(async () => (await receivedEvents(page)).some((e) => e.event === event && e.payload.resourceId === resourceId))
    .toBe(true)
}

/** One Emerald Ape (1/50) in the cart, then the checkout as Nova (login on the way). */
export async function checkoutAsNova(page: Page, scenario = 'default') {
  await openFresh(page, '/nfts/emerald-ape-042', scenario)
  await selectEdition(page, '1/50')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Emerald Ape #042 adicionado ao carrinho')).toBeVisible()
  await page.goto('/checkout')
  await login(page, users.nova)
  await expect(page).toHaveURL('/checkout')
  await expect(page.getByTestId('summary-total')).toHaveText('1.206 ETH')
}

/** Checkout as Nova until the order page; returns the order id. */
export async function buyAsNova(page: Page, scenario = 'default'): Promise<string> {
  await checkoutAsNova(page, scenario)
  await connectAndReview(page)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/orders\/order-/)
  return page.url().split('/orders/')[1]
}

/** Desktop shows the order in a modal: closing it goes to Início. Mobile has a page. */
export async function leaveOrder(page: Page) {
  if (isMobile(page)) return
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()
  await expect(page).toHaveURL('/')
}
