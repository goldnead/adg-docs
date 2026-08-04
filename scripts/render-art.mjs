#!/usr/bin/env node
/**
 * Renders an addon's art templates to PNG.
 *
 * The ten addons that already have art were produced this way: `art/cover.html`
 * is a self-contained 1200x630 page with the icon inlined as SVG, screenshotted
 * headless. This script is that step, written down, so the two addons that had
 * no art can join the same system and a future addon does not need the
 * procedure reinvented.
 *
 * Playwright is already a devDependency here for `shoot-screenshots.mjs`, which
 * is why the renderer lives in the docs repo rather than in each addon.
 *
 *   node scripts/render-art.mjs identity-contracts suppression
 *   node scripts/render-art.mjs --all
 *   node scripts/render-art.mjs suite
 *
 * Writes `art/cover.png` (1200x630) and `art/icon.png` (512x512) next to the
 * sources it finds. Missing sources are reported, not fabricated.
 *
 * `suite` is the exception: it renders this repo's own `art/suite-cover.html`
 * to `public/art/suite-cover.png`, the share image for every page that does not
 * belong to one addon. Run it after `sync-art.mjs`, because the template reads
 * the icons out of `public/art/`.
 */

import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

import { chromium } from 'playwright'

import { addons } from '../.vitepress/addons.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOCS = resolve(HERE, '..')

const reposArg = process.argv.find((a) => a.startsWith('--repos='))
const REPOS = resolve(DOCS, reposArg ? reposArg.slice('--repos='.length) : '..')

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const all = process.argv.includes('--all')

const slugs = all
  ? addons.map((a) => a.slug)
  : requested.length
    ? requested
    : []

if (!slugs.length) {
  console.error(
    'Usage: node scripts/render-art.mjs <slug> [<slug>…]\n' +
      '       node scripts/render-art.mjs --all',
  )
  process.exit(1)
}

const exists = async (p) => {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/**
 * The icon PNG is rendered from the SVG rather than from a second template, so
 * the two can never drift. The SVG is inlined into a bare page at its own size
 * with a transparent background.
 */
const iconPage = (svg) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; }
  html, body { width: 512px; height: 512px; background: transparent; }
  svg { display: block; width: 512px; height: 512px; }
</style></head><body>${svg}</body></html>`

const browser = await chromium.launch()
let rendered = 0
const skipped = []

for (const slug of slugs) {
  if (slug === 'suite') {
    const source = resolve(DOCS, 'art', 'suite-cover.html')
    if (!(await exists(source))) {
      skipped.push('suite: no art/suite-cover.html')
      continue
    }
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    })
    await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' })
    await page.screenshot({
      path: resolve(DOCS, 'public', 'art', 'suite-cover.png'),
    })
    await page.close()
    rendered++
    console.log(`  cover   suite  →  public/art/suite-cover.png  (1200×630)`)
    continue
  }

  const art = resolve(REPOS, `statamic-${slug}`, 'art')

  // Cover: 1200x630 from the HTML template.
  const coverHtml = resolve(art, 'cover.html')
  if (await exists(coverHtml)) {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    })
    await page.goto(pathToFileURL(coverHtml).href, { waitUntil: 'networkidle' })
    await page.screenshot({ path: resolve(art, 'cover.png') })
    await page.close()
    rendered++
    console.log(`  cover   ${slug}  →  art/cover.png  (1200×630)`)
  } else {
    skipped.push(`${slug}: no art/cover.html`)
  }

  // Icon: 512x512 from the SVG, transparent background.
  const iconSvg = resolve(art, 'icon.svg')
  if (await exists(iconSvg)) {
    const page = await browser.newPage({
      viewport: { width: 512, height: 512 },
      deviceScaleFactor: 1,
    })
    await page.setContent(iconPage(await readFile(iconSvg, 'utf8')), {
      waitUntil: 'networkidle',
    })
    await page.screenshot({
      path: resolve(art, 'icon.png'),
      omitBackground: true,
    })
    await page.close()
    rendered++
    console.log(`  icon    ${slug}  →  art/icon.png   (512×512)`)
  } else {
    skipped.push(`${slug}: no art/icon.svg`)
  }
}

await browser.close()

console.log(`\n${rendered} file(s) rendered.`)
if (skipped.length) {
  console.log(`Skipped:\n  ${skipped.join('\n  ')}`)
}
