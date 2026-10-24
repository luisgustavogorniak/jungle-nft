import { expect, test, type Page } from '@playwright/test'
import {
  checkoutAsNova,
  connectAndReview,
  expectPrimaryWallet,
  leaveOrder,
  listOrders,
  login,
  mockControls,
  openCart,
  setScenario,
  users,
} from './support/mock'

/** Idempotency-Key of every POST /api/orders the page sends, in order. */
function recordOrderKeys(page: Page) {
  const keys: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') {
      keys.push(request.headers()['idempotency-key'])
    }
  })
  return keys
}

test.describe('checkout', () => {
  test('validates the collector data and shows a review before sending', async ({ page }) => {
    await checkoutAsNova(page)
    await expectPrimaryWallet(page)
    // The desktop form says where the wallet data comes from (mobile shows wallet cards instead).
    if ((page.viewportSize()?.width ?? 0) >= 768) {
      await expect(page.getByRole('link', { name: 'Carteiras' })).toHaveAttribute('href', '/profile/wallets')
    }

    await page.getByLabel('Nome de exibição').fill('')
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await page.getByRole('button', { name: 'Revisar pedido' }).click()
    await expect(page.getByText('Informe o nome de exibição')).toBeVisible()
    await expect(page.getByLabel('Nome de exibição')).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Nome de exibição').fill('Nova S.')
    await page.getByRole('button', { name: 'Revisar pedido' }).click()
    const review = page.getByRole('region', { name: 'Revise seu pedido' })
    await expect(review).toContainText('Nova S. · @')
    await expect(review).toContainText('Principal · 0xA91F…E82C')
    await expect(review).toContainText('MetaMask')

    await review.getByRole('button', { name: 'Editar dados' }).click()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Nova S.')
    await page.getByRole('button', { name: 'Revisar pedido' }).click()
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/orders\/order-/)
  })

  test('a refused wallet connection can be retried, and disconnecting blocks the review', async ({ page }) => {
    await checkoutAsNova(page, 'wallet-rejected')

    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByRole('alert')).toContainText('A conexão foi recusada na carteira')
    await expect(page.getByRole('button', { name: 'Revisar pedido' })).toBeHidden()

    await setScenario(page, 'default')
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByText('MetaMask conectada · 0xA91F…E82C')).toBeVisible()

    // Another provider is another connection.
    await page.getByRole('radio', { name: /Coinbase Wallet/ }).check()
    await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByText('Coinbase Wallet conectada')).toBeVisible()

    await page.getByRole('button', { name: 'Desconectar' }).click()
    await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Revisar pedido' })).toBeHidden()
  })

  test('an order whose response timed out is recovered with the same idempotency key', async ({ page }) => {
    test.slow() // the client gives up after its 10s timeout
    await checkoutAsNova(page, 'order-timeout')
    await connectAndReview(page)
    const keys = recordOrderKeys(page)

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByRole('alert')).toContainText('O servidor demorou para responder', { timeout: 15_000 })
    // The server did create the order; only its response was lost.
    const created = await listOrders(page)
    expect(created).toHaveLength(1)

    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page).toHaveURL(/\/orders\/order-/)
    // The retry reused the key of the first attempt and got the original order back, not a second one.
    expect(keys).toHaveLength(2)
    expect(keys[1]).toBe(keys[0])
    expect(await listOrders(page)).toEqual(created)
    expect(page.url()).toContain(created[0].id)
  })

  test('repeated clicks on confirm create a single order', async ({ page }) => {
    await checkoutAsNova(page)
    await connectAndReview(page)
    const keys = recordOrderKeys(page)

    // Three fast clicks while the request is in flight (the default latency is 150-450 ms).
    await page.getByRole('button', { name: 'Confirmar compra' }).click({ clickCount: 3, delay: 20 })
    await expect(page).toHaveURL(/\/orders\/order-/)
    expect(keys).toHaveLength(1)
    expect(await listOrders(page)).toHaveLength(1)
  })

  test('a session that expires at the confirmation keeps the cart and creates no order', async ({ page }) => {
    await checkoutAsNova(page)
    await connectAndReview(page)
    const total = await page.getByTestId('summary-total').textContent()

    await mockControls(page, 'expireSessions')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page).toHaveURL(/\/login\?.*redirect=%2Fcheckout.*reason=expired/)
    await expect(page.getByRole('status').filter({ hasText: 'Sua sessão expirou' })).toBeVisible()

    await login(page, users.nova)
    await expect(page).toHaveURL('/checkout')
    await expect(page.getByTestId('summary-total')).toHaveText(total!)
    expect(await listOrders(page)).toHaveLength(0)
  })

  test('a pending order is announced in the cart with a link to it', async ({ page }) => {
    await checkoutAsNova(page, 'slow-payment')
    await connectAndReview(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/orders\/order-/)
    const orderUrl = page.url()

    await leaveOrder(page)
    await openCart(page)
    const notice = page.getByRole('status').filter({ hasText: 'aguardando a confirmação da rede' })
    await expect(notice).toBeVisible()
    await notice.getByRole('link', { name: 'Ver pedido' }).click()
    await expect(page).toHaveURL(orderUrl)
  })
})
