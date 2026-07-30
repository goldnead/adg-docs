import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'

import AddonGrid from './AddonGrid.vue'
import AddonHeader from './AddonHeader.vue'
import Requirements from './Requirements.vue'

import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('AddonGrid', AddonGrid)
    app.component('AddonHeader', AddonHeader)
    app.component('Requirements', Requirements)
  },
} satisfies Theme
