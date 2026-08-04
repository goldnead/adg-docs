#!/usr/bin/env node
/**
 * Copies each addon's CHANGELOG.md into its docs section.
 *
 * Run this from a machine that has the addon repos checked out next to this one,
 * then commit the result. The docs site is built on a server that does not have
 * them, so the generated pages are committed rather than produced at build time.
 *
 *   node scripts/sync-changelogs.mjs [--repos=../]
 */

import { readFile, writeFile, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { documented, repoDir } from '../.vitepress/addons.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOCS = resolve(HERE, '..')

const reposArg = process.argv.find((a) => a.startsWith('--repos='))
const REPOS = resolve(DOCS, reposArg ? reposArg.slice('--repos='.length) : '..')

const exists = async (p) => {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Escape `{{` outside fenced code blocks.
 *
 * VitePress applies `v-pre` to fenced blocks but not to inline code, so a
 * changelog entry mentioning `{{ marketing:subscribe }}` in backticks is handed
 * to the Vue compiler as an interpolation and fails the build.
 */
function escapeInterpolation(markdown) {
  let inFence = false

  return markdown
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence
        return line
      }
      return inFence ? line : line.replaceAll('{{', '&#123;&#123;')
    })
    .join('\n')
}

/**
 * Strip the leading H1 so the page's own heading is the only one, and demote
 * nothing else: a changelog's heading hierarchy is meaningful.
 */
function body(markdown) {
  return escapeInterpolation(markdown.replace(/^#\s+.*\n+/, '').trim())
}

const header = (addon, found) => `---
title: ${addon.name} changelog
editLink: false
---

# Changelog

<AddonHeader slug="${addon.slug}" />

${
  addon.package
    ? `Release notes for \`${addon.package}\`, as published with the package.`
    : `Release notes for [${addon.name}](${addon.source}), as published with the repository.`
}${
  found
    ? ''
    : `

::: warning Not yet synced
This page is generated from the addon repository's \`CHANGELOG.md\` by
\`scripts/sync-changelogs.mjs\`, and that file was not found when the site was
last built. Run the script from a checkout that has the addon repos as siblings.
:::`
}${
  addon.package
    ? `

Cross-version upgrade notes for the whole suite are in
[Upgrading](/guide/upgrading).`
    : ''
}

`

let synced = 0
let missing = []

for (const addon of documented) {
  const source = resolve(REPOS, repoDir(addon), 'CHANGELOG.md')
  const target = resolve(DOCS, addon.slug, 'changelog.md')

  if (await exists(source)) {
    const markdown = await readFile(source, 'utf8')
    await writeFile(target, `${header(addon, true)}${body(markdown)}\n`)
    synced++
    console.log(`  synced  ${addon.slug}  ←  ${repoDir(addon)}/CHANGELOG.md`)
  } else {
    // Only write the placeholder if there is nothing there already, so a manual
    // page is never clobbered by a run from the wrong directory.
    if (!(await exists(target))) {
      await writeFile(
        target,
        `${header(addon, false)}_No release notes available._\n`,
      )
    }
    missing.push(addon.slug)
    console.log(`  missing ${addon.slug}  (looked in ${source})`)
  }
}

console.log(`\n${synced} synced, ${missing.length} missing.`)
if (missing.length) {
  console.log(`Missing: ${missing.join(', ')}`)
}
