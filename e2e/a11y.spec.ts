import { expect, test, type Locator, type Page } from '@playwright/test'
import { checkoutAsNova, openFresh, selectEdition, updateNft } from './support/mock'

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768

/**
 * The focused element draws something it does not draw without focus: an
 * outline, a ring (box-shadow) or another border. Comparing both states avoids
 * parsing colors (Tailwind's rings come out as oklab()/color-mix()).
 */
async function hasFocusIndicator(target: Locator) {
  return target.evaluate((node) => {
    const element = node as HTMLElement
    const look = () => {
      const style = getComputedStyle(element)
      const outline = style.outlineStyle === 'none' ? 'none' : `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`
      return `${outline}|${style.boxShadow}|${style.borderColor}`
    }
    const previousTransition = element.style.transition
    element.style.transition = 'none'
    const focused = look()
    element.blur()
    const idle = look()
    element.focus()
    element.style.transition = previousTransition
    return focused !== idle
  })
}

test.describe('keyboard, focus and forms', () => {
  test('the skip link is the first stop, shows up on focus and jumps to the content', async ({ page }) => {
    await openFresh(page, '/')
    // Tab only means something once the app has rendered.
    await expect(page.getByRole('link', { name: /^Carrinho/ })).toBeVisible()

    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    const box = await skip.boundingBox()
    expect(box!.width).toBeGreaterThan(1)
    expect(await hasFocusIndicator(skip)).toBe(true)

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#main$/)
  })

  test('every control reached with Tab shows where the focus is', async ({ page }) => {
    await openFresh(page, '/')
    await expect(page.getByRole('link', { name: /^Carrinho/ })).toBeVisible()

    const unmarked: string[] = []
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const focused = page.locator(':focus')
      if (!(await hasFocusIndicator(focused))) {
        unmarked.push(await focused.evaluate((node) => `${node.tagName.toLowerCase()} "${node.textContent?.trim().slice(0, 30) ?? ''}"`))
      }
    }
    expect(unmarked).toEqual([])
  })

  test('the purchase actions of the detail work with the keyboard alone', async ({ page }) => {
    await openFresh(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await selectEdition(page, '1/50')

    const increase = page.getByRole('button', { name: 'Aumentar quantidade' })
    await increase.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Diminuir quantidade' })).toBeEnabled()

    const add = page.getByRole('button', { name: 'Adicionar ao carrinho' })
    await add.focus()
    await page.keyboard.press('Space')
    await expect(page.getByText('Emerald Ape #042 adicionado ao carrinho')).toBeVisible()
  })

  test('the filters keep the focus inside the drawer on mobile and stay reachable on desktop', async ({ page }) => {
    await openFresh(page, '/')

    if (!isMobile(page)) {
      // No drawer on desktop: a landmark whose first control Tab can reach.
      const sidebar = page.getByRole('complementary', { name: 'Filtros' })
      await expect(sidebar).toBeVisible()
      const first = sidebar.locator('input, button, [role="checkbox"], [role="combobox"]').first()
      await first.focus()
      await expect(first).toBeFocused()
      expect(await hasFocusIndicator(first)).toBe(true)
      return
    }

    const trigger = page.getByRole('button', { name: /^Filtros/ })
    await trigger.focus()
    await page.keyboard.press('Enter')

    const drawer = page.getByRole('dialog', { name: 'Filtros' })
    await expect(drawer).toBeVisible()
    expect(await drawer.evaluate((node) => node.contains(document.activeElement))).toBe(true)

    // The page behind is out of the focus order: Tab keeps cycling inside the drawer.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await drawer.evaluate((node) => node.contains(document.activeElement))).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('form errors are tied to their fields: aria-invalid, aria-describedby and the first error gets the focus', async ({ page }) => {
    await openFresh(page, '/register')
    await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()

    const fields = await page.getByRole('form', { name: 'Criar conta' }).locator('input').all()
    expect(fields.length).toBe(4)
    for (const field of fields) {
      await expect(field).toHaveAttribute('aria-invalid', 'true')
      const message = await field.evaluate((node) => {
        const id = node.getAttribute('aria-describedby')
        return id ? document.getElementById(id)?.textContent ?? null : null
      })
      expect(message, 'the description of an invalid field is the visible error').toBeTruthy()
    }
    await expect(fields[0]).toBeFocused()

    // Fixing a field clears its error.
    await fields[0].fill('novasato')
    await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(fields[0]).not.toHaveAttribute('aria-invalid', 'true')
    await expect(fields[1]).toBeFocused()
  })

  test('connecting the wallet moves the focus to the next step, not to the page body', async ({ page }) => {
    await checkoutAsNova(page)
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByRole('button', { name: 'Revisar pedido' })).toBeFocused()
  })

  test('the quantity stepper says why "+" is disabled at the limit', async ({ page }) => {
    await openFresh(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await updateNft(page, 'emerald-ape-042', { editions: [{ id: '1-50', available: 2 }] })
    await selectEdition(page, '1/50')
    const stepper = page.getByRole('group', { name: 'Quantidade' })
    await expect(stepper.getByText('Máximo disponível')).toHaveCount(0)

    await stepper.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(stepper.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
    await expect(stepper).toHaveAccessibleDescription('Máximo disponível: 2')
  })

  test('each cart card has a single link to its NFT, with a name', async ({ page }) => {
    await openFresh(page, '/nfts/emerald-ape-042')
    await selectEdition(page, '1/50')
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await expect(page.getByText('Emerald Ape #042 adicionado ao carrinho')).toBeVisible()
    await page.getByRole('button', { name: 'Ver carrinho' }).click()
    const row = page.getByRole('listitem', { name: /Emerald Ape #042/ })
    await expect(row.locator('a')).toHaveCount(1)
    await expect(row.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
  })
})
