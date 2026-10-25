import { expect, test, type Page } from '@playwright/test'
import { login, openFresh, selectEdition, updateNft, users } from './support/mock'

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768

/** Desktop: the text button, whose label says the next action. Mobile: the heart over the artwork. */
const favorite = (page: Page) => page.getByRole('button', { name: /^(Favoritar|Remover dos favoritos)/ })

/** The text button changes its label; the heart keeps "Favoritar <name>" and uses aria-pressed. */
async function expectFavorite(page: Page, on: boolean) {
  if (isMobile(page)) await expect(favorite(page)).toHaveAttribute('aria-pressed', String(on))
  else await expect(favorite(page)).toHaveText(on ? 'Remover dos favoritos' : 'Favoritar')
}

test.describe('detail', () => {
  test('preselects 1/50, as in the layout, and limits the quantity to the edition stock', async ({ page }) => {
    await openFresh(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('radio', { name: /^1[/]50 / })).toBeChecked()
    if (!isMobile(page)) {
      await expect(page.getByRole('navigation', { name: 'Você está em' })).toContainText('Mercado / Emerald Ape #042')
    }
    await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeEnabled()
    // Emerald Ape has the 1/1 edition with a single unit: "+" stops at 1.
    await selectEdition(page, '1/1')
    await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
  })

  test('falls back to the first edition in stock when 1/50 sells out', async ({ page }) => {
    await openFresh(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('radio', { name: /^1[/]50 / })).toBeChecked()
    await updateNft(page, 'emerald-ape-042', { editions: [{ id: '1-50', available: 0 }] })
    await expect(page.getByRole('radio', { name: '1/1 (1 disponível)' })).toBeChecked()
  })

  test('shows the main purchase actions enabled without extra steps', async ({ page }) => {
    await openFresh(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeEnabled()
  })
})

test.describe('favorites', () => {
  test('sends a visitor to login and comes back to the NFT', async ({ page }) => {
    await openFresh(page, '/nfts/golden-signal-160')
    await favorite(page).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fnfts%2Fgolden-signal-160/)
    await login(page, users.leo)
    await expect(page).toHaveURL('/nfts/golden-signal-160')
  })

  test('persists across reload and shows in the favorites page', async ({ page }) => {
    await openFresh(page, '/nfts/golden-signal-160')
    await favorite(page).click()
    await login(page, users.leo)
    await expectFavorite(page, false)

    const saved = page.waitForResponse((r) => r.url().includes('/api/favorites/') && r.request().method() === 'PUT')
    await favorite(page).click()
    await expectFavorite(page, true)
    await saved
    await page.reload()
    await expectFavorite(page, true)

    await page.goto('/favorites')
    await expect(page.getByRole('list', { name: 'Favoritos' }).getByRole('link', { name: /Golden Signal #160/ })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Favoritos' }).getByRole('link', { name: /Golden Beat #207/ })).toBeVisible()
  })

  test('rolls the heart back and warns when the API fails', async ({ page }) => {
    await openFresh(page, '/nfts/golden-signal-160', 'favorites-error')
    await favorite(page).click()
    await login(page, users.leo)
    await expectFavorite(page, false)

    await favorite(page).click()
    await expect(page.getByText(/Não foi possível favoritar/)).toBeVisible()
    await expectFavorite(page, false)
  })
})
