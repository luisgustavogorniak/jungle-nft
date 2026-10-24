import type { Page } from '@playwright/test'

type MockControls = {
  reset: () => Promise<void>
  setScenario: (name: string) => void
  getScenario: () => string
  expireSessions: () => void
}

export const users = {
  nova: { email: 'nova@kurio.test', password: 'Kurio@2026', displayName: 'Nova Sato' },
  leo: { email: 'leo@kurio.test', password: 'Kurio@2026', displayName: 'Leo Arcos' },
} as const

/** Opens a path with fresh mock data (and optionally a scenario). */
export async function openFresh(page: Page, path: string, scenario = 'default') {
  const url = new URL(path, 'http://placeholder')
  url.searchParams.set('mock-reset', '')
  url.searchParams.set('scenario', scenario)
  await page.goto(`${url.pathname}${url.search}`)
}

export async function mockControls(page: Page, action: keyof MockControls) {
  await page.evaluate(
    (name) => (window as unknown as { __kurioMock: MockControls }).__kurioMock[name](''),
    action,
  )
}

export async function login(page: Page, user: { email: string; password: string }) {
  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel('Senha').fill(user.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}
