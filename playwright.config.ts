import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  // One baseline per project, shared by every OS: no `-win32`/`-linux`/`-darwin` suffix, so a
  // checkout on another platform compares against the committed images instead of finding none.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{projectName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      // Fonts are bundled, so what changes between systems is rasterization (antialiasing,
      // hinting). A small tolerance absorbs it; a missing section or a broken layout still fails.
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Tests run against the optimized build with mocks enabled, the same artifact we deploy.
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Never reuse a server that is already up: it could be serving an old build.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
