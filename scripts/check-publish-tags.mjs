#!/usr/bin/env node
/**
 * Checks the `vendor:publish` list in `guide/installation.md` against the code.
 *
 * Same contract as `sync-licenses.mjs`: run it from a machine that has the addon
 * repos checked out next to this one.
 *
 *   node scripts/check-publish-tags.mjs [--repos=../] [--list]
 *
 * Why this exists. The page listed twelve tags while the table above it listed
 * twenty-six addons, and the fourteen missing ones were not a decision: nobody
 * had gone and looked. Worse, the tip under the list named two addons as the
 * exceptions whose tag does not follow their slug. There are four, and the two
 * it missed had been that way since they were written.
 *
 * A published tag that does not exist fails with "Unable to locate publishable
 * resources", which reads like a broken install rather than a wrong manual.
 *
 * `--list` prints the block as it should read, so the page is regenerated from
 * the code rather than corrected by hand.
 */

import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { addons } from '../.vitepress/addons.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOCS = resolve(HERE, '..')
const PAGE = join(DOCS, 'guide/installation.md')

const args = process.argv.slice(2)
const listOnly = args.includes('--list')
const reposArg = args.find((a) => a.startsWith('--repos='))
const REPOS = resolve(DOCS, reposArg ? reposArg.slice('--repos='.length) : '..')

/**
 * The addon's slug, the way Statamic works it out.
 *
 * `extra.statamic.slug` when it is there, otherwise the package name after the
 * slash. This matters more than it looks: the automatic config tag is built
 * from the **slug**, not from the config file's name, so an addon whose slug
 * and config file disagree gets no automatic tag at all and has to register
 * one. Four of them do, and two of those were undocumented.
 *
 * See `statamic/cms/src/Addons/Addon.php` and `Manifest.php`.
 */
function slugOf(composer) {
  const declared = composer?.extra?.statamic?.slug

  if (typeof declared === 'string' && declared.trim() !== '') {
    return declared.trim()
  }

  return String(composer.name).split('/')[1]
}

/**
 * The config tag an addon really answers to.
 *
 * Two sources, in this order:
 *
 * 1. An explicit `publishes([... config ...], 'tag')` in a service provider.
 *    That always wins, because it is what the addon actually registered.
 * 2. Otherwise Statamic's automatic one, `{slug}-config`, and **only** when
 *    `config/{slug}.php` exists. `AddonServiceProvider::bootConfig()` builds the
 *    filename from the slug and returns early when the file is not there.
 *
 * `null` means the addon has nothing to publish, which is a real answer and not
 * a gap: Products and Flow Canvas ship no config file at all.
 *
 * @returns {Promise<{tag: string|null, source: string}>}
 */
async function configTag(dir) {
  const composer = JSON.parse(await readFile(join(REPOS, dir, 'composer.json'), 'utf8'))
  const slug = slugOf(composer)

  let files = []
  try {
    files = await readdir(join(REPOS, dir, 'src'))
  } catch {
    return { tag: null, source: 'no src/ directory' }
  }

  for (const file of files.filter((f) => f.endsWith('.php'))) {
    const php = await readFile(join(REPOS, dir, 'src', file), 'utf8')

    // The `publishes` call whose payload mentions a config path. Non-greedy up
    // to the closing bracket so a provider with several publishes calls does
    // not have them collapse into one match.
    for (const [, payload, tag] of php.matchAll(/publishes\(\s*\[([\s\S]*?)\]\s*,\s*'([^']+)'/g)) {
      if (/config\//.test(payload) && /config_path\(/.test(payload)) {
        return { tag, source: `src/${file}` }
      }
    }
  }

  try {
    await readFile(join(REPOS, dir, 'config', `${slug}.php`), 'utf8')

    return { tag: `${slug}-config`, source: `automatic, config/${slug}.php matches slug "${slug}"` }
  } catch {
    return { tag: null, source: 'no config file under the addon slug' }
  }
}

const expected = []
const unreadable = []

for (const addon of addons) {
  const dir = `statamic-${addon.slug}`

  try {
    const { tag, source } = await configTag(dir)

    if (tag !== null) expected.push({ slug: addon.slug, tag, source })
  } catch (e) {
    // A repo that is not checked out cannot be verified, and saying nothing
    // would let a green run mean less than it looks.
    unreadable.push(`${addon.slug.padEnd(20)} ${e.message}`)
  }
}

expected.sort((a, b) => a.tag.localeCompare(b.tag))

if (listOnly) {
  for (const e of expected) console.log(`php artisan vendor:publish --tag=${e.tag}`)
  process.exit(0)
}

/** The tags the page tells a reader to run. */
const page = await readFile(PAGE, 'utf8')
const documented = [...page.matchAll(/--tag=([a-z0-9-]+)/g)].map(([, t]) => t)

const problems = []

for (const { slug, tag } of expected) {
  if (! documented.includes(tag)) {
    problems.push(`${tag.padEnd(32)} missing from the page (${slug})`)
  }
}

for (const tag of documented) {
  if (! expected.some((e) => e.tag === tag)) {
    problems.push(`${tag.padEnd(32)} on the page, but no addon registers it`)
  }
}

for (const line of unreadable) console.warn(`  ? ${line}`)
for (const p of problems) console.error(`  ✗ ${p}`)

if (problems.length) {
  console.error(`\n${problems.length} problem(s). Regenerate the block with --list and paste it into guide/installation.md.`)
  process.exit(1)
}

if (unreadable.length) {
  console.warn(`… ${expected.length} publish tags match the code, ${unreadable.length} not verified`)
  process.exit(1)
}

console.log(`✓ ${expected.length} publish tags match the code`)
