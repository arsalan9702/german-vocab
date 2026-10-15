<script>
  import { chapterStats } from '../lib/data.svelte.js'
  import { exportData, importBackup, parseBackup, backupFilename, ValidationError } from '../lib/store.js'
  import { portal } from '../lib/portal.js'
  import { toast } from '../lib/toast.svelte.js'
  import { sync, syncNow, connect, disconnect } from '../lib/sync.svelte.js'

  const LAST_KEY = 'gv:lastBackup'

  const counts = $derived(
    chapterStats.value.reduce((a, c) => ({ chapters: a.chapters + 1, words: a.words + c.total }), {
      chapters: 0,
      words: 0,
    }),
  )

  let lastBackup = $state(readLast())
  let persisted = $state(null)
  let busy = $state(false)
  let pending = $state(null) // { text, name, chapters, words, invalid }
  let result = $state(null)
  let confirming = $state(false)

  let token = $state('')
  let connecting = $state(false)
  let now = $state(Date.now())
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 30_000)
    return () => clearInterval(t)
  })

  const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=German%20Vocab'

  function ago(t) {
    const s = Math.max(0, Math.round((now - t) / 1000))
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)} min ago`
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`
    return fmt(new Date(t))
  }

  async function link(e) {
    e.preventDefault()
    if (connecting || !token.trim()) return
    connecting = true
    await connect(token)
    connecting = false
    if (sync.status !== 'off') {
      token = ''
      toast('Cloud sync is on')
    }
  }

  navigator.storage?.persisted?.().then((p) => (persisted = p)).catch(() => {})

  function readLast() {
    try {
      const v = Number(localStorage.getItem(LAST_KEY))
      return v ? new Date(v) : null
    } catch {
      return null
    }
  }

  const fmt = (d) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  function download(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFilename()
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    try {
      localStorage.setItem(LAST_KEY, String(Date.now()))
    } catch {}
    lastBackup = new Date()
  }

  async function backup() {
    if (busy) return
    busy = true
    try {
      download(await exportData())
      toast('Backup downloaded')
    } catch (e) {
      console.error(e)
      toast('Could not create the backup', 'error')
    } finally {
      busy = false
    }
  }

  async function pick(e) {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = '' // so the same file can be picked again
    if (!file) return
    result = null
    try {
      const text = await file.text()
      const parsed = parseBackup(text)
      pending = {
        text,
        name: file.name,
        chapters: parsed.chapters.length,
        words: parsed.words.length,
        invalid: parsed.invalid,
      }
    } catch (err) {
      pending = null
      toast(err instanceof ValidationError ? err.message : 'Could not read the file', 'error')
    }
  }

  async function restore(mode) {
    if (busy || !pending) return
    busy = true
    try {
      // Replace wipes everything, so the current data is always downloaded first.
      if (mode === 'replace') download(await exportData())
      result = await importBackup(pending.text, mode)
      // Otherwise the next sync would merge the replaced data back in from the gist.
      if (mode === 'replace') syncNow({ pull: false })
      pending = null
      confirming = false
      toast(mode === 'replace' ? 'Data replaced' : 'Backup merged')
    } catch (err) {
      console.error(err)
      toast(err instanceof ValidationError ? err.message : 'Restore failed. Nothing was changed.', 'error')
    } finally {
      busy = false
    }
  }

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && !busy && (confirming = false)} />

