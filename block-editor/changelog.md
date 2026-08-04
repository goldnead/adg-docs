---
title: Block Editor changelog
editLink: false
---

# Changelog

<AddonHeader slug="block-editor" />

Release notes for [Block Editor](https://github.com/goldnead/block-editor), as published with the repository.

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Search and replace inside the editor (`⌘F` / `Ctrl+F`).
- A link command in the slash menu, backed by the host's `resolveLinks`
  callback.
- Wiki-link chips for `backlog`, `contact` and `page` targets alongside the
  existing `task`, `project` and `file` kinds.
- MIT licence, and this changelog.

### Changed

- The embedded stylesheet is compiled without Tailwind's preflight, so it can no
  longer reset the page it is mounted into.
- Borderless, transparent editor chrome with minimal padding, so the editor
  takes the surrounding page's appearance rather than imposing its own.
- Form elements inside the editor are reset in a scoped rule, which removes the
  OS default button chrome from the menus and the drag handle.

### Removed

- The `@google/genai` and `firebase-tools` dependencies, the `GEMINI_API_KEY`
  example environment file, and the Gemini capability flag in `metadata.json`.
  None of them were used: the editor makes no network calls of its own. They
  were left over from the project scaffold.
- The unused `@hookform/resolvers`, `class-variance-authority`, `motion`,
  `@tailwindcss/typography` and `tw-animate-css` dependencies.
