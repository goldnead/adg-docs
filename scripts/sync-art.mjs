#!/usr/bin/env node
/**
 * Copies each addon's icon and cover into the docs site, and derives the
 * per-addon accent colours from the icons themselves.
 *
 * Same contract as `sync-changelogs.mjs`: run this from a machine that has the
 * addon repos checked out next to this one, then commit the result. The site is
 * built on a server that does not have them, so the assets are committed rather
 * than fetched at build time.
 *
 *   node scripts/sync-art.mjs [--repos=../]
 *
 * Three things come out of a run:
 *
 *   public/art/<slug>/{icon.svg,cover.png}   the assets themselves
 *   .vitepress/art.generated.mjs             the colour table, for components
 *   .vitepress/theme/art.generated.css       the same table as CSS custom
 *                                            properties, scoped per addon
 *
 * The colour table is generated rather than hand-maintained because the icon is
 * already the source of truth for an addon's colour, and a hand-copied hex has
 * nothing keeping it honest when the icon is redrawn.
 */

import { copyFile, mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { addons } from '../.vitepress/addons.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOCS = resolve(HERE, '..')

const reposArg = process.argv.find((a) => a.startsWith('--repos='))
const REPOS = resolve(DOCS, reposArg ? reposArg.slice('--repos='.length) : '..')

/**
 * Text on these backgrounds has to clear WCAG AA. Both values are what the
 * VitePress default theme actually paints behind body copy.
 */
const LIGHT_BG = '#ffffff'
const DARK_BG = '#1b1b1f'
const MIN_CONTRAST = 4.5

/**
 * Webhook Manager names its icon `logo.svg`. Rather than rename a file in a
 * released package, the exception is recorded here.
 */
const ICON_FILENAMES = ['icon.svg', 'logo.svg']

const exists = async (p) => {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------- colour maths

const hexToRgb = (hex) => {
  const h = hex.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
}

const rgbToHex = ([r, g, b]) =>
  '#' +
  [r, g, b]
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, c)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')

const srgbToLinear = (c) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

const linearToSrgb = (c) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055

/** Relative luminance, WCAG 2.1 definition. */
const luminance = (rgb) => {
  const [r, g, b] = rgb.map(srgbToLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// sRGB ⇄ OKLab. Lightness is adjusted in OKLab because shifting it there keeps
// the hue and the chroma the eye reads as "the addon's colour"; the same move in
// HSL drifts noticeably towards grey on the saturated icons.

const rgbToOklab = (rgb) => {
  const [r, g, b] = rgb.map(srgbToLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

const oklabToRgb = ([L, a, bb]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * bb) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(linearToSrgb)
}

/**
 * Walk the colour's lightness towards `direction` until it clears MIN_CONTRAST
 * against `bg`, and return the first value that does.
 *
 * Returns null if the whole range fails, which is the caller's signal to stop
 * the build rather than ship unreadable link text.
 */
function findReadable(hex, bg, direction) {
  const target = hexToRgb(bg)
  const [, a, b] = rgbToOklab(hexToRgb(hex))
  const start = rgbToOklab(hexToRgb(hex))[0]

  for (let step = 0; step <= 100; step++) {
    const L = start + direction * step * 0.01
    if (L < 0 || L > 1) break
    const candidate = oklabToRgb([L, a, b])
    // Out-of-gamut candidates are clamped by rgbToHex; re-read the clamped
    // value so the contrast we assert is the contrast that ships.
    const clamped = hexToRgb(rgbToHex(candidate))
    if (contrast(clamped, target) >= MIN_CONTRAST) {
      return { hex: rgbToHex(candidate), contrast: contrast(clamped, target) }
    }
  }
  return null
}

/** Nudge a colour further along the same axis, for the hover state. */
function nudge(hex, direction, by = 0.07) {
  const [L, a, b] = rgbToOklab(hexToRgb(hex))
  return rgbToHex(oklabToRgb([Math.min(1, Math.max(0, L + direction * by)), a, b]))
}

const rgba = (hex, alpha) => {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.round(c * 255))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Black or white, whichever is legible on top of `hex`. */
const readableOn = (hex) => {
  const rgb = hexToRgb(hex)
  return contrast(rgb, hexToRgb('#1a1a1a')) >= contrast(rgb, hexToRgb('#ffffff'))
    ? '#1a1a1a'
    : '#ffffff'
}

// ------------------------------------------------------------------- the work

const stopsFrom = (svg) => {
  const stops = [...svg.matchAll(/stop-color="(#[0-9A-Fa-f]{3,6})"/g)].map(
    (m) => m[1],
  )
  return stops.length >= 2 ? [stops[0], stops[1]] : null
}

const palette = {}
const problems = []
const absent = []
let copied = 0

for (const addon of addons) {
  const repo = resolve(REPOS, `statamic-${addon.slug}`)
  const outDir = resolve(DOCS, 'public', 'art', addon.slug)

  // Two different situations that must not be conflated. A repo that is not
  // checked out on this machine says nothing about whether the addon has art —
  // it says this is the wrong machine to answer the question, so leave whatever
  // is already in public/art/ alone and carry on. An addon whose repo IS here
  // and has no art is a real gap, and that one stops the run.
  if (!(await exists(repo))) {
    absent.push(addon.slug)
    if (await exists(resolve(outDir, 'icon.svg'))) {
      const svg = await readFile(resolve(outDir, 'icon.svg'), 'utf8')
      const stops = stopsFrom(svg)
      if (stops) {
        const light = findReadable(stops[0], LIGHT_BG, -1)
        const dark = findReadable(stops[0], DARK_BG, +1)
        if (light && dark) {
          palette[addon.slug] = {
            from: stops[0],
            to: stops[1],
            light: light.hex,
            dark: dark.hex,
          }
        }
      }
    }
    continue
  }

  let iconSource = null
  for (const name of ICON_FILENAMES) {
    const candidate = resolve(repo, 'art', name)
    if (await exists(candidate)) {
      iconSource = candidate
      break
    }
  }

  const coverSource = resolve(repo, 'art', 'cover.png')

  if (!iconSource) {
    problems.push(`${addon.slug}: no art/${ICON_FILENAMES.join(' or art/')}`)
    continue
  }
  if (!(await exists(coverSource))) {
    problems.push(`${addon.slug}: no art/cover.png`)
    continue
  }

  await mkdir(outDir, { recursive: true })
  await copyFile(iconSource, resolve(outDir, 'icon.svg'))
  await copyFile(coverSource, resolve(outDir, 'cover.png'))
  copied += 2

  const svg = await readFile(iconSource, 'utf8')
  const stops = stopsFrom(svg)
  if (!stops) {
    problems.push(`${addon.slug}: icon has no two-stop gradient to read`)
    continue
  }

  const [from, to] = stops
  // Derive from the first stop: it is the lighter, more saturated end and the
  // colour a reader associates with the icon at thumbnail size.
  const light = findReadable(from, LIGHT_BG, -1)
  const dark = findReadable(from, DARK_BG, +1)

  if (!light) {
    problems.push(`${addon.slug}: ${from} cannot reach ${MIN_CONTRAST}:1 on white`)
    continue
  }
  if (!dark) {
    problems.push(
      `${addon.slug}: ${from} cannot reach ${MIN_CONTRAST}:1 on ${DARK_BG}`,
    )
    continue
  }

  palette[addon.slug] = { from, to, light: light.hex, dark: dark.hex }

  console.log(
    `  ${addon.slug.padEnd(19)} ${from} → ${to}   ` +
      `light ${light.hex} (${light.contrast.toFixed(1)}:1)   ` +
      `dark ${dark.hex} (${dark.contrast.toFixed(1)}:1)`,
  )
}

if (absent.length) {
  console.log(
    `\n${absent.length} repo(s) not checked out here, left as they were:\n` +
      `  ${absent.join(', ')}\n` +
      'Clone them next to this one and run again to pick their art up.',
  )
}

if (problems.length) {
  console.error(`\nsync-art failed:\n  ${problems.join('\n  ')}`)
  console.error(
    '\nEvery registered addon needs art/icon.svg (or art/logo.svg) and\n' +
      'art/cover.png. Draw the missing ones, render with scripts/render-art.mjs,\n' +
      'then run this again. Shipping an addon without art is not an option the\n' +
      'site can render around.',
  )
  process.exit(1)
}

const generated = `/**
 * GENERATED by scripts/sync-art.mjs — do not edit.
 *
 * \`from\`/\`to\` are the icon's gradient stops, used for decorative surfaces.
 * \`light\`/\`dark\` are the same hue pushed until it clears ${MIN_CONTRAST}:1 against the
 * page background of each mode, and are the only values safe for text.
 */

export const ART = ${JSON.stringify(palette, null, 2)}

/** Public path to an addon's icon. */
export const iconPath = (slug) => \`/art/\${slug}/icon.svg\`

/** Public path to an addon's cover. */
export const coverPath = (slug) => \`/art/\${slug}/cover.png\`
`

await writeFile(resolve(DOCS, '.vitepress', 'art.generated.mjs'), generated)

/**
 * The same table as CSS, keyed off `data-addon` on <html>.
 *
 * Overriding VitePress's own brand variables is what makes the whole chrome —
 * active sidebar item, links, code accents, buttons — pick up the addon's
 * colour without any component knowing it happened.
 */
const css = `/**
 * GENERATED by scripts/sync-art.mjs — do not edit.
 *
 * \`data-addon\` is set on <html>: server-side by \`transformHtml\` in config.mts
 * so the first paint is already correct, and again on client-side navigation by
 * \`theme/Layout.vue\`.
 */

${Object.entries(palette)
  .map(([slug, c]) => {
    const lightHover = nudge(c.light, -1)
    const darkHover = nudge(c.dark, +1)
    return `html[data-addon='${slug}'] {
  --gn-accent-from: ${c.from};
  --gn-accent-to: ${c.to};
  --vp-c-brand-1: ${c.light};
  --vp-c-brand-2: ${lightHover};
  --vp-c-brand-3: ${c.from};
  --vp-c-brand-soft: ${rgba(c.from, 0.16)};
  --vp-button-brand-bg: ${c.from};
  --vp-button-brand-hover-bg: ${c.to};
  --vp-button-brand-active-bg: ${c.to};
  --vp-button-brand-text: ${readableOn(c.from)};
  --vp-button-brand-hover-text: ${readableOn(c.to)};
}

html.dark[data-addon='${slug}'] {
  --vp-c-brand-1: ${c.dark};
  --vp-c-brand-2: ${darkHover};
  --vp-c-brand-3: ${c.to};
  --vp-c-brand-soft: ${rgba(c.dark, 0.16)};
}`
  })
  .join('\n\n')}
`

await writeFile(resolve(DOCS, '.vitepress', 'theme', 'art.generated.css'), css)

console.log(
  `\n${copied} asset(s) copied, ${Object.keys(palette).length} palette entries written.`,
)
