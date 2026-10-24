// Lighthouse audit of the production build, with the mocks on and the default scenario.
// 3 runs per page and profile, median of every category, HTML + JSON of the median run.
//
//   npm run lighthouse
//
// Cart and payment need a session and a cart, so the browser is the Chromium that ships with
// Playwright: it logs in and fills the cart, then Lighthouse audits that same browser (same
// profile, so localStorage and the mock service worker survive). The HTTP cache is cleared
// before every run, so each one is a cold load.
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'reports', 'lighthouse')

const PREVIEW_PORT = 4174
const DEBUG_PORT = 9333
const BASE = `http://localhost:${PREVIEW_PORT}`
const RUNS = 3
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

const PAGES = [
  { slug: 'home', path: '/', session: 'guest' },
  { slug: 'detail', path: '/nfts/emerald-ape-042', session: 'guest' },
  { slug: 'cart', path: '/cart', session: 'member' },
  { slug: 'checkout', path: '/checkout', session: 'member' },
]
const PROFILES = [
  { name: 'mobile', config: undefined },
  { name: 'desktop', config: desktopConfig },
]

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

async function waitFor(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // not up yet
    }
    await sleep(300)
  }
  throw new Error(`${url} did not come up`)
}

/** Visitor: fresh mock data. Member: Nova, logged in, one Emerald Ape in the cart. */
async function seed(context, session) {
  const page = await context.newPage()
  await page.goto(`${BASE}/nfts/emerald-ape-042?mock-reset&scenario=default`)
  if (session === 'member') {
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await page.getByText('Emerald Ape #042 adicionado ao carrinho').waitFor()
    await page.goto(`${BASE}/login`)
    await page.getByLabel('E-mail').fill('nova@kurio.test')
    await page.getByLabel(/^Senha\*?$/).fill('Kurio@2026')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.getByRole('link', { name: /^Carrinho \(1 item\)/ }).waitFor()
  } else {
    await page.goto(`${BASE}/`)
    await page.getByRole('link', { name: /Emerald Ape #042/ }).waitFor()
  }
  await page.close()
}

function summarize(lhr) {
  const scores = Object.fromEntries(CATEGORIES.map((id) => [id, Math.round(lhr.categories[id].score * 100)]))
  return {
    ...scores,
    lcp: Math.round(lhr.audits['largest-contentful-paint'].numericValue),
    cls: Number(lhr.audits['cumulative-layout-shift'].numericValue.toFixed(3)),
    tbt: Math.round(lhr.audits['total-blocking-time'].numericValue),
  }
}

async function auditSession(context, session, results, environment) {
  await seed(context, session)
  const cdpPage = await context.newPage()
  const cdp = await context.newCDPSession(cdpPage)

  for (const page of PAGES.filter((candidate) => candidate.session === session)) {
    for (const profile of PROFILES) {
      const runs = []
      for (let run = 1; run <= RUNS; run++) {
        await cdp.send('Network.clearBrowserCache')
        const result = await lighthouse(
          `${BASE}${page.path}`,
          {
            port: DEBUG_PORT,
            output: ['json', 'html'],
            logLevel: 'error',
            onlyCategories: CATEGORIES,
            disableStorageReset: true,
          },
          profile.config,
        )
        if (result.lhr.runtimeError) throw new Error(`${page.slug}/${profile.name}: ${result.lhr.runtimeError.message}`)
        environment.userAgent ??= result.lhr.environment.hostUserAgent
        environment.throttling ??= {}
        environment.throttling[profile.name] = result.lhr.configSettings.throttling
        environment.throttlingMethod = result.lhr.configSettings.throttlingMethod
        runs.push({ ...summarize(result.lhr), json: result.report[0], html: result.report[1] })
        const last = runs.at(-1)
        console.log(
          `${page.slug.padEnd(8)} ${profile.name.padEnd(8)} run ${run}: perf ${last.performance} a11y ${last.accessibility} bp ${last['best-practices']} seo ${last.seo} | LCP ${last.lcp}ms CLS ${last.cls} TBT ${last.tbt}ms`,
        )
      }

      const medians = Object.fromEntries(
        [...CATEGORIES, 'lcp', 'cls', 'tbt'].map((key) => [key, median(runs.map((candidate) => candidate[key]))]),
      )
      // The run kept as evidence is the one with the median performance score.
      const order = runs.map((candidate, index) => ({ index, score: candidate.performance })).sort((a, b) => a.score - b.score)
      const medianRun = order[Math.floor(order.length / 2)].index
      const file = `${page.slug}-${profile.name}`
      writeFileSync(path.join(outDir, `${file}.json`), runs[medianRun].json)
      writeFileSync(path.join(outDir, `${file}.html`), runs[medianRun].html)

      results.push({
        page: page.slug,
        url: page.path,
        profile: profile.name,
        session: page.session,
        runs: runs.map(({ json: _json, html: _html, ...scores }) => scores),
        median: medians,
        medianRun: medianRun + 1,
        reports: { html: `${file}.html`, json: `${file}.json` },
      })
    }
  }
  await cdpPage.close()
}

function markdown(summary) {
  const mark = (value, target) => (value >= target ? String(value) : `**${value}** ⚠`)
  const rows = summary.results.map(
    (r) =>
      `| ${r.page} | ${r.profile} | ${mark(r.median.performance, TARGETS.performance)} | ${mark(r.median.accessibility, TARGETS.accessibility)} | ${mark(r.median['best-practices'], TARGETS['best-practices'])} | ${mark(r.median.seo, TARGETS.seo)} | ${r.median.lcp} ms | ${r.median.cls} | ${r.median.tbt} ms | [html](${r.reports.html}) · [json](${r.reports.json}) |`,
  )
  const runs = summary.results.flatMap((r) =>
    r.runs.map(
      (run, index) =>
        `| ${r.page} | ${r.profile} | ${index + 1}${index + 1 === r.medianRun ? ' (kept)' : ''} | ${run.performance} | ${run.accessibility} | ${run['best-practices']} | ${run.seo} | ${run.lcp} ms | ${run.cls} | ${run.tbt} ms |`,
    ),
  )
  return `# Lighthouse results

Generated ${summary.generatedAt} by \`npm run lighthouse\`. Median of ${summary.conditions.runsPerPage} runs per page and profile. Targets: performance ≥ ${TARGETS.performance}, accessibility ≥ ${TARGETS.accessibility}, best practices ≥ ${TARGETS['best-practices']}, SEO ≥ ${TARGETS.seo} (⚠ = below target).

## Medians

| Page | Profile | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | Report (median run) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${rows.join('\n')}

## Environment and conditions

${Object.entries(summary.tools)
  .map(([key, value]) => `- **${key}:** ${value}`)
  .join('\n')}
${summary.conditions.notes.map((note) => `- ${note}`).join('\n')}

## Every run

| Page | Profile | Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${runs.join('\n')}
`
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

console.log('Building…')
const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true })
if (build.status !== 0) process.exit(build.status ?? 1)

const preview = spawn('npm', ['run', 'preview', '--', '--port', String(PREVIEW_PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
  shell: true,
})
const stopPreview = () => {
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(preview.pid), '/T', '/F'], { stdio: 'ignore' })
  else preview.kill()
}

