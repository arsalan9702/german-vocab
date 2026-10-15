<script>
  import { route } from './lib/router.svelte.js'
  import { app } from './lib/data.svelte.js'
  import TabBar from './components/TabBar.svelte'
  import Toasts from './components/Toasts.svelte'
  import Chapters from './routes/Chapters.svelte'
  import Chapter from './routes/Chapter.svelte'
  import WordView from './routes/WordView.svelte'
  import WordForm from './routes/WordForm.svelte'
  import Placeholder from './routes/Placeholder.svelte'

  const r = $derived(route())
  const showGrain = new URLSearchParams(location.search).get('grain') !== '0'
</script>

{#if showGrain}<div class="grain" aria-hidden="true"></div>{/if}

<header class="topbar">
  <span class="dot r"></span>
  <span class="dot y"></span>
  <span class="dot g"></span>
  <span class="topbar-title">German Vocab</span>
</header>

<div class="shell">
  {#if app.ready}
    {#key r.key}
      <div class="view">
        {#if r.name === 'chapters'}
          <Chapters />
        {:else if r.name === 'chapter'}
          <Chapter id={r.id} />
        {:else if r.name === 'word'}
          <WordView id={r.id} />
        {:else if r.name === 'add'}
          <WordForm presetChapter={r.query.get('chapter')} />
        {:else if r.name === 'edit'}
          <WordForm editId={r.id} />
        {:else if r.name === 'search'}
          <Placeholder title="Search" note="Search across all chapters is coming soon." />
        {:else if r.name === 'settings'}
          <Placeholder title="Settings" note="Backup and restore are coming soon." />
        {:else if r.name === 'study'}
          <Placeholder
            title="Study"
            note="Study mode is coming soon."
            backHref={`/chapter/${r.id}`}
            backLabel="Back to chapter"
          />
        {:else}
          <Placeholder title="Not found" note="That page does not exist." />
        {/if}
      </div>
    {/key}
  {:else}
    <main class="page">
      <p class="hint">Loading…</p>
    </main>
  {/if}
</div>

<TabBar name={r.name} />
<Toasts />