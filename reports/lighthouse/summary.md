# Lighthouse results

Generated 2026-10-24T23:15:44.384Z by `npm run lighthouse`. Median of 3 runs per page and profile. Targets: performance ≥ 90, accessibility ≥ 95, best practices ≥ 95, SEO ≥ 90 (⚠ = below target).

## Medians

| Page | Profile | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | Report (median run) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| home | mobile | 98 | 100 | 100 | 100 | 1948 ms | 0.002 | 6 ms | [html](home-mobile.html) · [json](home-mobile.json) |
| home | desktop | 100 | 100 | 100 | 100 | 716 ms | 0.002 | 13 ms | [html](home-desktop.html) · [json](home-desktop.json) |
| detail | mobile | 99 | 100 | 100 | 100 | 1983 ms | 0 | 66 ms | [html](detail-mobile.html) · [json](detail-mobile.json) |
| detail | desktop | 100 | 100 | 100 | 100 | 608 ms | 0 | 0 ms | [html](detail-desktop.html) · [json](detail-desktop.json) |
| cart | mobile | 99 | 100 | 100 | 100 | 2018 ms | 0.003 | 80 ms | [html](cart-mobile.html) · [json](cart-mobile.json) |
| cart | desktop | 100 | 100 | 100 | 100 | 762 ms | 0.001 | 0 ms | [html](cart-desktop.html) · [json](cart-desktop.json) |
| checkout | mobile | 98 | 100 | 100 | 100 | 2100 ms | 0 | 93 ms | [html](checkout-mobile.html) · [json](checkout-mobile.json) |
| checkout | desktop | 100 | 100 | 100 | 100 | 810 ms | 0 | 0 ms | [html](checkout-desktop.html) · [json](checkout-desktop.json) |

## Environment and conditions

- **lighthouse:** 13.5.0
- **browser:** Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.8078.4 Safari/537.36
- **playwright:** 1.64.1
- **node:** v24.22.0
- **os:** Windows_NT 10.0.26300 (x64)
- **cpu:** Intel(R) Core(TM) i5-9400F CPU @ 2.90GHz × 6
- **Build:** production build (`npm run build`) served by `vite preview`, mocks enabled (`VITE_ENABLE_MOCKS`), `default` scenario (150–450 ms mock latency).
- **Profiles:** `mobile` is Lighthouse’s default (emulated phone, simulated slow 4G, 4× CPU slowdown); `desktop` is Lighthouse’s desktop preset.
- **Pages:** home and detail as a visitor with fresh mock data; cart and payment as Nova Sato, logged in, with one Emerald Ape #042 in the cart.
- **Cold load:** the HTTP cache is cleared before every run. localStorage and the service worker are kept (they hold the session and the mock backend), so `disableStorageReset` is on.
- **Browser:** headless Chromium from Playwright, driven over the remote debugging port. Run on a single local machine, so absolute timings vary between machines; the scores use Lighthouse’s simulated throttling, which is less sensitive to that.
- **Kept report:** the HTML/JSON of each page and profile is the run with the median performance score.

## Every run

| Page | Profile | Run | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| home | mobile | 1 | 98 | 100 | 100 | 100 | 1983 ms | 0.002 | 6 ms |
| home | mobile | 2 (kept) | 98 | 100 | 100 | 100 | 1948 ms | 0.002 | 5 ms |
| home | mobile | 3 | 98 | 100 | 100 | 100 | 1944 ms | 0.002 | 19 ms |
| home | desktop | 1 (kept) | 100 | 100 | 100 | 100 | 697 ms | 0.002 | 12 ms |
| home | desktop | 2 | 100 | 100 | 100 | 100 | 716 ms | 0.002 | 13 ms |
| home | desktop | 3 | 99 | 100 | 100 | 100 | 745 ms | 0.002 | 14 ms |
| detail | mobile | 1 | 99 | 100 | 100 | 100 | 1983 ms | 0 | 66 ms |
| detail | mobile | 2 (kept) | 99 | 100 | 100 | 100 | 1983 ms | 0 | 69 ms |
| detail | mobile | 3 | 99 | 100 | 100 | 100 | 1972 ms | 0 | 66 ms |
| detail | desktop | 1 | 100 | 100 | 100 | 100 | 628 ms | 0 | 0 ms |
| detail | desktop | 2 (kept) | 100 | 100 | 100 | 100 | 608 ms | 0 | 0 ms |
| detail | desktop | 3 | 100 | 100 | 100 | 100 | 597 ms | 0 | 0 ms |
| cart | mobile | 1 | 99 | 100 | 100 | 100 | 2014 ms | 0.003 | 90 ms |
| cart | mobile | 2 (kept) | 99 | 100 | 100 | 100 | 2018 ms | 0.003 | 80 ms |
| cart | mobile | 3 | 99 | 100 | 100 | 100 | 2020 ms | 0.003 | 77 ms |
| cart | desktop | 1 | 100 | 100 | 100 | 100 | 764 ms | 0.001 | 0 ms |
| cart | desktop | 2 (kept) | 100 | 100 | 100 | 100 | 762 ms | 0.001 | 0 ms |
| cart | desktop | 3 | 100 | 100 | 100 | 100 | 733 ms | 0.001 | 0 ms |
| checkout | mobile | 1 | 98 | 100 | 100 | 100 | 2081 ms | 0 | 93 ms |
| checkout | mobile | 2 (kept) | 98 | 100 | 100 | 100 | 2100 ms | 0 | 91 ms |
| checkout | mobile | 3 | 98 | 100 | 100 | 100 | 2176 ms | 0 | 93 ms |
| checkout | desktop | 1 | 100 | 100 | 100 | 100 | 810 ms | 0 | 0 ms |
| checkout | desktop | 2 (kept) | 100 | 100 | 100 | 100 | 820 ms | 0 | 0 ms |
| checkout | desktop | 3 | 100 | 100 | 100 | 100 | 808 ms | 0 | 0 ms |
