import { expect, test, type Page } from '@playwright/test'
import { expectSignedIn, login, logout, openFresh, users } from './support/mock'

// 1x1 PNG: enough for the avatar pipeline (decode, crop, resize, re-encode).
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

async function openAs(page: Page, user: typeof users.nova | typeof users.leo, path: string) {
  await openFresh(page, `/login?redirect=${encodeURIComponent(path)}`)
  await login(page, user)
  await expect(page).toHaveURL(path)
}

test.describe('profile', () => {
  test('edits the data, updates the header name and keeps it after refresh', async ({ page }) => {
    await openAs(page, users.nova, '/profile')

    await page.getByLabel('Nome de exibição').fill('Nova S.')
    await page.getByLabel('Nome ENS').fill('nova.s.eth')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Perfil atualizado')).toBeVisible()
    await expectSignedIn(page, 'Nova S.')

    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Nova S.')
    await expect(page.getByLabel('Nome ENS')).toHaveValue('nova.s.eth')
  })

  test('shows validation and API errors on the fields', async ({ page }) => {
    await openAs(page, users.nova, '/profile')
    // The form shows the loaded profile before anything is typed into it.
    await expect(page.getByLabel('E-mail')).toHaveValue('nova@kurio.test')

    // Client validation.
    await page.getByLabel('E-mail').fill('not-an-email')
    await page.getByLabel('Nome ENS').fill('nova.com')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Use um nome terminado em .eth')).toBeVisible()

    // The API refuses a username that belongs to another account.
    await page.getByLabel('E-mail').fill('nova@kurio.test')
    await page.getByLabel('Nome ENS').fill('nova.kurio.eth')
    await page.getByLabel('Nome de usuário').fill('leoarcos')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Este nome de usuário já está em uso')).toBeVisible()

    await page.reload()
    await expect(page.getByLabel('Nome de usuário')).toHaveValue('novasato')
  })

  test('sets, rejects and removes the avatar', async ({ page }) => {
    await openAs(page, users.nova, '/profile')
    const avatar = page.getByRole('img', { name: 'Seu avatar' })
    const chooser = page.getByLabel('Escolher imagem do avatar')

    await chooser.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
    await expect(page.getByRole('alert').filter({ hasText: 'Use uma imagem PNG, JPG ou WebP.' })).toBeVisible()
    await expect(avatar).toHaveCount(0)

    await chooser.setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: png })
    await expect(avatar).toBeVisible()
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Perfil atualizado')).toBeVisible()
    // Stored resized and as a data URL: small enough for the mock database.
    const src = await avatar.getAttribute('src')
    expect(src).toMatch(/^data:image\/(webp|jpeg);base64,/)
    expect(src!.length).toBeLessThan(100_000)

    await page.reload()
    await expect(avatar).toBeVisible()

    await page.getByRole('button', { name: 'Remover' }).click()
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Perfil atualizado')).toBeVisible()
    await page.reload()
    await expect(avatar).toHaveCount(0)
  })

  test('changes the password: the old one stops working', async ({ page }) => {
    await openAs(page, users.nova, '/profile')
    const form = page.getByRole('form', { name: 'Alterar senha' })

    await form.getByLabel('Senha atual').fill('wrong-password')
    await form.getByLabel(/^Nova senha/).fill('Novo#Senha2026')
    await form.getByLabel('Confirmar nova senha').fill('Outra#Senha2026')
    await form.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(form.getByText('As senhas não coincidem')).toBeVisible()

    await form.getByLabel('Confirmar nova senha').fill('Novo#Senha2026')
    await form.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(form.getByText('A senha atual está incorreta')).toBeVisible()
    await expect(form.getByLabel('Senha atual')).toHaveAttribute('aria-invalid', 'true')

    await form.getByLabel('Senha atual').fill(users.nova.password)
    await form.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('Senha alterada')).toBeVisible()

    await logout(page, users.nova.displayName)
    await page.goto('/login')
    await login(page, users.nova)
    await expect(page.getByText('E-mail ou senha inválidos')).toBeVisible()

    await login(page, { email: users.nova.email, password: 'Novo#Senha2026' })
    await expectSignedIn(page, users.nova.displayName)
  })

  test('the password fields of the change form have their own show/hide toggle', async ({ page }) => {
    await openAs(page, users.nova, '/profile')
    const form = page.getByRole('form', { name: 'Alterar senha' })

    const current = form.getByLabel('Senha atual')
    const next = form.getByLabel(/^Nova senha/)
    await current.fill('Kurio@2026')
    await next.fill('Novo#Senha2026')

    await form.getByRole('button', { name: 'Mostrar senha' }).first().click()
    await expect(current).toHaveAttribute('type', 'text')
    await expect(current).toHaveValue('Kurio@2026')
    // Revealing one field leaves the others hidden.
    await expect(next).toHaveAttribute('type', 'password')
    await expect(form.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('a full browser storage rolls the change back with a clear message', async ({ page }) => {
    await openAs(page, users.nova, '/profile')
    await page.evaluate(() => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'kurio.mock.db') throw new DOMException('full', 'QuotaExceededError')
        return original.call(this, key, value)
      }
    })

    await page.getByLabel('Nome de exibição').fill('Nome novo')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'O armazenamento do navegador está cheio' })).toBeVisible()

    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Nova Sato')
  })
})

