import { expect, test } from '@playwright/test'

test('app boots with MSW serving REST and Socket.IO', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('api-status')).toHaveText('API: ok')
  await expect(page.getByTestId('realtime-status')).toHaveText('Realtime: realtime online')
})
