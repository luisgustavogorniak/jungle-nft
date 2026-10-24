import { expect, type Page } from '@playwright/test'

type MockControls = {
  reset: () => Promise<void>
  setScenario: (name: string) => void
  getScenario: () => string
  expireSessions: () => void
  updateNft: (nftId: string, changes: NftChanges) => void
  dropConnections: () => void
}

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
  await page.getByLabel('Senha').fill(user.password)
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
  await page.getByRole('button', { name: 'Sair' }).click()
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
