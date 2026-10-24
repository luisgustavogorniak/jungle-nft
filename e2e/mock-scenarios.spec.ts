import { expect, test, type Page } from '@playwright/test'

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

test('unknown scenarios are ignored and the app still boots', async ({ page }) => {
  await page.goto('/?scenario=does-not-exist')
  await expect(page.getByRole('list', { name: 'NFTs' })).toBeVisible()
  expect(await healthScenario(page)).toBe('default')
})
