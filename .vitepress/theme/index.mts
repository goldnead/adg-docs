import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'

import AddonGrid from './AddonGrid.vue'
import AddonHeader from './AddonHeader.vue'
import Figure from './Figure.vue'
import Layout from './Layout.vue'
import LicenceTable from './LicenceTable.vue'
import MaturityTable from './MaturityTable.vue'
import Playground from './Playground.vue'
import Requirements from './Requirements.vue'
import SalesGroup from './SalesGroup.vue'
import SuiteMosaic from './SuiteMosaic.vue'

import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('AddonGrid', AddonGrid)
    app.component('AddonHeader', AddonHeader)
    app.component('Figure', Figure)
    app.component('LicenceTable', LicenceTable)
    app.component('MaturityTable', MaturityTable)
    app.component('Playground', Playground)
    app.component('Requirements', Requirements)
    app.component('SalesGroup', SalesGroup)
    app.component('SuiteMosaic', SuiteMosaic)
  },
} satisfies Theme
