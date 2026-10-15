import Dexie from 'dexie'
import { exportData, importBackup } from './store.js'

// Cloud copy in a private GitHub gist. The phone stays the source of truth and works offline.
// A sync is always: pull the gist, merge it in (newer updatedAt wins), push back if different.
// Nothing is ever deleted, so merging both ways is safe.

const FILE = 'german-vocab.json'
const API = 'https://api.github.com'
const KEY = { token: 'gv:gistToken', gist: 'gv:gistId', last: 'gv:lastSync' }
const DEBOUNCE = 3000

const get = (k) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const set = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {}
}

// status: off | idle | syncing | offline | error
export const sync = $state({
  status: get(KEY.token) ? 'idle' : 'off',
  lastSync: Number(get(KEY.last)) || null,
  error: '',
  gistUrl: get(KEY.gist) ? `https://gist.github.com/${get(KEY.gist)}` : '',
})

class SyncError extends Error {}

async function gh(path, { method = 'GET', body } = {}) {
  const res = await fetch(API + path, {
    method,
    cache: 'no-store', // the API allows 60s of caching; a stale pull would hide other devices' edits
    headers: {
      Authorization: `Bearer ${get(KEY.token)}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) throw new SyncError('GitHub token is invalid or expired.')
  if (res.status === 403) throw new SyncError('GitHub refused the request. Check the token has the gist scope.')
  if (res.status === 404) return null
  if (!res.ok) throw new SyncError(`GitHub error ${res.status}.`)
  return res.json()
}

// Order-independent fingerprint of the data, ignoring exportedAt.
function canonical(data) {
  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  return JSON.stringify({
    chapters: [...data.chapters].sort(byId),
    words: [...data.words].sort(byId),
  })
}

async function snapshot() {
  const data = await exportData()
  data.chapters.sort((a, b) => a.createdAt - b.createdAt)
  data.words.sort((a, b) => a.createdAt - b.createdAt)
  return data
}

async function fileContent(gist) {
  const f = gist?.files?.[FILE]
  if (!f) return null
  if (!f.truncated) return f.content
  const res = await fetch(f.raw_url, { cache: 'no-store' })
  if (!res.ok) throw new SyncError(`Could not download the gist (${res.status}).`)
  return res.text()
}

// Reuses an existing German Vocab gist (another browser or device), or creates one.
async function findOrCreateGist() {
  for (let page = 1; page <= 10; page++) {
    const list = await gh(`/gists?per_page=100&page=${page}`)
    if (!list?.length) break
    const hit = list.find((g) => g.files?.[FILE])
    if (hit) return hit.id
  }
  const created = await gh('/gists', {
    method: 'POST',
    body: {
      description: 'German Vocab data (synced by the app)',
      public: false,
      files: { [FILE]: { content: JSON.stringify(await snapshot(), null, 1) } },
    },
  })
  return created.id
}

async function run({ pull }, retried = false) {
  let id = get(KEY.gist)
  if (!id) {
    id = await findOrCreateGist()
    set(KEY.gist, id)
    sync.gistUrl = `https://gist.github.com/${id}`
  }

  let remote = null
  if (pull) {
    const gist = await gh(`/gists/${id}`)
    if (!gist) {
      // Gist was deleted on GitHub: start over with a fresh one.
      if (retried) throw new SyncError('Could not find the gist on GitHub.')
      set(KEY.gist, null)
      return run({ pull }, true)
    }
    const text = await fileContent(gist)
    if (text) {
      importing = true
      try {
        await importBackup(text, 'merge')
      } finally {
        importing = false
      }
      remote = JSON.parse(text)
    }
  }

  const local = await snapshot()
  if (!remote || canonical(remote) !== canonical(local)) {
    const ok = await gh(`/gists/${id}`, {
      method: 'PATCH',
      body: { files: { [FILE]: { content: JSON.stringify(local, null, 1) } } },
    })
    if (!ok) {
      if (retried) throw new SyncError('Could not find the gist on GitHub.')
      set(KEY.gist, null)
      return run({ pull }, true)
    }
  }
}

let running = null
let again = false
let importing = false
let timer = null

// pull: false overwrites the gist with this phone's data (after "Replace all").
export function syncNow({ pull = true } = {}) {
  clearTimeout(timer)
  if (!get(KEY.token)) return Promise.resolve()
  if (running) {
    again = true
    return running
  }
  sync.status = 'syncing'
  sync.error = ''
  running = run({ pull })
    .then(() => {
      sync.status = 'idle'
      sync.lastSync = Date.now()
      set(KEY.last, String(sync.lastSync))
    })
    .catch((e) => {
      if (e instanceof SyncError) {
        sync.status = 'error'
        sync.error = e.message
      } else if (!navigator.onLine || e instanceof TypeError) {
        sync.status = 'offline' // fetch failed; the next sync catches up
      } else {
        console.error('sync failed', e)
        sync.status = 'error'
        sync.error = e.message || 'Sync failed.'
      }
    })
    .finally(() => {
      running = null
      if (again) {
        again = false
        schedule()
      }
    })
  return running
}

function schedule() {
  if (!get(KEY.token)) return
  clearTimeout(timer)
  timer = setTimeout(syncNow, DEBOUNCE)
}

export async function connect(token) {
  set(KEY.token, token.trim())
  set(KEY.gist, null)
  await syncNow()
  if (sync.status === 'error') disconnect(sync.error)
}

// Stops syncing. The data on the phone and in the gist are both kept.
export function disconnect(error = '') {
  clearTimeout(timer)
  set(KEY.token, null)
  set(KEY.gist, null)
  set(KEY.last, null)
  sync.status = 'off'
  sync.lastSync = null
  sync.gistUrl = ''
  sync.error = error
}

export function startSync() {
  // Every local write, including from other tabs. The sync's own merge is skipped (Dexie fires
  // this synchronously on commit, while importing is still true); an edit made mid-sync reruns it.
  Dexie.on('storagemutated', () => {
    if (importing) return
    if (running) again = true
    else schedule()
  })
  document.addEventListener('visibilitychange', () => {
    // Leaving: push now instead of waiting. Coming back: pull other devices' edits.
    if (get(KEY.token)) syncNow()
  })
  window.addEventListener('online', () => syncNow())
  syncNow()
}
