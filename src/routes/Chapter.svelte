<script>
  import { chapterById, wordsOf } from '../lib/data.svelte.js'
  import { renameChapter } from '../lib/store.js'
  import { toast } from '../lib/toast.svelte.js'
  import ChapterDialog from '../components/ChapterDialog.svelte'
  import Smiley from '../components/Smiley.svelte'
  import { genderOf } from '../lib/gender.js'

  let { id } = $props()

  const chapter = chapterById(id)
  const words = wordsOf(id)

  let filter = $state('all')
  let renaming = $state(false)

  const total = $derived(words.value.length)
  const known = $derived(words.value.filter((w) => w.status === 'known').length)
  const shown = $derived(
    filter === 'all' ? words.value : words.value.filter((w) => w.status === filter),
  )
  const chips = $derived([
    ['all', 'All', total],
    ['learning', 'Learning', total - known],
    ['known', 'Known', known],
  ])
</script>

{#if chapter.value}
  <main class="page">
    <section class="head">
      <a class="back" href="#/">‹ Chapters</a>
      <h1 class="t-display t-hero yellow title-hero sm">{chapter.value.title}</h1>
      <div class="row">
        <span class="tag tilt-r">{known} / {total} known</span>
        <button class="btn sm white" onclick={() => (renaming = true)}>Rename</button>
      </div>
    </section>

    <div
      class="bar"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax={total}
      aria-valuenow={known}
      style="--p: {total ? known / total : 0}"
    >
      <i></i>
    </div>

    <section class="row">
      {#if total > 0}
        <a class="btn" href={'#/study/' + id}>Study</a>
      {:else}
        <button class="btn" disabled>Study</button>
      {/if}
      <a class="btn cyan" href={'#/add?chapter=' + id}>Add word</a>
    </section>

    {#if total === 0}
      <section class="empty">
        <Smiley size={96} />
        <p class="t-serif">No words in this chapter yet</p>
      </section>
    {:else}
      <div class="chips" role="group" aria-label="Filter words">
        {#each chips as [key, label, n] (key)}
          <button class="chip" aria-pressed={filter === key} onclick={() => (filter = key)}>
            {label} {n}
          </button>
        {/each}
      </div>

      {#if shown.length === 0}
        <p class="hint">No words match this filter.</p>
      {:else}
        <ul class="word-list">
          {#each shown as w (w.id)}
            <li>
              <a class="word-row g-{genderOf(w.de) ?? 'none'}" href={'#/word/' + w.id}>
                <span class="status-dot" class:known={w.status === 'known'}></span>
                <span class="word-text">
                  <span class="word-de">{w.de}</span>
                  <span class="word-en">{w.en}</span>
                </span>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </main>

  {#if renaming}
    <ChapterDialog
      heading="Rename chapter"
      initial={chapter.value.title}
      action={(name) => renameChapter(id, name)}
      onclose={() => (renaming = false)}
      ondone={() => {
        renaming = false
        toast('Chapter renamed')
      }}
    />
  {/if}
{:else if chapter.ready}
  <main class="page">
    <section class="empty">
      <Smiley size={96} />
      <p class="t-serif">Chapter not found</p>
      <a class="btn" href="#/">Back to chapters</a>
    </section>
  </main>
{/if}