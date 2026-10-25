import { expect, test } from '@playwright/test'
import { openFresh, selectSort, setScenario, withFilters } from './support/mock'

const items = (page: import('@playwright/test').Page) => page.getByRole('list', { name: 'NFTs' }).getByRole('listitem')
const count = (page: import('@playwright/test').Page) => page.getByRole('status').filter({ hasText: /NFTs? encontrados?/ })

test.describe('catalog', () => {
  test('combines filters, sorting and pagination in the URL and restores them with the history', async ({ page }) => {
    await openFresh(page, '/')
    await expect(items(page)).toHaveCount(9)
    await expect(count(page)).toContainText('36 NFTs encontrados')

    // Page 2 of the whole catalog.
    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(items(page).first()).not.toContainText('Emerald Ape #042')

    // Changing a filter restarts pagination.
    await withFilters(page, (filters) => filters.getByRole('checkbox', { name: /^Música/ }).click())
    await expect(page).toHaveURL(/categories=music/)
    await expect(page).not.toHaveURL(/page=/)
    await expect(count(page)).toContainText('4 NFTs encontrados')

    // Filters compose.
    await withFilters(page, (filters) => filters.getByRole('checkbox', { name: /^Ethereum/ }).click())
    await expect(page).toHaveURL(/categories=music.*networks=ethereum/)
    await expect(count(page)).toContainText('2 NFTs encontrados')

    await selectSort(page, 'Menor preço')
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(items(page).first()).toContainText('Echo Chamber #319')
    await expect(items(page).nth(1)).toContainText('Golden Beat #207')

    // Refresh keeps everything.
    await page.reload()
    await expect(items(page)).toHaveCount(2)
    await expect(items(page).first()).toContainText('Echo Chamber #319')

    // History walks back through each change.
    await page.goBack()
    await expect(page).not.toHaveURL(/sort=/)
    await expect(items(page).first()).toContainText('Golden Beat #207')
    await page.goBack()
    await expect(count(page)).toContainText('4 NFTs encontrados')
    await page.goBack()
    await expect(page).toHaveURL(/page=2/)
    await expect(count(page)).toContainText('36 NFTs encontrados')
  })

  test('searches by text and shows the empty state with a way out', async ({ page }) => {
    await openFresh(page, '/')
    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('ape')
    await expect(page).toHaveURL(/q=ape/)
    await expect(count(page)).toContainText('2 NFTs encontrados')

    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('zzzz')
    await expect(page.getByText('Nenhum NFT encontrado.')).toBeVisible()
    await page.getByTestId('empty-state').getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(items(page)).toHaveCount(9)
    await expect(page.getByRole('searchbox', { name: 'Buscar NFTs' })).toHaveValue('')
  })

  test('applies a price range', async ({ page }) => {
    await openFresh(page, '/')
    await withFilters(page, async (filters) => {
      await filters.getByLabel('Mínimo (ETH)').fill('2.00')
      await filters.getByLabel('Máximo (ETH)').fill('3.00')
      await filters.getByRole('button', { name: 'Aplicar' }).click()
    })
    await expect(page).toHaveURL(/minPrice=2\.00.*maxPrice=3\.00/)
    await expect(count(page)).toContainText('3 NFTs encontrados')

    await withFilters(page, async (filters) => {
      await filters.getByLabel('Mínimo (ETH)').fill('5')
      await filters.getByLabel('Máximo (ETH)').fill('1')
      await filters.getByRole('button', { name: 'Aplicar' }).click()
      await expect(filters.getByRole('alert')).toHaveText('O mínimo não pode ser maior que o máximo')
    })
  })

  test('ignores invalid URL params instead of breaking', async ({ page }) => {
    await openFresh(page, '/?page=abc&categories=foo&sort=cheapest')
    await expect(items(page)).toHaveCount(9)
  })

  test('shows the empty catalog scenario', async ({ page }) => {
    await openFresh(page, '/', 'empty-catalog')
    await expect(page.getByText('Nenhum NFT encontrado.')).toBeVisible()
  })

  test('discards out-of-order responses: the last choice wins', async ({ page }) => {
    // First catalog response takes 1.5 s, the next one 0.1 s.
    await openFresh(page, '/', 'out-of-order')
    await selectSort(page, 'Menor preço')
    await expect(items(page).first()).toContainText('Rust Garden #126')

    // Give the slow, older response time to arrive: it must not replace the newer one.
    await page.waitForTimeout(2000)
    await expect(items(page).first()).toContainText('Rust Garden #126')
  })

  test('shows skeletons while loading slowly', async ({ page }) => {
    await openFresh(page, '/', 'slow')
    await expect(page.getByLabel('Carregando NFTs')).toBeVisible()
    await expect(items(page)).toHaveCount(9, { timeout: 10_000 })
    await expect(page.getByLabel('Carregando NFTs')).toHaveCount(0)
  })

  test('shows the failure and recovers with a retry', async ({ page }) => {
    await openFresh(page, '/', 'server-error')
    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo.' })
    await expect(alert).toBeVisible({ timeout: 15_000 })

    await setScenario(page, 'default')
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(items(page)).toHaveCount(9)
    await expect(alert).toHaveCount(0)
  })

  test('puts the search before the hero on mobile and inside the catalog on desktop', async ({ page }, testInfo) => {
    await openFresh(page, '/')
    const search = page.getByRole('searchbox', { name: 'Buscar NFTs' })
    await expect(search).toHaveCount(1)
    const hero = page.getByRole('heading', { level: 1 })
    const [searchBox, heroBox] = [await search.boundingBox(), await hero.boundingBox()]
    if (testInfo.project.name === 'mobile') expect(searchBox!.y).toBeLessThan(heroBox!.y)
    else expect(searchBox!.y).toBeGreaterThan(heroBox!.y)
  })

  test('the tab bar "Explorar" button focuses the search', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the tab bar only exists on mobile')
    await openFresh(page, '/')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.getByRole('button', { name: 'Explorar' }).click()
    await expect(page.getByRole('searchbox', { name: 'Buscar NFTs' })).toBeFocused()
  })
})
