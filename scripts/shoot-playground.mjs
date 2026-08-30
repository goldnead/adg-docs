#!/usr/bin/env node
/**
 * Capture Control Panel screenshots from the addon-studio playground.
 *
 * `shoot-screenshots.mjs` shoots the hub, which carries the CRM and marketing
 * addons. The playground carries *all* of them at once, on data that was built
 * to be awkward rather than pretty — five brands, subscriptions mid-plan, a
 * cancelled booking, a credit note. That is the right source for the commerce
 * addons, and the only one for those the hub does not install.
 *
 *   cd ~/projects/statamic-addon-studio/playground
 *   APP_LOCALE=en php8.4 artisan serve --port=8125
 *
 * Two things about that line. `php8.4` because the lock file demands 8.4.1 and
 * the host defaults to 8.3 — started with the wrong one, every page is a 500.
 * `APP_LOCALE=en` because the playground's own .env is German on purpose, and
 * the rest of the screenshot corpus is English; overriding it per run leaves
 * that choice alone.
 *   node scripts/shoot-playground.mjs [name-filter]
 *
 * Chrome comes from the system (`channel: 'chrome'`); Playwright's own browsers
 * are not installed on this host and downloading them for two runs a month is
 * not worth it.
 *
 * Output: public/screenshots/<name>.png at 2x, matching the rest of the corpus.
 */

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../public/screenshots')

const BASE = process.env.PLAYGROUND_URL ?? 'http://127.0.0.1:8125'
const EMAIL = 'mira@nordlicht.beispiel'
const PASSWORD = 'demo-local-password'

const VIEWPORT = { width: 1560, height: 980 }
const SCALE = 2

/**
 * Dismiss the trial-mode licence warning.
 *
 * The playground runs Statamic Pro and eight commercial addons without keys, so
 * every first page load raises a modal over the whole screen. It does not only
 * spoil the picture: it swallows the next click, which is why the two shots
 * that open a filter menu failed before this existed.
 */
async function dismissLicenceWarning(page) {
  // Match the button by label rather than by dialog position: the modal has two
  // buttons and the other one navigates away to the licensing screen.
  for (const label of [/^snooze$/i, /später erinnern/i, /remind me later/i]) {
    const button = page.getByRole('button', { name: label })
    if (await button.count()) {
      await button.first().click()
      await page.waitForTimeout(600)
      return
    }
  }
}

/**
 * Zoom the graph in far enough that node labels are not truncated.
 *
 * The editor opens at the saved viewport — 50% in the seeded funnels, where
 * every label reads "Zeigt ins …". The zoom toolbar is icon-only apart from the
 * percentage and the buttons are easy to mis-index; clicking the wrong one arms
 * the node picker or opens a node's context menu, both of which land in the
 * picture. So: clear anything that may already be open, then zoom with the
 * wheel over the middle of the canvas, which Vue Flow handles natively.
 */
