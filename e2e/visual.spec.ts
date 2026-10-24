import { expect, test, type Page } from '@playwright/test'
import { checkoutAsNova, openFresh } from './support/mock'

// Visual regression of the four screens the challenge names. Baselines live in
// e2e/__screenshots__ and are shared by every OS (see playwright.config.ts).

/**
 * Everything that paints is in: fonts loaded and every image decoded. Lazy images below the
 * fold never load on their own in a full-page capture, so they are made eager first.
 */
async function settled(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    const images = Array.from(document.images)
    for (const image of images) image.loading = 'eager'
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)))
  })
}

test.describe('visual regression @visual', () => {
  test.beforeEach(async ({ page }) => {
    // Same "now" in every run; timers keep ticking so the mocked network still answers.
    await page.clock.install({ time: new Date('2026-10-24T12:00:00Z') })
  })

  test('home', async ({ page }) => {
    await openFresh(page, '/')
    await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
    await settled(page)
    await expect(page).toHaveScreenshot('home.png', { fullPage: true })
  })

  test('nft detail', async ({ page }) => {
    await openFresh(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await settled(page)
    await expect(page).toHaveScreenshot('detail.png', { fullPage: true })
  })

  test('cart', async ({ page }) => {
    await openFresh(page, '/nfts/emerald-ape-042')
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await expect(page.getByText('Emerald Ape #042 adicionado ao carrinho')).toBeVisible()
    await page.goto('/cart')
    await expect(page.getByTestId('summary-total')).toBeVisible()
    await settled(page)
    await expect(page).toHaveScreenshot('cart.png', { fullPage: true })
  })

  test('payment', async ({ page }) => {
    await checkoutAsNova(page)
    await settled(page)
    await expect(page).toHaveScreenshot('payment.png', { fullPage: true })
  })
})
