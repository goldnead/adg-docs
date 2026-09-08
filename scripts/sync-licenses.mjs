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

const { addons, tools, SALES, salesOf } = await import(REGISTRY)
const entries = [...addons, ...(tools ?? [])]

/**
 * The second half of the same honesty problem.
 *
 * `license` is checked against each package's composer.json. `sales` has no
 * composer.json to check against, but it does have a source: **Schedule A of
 * the EULA**, which is the contract a buyer actually signs. So it is read from
 * there, package name by package name, rather than trusted.
 *
 * The first version of this check only compared MIT against `free` and then
 * printed "26 sales entries consistent". That line claimed a check it had not
 * made: moving `consent` from `suite-only` to `marketplace` passed green, and
 * the site would then have told buyers to wait for a listing that is not
 * coming. That is the exact failure this whole field exists to remove.
 *
 * Checked here rather than in the component because a component that throws
 * fails the build with a stack trace from inside Vue. This says which slug.
 */
const salesProblems = []

/**
 * Schedule A, as four groups of Composer names.
 *
 * The schedule is markdown: three tables under bold headings, then a sentence
 * for the two packages that are not sold at all. Composer names are the only
 * thing read out of it, because they are the one identifier the contract and
 * the registry share.
 *
 * A schedule that cannot be found is an error, never an empty pass. The whole
 * point is that silence here used to look like agreement.
 *
 * @returns {Map<string, string>} composer name → sales key
 */
async function scheduleA() {
  const eula = await readFile(resolve(HERE, '../EULA.md'), 'utf8')
  const start = eula.indexOf('## Schedule A')

  if (start === -1) {
    throw new Error('EULA.md has no "## Schedule A" heading. Sales entries cannot be verified.')
  }

  const heading = (text) => {
    if (/marketplace/i.test(text)) return 'marketplace'
    if (/only in the suite/i.test(text)) return 'suite-only'
    if (/mit/i.test(text)) return 'free'
    if (/not currently sold/i.test(text)) return 'not-sold'

    return null
  }

  const expected = new Map()
  let current = null

  for (const line of eula.slice(start).split('\n')) {
    const bold = line.match(/^\*\*(.+?)\*\*\s*$/)

    if (bold) {
      current = heading(bold[1])
      continue
    }

    if (current === null) continue

    for (const [, name] of line.matchAll(/`(goldnead\/[a-z0-9-]+)`/g)) {
      expected.set(name, current)
    }
  }

  if (expected.size === 0) {
    throw new Error('Schedule A named no packages. The parser and the schedule have drifted apart.')
  }

  return expected
}

const schedule = await scheduleA()

for (const addon of addons) {
  if (! addon.package) continue

  const contract = schedule.get(addon.package)
  const sale = salesOf(addon.slug)

  if (contract === undefined) {
    salesProblems.push(`${addon.slug.padEnd(24)} is in the registry but not in Schedule A of EULA.md`)
    continue
  }

  if (contract !== sale) {
    salesProblems.push(
      `${addon.slug.padEnd(24)} sells as "${sale}", Schedule A puts it under "${contract}"`,
    )
  }
}

for (const [name] of schedule) {
  if (! addons.some((a) => a.package === name)) {
    salesProblems.push(`${name.padEnd(24)} is in Schedule A but not in the registry`)
  }
}

for (const addon of addons) {
  const sale = salesOf(addon.slug)

  if (sale === null) {
    salesProblems.push(`${addon.slug.padEnd(24)} has no entry in SALES_BY_SLUG`)
    continue
  }

  if (!SALES[sale]) {
    salesProblems.push(`${addon.slug.padEnd(24)} sells as "${sale}", which SALES does not define`)
    continue
  }

  const shouldBeFree = addon.license === 'MIT'

  if (shouldBeFree !== (sale === 'free')) {
    salesProblems.push(
      `${addon.slug.padEnd(24)} is ${addon.license} but sells as "${sale}"`,
    )
  }
}

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

for (const p of salesProblems) console.error(`  ✗ ${p}`)

if (!problems.length && !unreadable.length && !salesProblems.length) {
  // Say "incomplete" rather than "✓" when something was skipped: whoever reads
  // the output rather than the exit code must not read a tick as all-clear.
  if (missing.length) {
    console.warn(`… ${checked} licences match composer.json, ${missing.length} not verified`)
    process.exit(1)
  }
  console.log(`✓ ${checked} licences match composer.json, ${addons.length} sales entries match Schedule A`)
  process.exit(0)
}

// `--fix` rewrites licences from composer.json. It deliberately does not touch
// the sales field: there is no file to take the answer from, only the EULA, and
// a script that guessed one would be the hand-maintained value this whole
// mechanism exists to remove.
if (salesProblems.length) {
  console.error(`\n${salesProblems.length} sales problem(s). Fix SALES_BY_SLUG in .vitepress/addons.mjs against Schedule A of EULA.md, or fix the schedule.`)
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
