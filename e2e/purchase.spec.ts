import { expect, test, type Page } from '@playwright/test'
import { connectAndReview, expectPrimaryWallet, login, openCart, openFresh, selectEdition, users } from './support/mock'

/** Catalog → detail → cart → login → checkout, stopping right after "Confirmar compra". */
async function buyEmeraldApe(page: Page, scenario?: string) {
  await openFresh(page, '/', scenario)

  await page.getByRole('link', { name: /Emerald Ape #042/ }).click()
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await selectEdition(page, '1/50')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Emerald Ape #042 adicionado ao carrinho')).toBeVisible()

  await page.getByRole('button', { name: 'Ver carrinho' }).click()
  await expect(page.getByTestId('summary-subtotal')).toHaveText('2.38 ETH')
  await expect(page.getByTestId('summary-fee')).toHaveText('0.016 ETH')
  await expect(page.getByTestId('summary-total')).toHaveText('2.396 ETH')

  // Checkout requires a session: the visitor cart is kept through login.
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
  await login(page, users.nova)
  await expect(page).toHaveURL('/checkout')

  await expectPrimaryWallet(page)
  await expect(page.getByTestId('summary-total')).toHaveText('2.396 ETH')
  await connectAndReview(page)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/orders\/order-/)
}

test.describe('purchase', () => {
  test('completes a purchase from the catalog to the confirmed receipt', async ({ page }) => {
    await buyEmeraldApe(page)

    await expect(page.getByTestId('order-status')).toHaveText('Seus NFTs agora estão na sua carteira')
    await expect(page.getByTestId('order-total')).toHaveText('2.396 ETH')
    await expect(page.getByTestId('order-tx')).toHaveText(/^0x[0-9a-f]{4}…[0-9a-f]{4}$/)
    await expect(page.getByRole('list', { name: 'Itens comprados' })).toContainText('Emerald Ape #042 (1/50) × 2 · 2.38 ETH')

    // Only the purchased items leave the cart.
    await openCart(page)
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  })

  test('recovers a pending order after reload and receives the confirmation via Socket.IO', async ({ page }) => {
    await buyEmeraldApe(page, 'slow-payment')
    const orderUrl = page.url()

    await expect(page.getByTestId('order-status')).toContainText('Aguardando a confirmação da rede')
    await page.reload()

    // State after reload comes from GET /api/orders/:id ...
    await expect(page.getByTestId('order-status')).toContainText('Aguardando a confirmação da rede')
    expect(page.url()).toBe(orderUrl)
    // ... and the socket keeps updating it until the payment settles.
    await expect(page.getByTestId('order-status')).toHaveText('Seus NFTs agora estão na sua carteira', {
      timeout: 10_000,
    })
  })

  test('shows a declined payment and keeps the items in the cart', async ({ page }) => {
    await buyEmeraldApe(page, 'payment-declined')

    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.getByTestId('summary-total')).toHaveText('2.396 ETH')
  })

  test('shows not found for an unknown NFT accessed directly', async ({ page }) => {
    await openFresh(page, '/nfts/does-not-exist')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  })
})
