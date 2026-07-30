#!/usr/bin/env node
/**
 * Capture the Control Panel screenshots used across the docs.
 *
 * Runs against the local hub checkout (~/Documents/WebDev/hub) with the `demo`
 * brand seeded by its seed-docs-demo*.php scripts. Everything is scoped to that
 * brand, so no real contact data can end up in a published image.
 *
 *   cd ~/Documents/WebDev/hub && php artisan serve --port=8123
 *   node scripts/shoot-screenshots.mjs [name-filter]
 *
 * Output: public/screenshots/<name>.png at 2x, which is what the docs reference.
 */

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../public/screenshots')

const BASE = process.env.HUB_URL ?? 'http://127.0.0.1:8123'
const EMAIL = 'demo@acme.test'
const PASSWORD = 'screenshot-demo-2026'

const VIEWPORT = { width: 1560, height: 980 }
const SCALE = 2

/**
 * Guard for the email-template shots.
 *
 * Those entries are ordinary Statamic entries, so the demo brand does NOT isolate
 * them and whatever the checkout holds is what lands in the picture. Refuse
 * anything that is not one of the three demo templates.
 */
const DEMO_SLUGS = ['welcome', 'newsletter-wrapper', 'lead-assigned']

async function DEMO_TEMPLATES_ONLY(page) {
  const rows = await page.$$eval('table tbody tr, [role="row"]', (els) =>
    els.map((el) => el.textContent?.trim() ?? '').filter(Boolean),
  )
  const foreign = rows.filter(
    (r) => r && !DEMO_SLUGS.some((s) => r.includes(s)),
  )
  if (foreign.length) {
    throw new Error(
      `refusing: the et_templates collection holds entries that are not demo ` +
        `templates (${foreign.length} row(s)). Move them aside before re-shooting — ` +
        `these entries are not brand-scoped.`,
    )
  }
}

/** `settle` waits after load; `scrollTo` scrolls the CP's inner region. */
const SHOTS = [
  // ---- LeadHub
  { name: 'leadhub-contacts', url: '/cp/leadhub/contacts' },
  { name: 'leadhub-contact-detail', url: '/cp/leadhub/contacts/117' },
  // The timeline is the point of the contact screen and sits below the fold.
  { name: 'leadhub-timeline', url: '/cp/leadhub/contacts/117', scrollTo: 1250 },
  { name: 'leadhub-pipeline', url: '/cp/leadhub/pipelines' },
  { name: 'leadhub-segments', url: '/cp/leadhub/segments' },
  { name: 'leadhub-tasks', url: '/cp/leadhub/tasks' },
  { name: 'leadhub-dashboard', url: '/cp/leadhub' },

  // ---- Marketing
  { name: 'marketing-lists', url: '/cp/marketing/lists' },
  { name: 'marketing-campaigns', url: '/cp/marketing/campaigns' },
  { name: 'marketing-campaign-report', url: '/cp/marketing/campaigns/spring-notes' },

  // ---- Automations
  {
    name: 'automations-builder',
    url: '/cp/automations/automations/51/edit',
    settle: 3000,
    // The builder opens with the node library expanded over half the canvas and
    // the graph auto-zoomed to ~49%, which is unreadable at any print size.
    // Both controls are icon-only buttons, so find them by DOM position rather
    // than by label.
    async prepare(page) {
      // Collapse the node library: the only button in the "NODE LIBRARY" header.
      await page.evaluate(() => {
        const header = [...document.querySelectorAll('*')].find(
          (el) => el.children.length === 0 && /^\s*NODE LIBRARY\s*$/i.test(el.textContent ?? ''),
        )
        header?.parentElement?.querySelector('button')?.click()
      })
      await page.waitForTimeout(800)

      // Zoom toolbar: [−] [64%] [+] [fit]. Vue Flow binds a real pointer handler,
      // so a synthetic .click() on the node is ignored — dispatch a real click at
      // the button's centre instead.
      const clickToolbar = async (index) => {
        const box = await page.evaluate((i) => {
          const pct = [...document.querySelectorAll('*')].find(
            (el) => el.children.length === 0 && /^\s*\d+%\s*$/.test(el.textContent ?? ''),
          )
          let bar = pct?.parentElement
          while (bar && bar.querySelectorAll('button').length < 3) bar = bar.parentElement
          const b = [...(bar?.querySelectorAll('button') ?? [])].at(i)
          if (!b) return null
          const r = b.getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        }, index)
        if (box) {
          await page.mouse.click(box.x, box.y)
          await page.waitForTimeout(500)
        }
      }

      await clickToolbar(-1)   // fit to view, which also centres the graph
      await clickToolbar(1)    // one step in, so node labels are not truncated
      await page.waitForTimeout(700)
    },
  },
  { name: 'automations-list', url: '/cp/automations' },
  { name: 'automations-runs', url: '/cp/automations/runs' },
  { name: 'automations-templates', url: '/cp/automations/templates' },

  // ---- Webhook Manager
  { name: 'webhook-manager-outbound', url: '/cp/webhook-manager/outbound' },
  { name: 'webhook-manager-deliveries', url: '/cp/webhook-manager/deliveries' },
  // A failed delivery: the snapshot, the error classification and the retry
  // schedule are the reason this screen exists.
  { name: 'webhook-manager-delivery-detail', url: '/cp/webhook-manager/deliveries/170' },
  { name: 'webhook-manager-insights', url: '/cp/webhook-manager/insights' },

  // ---- Platform
  { name: 'activity-inspector', url: '/cp/activity' },
  { name: 'notifications-inspector', url: '/cp/notifications' },

  // ---- Email Templates / Brand Context
  // `/entries` is the JSON API, not the screen. The collection URL is the screen.
  //
  // Email template entries are ordinary Statamic entries and are therefore NOT
  // brand-scoped — the demo brand does not isolate them. The hub checkout carries
  // real customer templates, so this shot is guarded: it refuses rather than
  // capturing content that does not belong in a public manual.
  {
    name: 'email-templates-collection',
    url: '/cp/collections/et_templates',
    guard: DEMO_TEMPLATES_ONLY,
  },
  // Statamic addresses an entry by id, not by slug.
  {
    name: 'email-templates-entry',
    url: '/cp/collections/et_templates/entries/11111111-1111-4111-8111-111111111111',
    settle: 1800,
  },
  { name: 'brand-members', url: '/cp/brands/users' },

  // ---- Table of Contents
  // No Control Panel surface at all, so the screenshot is the rendered result:
  // the tag's nested list on the right, the modifier's heading ids on the left.
  { name: 'toc-frontend', url: '/toc-demo', settle: 700 },
]

