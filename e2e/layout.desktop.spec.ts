import { expect, test, type Page } from '@playwright/test'
import { buyAsNova, openFresh } from './support/mock'

// Desktop project only (see playwright.config.ts): the widths are set by each test.

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
    test(`no main screen overflows horizontally at ${width}px`, async ({ page }) => {
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
})