test.describe('wallets', () => {
  test('edits the primary wallet and keeps it after refresh', async ({ page }) => {
    await openAs(page, users.nova, '/profile/wallets')
    const primary = page.getByRole('form', { name: 'Carteira principal' })

    await primary.getByLabel('Endereço da carteira').fill('0x123')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByLabel('Endereço da carteira')).toHaveAttribute('aria-invalid', 'true')
    await expect(primary.getByText('Use um endereço 0x com 40 caracteres hexadecimais')).toBeVisible()

    await primary.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
    await primary.getByLabel('Apelido da carteira').fill('Cofre')
    await primary.getByLabel('Tipo de carteira').selectOption('coinbase')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira salva')).toBeVisible()

    await page.reload()
    const reloaded = page.getByRole('form', { name: 'Carteira principal' })
    await expect(reloaded.getByLabel('Apelido da carteira')).toHaveValue('Cofre')
    await expect(reloaded.getByLabel('Tipo de carteira')).toHaveValue('coinbase')
  })

  test('the profile shows the nickname saved in Carteiras without a reload', async ({ page }) => {
    await openAs(page, users.nova, '/profile')
    await expect(page.getByLabel('Apelido da carteira')).toBeVisible()
    const visible = (name: string) => page.locator(`a[href="${name}"]:visible`).first()

    await visible('/profile/wallets').click()
    const primary = page.getByRole('form', { name: 'Carteira principal' })
    await primary.getByLabel('Apelido da carteira').fill('Cofre')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira salva')).toBeVisible()

    await visible('/profile').click()
    await expect(page.getByLabel('Apelido da carteira')).toHaveValue('Cofre')
  })

    test('an address that belongs to another account is refused by the API', async ({ page }) => {
    await openAs(page, users.nova, '/profile/wallets')
    const primary = page.getByRole('form', { name: 'Carteira principal' })

    // Leo's primary address, in another casing.
    await primary.getByLabel('Endereço da carteira').fill('0x3c7d9e1f5a2b8c4d6e0f1a3b5c7d9e2f4a6b8d01')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByLabel('Endereço da carteira')).toHaveAttribute('aria-invalid', 'true')
    await expect(primary.getByText('Este endereço já está cadastrado em outra conta').first()).toBeVisible()
  })

  test('adds a secondary wallet as a copy of the primary one', async ({ page }) => {
    await openAs(page, users.leo, '/profile/wallets')
    await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()

    await page.getByRole('button', { name: 'Adicionar' }).click()
    const secondary = page.getByRole('form', { name: 'Carteira secundária' })
    await secondary.getByLabel('Igual à carteira principal').click()
    await expect(secondary.getByLabel('Endereço da carteira')).toHaveValue('0x3C7d9E1f5A2b8C4d6E0f1A3b5C7d9E2f4A6b8D01')
    await secondary.getByLabel('Apelido da carteira').fill('Reserva')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira salva')).toBeVisible()

    await page.reload()
    await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toHaveCount(0)
    await expect(page.getByRole('form', { name: 'Carteira secundária' }).getByLabel('Apelido da carteira')).toHaveValue('Reserva')
  })
})
