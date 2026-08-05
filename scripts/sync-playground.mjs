#!/usr/bin/env node
/**
 * Copies the Block Editor's build output into the playground.
 *
 * Same contract as `sync-art.mjs` and `sync-changelogs.mjs`: run it from a
 * machine that has the repo checked out next to this one, then commit the
 * result. The site is built on a server that does not have it.
 *
 *   node scripts/sync-playground.mjs [--repos=../]
 *
 * The two files are build output in their own repo, so a stale copy here is the
 * failure mode to guard against, not a missing one. That is why this refuses to
 * copy files older than the sources they were built from: `npm run build` in
 * the editor repo and no sync here would leave the playground demonstrating a
 * version of the editor that no longer exists.
 */

import { copyFile, mkdir, stat, access, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { tools } from '../.vitepress/addons.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOCS = resolve(HERE, '..')

const reposArg = process.argv.find((a) => a.startsWith('--repos='))
const REPOS = resolve(DOCS, reposArg ? reposArg.slice('--repos='.length) : '..')

const ASSETS = ['editor.js', 'editor.css']

const exists = async (p) => {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/**
 * What actually goes into the bundle. Deliberately not "every file in the
 * repo": artwork, the README and the changelog all change without affecting a
 * single byte of the output, and a guard that cries wolf over those is a guard
 * that gets ignored.
 */
const BUNDLE_SOURCES = ['components', 'lib', 'styles', 'scripts', 'package.json']

/** The newest mtime among the files the bundle is built from. */
const newestSourceMtime = async (repo) => {
  let newest = 0

  const walk = async (current) => {
    const entry = await stat(current)
    if (!entry.isDirectory()) {
      if (entry.mtimeMs > newest) newest = entry.mtimeMs
      return
    }
    for (const child of await readdir(current, { withFileTypes: true })) {
      if (child.name.startsWith('.')) continue
      await walk(resolve(current, child.name))
    }
  }

  for (const name of BUNDLE_SOURCES) {
    const path = resolve(repo, name)
    if (await exists(path)) await walk(path)
  }

  return newest
}

const problems = []
let copied = 0

for (const tool of tools) {
  if (!tool.playground) continue

  const repo = resolve(REPOS, tool.repo)
  const outDir = resolve(DOCS, 'public', 'playground', tool.slug)

  // A repo that is not checked out here says nothing about the assets — it says
  // this is the wrong machine to answer the question. Leave what is committed.
  if (!(await exists(repo))) {
    console.log(`  ${tool.slug}: repo not checked out here, left as it was`)
    continue
  }

  const sources = ASSETS.map((name) => resolve(repo, 'public', name))
  const missing = []
  for (const source of sources) {
    if (!(await exists(source))) missing.push(source)
  }
  if (missing.length) {
    problems.push(`${tool.slug}: no ${missing.join(', ')} — run \`npm run build\` there`)
    continue
  }

  const built = Math.min(...(await Promise.all(sources.map(async (s) => (await stat(s)).mtimeMs))))
  const edited = await newestSourceMtime(repo)

  if (edited > built) {
    problems.push(
      `${tool.slug}: public/editor.{js,css} are older than the sources they came from — ` +
        'run `npm run build` in the repo first',
    )
    continue
  }

  await mkdir(outDir, { recursive: true })
  for (const name of ASSETS) {
    await copyFile(resolve(repo, 'public', name), resolve(outDir, name))
    copied++
  }
  console.log(`  ${tool.slug.padEnd(14)} ← ${tool.repo}/public/{${ASSETS.join(',')}}`)
}

if (problems.length) {
  console.error(`\nsync-playground failed:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}

console.log(`\n${copied} file(s) copied.`)
