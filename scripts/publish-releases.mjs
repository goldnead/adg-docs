#!/usr/bin/env node
/**
 * Turns each addon's CHANGELOG.md into GitHub Releases.
 *
 * The Statamic Marketplace builds a product's changelog from its **GitHub
 * Releases**, not from CHANGELOG.md. A checkout can have twenty-seven tags and a
 * meticulous changelog and still list with an empty one — which on 2026-08-04
 * was the state of five of the eight paid packages, and a badly stale one for
 * `toc`, the only package already selling.
 *
 * The notes already exist and are good. This only moves them.
 *
 *   node scripts/publish-releases.mjs                  # dry run, everything
 *   node scripts/publish-releases.mjs leadhub toc      # dry run, two repos
 *   node scripts/publish-releases.mjs --apply          # actually create them
 *
 * Dry run is the default because this writes to public repositories and a
 * hundred-odd releases is not a thing to discover you got wrong afterwards.
 *
 * Existing releases are never touched. Re-running is safe and is the intended
 * way to use it after tagging: it creates only what is missing.
 */

import { readFile, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { documented, repoDir } from '../.vitepress/addons.mjs'

const run = promisify(execFile)

const HERE = dirname(fileURLToPath(import.meta.url))
const DOCS = resolve(HERE, '..')

const reposArg = process.argv.find((a) => a.startsWith('--repos='))
const REPOS = resolve(DOCS, reposArg ? reposArg.slice('--repos='.length) : '..')

const APPLY = process.argv.includes('--apply')
/** Print the notes that would be posted, instead of just the tag names. */
const PREVIEW = process.argv.includes('--preview')
const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'))

const exists = async (p) => {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Pull the version out of a `##` heading.
 *
 * Twelve repos written over three years do not agree on a format. All of these
 * occur:
 *
 *   ## 1.8.2 — 2026-08-01        automations, marketing
 *   ## [1.0.1] - 2026-01-14      webhook-manager, leadhub (Keep a Changelog)
 *   ## 2026-08-01 v2.1.0         toc (date first)
 *   ## v1.10                     toc (two-part, not valid semver)
 *   ## Unreleased                everywhere
 *
 * Rather than teach the parser five shapes, scan the heading for the first
 * dotted number. A date cannot match it — `2026-08-01` is hyphen-separated —
 * and a heading with no version at all is Unreleased by definition.
 */
const versionIn = (heading) => heading.match(/\bv?(\d+(?:\.\d+)+)\b/)?.[1] ?? null

/** Split a changelog into `{ version, body }`, newest first. */
function parseChangelog(markdown) {
  const out = []
  let current = null

  for (const line of markdown.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/)

    if (heading && !line.startsWith('###')) {
      if (current) out.push(current)

      const version = versionIn(heading[1])
      current = version ? { version, lines: [] } : null
      continue
    }

    if (current) current.lines.push(line)
  }

  if (current) out.push(current)

  return out
    .map(({ version, lines }) => ({ version, body: lines.join('\n').trim() }))
    .filter((r) => r.body)
}

/**
 * Prefix top-level bullets with the Marketplace's badge markers.
 *
 * Statamic renders `- [new]` and `- [fix]` as badges. The section heading is
 * what says which one applies, so the transform is scoped to bullets sitting
 * directly under an Added/Fixed heading and leaves prose, nested bullets and
 * fenced code exactly as written — these changelogs carry real explanations and
 * are worth more intact than badged.
 */
function addBadges(body) {
  let badge = null
  let inFence = false

  return body
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence
        return line
      }
      if (inFence) return line

      const heading = line.match(/^###\s+(.+)$/)
      if (heading) {
        const text = heading[1].toLowerCase()
        if (/^(added|new|feature)/.test(text)) badge = '[new]'
        else if (/^(fixed|fix|bug)/.test(text)) badge = '[fix]'
        else badge = null
        return line
      }

      if (badge && /^- (?!\[(new|fix)\])/.test(line)) {
        return line.replace(/^- /, `- ${badge} `)
      }
      return line
    })
    .join('\n')
}

const git = async (cwd, args) => (await run('git', args, { cwd })).stdout.trim()

async function tagsFor(cwd) {
  const local = await git(cwd, ['tag'])
  return new Set(local.split('\n').filter(Boolean))
}

async function releasedTags(cwd) {
  try {
    const { stdout } = await run(
      'gh',
      ['release', 'list', '--limit', '300', '--json', 'tagName'],
      { cwd },
    )
    return new Set(JSON.parse(stdout).map((r) => r.tagName))
  } catch (e) {
    throw new Error(`gh release list failed: ${e.stderr || e.message}`)
  }
}

/** The tag that carries a changelog version. Tags here use a `v` prefix. */
const tagFor = (version, tags) =>
  [`v${version}`, version].find((t) => tags.has(t)) ?? null

const targets = documented.filter((e) =>
  requested.length ? requested.includes(e.slug) : true,
)

let created = 0
let skipped = 0
const notes = []

for (const entry of targets) {
  const cwd = resolve(REPOS, repoDir(entry))
  const changelog = resolve(cwd, 'CHANGELOG.md')

  if (!(await exists(changelog))) {
    notes.push(`${entry.slug}: no CHANGELOG.md`)
    continue
  }

  const releases = parseChangelog(await readFile(changelog, 'utf8'))
  const tags = await tagsFor(cwd)
  const already = await releasedTags(cwd)

  const missing = []
  const untagged = []

  for (const { version, body } of releases) {
    const tag = tagFor(version, tags)
    if (!tag) {
      untagged.push(version)
      continue
    }
    if (already.has(tag)) {
      skipped++
      continue
    }
    missing.push({ tag, version, body: addBadges(body) })
  }

  if (untagged.length) {
    notes.push(
      `${entry.slug}: ${untagged.length} changelog entr${untagged.length === 1 ? 'y has' : 'ies have'} no matching tag (${untagged.slice(0, 4).join(', ')}${untagged.length > 4 ? ', …' : ''})`,
    )
  }

  if (!missing.length) {
    console.log(`  ${entry.slug.padEnd(20)} nothing to do`)
    continue
  }

  console.log(
    `  ${entry.slug.padEnd(20)} ${missing.length} missing: ${missing.map((m) => m.tag).join(' ')}`,
  )

  if (PREVIEW) {
    for (const { tag, version, body } of missing) {
      console.log(
        `\n${'─'.repeat(72)}\n${entry.slug} · tag ${tag} · title "${version}"\n${'─'.repeat(72)}\n${body}\n`,
      )
    }
  }

  if (!APPLY) continue

  // Oldest first, so the newest release ends up flagged "Latest".
  for (const { tag, version, body } of [...missing].reverse()) {
    try {
      await run(
        'gh',
        ['release', 'create', tag, '--title', version, '--notes', body, '--verify-tag'],
        { cwd },
      )
      created++
      console.log(`      created ${tag}`)
    } catch (e) {
      notes.push(`${entry.slug} ${tag}: ${(e.stderr || e.message).trim().split('\n')[0]}`)
    }
  }
}

console.log(
  APPLY
    ? `\n${created} release(s) created, ${skipped} already existed.`
    : `\nDry run — nothing was written. ${skipped} release(s) already exist. Re-run with --apply.`,
)

if (notes.length) console.log(`\nNotes:\n  ${notes.join('\n  ')}`)
