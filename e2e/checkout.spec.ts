import { expect, test, type Page } from '@playwright/test'
import {
  checkoutAsNova,
  connectAndReview,
  expectEventReceived,
  expectPrimaryWallet,
  leaveOrder,
  listOrders,
  login,
  mockControls,
  openCart,
  setScenario,
  settlePendingOrders,
  updateNft,
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

  test('an order whose response timed out is recovered with the same idempotency key, even after a reload', async ({ page }) => {
    test.slow() // the client gives up after its 10s timeout
    await checkoutAsNova(page, 'order-timeout')
    await connectAndReview(page)
    const keys = recordOrderKeys(page)

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    const attempt = page.getByRole('region', { name: 'Pedido em andamento' })
    await expect(attempt).toBeVisible({ timeout: 15_000 })
    // The server did create the order; only its response was lost.
    const created = await listOrders(page)
    expect(created).toHaveLength(1)

    // The attempt survives a reload: the retry still sends the original request, so no 409.
    await page.reload()
    await expect(attempt).toBeVisible()
    await attempt.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page).toHaveURL(`/orders/${created[0].id}`)
    // The retry reused the key of the first attempt and got the original order back, not a second one.
    expect(keys).toHaveLength(2)
    expect(keys[1]).toBe(keys[0])
    expect(await listOrders(page)).toEqual(created)
  })

  test('a timed-out order keeps its panel while pending and drops it once the server confirms it', async ({ page }) => {
    test.slow() // the client gives up after its 10s timeout
    await checkoutAsNova(page, 'order-timeout')
    await connectAndReview(page)

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    const attempt = page.getByRole('region', { name: 'Pedido em andamento' })
    await expect(attempt).toBeVisible({ timeout: 15_000 })
    const [created] = await listOrders(page)

    // The attempt lists what it buys.
    await expect(attempt.getByRole('list', { name: 'Itens da tentativa' })).toContainText('1× Emerald Ape #042')
    await expect(attempt.getByRole('list', { name: 'Itens da tentativa' })).toContainText('Total: 1.206 ETH')
    // While it is pending the panel stays, even with its quote expired.
    await mockControls(page, 'expireQuotes')
    await page.reload()
    await expect(attempt).toBeVisible()

    // The confirmation is a final answer from the server: the attempt is dropped, nothing is sent again.
    const keys = recordOrderKeys(page)
    await settlePendingOrders(page)
    await expectEventReceived(page, 'order.updated', created.id)
    await expect(attempt).toBeHidden()
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('kurio.checkout.attempt'))).toBeNull()
    expect(keys).toHaveLength(0)
    expect(await listOrders(page)).toEqual([expect.objectContaining({ id: created.id, status: 'confirmed' })])
  })

  test('an old attempt that does not match the cart is discarded: normal checkout, nothing sent again', async ({ page }) => {
    await checkoutAsNova(page)
    // Left by an earlier session: four other NFTs, a quote that no longer exists, no answer from the server.
    await page.evaluate(() => {
      const line = (nftId: string) => ({ nftId, editionId: '1-50', quantity: 1, name: nftId })
      sessionStorage.setItem(
        'kurio.checkout.attempt',
        JSON.stringify({
          key: crypto.randomUUID(),
          userId: 'user-nova',
          body: { quoteId: 'quote-old', walletId: 'wallet-old', network: 'ethereum', provider: 'metamask', collector: {} },
          lines: ['neon-vessel-552', 'a', 'b', 'c'].map(line),
          total: '7.366',
        }),
      )
    })
    const keys = recordOrderKeys(page)
    await page.reload()

    await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Pedido em andamento' })).toBeHidden()
    expect(await page.evaluate(() => sessionStorage.getItem('kurio.checkout.attempt'))).toBeNull()
    expect(keys).toHaveLength(0)

    await connectAndReview(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/orders\/order-/)
    expect(keys).toHaveLength(1)
    const orders = await listOrders(page)
    expect(orders).toHaveLength(1)
    expect(orders[0]).toMatchObject({ lines: [expect.objectContaining({ nftId: 'emerald-ape-042', quantity: 1 })] })
  })

  test('the unresolved attempt can be discarded to start again', async ({ page }) => {
    test.slow() // the client gives up after its 10s timeout
    await checkoutAsNova(page, 'order-timeout')
    await connectAndReview(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    const attempt = page.getByRole('region', { name: 'Pedido em andamento' })
    await expect(attempt).toBeVisible({ timeout: 15_000 })

    await attempt.getByRole('button', { name: 'Descartar e começar de novo' }).click()
    await expect(attempt).toBeHidden()
    expect(await page.evaluate(() => sessionStorage.getItem('kurio.checkout.attempt'))).toBeNull()
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
    // The order reserves the last unit, so the cart line has no stock while it is pending.
    await updateNft(page, 'emerald-ape-042', { editions: [{ id: '1-50', available: 1 }] })
    await connectAndReview(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/orders\/order-/)
    const orderUrl = page.url()

    await leaveOrder(page)
    await openCart(page)
    // The line says the user's own order holds it, not that it sold out.
    const row = page.getByRole('listitem', { name: /Emerald Ape #042/ })
    await expect(row.getByText('Pedido em andamento')).toBeVisible()
    await expect(row).not.toContainText('esgotou')
    await expect(row.getByRole('link', { name: 'Ver pedido' })).toHaveAttribute('href', new URL(orderUrl).pathname)
    const notice = page.getByRole('status').filter({ hasText: 'aguardando a confirmação da rede' })
    await expect(notice).toBeVisible()
    await notice.getByRole('link', { name: 'Ver pedido' }).click()
    await expect(page).toHaveURL(orderUrl)
  })
})
