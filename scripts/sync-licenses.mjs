#!/usr/bin/env node
/**
 * Checks the registry's `license` field against each addon's own composer.json.
 *
 * Same contract as `sync-art.mjs` and `sync-changelogs.mjs`: run it from a
 * machine that has the addon repos checked out next to this one.
 *
 *   node scripts/sync-licenses.mjs [--repos=../] [--fix]
 *
 * Why this exists. On 2026-08-29 the site told the world that Webhook Manager,
 * LeadHub, Marketing, Lead Magnets, Email Templates and Events were MIT. All six
 * had been proprietary since the August release round, and Flow Canvas was
 * listed the other way round. A hand-copied licence has nothing keeping it
 * honest, exactly like the hand-copied accent colours that `sync-art.mjs`
 * replaced. This is the thing that keeps it honest.
 *
 * A wrong licence on this page is not a typo: a reader can build a client
 * project on a package they believe is free.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REGISTRY = resolve(HERE, '../.vitepress/addons.mjs')

const args = process.argv.slice(2)
const fix = args.includes('--fix')
const reposArg = args.find((a) => a.startsWith('--repos='))
const REPOS = resolve(HERE, '..', reposArg ? reposArg.slice('--repos='.length) : '..')

/**
 * composer's SPDX-ish field to the word the site shows.
 *
 * Anything that is not a plain string is refused rather than labelled. Mapping
 * "not MIT" to Commercial would quietly pass a package whose `license` key went
 * missing altogether, and a green run has to mean the field was read.
 */
const label = (spdx) => {
  if (typeof spdx !== 'string' || !spdx.trim()) return null
  return spdx === 'MIT' ? 'MIT' : 'Commercial'
}

const { addons, tools } = await import(REGISTRY)
const entries = [...addons, ...(tools ?? [])]

const problems = []
const missing = []
const unreadable = []

for (const entry of entries) {
  // Only Composer packages have a licence field to compare against. The
  // registry also carries tools (block-editor is an npm package with no
  // composer.json); skipping them is correct, not a gap.
  if (!entry.package) continue

  const dir = entry.package.split('/')[1]
  let composer
  try {
    composer = JSON.parse(await readFile(join(REPOS, dir, 'composer.json'), 'utf8'))
  } catch {
    // A repo that is not checked out here cannot be verified. Say so rather
    // than passing it silently: a green run must mean every entry was seen.
    missing.push(entry.slug)
    continue
  }

  const actual = label(composer.license)
  if (actual === null) {
    unreadable.push({ slug: entry.slug, value: JSON.stringify(composer.license) })
    continue
  }
  if (actual !== entry.license) {
    problems.push({ slug: entry.slug, site: entry.license, composer: composer.license, actual })
  }
}

for (const slug of missing) console.warn(`  ? ${slug.padEnd(24)} no checkout under ${REPOS}, not verified`)
for (const u of unreadable) console.error(`  ! ${u.slug.padEnd(24)} composer.json license is ${u.value}, not a string`)

const checked = entries.filter((e) => e.package).length - missing.length - unreadable.length

if (!problems.length && !unreadable.length) {
  // Say "incomplete" rather than "✓" when something was skipped: whoever reads
  // the output rather than the exit code must not read a tick as all-clear.
  if (missing.length) {
    console.warn(`… ${checked} licences match composer.json, ${missing.length} not verified`)
    process.exit(1)
  }
  console.log(`✓ ${checked} licences match composer.json`)
  process.exit(0)
}

for (const p of problems) {
  console.error(`  ✗ ${p.slug.padEnd(24)} site says ${p.site}, composer.json says ${p.composer}`)
}

if (!fix || !problems.length) {
  if (problems.length) console.error(`\n${problems.length} mismatch(es). Re-run with --fix to rewrite the registry.`)
  process.exit(1)
}

let source = await readFile(REGISTRY, 'utf8')
for (const p of problems) {
  // Stay inside this addon's object literal. A greedy dot with the `s` flag
  // would happily run past the next `slug:` and rewrite the following addon's
  // licence if this one had no `license` field.
  const pattern = new RegExp(`(slug: '${p.slug}',(?:(?!slug: ')[\\s\\S])*?license: ')([^']+)(')`)
  const match = pattern.exec(source)
  if (!match) throw new Error(`could not locate the license line for ${p.slug}`)
  source = source.slice(0, match.index + match[1].length) + p.actual + source.slice(match.index + match[1].length + match[2].length)
}
await writeFile(REGISTRY, source)
console.error(`\nrewrote ${problems.length} entr${problems.length === 1 ? 'y' : 'ies'} in .vitepress/addons.mjs`)
console.error('Re-run without --fix to confirm.')
