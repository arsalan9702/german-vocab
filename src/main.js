import '@fontsource/lilita-one/latin-400.css'
import '@fontsource/yellowtail/latin-400.css'
import '@fontsource/playfair-display/latin-900-italic.css'
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'
import './app.css'
import './screens.css'

import { mount } from 'svelte'
import App from './App.svelte'
import { db } from './lib/db.js'
import * as store from './lib/store.js'

store.requestPersistence()

// Console access for testing on desktop. Stripped from production builds.
if (import.meta.env.DEV) {
  window.db = db
  window.store = store
}

export default mount(App, { target: document.getElementById('app') })