import { expect, test, type Page } from '@playwright/test'
import { openFresh } from './support/mock'

async function healthScenario(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const response = await fetch('/api/health')
    return ((await response.json()) as { scenario: string }).scenario
  })
}

test('scenario is selected from the URL, persists on reload and is removed from the URL', async ({ page }) => {
  await page.goto('/?scenario=slow&mock-reset')
  await expect(page.getByRole('list', { name: 'NFTs' })).toBeVisible()

  expect(new URL(page.url()).search).toBe('')
  expect(await healthScenario(page)).toBe('slow')

  await page.reload()
  await expect(page.getByRole('list', { name: 'NFTs' })).toBeVisible()
  expect(await healthScenario(page)).toBe('slow')
})

test('API requests still reach the mocks after the browser stops the Service Worker', async ({ page }) => {
  await openFresh(page, '/nfts/emerald-ape-042')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Emerald Ape #042 adicionado ao carrinho')).toBeVisible()

  // What Chrome does to an idle worker: the restarted worker forgets its active clients.
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('ServiceWorker.enable')
  await cdp.send('ServiceWorker.stopAllWorkers')

  // GET /api/cart and POST /api/quote are still answered by MSW, not by the host.
  // The toast action is the way to the cart on the mobile detail page (no tab bar there).
  await page.getByRole('button', { name: 'Ver carrinho' }).click()
  await expect(page.getByTestId('summary-subtotal')).toHaveText('1.19 ETH')
})

test('unknown scenarios are ignored and the app still boots', async ({ page }) => {
  await page.goto('/?scenario=does-not-exist')
  await expect(page.getByRole('list', { name: 'NFTs' })).toBeVisible()
  expect(await healthScenario(page)).toBe('default')
})
