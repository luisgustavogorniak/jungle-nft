import { expect, test } from '@playwright/test'
import { expectSignedIn, expectSignedOut, login, logout, mockControls, openFresh, openProfile, users } from './support/mock'

test.describe('account and session', () => {
  test('logs in, survives a refresh and logs out', async ({ page }) => {
    await openFresh(page, '/login')
    await login(page, users.nova)

    await expect(page).toHaveURL('/')
    await expectSignedIn(page, users.nova.displayName)

    await page.reload()
    await expectSignedIn(page, users.nova.displayName)

    await logout(page, users.nova.displayName)
    await expectSignedOut(page)
  })

  test('shows field validation and wrong credentials errors', async ({ page }) => {
    await openFresh(page, '/login')
    const form = page.getByRole('form', { name: 'Entrar' })

    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Informe um e-mail válido')).toBeVisible()
    await expect(page.getByLabel('E-mail')).toBeFocused()

    await login(page, { ...users.nova, password: 'wrong-password' })
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos')
    await expect(page).toHaveURL(/\/login/)
  })

  test('register handles conflicts returned by the API and then creates the account', async ({ page }) => {
    await openFresh(page, '/register')

    await page.getByLabel('Nome de usuário').fill('novasato')
    await page.getByLabel('E-mail').fill(users.nova.email)
    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill('Secret#123')
    await page.getByLabel('Confirmar senha').fill('Secret#123')
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page.getByText('Este e-mail já está cadastrado')).toBeVisible()
    await expect(page.getByText('Este nome de usuário já está em uso')).toBeVisible()

    await page.getByLabel('Nome de usuário').fill('marina')
    await page.getByLabel('E-mail').fill('marina@kurio.test')
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expectSignedIn(page, 'marina')
  })

  test('register validates password confirmation on the client', async ({ page }) => {
    await openFresh(page, '/register')
    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill('Secret#123')
    await page.getByLabel('Confirmar senha').fill('Different#1')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByText('As senhas não coincidem')).toBeVisible()
  })

  test('private route redirects to login and returns after authenticating', async ({ page }) => {
    await openFresh(page, '/profile')

    await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/)
    await login(page, users.nova)

    await expect(page).toHaveURL('/profile')
    await expect(page.getByTestId('profile')).toContainText(users.nova.email)
  })

  test('expired session redirects to login keeping the context to resume', async ({ page }) => {
    await openFresh(page, '/login')
    await login(page, users.nova)
    await expectSignedIn(page, users.nova.displayName)

    await mockControls(page, 'expireSessions')
    await openProfile(page, users.nova.displayName)

    await expect(page).toHaveURL(/\/login\?.*redirect=%2Fprofile.*reason=expired/)
    await expect(page.getByRole('status').filter({ hasText: 'Sua sessão expirou' })).toBeVisible()
    await expectSignedOut(page)

    await login(page, users.nova)
    await expect(page).toHaveURL('/profile')
  })

  test('switching users never shows data from the previous one', async ({ page }) => {
    await openFresh(page, '/login?redirect=%2Fprofile')
    await login(page, users.nova)
    await expect(page.getByTestId('profile')).toContainText(users.nova.email)

    // Navigating right after the click: the logout must not depend on the request finishing.
    await logout(page, users.nova.displayName)
    await page.goto('/login?redirect=%2Fprofile')
    await login(page, users.leo)

    await expect(page.getByTestId('profile')).toContainText(users.leo.email)
    await expect(page.getByText(users.nova.email)).toHaveCount(0)
  })

  test('rejects external redirect targets after login', async ({ page }) => {
    await openFresh(page, '/login?redirect=%2F%2Fevil.example')
    await login(page, users.nova)
    await expect(page).toHaveURL('/')
  })
})
