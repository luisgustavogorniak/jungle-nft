import { expect, test, type Page } from '@playwright/test'
import { login, openFresh, selectEdition, users } from './support/mock'

const favorite = (page: Page) => page.getByRole('button', { name: /^Favoritar/ })

test.describe('detail', () => {
  test('preselects the first edition in stock and limits the quantity to it', async ({ page }) => {
    await openFresh(page, '/nfts/emerald-ape-042')
    // Emerald Ape has the 1/1 edition with a single unit: it is chosen, and "+" stops at 1.
    await expect(page.getByRole('radio', { name: /^1[/]1 / })).toBeChecked()
    await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
    await selectEdition(page, '1/50')
    await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeEnabled()
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
    await expect(favorite(page)).toHaveAttribute('aria-pressed', 'false')

    const saved = page.waitForResponse((r) => r.url().includes('/api/favorites/') && r.request().method() === 'PUT')
    await favorite(page).click()
    await expect(favorite(page)).toHaveAttribute('aria-pressed', 'true')
    await saved
    await page.reload()
    await expect(favorite(page)).toHaveAttribute('aria-pressed', 'true')

    await page.goto('/favorites')
    await expect(page.getByRole('list', { name: 'Favoritos' }).getByRole('link', { name: /Golden Signal #160/ })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Favoritos' }).getByRole('link', { name: /Golden Beat #207/ })).toBeVisible()
  })

  test('rolls the heart back and warns when the API fails', async ({ page }) => {
    await openFresh(page, '/nfts/golden-signal-160', 'favorites-error')
    await favorite(page).click()
    await login(page, users.leo)
    await expect(favorite(page)).toHaveAttribute('aria-pressed', 'false')

    await favorite(page).click()
    await expect(page.getByText(/Não foi possível favoritar/)).toBeVisible()
    await expect(favorite(page)).toHaveAttribute('aria-pressed', 'false')
  })
})