async function zoomCanvas(page) {
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  const box = await page.evaluate(() => {
    const el = document.querySelector('.vue-flow, [class*="vue-flow"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  if (!box) return

  await page.mouse.move(box.x, box.y)
  for (let i = 0; i < 2; i++) {
    await page.mouse.wheel(0, -240)
    await page.waitForTimeout(250)
  }
  await page.waitForTimeout(600)
}

/** Open a Statamic listing's filter menu, which is a button labelled "Filters". */
/** Take focus off whatever holds it, so no stray ring lands in the picture. */
async function blurActiveElement(page) {
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
  await page.waitForTimeout(300)
}

/**
 * Open the product editor on the first row.
 *
 * By clicking the name cell rather than the row actions: the cell is the button
 * the screen advertises, and going through the dropdown would put an open menu
 * in the picture.
 */
async function openProductEditor(page) {
  await page.locator('table tbody tr button').first().click()
  await page.waitForTimeout(900)
}

async function openFilters(page) {
  await page.getByRole('button', { name: /filters?/i }).first().click()
  await page.waitForTimeout(600)
}

const SHOTS = [
  // ---- Insights
  //
  // The Metrics screen, which lists every figure the family registered. Not in
  // `sync-screenshots.mjs`: that table copies pictures the addon repos ship, and
  // `statamic-insights` ships only the four revenue shots. This screen exists
  // solely on an install that has the other thirteen addons, which is the
  // playground and nowhere else.
  //
  // 2500ms to settle rather than the default: the screen builds fifty-eight
  // figures and their comparison against the previous period on request, and
  // `networkidle` returns before the last group has painted.
  { name: 'insights-metrics', url: '/cp/insights/metrics', settle: 2500 },

  // ---- Payments
  { name: 'payments-listing', url: '/cp/utilities/payments' },
  { name: 'payments-filters', url: '/cp/utilities/payments', prepare: openFilters },
  { name: 'payments-subscriptions', url: '/cp/utilities/subscriptions' },

  // ---- Booking
  { name: 'booking-listing', url: '/cp/utilities/bookings' },
  { name: 'booking-filter', url: '/cp/utilities/bookings', prepare: openFilters },

  // ---- Products
  //
  // `blur` on the listing: dismissing the licence dialog leaves focus on the
  // search box here, and the ring around it appears in no other screenshot on
  // the site. The editor shot does not need it — the click that opens the panel
  // moves focus into the panel.
  { name: 'products-listing', url: '/cp/utilities/products', prepare: blurActiveElement },
  { name: 'products-editor', url: '/cp/utilities/products', prepare: openProductEditor },

  // ---- Offers
  { name: 'offers-listing', url: '/cp/utilities/offers' },
  { name: 'offers-coupons', url: '/cp/utilities/coupons' },

  // ---- Funnels & the canvas they share with Automations
  { name: 'funnels-list', url: '/cp/utilities/funnels' },
  {
    // `fruehlingskurs`, not the nine-step `sackgassen`: that one exists to be
    // awkward (a disabled step, an orphan) and reads as a broken funnel in a
    // picture meant to show the editor working.
    name: 'flow-canvas-canvas',
    url: '/cp/utilities/funnels/1/edit',
    settle: 3500,
    prepare: zoomCanvas,
  },
]

await mkdir(OUT, { recursive: true })

const filter = process.argv[2]
const wanted = filter ? SHOTS.filter((s) => s.name.includes(filter)) : SHOTS

const browser = await chromium.launch({ channel: 'chrome' })
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE })
const page = await context.newPage()

await page.goto(`${BASE}/cp`, { waitUntil: 'domcontentloaded' })
await page.fill('input[name=email]', EMAIL)
await page.fill('input[name=password]', PASSWORD)
await page.press('input[name=password]', 'Enter')
await page.waitForLoadState('networkidle')

if (!page.url().includes('/cp/')) {
  throw new Error(`Login failed, landed on ${page.url()}`)
}

await dismissLicenceWarning(page)

let ok = 0
const failed = []

for (const shot of wanted) {
  try {
    await page.goto(BASE + shot.url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(shot.settle ?? 900)
    await dismissLicenceWarning(page)
    if (shot.prepare) await shot.prepare(page)
    await page.screenshot({ path: resolve(OUT, `${shot.name}.png`) })
    console.log(`  shot  ${shot.name}.png`)
    ok++
  } catch (e) {
    failed.push(`${shot.name}: ${String(e.message).split('\n')[0]}`)
    console.log(`  FAIL  ${shot.name}`)
  }
}

await browser.close()

console.log(`\n${ok} shot, ${failed.length} failed.`)
failed.forEach((f) => console.log(`  ${f}`))
if (failed.length) process.exitCode = 1

/*
 * The two invoice pictures are not in the list above, and cannot be.
 *
 * `statamic-invoices` ships no Control Panel screen at all — it renders a
 * document, and the document is the thing worth showing. There is no URL to
 * point a browser at, so they are made in two steps from the playground:
 *
 *   php8.4 artisan tinker --execute='
 *     use Goldnead\Invoices\Models\Invoice; use Goldnead\Invoices\Support\Renderer;
 *     $r = app(Renderer::class);
 *     file_put_contents("/tmp/invoice.html",     $r->view(Invoice::find(10))->render());
 *     file_put_contents("/tmp/credit-note.html", $r->view(Invoice::find(16))->render());'
 *
 *   google-chrome --headless --disable-gpu --no-sandbox --hide-scrollbars \
 *     --user-data-dir=/tmp/chrome-inv --window-size=900,640 \
 *     --force-device-scale-factor=2 --virtual-time-budget=4000 \
 *     --screenshot=public/screenshots/invoices-invoice.png file:///tmp/invoice.html
 *
 * Invoice 10 and credit note 16 are the seeded pair that carry **two** tax
 * rates, 19% and 7%. That is the whole point of the picture: the per-rate
 * breakdown § 14 Abs. 4 Nr. 8 UStG demands is invisible on a single-rate
 * invoice, and every other seeded invoice has one rate or none.
 */
