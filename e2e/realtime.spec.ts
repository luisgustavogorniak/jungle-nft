import { expect, test, type Page } from '@playwright/test'
import { connectAndReview, login, openFresh, selectEdition, updateNft, updateNftWhileDisconnected, users } from './support/mock'

const NFT_ID = 'emerald-ape-042'

/** Detail → 1/50 edition, two units (1.19 ETH each) → cart. */
async function cartWithEmeraldApe(page: Page, scenario = 'default') {
  await openFresh(page, `/nfts/${NFT_ID}`, scenario)
  await selectEdition(page, '1/50')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('button', { name: 'Ver carrinho' }).click()
  await expect(page.getByTestId('summary-subtotal')).toHaveText('2.38 ETH')
}

const notice = (page: Page) => page.getByRole('status', { name: 'Atualizações em tempo real' })

test.describe('realtime', () => {
  test('a price change of a cart item is announced and the summary is updated', async ({ page }) => {
    await cartWithEmeraldApe(page)

    await updateNft(page, NFT_ID, { price: '1.50' })

    await expect(notice(page)).toContainText('O preço de Emerald Ape #042 (1/50) mudou de 1.19 ETH para 1.50 ETH')
    await expect(page.getByTestId('summary-subtotal')).toHaveText('3.00 ETH')
    await expect(page.getByTestId('summary-total')).toHaveText('3.016 ETH')
  })

  test('a sold out edition is announced in the cart', async ({ page }) => {
    await cartWithEmeraldApe(page)

    await updateNft(page, NFT_ID, { editions: [{ id: '1-50', available: 0 }] })

    await expect(notice(page)).toContainText('Emerald Ape #042 (1/50) esgotou')
  })

  test('the checkout blocks a stale quote until the user accepts the new total', async ({ page }) => {
    await cartWithEmeraldApe(page)
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await login(page, users.nova)
    await expect(page).toHaveURL('/checkout')
    await connectAndReview(page)
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()

    await updateNft(page, NFT_ID, { price: '1.50' })

    const alert = page.getByRole('alert').filter({ hasText: 'Os valores mudaram' })
    await expect(alert).toContainText('Total anterior: 2.396 ETH. Novo total: 3.016 ETH.')
    await expect(page.getByTestId('summary-total')).toHaveText('3.016 ETH')
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()

    await alert.getByRole('button', { name: 'Aceitar novo valor' }).click()
    await expect(alert).toBeHidden()
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page).toHaveURL(/\/orders\/order-/)
    await expect(page.getByTestId('order-total')).toHaveText('3.016 ETH')
    await expect(page.getByTestId('order-status')).toHaveText('Seus NFTs agora estão na sua carteira')
  })

  test('the price-change scenario raises the price of the first cart item by 10%', async ({ page }) => {
    await cartWithEmeraldApe(page, 'price-change')

    await expect(notice(page)).toContainText('mudou de 1.19 ETH para 1.309 ETH', { timeout: 10_000 })
    await expect(page.getByTestId('summary-subtotal')).toHaveText('2.618 ETH')
  })

  test('after a reconnection the cart is reconciled with REST', async ({ page }) => {
    await cartWithEmeraldApe(page)

    // The change happens while the socket is down: no event reaches the client.
    await updateNftWhileDisconnected(page, NFT_ID, { price: '1.50' })

    // socket.io-client reconnects on its own and the active queries are re-read.
    await expect(page.getByTestId('summary-subtotal')).toHaveText('3.00 ETH', { timeout: 10_000 })
    await expect(notice(page)).toHaveText('')
  })
})
