import { expect, test } from '@playwright/test'
import { buyAsNova, expectEventReceived, settlePendingOrders } from './support/mock'

test.describe('orders', () => {
  test('the desktop confirmation is a modal that survives direct access and refresh', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mobile shows the receipt as a page')
    await buyAsNova(page)

    const dialog = page.getByRole('dialog', { name: 'Seus NFTs agora estão na sua carteira' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeFocused()

    // Direct access / refresh: the URL alone opens the modal, with focus inside it.
    await page.reload()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeFocused()

    // The transaction is simulated: no link to a real explorer.
    const explorer = dialog.getByRole('button', { name: 'Ver no Etherscan' })
    await expect(explorer).toHaveAttribute('aria-disabled', 'true')
    await expect(explorer).toHaveAccessibleDescription('Transação simulada')
    await explorer.hover()
    await expect(page.getByRole('tooltip', { name: 'Transação simulada' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Etherscan/ })).toHaveCount(0)

    // Focus stays trapped in the modal; Escape closes it.
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL('/')
  })

  test('with a pending order, only its items leave the cart once it is confirmed', async ({ page }) => {
    const orderId = await buyAsNova(page, 'slow-payment')
    await expect(page.getByTestId('order-status')).toContainText('Aguardando a confirmação da rede')

    // While the payment is pending, another NFT goes into the cart.
    await page.goto('/nfts/violet-nomad-314')
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await expect(page.getByText('Violet Nomad #314 adicionado ao carrinho')).toBeVisible()
    await page.getByRole('button', { name: 'Ver carrinho' }).click()
    const items = page.getByRole('list', { name: 'Itens do carrinho' })
    await expect(items.getByRole('listitem')).toHaveCount(2)
    await expect(page.getByRole('status').filter({ hasText: 'aguardando a confirmação da rede' })).toBeVisible()

    await settlePendingOrders(page)
    await expectEventReceived(page, 'order.updated', orderId)

    // The confirmation removed the ordered Emerald Ape only.
    await expect(items.getByRole('listitem')).toHaveCount(1)
    await expect(items).toContainText('Violet Nomad #314')
    await expect(items).not.toContainText('Emerald Ape #042')
    await expect(page.getByRole('status').filter({ hasText: 'aguardando a confirmação da rede' })).toBeHidden()
  })
})
