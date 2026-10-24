import { expect, test } from '@playwright/test'
import { openFresh } from './support/mock'

test('app boots with MSW serving the catalog', async ({ page }) => {
  await openFresh(page, '/')

  const items = page.getByRole('list', { name: 'NFTs' }).getByRole('listitem')
  await expect(items).toHaveCount(9)
  await expect(items.first()).toContainText('Emerald Ape #042')
  await expect(items.first()).toContainText('1.19 ETH')
})
