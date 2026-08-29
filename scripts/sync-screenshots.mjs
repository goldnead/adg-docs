#!/usr/bin/env node
/**
 * Copies screenshots that already live in the addon repos into the docs.
 *
 * Same contract as `sync-art.mjs` and `sync-changelogs.mjs`: run it from a
 * machine that has the repos checked out next to this one, then commit the
 * result. The site is built on a server that does not have them.
 *
 *   node scripts/sync-screenshots.mjs [--repos=../]
 *
 * The map is explicit rather than derived, and it has to be: every repo named
 * its files differently (`01-payments-listing.png`, `dialog-dark.png`,
 * `banner.png`), while the docs want one shape, `<addon>-<screen>.png`. A
 * clever rule would guess wrong on the next repo; a table says out loud which
 * picture is which and fails visibly when a source is renamed.
 *
 * `shoot-screenshots.mjs` remains the way to capture what no repo ships.
 */

import { copyFile, mkdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOCS = resolve(HERE, '..')
const OUT = resolve(DOCS, 'public/screenshots')

const reposArg = process.argv.find((a) => a.startsWith('--repos='))
const REPOS = resolve(DOCS, reposArg ? reposArg.slice('--repos='.length) : '..')

/** `statamic-<repo>/<from>` → `public/screenshots/<to>.png` */
const MAP = [
  ['consent', 'docs/banner.png', 'consent-banner'],
  ['consent', 'docs/mobile.png', 'consent-banner-mobile'],
  ['consent', 'docs/dialog.png', 'consent-dialog'],
  ['consent', 'docs/dialog-dark.png', 'consent-dialog-dark'],
  ['consent', 'docs/cp-banner.png', 'consent-cp-banner'],
  ['consent', 'docs/cp-services.png', 'consent-cp-services'],
  ['consent', 'docs/cp-services-dark.png', 'consent-cp-services-dark'],

  ['funnels', 'screenshots/01-funnel-editor.png', 'funnels-editor'],
  ['funnels', 'screenshots/02-funnel-graph.png', 'funnels-graph'],
  ['funnels', 'screenshots/03-offer-step.png', 'funnels-offer-step'],

  ['payments', 'screenshots/01-payments-listing.png', 'payments-listing'],
  ['payments', 'screenshots/02-payments-dark.png', 'payments-listing-dark'],
  ['payments', 'screenshots/03-payments-unfulfilled.png', 'payments-unfulfilled'],
  ['payments', 'screenshots/04-follow-up-offer.png', 'payments-follow-up-offer'],

  ['insights', 'screenshots/01-revenue-overview.png', 'insights-revenue'],
  ['insights', 'screenshots/02-revenue-dark.png', 'insights-revenue-dark'],
  ['insights', 'screenshots/03-attribution.png', 'insights-attribution'],
  ['insights', 'screenshots/04-contact-revenue.png', 'insights-contact-revenue'],

  ['offers', 'screenshots/01-offers-listing.png', 'offers-listing'],
  ['offers', 'screenshots/02-offer-editor.png', 'offers-editor'],

  ['booking', 'screenshots/01-bookings-listing.png', 'booking-listing'],
  ['booking', 'screenshots/02-bookings-dark.png', 'booking-listing-dark'],
  ['booking', 'screenshots/03-bookings-filter.png', 'booking-filter'],
]

await mkdir(OUT, { recursive: true })

let copied = 0
const missing = []

for (const [repo, from, to] of MAP) {
  const src = resolve(REPOS, `statamic-${repo}`, from)
  const dest = resolve(OUT, `${to}.png`)

  try {
    await stat(src)
  } catch {
    missing.push(`statamic-${repo}/${from}`)
    continue
  }

  await copyFile(src, dest)
  console.log(`  copied  ${to}.png  ←  statamic-${repo}/${from}`)
  copied++
}

console.log(`\n${copied} copied, ${missing.length} missing.`)

if (missing.length) {
  console.log('\nMissing sources — renamed or removed upstream:')
  missing.forEach((m) => console.log(`  ${m}`))
  process.exitCode = 1
}
