import { expect, test, type Page } from '@playwright/test'
import { connectAndReview, login, openFresh, selectEdition, setScenario, users } from './support/mock'

/** Detail → 1/50 edition, two units → cart. The toast action is the way to the cart on mobile. */
async function addEmeraldApe(page: Page, scenario = 'default') {
  await openFresh(page, '/nfts/emerald-ape-042', scenario)
  await selectEdition(page, '1/50')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('button', { name: 'Ver carrinho' }).click()
  await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toBeVisible()
}

const total = (page: Page) => page.getByTestId('summary-total')
const stepper = (page: Page) => page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' })

test.describe('cart', () => {
  test('changes the quantity within the stock and keeps the summary in sync', async ({ page }) => {
    await addEmeraldApe(page)
    await expect(page.getByTestId('summary-subtotal')).toHaveText('2.38 ETH')

    await stepper(page).getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(stepper(page).getByRole('status')).toHaveText('3')
    await expect(page.getByTestId('summary-subtotal')).toHaveText('3.57 ETH')
    await expect(total(page)).toHaveText('3.586 ETH')

    // The minimum is 1: "−" is disabled there instead of failing silently.
    await stepper(page).getByRole('button', { name: 'Diminuir quantidade' }).click()
    await stepper(page).getByRole('button', { name: 'Diminuir quantidade' }).click()
    await expect(stepper(page).getByRole('button', { name: 'Diminuir quantidade' })).toBeDisabled()
    await expect(page.getByTestId('summary-subtotal')).toHaveText('1.19 ETH')
  })

  test('removes an item and shows the empty cart', async ({ page }) => {
    await addEmeraldApe(page)
    await page.getByRole('button', { name: 'Remover Emerald Ape #042 do carrinho' }).click()
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Continuar explorando' })).toBeVisible()
  })

  test('keeps the cart after a refresh and through login', async ({ page }) => {
    await addEmeraldApe(page)
    await page.reload()
    await expect(page.getByTestId('summary-subtotal')).toHaveText('2.38 ETH')

    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await login(page, users.nova)
    await expect(page).toHaveURL('/checkout')
    // Desktop and mobile checkouts show the breakdown, not only the total.
    await expect(page.getByTestId('summary-subtotal')).toHaveText('2.38 ETH')
    await expect(page.getByTestId('summary-fee')).toBeVisible()
    await expect(page.getByTestId('summary-total')).toHaveText('2.396 ETH')
  })

  test('validates coupons: invalid, expired, applied (kept after refresh) and removed', async ({ page }) => {
    await addEmeraldApe(page)
    const field = page.getByLabel('Código promocional')

    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Digite um código promocional.' })).toBeVisible()

    await field.fill('NOPE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Código promocional inválido' })).toBeVisible()
    await expect(page.getByTestId('summary-discount')).toHaveText('(-) 0.00')

    await field.fill('mint2025')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'expirou' })).toBeVisible()

    await field.fill('kurio10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('KURIO10 aplicado: 10% de desconto')).toBeVisible()
    await expect(page.getByTestId('summary-discount')).toHaveText('(-) 0.238')
    await expect(total(page)).toHaveText('2.158 ETH')

    await page.reload()
    await expect(page.getByTestId('summary-discount')).toHaveText('(-) 0.238')

    await page.getByRole('button', { name: 'Remover cupom KURIO10' }).click()
    await expect(page.getByTestId('summary-discount')).toHaveText('(-) 0.00')
    await expect(total(page)).toHaveText('2.396 ETH')
  })

  test('drops the coupon once the order with it is confirmed', async ({ page }) => {
    await addEmeraldApe(page)
    await page.getByLabel('Código promocional').fill('kurio10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('KURIO10 aplicado: 10% de desconto')).toBeVisible()

    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await login(page, users.nova)
    await connectAndReview(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByTestId('order-status')).toHaveText('Seus NFTs agora estão na sua carteira')

    // The next cart starts without the coupon of the previous purchase.
    await page.goto('/nfts/emerald-ape-042')
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await page.getByRole('button', { name: 'Ver carrinho' }).click()
    await expect(page.getByTestId('summary-subtotal')).toHaveText('1.19 ETH')
    await expect(page.getByTestId('summary-discount')).toHaveText('(-) 0.00')
    await expect(page.getByText('KURIO10 aplicado')).toBeHidden()
  })

  test('rolls the quantity back and warns when the API refuses the change', async ({ page }) => {
    await addEmeraldApe(page)
    await setScenario(page, 'cart-error')

    await stepper(page).getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(page.getByText(/Não foi possível alterar a quantidade/)).toBeVisible()
    await expect(stepper(page).getByRole('status')).toHaveText('2')
    await expect(page.getByTestId('summary-subtotal')).toHaveText('2.38 ETH')
  })

  test('trash and stepper never overlap', async ({ page }) => {
    await addEmeraldApe(page)
    const trash = await page.getByRole('button', { name: 'Remover Emerald Ape #042 do carrinho' }).boundingBox()
    const group = await stepper(page).boundingBox()
    const overlaps =
      trash!.x < group!.x + group!.width &&
      trash!.x + trash!.width > group!.x &&
      trash!.y < group!.y + group!.height &&
      trash!.y + trash!.height > group!.y
    expect(overlaps).toBe(false)
  })
})