const userDataDir = path.join(os.tmpdir(), `kurio-lighthouse-${Date.now()}`)
const results = []
const environment = {}
let context
try {
  await waitFor(BASE)
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: null,
    args: [`--remote-debugging-port=${DEBUG_PORT}`],
  })
  await auditSession(context, 'guest', results, environment)
  await auditSession(context, 'member', results, environment)

  const summary = {
    generatedAt: new Date().toISOString(),
    tools: {
      lighthouse: require('lighthouse/package.json').version,
      browser: environment.userAgent,
      playwright: require('@playwright/test/package.json').version,
      node: process.version,
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      cpu: `${os.cpus()[0]?.model.trim()} × ${os.cpus().length}`,
    },
    conditions: {
      runsPerPage: RUNS,
      targets: TARGETS,
      throttlingMethod: environment.throttlingMethod,
      throttling: environment.throttling,
      notes: [
        '**Build:** production build (`npm run build`) served by `vite preview`, mocks enabled (`VITE_ENABLE_MOCKS`), `default` scenario (150–450 ms mock latency).',
        '**Profiles:** `mobile` is Lighthouse’s default (emulated phone, simulated slow 4G, 4× CPU slowdown); `desktop` is Lighthouse’s desktop preset.',
        '**Pages:** home and detail as a visitor with fresh mock data; cart and payment as Nova Sato, logged in, with one Emerald Ape #042 in the cart.',
        '**Cold load:** the HTTP cache is cleared before every run. localStorage and the service worker are kept (they hold the session and the mock backend), so `disableStorageReset` is on.',
        '**Browser:** headless Chromium from Playwright, driven over the remote debugging port. Run on a single local machine, so absolute timings vary between machines; the scores use Lighthouse’s simulated throttling, which is less sensitive to that.',
        '**Kept report:** the HTML/JSON of each page and profile is the run with the median performance score.',
      ],
    },
    results,
  }
  writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
  writeFileSync(path.join(outDir, 'summary.md'), markdown(summary))
  console.log(`\nReports written to ${path.relative(root, outDir)}`)
} finally {
  await context?.close()
  stopPreview()
  rmSync(userDataDir, { recursive: true, force: true })
}
