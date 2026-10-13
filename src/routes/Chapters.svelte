<script>
  import { chapterStats as chapters, hasChapter, until } from '../lib/data.svelte.js'
  import { createChapter } from '../lib/store.js'
  import { go } from '../lib/router.svelte.js'
  import { toast } from '../lib/toast.svelte.js'
  import ChapterDialog from '../components/ChapterDialog.svelte'
  import Smiley from '../components/Smiley.svelte'

  const accents = ['cyan', 'yellow', 'pink', 'green']
  let creating = $state(false)

  const totals = $derived(
    chapters.value.reduce(
      (a, c) => ({ words: a.words + c.total, known: a.known + c.known }),
      { words: 0, known: 0 },
    ),
  )
</script>

<main class="page">
  <section class="head">
    <div class="t-script title-script">Your</div>
    <h1 class="t-display t-hero title-hero">CHAPTERS</h1>
    {#if chapters.ready && chapters.value.length}
      <p class="stat-line">
        {chapters.value.length} chapters · {totals.words} words · {totals.known} known
      </p>
    {/if}
  </section>

  {#if chapters.ready}
    {#if chapters.value.length === 0}
      <section class="empty">
        <Smiley size={110} />
        <p class="t-serif">No chapters yet</p>
        <button class="btn" onclick={() => (creating = true)}>Create your first chapter</button>
      </section>
    {:else}
      <button class="btn cyan" onclick={() => (creating = true)}>New chapter</button>

      <section class="chapter-list">
        {#each chapters.value as c, i (c.id)}
          <a
            class="card chapter-card accent-{accents[i % accents.length]}"
            href={'#/chapter/' + c.id}
          >
            <div class="row between">
              <h2 class="chapter-title">{c.title}</h2>
              <span class="tag tilt-r">{c.total} {c.total === 1 ? 'word' : 'words'}</span>
            </div>
            <div
              class="bar"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax={c.total}
              aria-valuenow={c.known}
              style="--p: {c.total ? c.known / c.total : 0}"
            >
              <i></i>
            </div>
            <p class="chapter-meta">{c.known} known of {c.total}</p>
          </a>
        {/each}
      </section>
    {/if}
  {/if}
</main>

{#if creating}
  <ChapterDialog
    heading="New chapter"
    label="Create"
    action={async (name) => {
      const c = await createChapter(name)
      await until(() => hasChapter(c.id))
      return c
    }}
    onclose={() => (creating = false)}
    ondone={(c) => {
      creating = false
      toast('Chapter created')
      go('/chapter/' + c.id)
    }}
  />
{/if}