await mkdir(OUT, { recursive: true })

const filter = process.argv[2]
const targets = filter ? SHOTS.filter((s) => s.name.includes(filter)) : SHOTS

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: SCALE,
  colorScheme: 'light',
  reducedMotion: 'reduce',
})
const page = await context.newPage()

// ---- log in -----------------------------------------------------------------

await page.goto(`${BASE}/cp/auth/login`, { waitUntil: 'domcontentloaded' })
await page.fill('input[type="email"], input[name="email"]', EMAIL)
await page.fill('input[type="password"], input[name="password"]', PASSWORD)
await Promise.all([
  page.waitForURL((u) => !/\/auth\/login/.test(u.toString()), { timeout: 25000 }),
  page.press('input[type="password"], input[name="password"]', 'Enter'),
])

// Assert loudly. Silently shooting 21 pictures of the login form is the failure
// mode this guards against — every screenshot "succeeded" and every one was wrong.
if (/\/auth\/login/.test(page.url())) {
  throw new Error(`login failed — still at ${page.url()}`)
}
console.log(`logged in → ${page.url()}`)

// ---- switch to the demo brand, once -----------------------------------------
// `?brand=<handle>` is an explicit switch that the middleware persists to session.
await page.goto(`${BASE}/cp/dashboard?brand=demo`, { waitUntil: 'domcontentloaded' })
await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})

// ---- suppress the trial licensing banner ------------------------------------
// It is a modal on a trial install and would sit on top of every screenshot.
await page.addStyleTag({
  content: `
    [class*="licensing"], [class*="Licensing"],
    [data-licensing-alert], .licensing-alert { display: none !important; }
  `,
})

const dismiss = page.getByRole('button', { name: /snooze|dismiss|close/i }).first()
if (await dismiss.isVisible().catch(() => false)) {
  await dismiss.click().catch(() => {})
}

const state = await context.storageState()

// ---- shoot ------------------------------------------------------------------

const results = []

for (const shot of targets) {
  try {
    await page.goto(BASE + shot.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    await page.waitForTimeout(shot.settle ?? 900)

    // Re-apply on every page: the CP is an SPA and re-renders the banner.
    await page.addStyleTag({
      content: `
        [class*="licensing"], [class*="Licensing"],
        [data-licensing-alert], .licensing-alert { display: none !important; }
        *, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; }
      `,
    })

    // "Pro – Trial Mode" in the global header is true of this install and noise in
    // a manual. Hide the node, not the whole header.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('span, div, a')) {
        if (el.children.length === 0 && /trial mode/i.test(el.textContent ?? '')) {
          el.style.visibility = 'hidden'
        }
      }
    })

    if (shot.scrollTo) {
      // The CP scrolls an inner region, not the window, so scrolling `window`
      // silently does nothing. Find the tallest actually-scrollable element.
      await page.evaluate((y) => {
        window.scrollTo(0, y)
        const candidates = [...document.querySelectorAll('*')].filter((el) => {
          const s = getComputedStyle(el)
          return (
            el.scrollHeight > el.clientHeight + 200 &&
            /auto|scroll/.test(s.overflowY)
          )
        })
        candidates.sort((a, b) => b.scrollHeight - a.scrollHeight)
        candidates[0]?.scrollTo({ top: y, behavior: 'instant' })
      }, shot.scrollTo)
      await page.waitForTimeout(600)
    }

    if (shot.guard) {
      await shot.guard(page)
    }

    if (shot.prepare) {
      await shot.prepare(page)
    }

    const file = resolve(OUT, `${shot.name}.png`)
    await page.screenshot({ path: file, fullPage: false })

    const title = await page.title()

    // A session that lapsed mid-run would otherwise produce a folder full of
    // perfectly-captured login forms.
    if (/log in/i.test(title) || /\/auth\/login/.test(page.url())) {
      throw new Error(`bounced to login (session lost) at ${shot.url}`)
    }

    results.push({ name: shot.name, ok: true, title, url: shot.url })
    console.log(`  ok      ${shot.name.padEnd(36)} ${title}`)
  } catch (e) {
    results.push({ name: shot.name, ok: false, error: e.message, url: shot.url })
    console.log(`  FAIL    ${shot.name.padEnd(36)} ${e.message.split('\n')[0]}`)
  }
}

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} captured → ${OUT}`)
if (failed.length) {
  console.log('failed: ' + failed.map((f) => f.name).join(', '))
  process.exitCode = 1
}
