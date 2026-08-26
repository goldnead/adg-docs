# Installation

<AddonHeader />

<Requirements statamic="6.0+, for the Control Panel UI package" laravel="whatever the host requires" database="Not used" />

You do not install this directly. It arrives as a dependency of
[Automations](/automations/) or [Funnels](/funnels/), and there is nothing to do
afterwards: no migration, no publish, no config.

The rest of this page is for a **host addon** that wants to consume it.

## Composer, then npm

The Composer package carries the JavaScript. Its `src/` holds one class, so Composer has
something to autoload and a host can assert the package is installed without reaching into
a vendor path.

```bash
composer require goldnead/statamic-flow-canvas
```

The JavaScript is consumed the same way `@statamic/cms` is, as a file dependency pointing
into `vendor/`:

```json
"dependencies": {
    "@goldnead/flow-canvas": "file:./vendor/goldnead/statamic-flow-canvas/resources/js",
    "@statamic/cms": "file:./vendor/statamic/cms/resources/dist-package",
    "@vue-flow/background": "^1.3.0",
    "@vue-flow/controls": "^1.1.2",
    "@vue-flow/core": "^1.41.0",
    "@vue-flow/minimap": "^1.5.0"
}
```

**Composer therefore has to run before npm**, exactly as it already does for
`@statamic/cms`.

## The peer dependencies are yours

`vue` and the four `@vue-flow/*` packages are peer dependencies. The host owns them, so
that there is one copy of the flow library and one Vue on the page.

The package carries them as devDependencies as well, purely so its own files resolve
outside a host. That is what makes the next section necessary.

## Two lines of Vite config

```js
export default defineConfig({
    resolve: {
        preserveSymlinks: true,
        dedupe: ['vue', '@vue-flow/core', '@vue-flow/background', '@vue-flow/controls', '@vue-flow/minimap'],
    },
    // …
});
```

**`preserveSymlinks`** — the package is installed from a Composer path and linked by npm,
so its files sit outside the project. Without this, `vue`, `@vue-flow/*` and
`@statamic/cms` cannot be resolved from there, and they must resolve *here* so the page
ends up with one of each.

**`dedupe`** — without it a build can end up with two copies of the flow library. The
store one instance registers is then invisible to the other, and the canvas dies at setup
with `Cannot destructure property 'getState' of undefined`.

## The stylesheets

Two, both exported by the package:

```js
import '@goldnead/flow-canvas/canvas.css';
import '@goldnead/flow-canvas/canvas-theme.css';
```

They moved into the package in 1.0.2 so that two hosts cannot drift apart on the look of
the same canvas.

Vue Flow's own stylesheets are placed in the CSS `base` layer since 1.0.3. Unlayered CSS
outranks every layer, so `@vue-flow/minimap`'s fixed light background used to beat any
themed rule a host wrote — and not only inside the addon that built the bundle, because
the Control Panel loads **every** addon's stylesheet on **every** page.

## Statamic 6 build gotchas

The same two that bite every addon in this family:

- Statamic 6 reads an addon's Vite config **only** from the service provider's `$vite`
  property. `extra.statamic.vite` in `composer.json` is ignored.
- `@statamic/cms`'s Vite plugin needs `@vitejs/plugin-vue` in the project that resolves
  it, not in the addon.

## Licence

MIT.
