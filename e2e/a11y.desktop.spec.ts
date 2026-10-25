import { expect, test } from '@playwright/test'
import { openFresh } from './support/mock'

// Desktop project only (see playwright.config.ts): on mobile, login is a page, not a modal.
test.describe('keyboard and focus (desktop)', () => {
  test('closing the login modal returns the focus to the control that opened it', async ({ page }) => {
    await openFresh(page, '/')
    const opener = page.getByRole('banner').getByRole('link', { name: 'Entrar' })
    const dialog = page.getByRole('dialog', { name: 'Entrar' })

    await opener.focus()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL('/')
    await expect(opener).toBeFocused()

    await opener.focus()
    await page.keyboard.press('Enter')
    await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })
})
