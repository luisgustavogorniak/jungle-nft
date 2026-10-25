import { expect, test, type Page } from '@playwright/test'
import { buyAsNova, openFresh, selectEdition } from './support/mock'

/** Tablet and small laptop widths, where the desktop layout starts and is tightest. */
const widths = [768, 1024]

async function expectNoHorizontalOverflow(page: Page, path: string) {
  // Measured on the loaded screen, not on its skeleton.
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('status', { name: /^Carregando/ })).toHaveCount(0)
  await expect
    .poll(
      () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      { message: `${path} overflows horizontally` },
    )
    .toBeLessThanOrEqual(0)
}

test.describe('layout', () => {
  for (const width of widths) {
    test(`no main screen overflows horizontally at ${width}px`, async ({ page, isMobile }) => {
      test.skip(isMobile, 'the width is set here, so the desktop project is enough')
      await page.setViewportSize({ width, height: 900 })
      // Buying as Nova logs in and leaves an order to open.
      const orderId = await buyAsNova(page)
      const paths = [`/orders/${orderId}`, '/', '/nfts/emerald-ape-042', '/cart', '/checkout', '/favorites', '/profile', '/profile/wallets']
      for (const path of paths) {
        await page.goto(path)
        await expectNoHorizontalOverflow(page, path)
      }

      // Public screens, as a visitor.
      for (const path of ['/login', '/register', '/nfts/unknown-nft']) {
        await openFresh(page, path)
        await expectNoHorizontalOverflow(page, path)
      }
    })
  }

  test.describe('mobile', () => {
    test.skip(({ isMobile }) => !isMobile, 'mobile layout only')

    test('the catalog tabs fit a 390px screen without scrolling sideways', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await openFresh(page, '/')
      const tabs = page.getByRole('tablist').first()
      await expect(tabs).toBeVisible()
      expect(await tabs.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0)
    })

    test('the toast of the detail does not cover "Comprar NFT"', async ({ page }) => {
      await openFresh(page, '/nfts/emerald-ape-042')
      await selectEdition(page, '1/50')
      await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
      const toast = page.locator('[data-sonner-toast]').filter({ hasText: 'adicionado ao carrinho' })
      await expect(toast).toBeVisible()
      // Wait for the enter animation to finish before measuring.
      await expect.poll(() => toast.getAttribute('data-mounted')).toBe('true')
      await page.waitForTimeout(500)
      const toastBox = (await toast.boundingBox())!
      const buyBox = (await page.getByRole('button', { name: 'Comprar NFT' }).boundingBox())!
      expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(buyBox.y)
    })

    test('the last cart item can scroll clear of the fixed summary', async ({ page }) => {
      await openFresh(page, '/nfts/emerald-ape-042')
      await selectEdition(page, '1/50')
      await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
      await page.getByRole('button', { name: 'Ver carrinho' }).click()
      const items = page.getByRole('list', { name: 'Itens do carrinho' })
      await expect(items.getByRole('listitem')).toHaveCount(1)
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      const last = (await items.getByRole('listitem').last().boundingBox())!
      const summary = (await page.getByRole('region', { name: 'Resumo da carteira' }).boundingBox())!
      expect(last.y + last.height).toBeLessThanOrEqual(summary.y)
    })
  })
})
