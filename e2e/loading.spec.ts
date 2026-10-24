import { expect, test } from '@playwright/test'
import { openFresh, setScenario } from './support/mock'

const NFT_PATH = '/nfts/emerald-ape-042'

test.describe('loading, failure and recovery', () => {
  test('the detail shows a skeleton while loading and swaps it for the NFT', async ({ page }) => {
    // The mock delays every response by 2.5-3.5 s; the fake clock plays that time without waiting for it.
    await page.clock.install()
    await openFresh(page, NFT_PATH, 'slow')

    const loading = page.getByRole('status', { name: 'Carregando NFT' })
    await expect(loading).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toHaveCount(0)

    await page.clock.runFor(4000)
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await expect(loading).toHaveCount(0)
  })

  test('the skeleton keeps the artwork where it will be: nothing moves when the NFT arrives', async ({ page }) => {
    await openFresh(page, NFT_PATH, 'slow')
    const loading = page.getByRole('status', { name: 'Carregando NFT' })
    await expect(loading).toBeVisible()

    // The artwork is the only square block of the skeleton (the thumbnails are 100px, the rest are bars).
    const box = (selector: string, pick: 'square' | 'widest') =>
      page.evaluate(
        ([css, mode]) => {
          const rects = Array.from(document.querySelectorAll(css)).map((node) => {
            const { x, y, width, height } = node.getBoundingClientRect()
            return { x, y, width, height }
          })
          const candidates = mode === 'square' ? rects.filter((r) => Math.abs(r.width - r.height) < 6 && r.width > 200) : rects
          return candidates.sort((a, b) => b.width - a.width)[0]
        },
        [selector, pick] as const,
      )
    const placeholder = await box('[data-slot="skeleton"]', 'square')

    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible({ timeout: 10_000 })
    const artwork = await box('main img', 'widest')

    // Position and size, on both viewports (1px of slack for sub-pixel layout).
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(artwork[key] - placeholder[key]), key).toBeLessThanOrEqual(1)
    }
  })

  test('the shimmer is a loop by default and stops under reduced motion', async ({ page }) => {
    const shimmer = async () => {
      const block = page.getByRole('status', { name: 'Carregando NFT' }).locator('[data-slot="skeleton"]:visible').first()
      await expect(block).toBeVisible()
      return block.evaluate((node) => {
        const style = getComputedStyle(node)
        return { seconds: parseFloat(style.animationDuration), iterations: style.animationIterationCount }
      })
    }

    await openFresh(page, NFT_PATH, 'slow')
    expect(await shimmer()).toEqual({ seconds: 1.6, iterations: 'infinite' })

    // The preference squeezes the animation into a single, instantaneous run.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const reduced = await shimmer()
    expect(reduced.seconds).toBeLessThan(0.001)
    expect(reduced.iterations).toBe('1')
  })

  test('the cart summary shows a skeleton while the quote loads', async ({ page }) => {
    await openFresh(page, NFT_PATH)
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await expect(page.getByText('Emerald Ape #042 adicionado ao carrinho')).toBeVisible()

    await setScenario(page, 'slow')
    await page.goto('/cart')

    const loading = page.getByRole('status', { name: 'Carregando carrinho' })
    await expect(loading).toBeVisible()
    await expect(page.getByTestId('summary-total')).toHaveCount(0)

    await expect(page.getByTestId('summary-total')).toBeVisible({ timeout: 15_000 })
    await expect(loading).toHaveCount(0)
  })

  test('a failing detail shows the error and recovers with a retry', async ({ page }) => {
    await openFresh(page, NFT_PATH, 'server-error')
    await expect(page.getByRole('heading', { name: 'Não foi possível carregar o NFT' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('alert')).toBeVisible()

    await setScenario(page, 'default')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()

    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})
