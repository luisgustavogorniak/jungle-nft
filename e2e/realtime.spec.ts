import { expect, test, type Page } from '@playwright/test'
import {
  buyAsNova,
  connectAndReview,
  countEvents,
  emitStaleNftUpdate,
  expectEventReceived,
  expectSignedIn,
  expectSignedOut,
  leaveOrder,
  listOrders,
  login,
  logout,
  openFresh,
  receivedEvents,
  replayLastEvent,
  selectEdition,
  settlePendingOrders,
  settlePendingOrdersWhileDisconnected,
  updateNft,
  updateNftWhileDisconnected,
  users,
} from './support/mock'

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

/**
 * The 1/1 edition has a single unit: the user's own order reserves the last one, so the
 * `nft.updated` of that reservation says "0 available" for a line the user is buying.
 */
async function reviewLastUnit(page: Page, scenario: string) {
  await openFresh(page, `/nfts/${NFT_ID}`, scenario)
  await expect(page.getByRole('radio', { name: '1/1 (1 disponível)' })).toBeChecked()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Emerald Ape #042 adicionado ao carrinho')).toBeVisible()
  await page.goto('/checkout')
  await login(page, users.nova)
  await expect(page).toHaveURL('/checkout')
  await connectAndReview(page)
}

test.describe('realtime', () => {
  test('a price change of a cart item is announced and the summary is updated', async ({ page }) => {
    await cartWithEmeraldApe(page)

    await updateNft(page, NFT_ID, { price: '1.50' })

    await expect(notice(page)).toContainText('O preço de Emerald Ape #042 (1/50) mudou de 1.19 ETH para 1.50 ETH')
    await expect(page.getByTestId('summary-subtotal')).toHaveText('3.00 ETH')
    await expect(page.getByTestId('summary-total')).toHaveText('3.016 ETH')
  })

  test('the reservation of the own pending order is not announced as a sell-out', async ({ page }) => {
    await reviewLastUnit(page, 'slow-payment')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/orders\/order-/)

    await expectEventReceived(page, 'nft.updated', NFT_ID)
    await expect(notice(page)).toHaveText('')
  })

  test('the reservation of an attempt without an answer is not announced as a sell-out', async ({ page }) => {
    test.slow() // the client gives up after its 10s timeout
    await reviewLastUnit(page, 'order-timeout')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    // The order exists and reserved the unit while its response never arrives.
    await expectEventReceived(page, 'nft.updated', NFT_ID)
    await expect(page.getByRole('region', { name: 'Pedido em andamento' })).toBeVisible({ timeout: 15_000 })
    await expect(notice(page)).toHaveText('')
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

    // The realtime notice is on screen at the same time and must not cover the button.
    const accept = alert.getByRole('button', { name: 'Aceitar novo valor' })
    await accept.scrollIntoViewIfNeeded()
    await expect(notice(page)).toContainText('O preço de Emerald Ape #042')
    const a = (await notice(page).locator('..').boundingBox())!
    const b = (await accept.boundingBox())!
    const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    expect(overlaps).toBe(false)

    await accept.click()
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

  test("after logout and another user's login, the previous user's order.updated never arrives", async ({ page }) => {
    const orderId = await buyAsNova(page, 'slow-payment')
    await expect(page.getByTestId('order-status')).toContainText('Aguardando a confirmação da rede')
    await leaveOrder(page)

    // Same page, no reload: the app itself must release Nova's socket.
    await logout(page, users.nova.displayName)
    await expectSignedOut(page)
    await page.getByRole('link', { name: 'Entrar' }).click()
    await login(page, users.leo)
    await expectSignedIn(page, users.leo.displayName)

    // Positive control: Leo's socket is connected and the probe records events.
    await updateNft(page, 'golden-beat-207', { price: '2.00' })
    await expectEventReceived(page, 'nft.updated', 'golden-beat-207')

    // Nova's payment settles now: the server emits order.updated to Nova's sockets.
    await settlePendingOrders(page)
    // A later broadcast on the same connection arrives after anything sent before it.
    await updateNft(page, 'golden-beat-207', { price: '2.10' })
    await expect
      .poll(async () => (await receivedEvents(page)).filter((e) => e.payload.resourceId === 'golden-beat-207').length)
      .toBe(2)

    const leaked = (await receivedEvents(page)).filter((e) => e.event === 'order.updated' && e.payload.resourceId === orderId)
    expect(leaked).toHaveLength(0)

    // And over REST the order does not exist for Leo.
    await page.goto(`/orders/${orderId}`)
    await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
  })

  test('an edition that sells out during the checkout is announced and blocks the confirmation', async ({ page }) => {
    await cartWithEmeraldApe(page)
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await login(page, users.nova)
    await connectAndReview(page)
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()

    await updateNft(page, NFT_ID, { editions: [{ id: '1-50', available: 0 }] })

    await expect(notice(page)).toContainText('Emerald Ape #042 (1/50) esgotou')
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
  })

  test('a duplicated event is delivered but its effects are not applied twice', async ({ page }) => {
    await cartWithEmeraldApe(page)
    await updateNft(page, NFT_ID, { price: '1.50' })
    await expect(notice(page)).toContainText('mudou de 1.19 ETH para 1.50 ETH')
    await page.getByRole('button', { name: 'Fechar aviso' }).click()
    await expect(notice(page)).toHaveText('')
    expect(await countEvents(page, 'nft.updated', NFT_ID)).toBe(1)

    // Same eventId, delivered again through the socket.
    await replayLastEvent(page)
    await expect.poll(() => countEvents(page, 'nft.updated', NFT_ID)).toBe(2)

    // The client dropped it: no new announcement, same summary.
    await expect(notice(page)).toHaveText('')
    await expect(page.getByTestId('summary-subtotal')).toHaveText('3.00 ETH')

    // Positive control: a genuinely new event still goes through.
    await updateNft(page, NFT_ID, { price: '1.60' })
    await expect(notice(page)).toContainText('mudou de 1.50 ETH para 1.60 ETH')
    await expect(page.getByTestId('summary-subtotal')).toHaveText('3.20 ETH')
  })

  test('an event older than the current state never rolls it back', async ({ page }) => {
    await cartWithEmeraldApe(page)
    await updateNft(page, NFT_ID, { price: '1.50' })
    await expect(page.getByTestId('summary-subtotal')).toHaveText('3.00 ETH')
    await page.getByRole('button', { name: 'Fechar aviso' }).click()

    // A late delivery of an older version (new eventId) with a much lower price.
    await emitStaleNftUpdate(page, NFT_ID, '0.10')
    await expect.poll(() => countEvents(page, 'nft.updated', NFT_ID)).toBe(2)

    await expect(notice(page)).toHaveText('')
    await expect(page.getByTestId('summary-subtotal')).toHaveText('3.00 ETH')
    await page.reload()
    await expect(page.getByTestId('summary-subtotal')).toHaveText('3.00 ETH')
  })

  test('a pending order settled while the socket is down is recovered after reconnecting, without a second order', async ({ page }) => {
    const orderId = await buyAsNova(page, 'slow-payment')
    await expect(page.getByTestId('order-status')).toContainText('Aguardando a confirmação da rede')

    // The payment settles on the server while the client is offline: the order.updated is lost.
    await settlePendingOrdersWhileDisconnected(page)

    // socket.io-client reconnects by itself and the active order is read again from REST.
    await expect(page.getByTestId('order-status')).toHaveText('Seus NFTs agora estão na sua carteira', { timeout: 10_000 })
    const orders = await listOrders(page)
    expect(orders).toHaveLength(1)
    expect(orders[0]).toMatchObject({ id: orderId, status: 'confirmed' })
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
