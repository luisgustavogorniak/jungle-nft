import { expect, test } from '@playwright/test'
import {
  checkoutAsNova,
  connectAndReview,
  expectPrimaryWallet,
  leaveOrder,
  listOrders,
  openCart,
  setScenario,
} from './support/mock'

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

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByRole('alert')).toContainText('O servidor demorou para responder', { timeout: 15_000 })

    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page).toHaveURL(/\/orders\/order-/)
    const orders = await listOrders(page)
    expect(orders).toHaveLength(1)
    expect(page.url()).toContain(orders[0].id)
  })

  test('repeated clicks on confirm create a single order', async ({ page }) => {
    await checkoutAsNova(page)
    await connectAndReview(page)

    await page.getByRole('button', { name: 'Confirmar compra' }).dblclick()
    await expect(page).toHaveURL(/\/orders\/order-/)
    expect(await listOrders(page)).toHaveLength(1)
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
