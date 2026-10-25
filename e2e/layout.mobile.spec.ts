import { expect, test } from '@playwright/test'
import { openFresh, selectEdition } from './support/mock'

// Mobile project only (see playwright.config.ts).
test.describe('mobile layout', () => {
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
