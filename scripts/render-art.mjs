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

import { documented, entryBySlug, repoDir } from '../.vitepress/addons.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOCS = resolve(HERE, '..')

const reposArg = process.argv.find((a) => a.startsWith('--repos='))
const REPOS = resolve(DOCS, reposArg ? reposArg.slice('--repos='.length) : '..')

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const all = process.argv.includes('--all')
/** Also render the Marketplace product image. See MARKETPLACE_CSS. */
const MARKETPLACE = process.argv.includes('--marketplace')

const slugs = all
  ? documented.map((a) => a.slug)
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
 * The Marketplace wants product images at roughly 1280x800; the covers are
 * 1200x630, the Open Graph shape. 1.6:1 against 1.905:1 is not a rescale, so
 * this is a second render of the same template rather than a resized file.
 *
 * It is an override sheet rather than a second template because all twelve
 * covers share one class structure, and a duplicated layout would drift the
 * first time one of them is edited. Only the canvas, the gutters and the glyph
 * change — the extra 170px of height is absorbed by the existing centring, and
 * font sizes are deliberately left alone because they differ per addon
 * (Identity Contracts runs its heading at 64px to fit the longest name in the
 * suite, and a blanket override would break exactly that).
 *
 * Statamic crops and squishes these a little, so nothing important should sit
 * near the outermost edges — hence wider gutters, not narrower.
 */
const MARKETPLACE_CSS = `
  html, body { width: 1280px !important; height: 800px !important; }
  .wrap { padding: 0 96px !important; }
  .glyph { width: 400px !important; height: 400px !important; }
`

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

  const entry = entryBySlug(slug)
  const art = resolve(REPOS, entry ? repoDir(entry) : `statamic-${slug}`, 'art')

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

    if (MARKETPLACE) {
      const mp = await browser.newPage({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      await mp.goto(pathToFileURL(coverHtml).href, { waitUntil: 'networkidle' })
      await mp.addStyleTag({ content: MARKETPLACE_CSS })
      // The first image in a product's list becomes its card in every listing,
      // so the filename carries the order.
      await mp.screenshot({ path: resolve(art, 'marketplace', '01-cover.png') })
      await mp.close()
      rendered++
      console.log(`  product ${slug}  →  art/marketplace/01-cover.png  (1280×800)`)
    }
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
