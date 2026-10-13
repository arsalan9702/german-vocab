<script>
  import { wordById, chapterById } from '../lib/data.svelte.js'
  import { setStatus, STATUS } from '../lib/store.js'
  import Flashcard from '../components/Flashcard.svelte'
  import Smiley from '../components/Smiley.svelte'

  let { id } = $props()

  const word = wordById(id)
  const chapter = $derived(word.value ? chapterById(word.value.chapterId).value : undefined)

  let flipped = $state(false)

  async function toggleStatus() {
    const w = word.value
    await setStatus(w.id, w.status === STATUS.KNOWN ? STATUS.LEARNING : STATUS.KNOWN)
  }
</script>

{#if word.value}
  {@const w = word.value}
  {@const c = chapter}
  <main class="page">
    <section class="head">
      <a class="back" href={c ? '#/chapter/' + c.id : '#/'}>‹ {c ? c.title : 'Chapters'}</a>
      <div class="row">
        <span class="tag" class:tilt-l={w.status === 'known'} class:tilt-r={w.status !== 'known'}>
          {w.status === 'known' ? 'Known' : 'Learning'}
        </span>
      </div>
    </section>

    <Flashcard de={w.de} deExample={w.deExample} en={w.en} enExample={w.enExample} bind:flipped />

    <p class="hint">Tap the card to flip</p>

    <section class="row">
      <button class="btn {w.status === 'known' ? '' : 'green'}" onclick={toggleStatus}>
        {w.status === 'known' ? 'Mark as learning' : 'Mark as known'}
      </button>
      <a class="btn cyan" href={'#/edit/' + w.id}>Edit</a>
    </section>
  </main>
{:else}
  <main class="page">
    <section class="empty">
      <Smiley size={96} />
      <p class="t-serif">Word not found</p>
      <a class="btn" href="#/">Back to chapters</a>
    </section>
  </main>
{/if}