<main class="page">
  <section class="head">
    <div class="t-script title-script">Your</div>
    <h1 class="t-display t-hero title-hero">SETTINGS</h1>
  </section>

  <section class="card accent-green panel">
    <h2 class="panel-title">Cloud sync</h2>
    {#if sync.status === 'off'}
      <p>
        Keep a copy in a private GitHub gist. It updates a few seconds after every change and when you
        open the app.
      </p>
      <ol class="steps">
        <li>
          <a class="link" href={TOKEN_URL} target="_blank" rel="noopener">Create a GitHub token</a>
          (the gist scope is already ticked; pick any expiry).
        </li>
        <li>Paste it below. It is stored only on this phone.</li>
      </ol>
      <form class="panel" onsubmit={link}>
        <input
          class="input"
          type="password"
          bind:value={token}
          placeholder="ghp_…"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
        />
        <button class="btn white" type="submit" disabled={connecting || !token.trim()}>
          {connecting ? 'Connecting…' : 'Connect'}
        </button>
      </form>
      {#if sync.error}<p class="field-error">{sync.error}</p>{/if}
    {:else}
      <p class="sync-line">
        <span class="status-dot" class:known={sync.status === 'idle'} class:bad={sync.status === 'error'}></span>
        {#if sync.status === 'syncing'}
          Syncing…
        {:else if sync.status === 'offline'}
          Offline. Changes upload when you're back online.
        {:else if sync.status === 'error'}
          Sync failed
        {:else}
          Synced {sync.lastSync ? ago(sync.lastSync) : ''}
        {/if}
      </p>
      {#if sync.status === 'error'}<p class="field-error">{sync.error}</p>{/if}
      {#if sync.gistUrl}
        <a class="link" href={sync.gistUrl} target="_blank" rel="noopener">Open the gist</a>
      {/if}
      <div class="row">
        <button class="btn white" onclick={() => syncNow()} disabled={sync.status === 'syncing'}>
          Sync now
        </button>
        <button class="btn sm white" onclick={() => disconnect()}>Disconnect</button>
      </div>
    {/if}
  </section>

  <section class="card accent-cyan panel">
    <h2 class="panel-title">Backup</h2>
    <p>
      Your vocab lives only on this phone: {plural(counts.chapters, 'chapter')},
      {plural(counts.words, 'word')}.
    </p>
    <p class="muted">
      Last backup: {lastBackup ? fmt(lastBackup) : 'never'}
    </p>
    {#if persisted === false}
      <p class="warn">
        Safari may delete this data if you don't open the app for 7 days. Back up regularly.
      </p>
    {/if}
    <button class="btn white" onclick={backup} disabled={busy}>Download backup</button>
  </section>

  <section class="card accent-yellow panel">
    <h2 class="panel-title">Restore</h2>
    <p>Load a backup file. You choose how to apply it before anything changes.</p>
    <label class="btn white" class:disabled={busy}>
      Choose backup file
      <input class="file-input" type="file" accept="application/json,.json" onchange={pick} />
    </label>

    {#if pending}
      <div class="panel-box">
        <p class="file-name">{pending.name}</p>
        <p>
          {plural(pending.chapters, 'chapter')}, {plural(pending.words, 'word')}
          {#if pending.invalid}· {pending.invalid} unreadable, will be skipped{/if}
        </p>
        <p class="muted">
          Merge keeps everything you have and takes the newer version of anything in both.
          Replace deletes all current data first.
        </p>
        <div class="row">
          <button class="btn cyan" onclick={() => restore('merge')} disabled={busy}>Merge</button>
          <button class="btn pink" onclick={() => (confirming = true)} disabled={busy}>
            Replace all
          </button>
          <button class="btn sm white" onclick={() => (pending = null)} disabled={busy}>Cancel</button>
        </div>
      </div>
    {/if}

    {#if result}
      <div class="panel-box">
        <p class="file-name">Restore finished</p>
        <p>
          Added {plural(result.chaptersAdded, 'chapter')} and {plural(result.wordsAdded, 'word')}.
          Updated {plural(result.chaptersUpdated, 'chapter')} and {plural(result.wordsUpdated, 'word')}.
        </p>
        {#if result.unchanged || result.skipped}
          <p class="muted">
            {result.unchanged} already up to date{#if result.skipped}, {result.skipped} skipped{/if}.
          </p>
        {/if}
      </div>
    {/if}
  </section>
</main>

{#if confirming && pending}
  <div use:portal>
    <button
      class="scrim"
      aria-label="Close dialog"
      tabindex="-1"
      onclick={() => !busy && (confirming = false)}
    ></button>
    <div class="dialog card accent-pink" role="dialog" aria-modal="true" aria-label="Replace all data">
      <div class="dialog-form">
        <h2 class="t-display dialog-title">Replace all data?</h2>
        <p>
          This deletes your {plural(counts.chapters, 'chapter')} and {plural(counts.words, 'word')}
          and loads {plural(pending.chapters, 'chapter')} and {plural(pending.words, 'word')} from the
          file.
        </p>
        <p>A backup of your current data downloads first.</p>
        <div class="row">
          <button class="btn white" onclick={() => (confirming = false)} disabled={busy}>Cancel</button>
          <button class="btn" onclick={() => restore('replace')} disabled={busy}>
            Back up and replace
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
