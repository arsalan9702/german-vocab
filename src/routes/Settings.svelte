<script>
  import { chapterStats } from '../lib/data.svelte.js'
  import { exportData, importBackup, parseBackup, backupFilename, ValidationError } from '../lib/store.js'
  import { portal } from '../lib/portal.js'
  import { toast } from '../lib/toast.svelte.js'

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
