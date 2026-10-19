<script>
  import { searchWords, chapterById } from '../lib/data.svelte.js'
  import { genderOf } from '../lib/gender.js'

  let { initial = '' } = $props()

  let q = $state(initial)
  let input = $state()

  const results = $derived(searchWords(q))
  const chapterTitle = (id) => chapterById(id).value?.title ?? ''

  // Focus only on a fresh search; coming Back to results should not pop the keyboard.
  $effect(() => {
    if (!initial) input?.focus()
  })

  // Keep the query in the URL so Back from a word returns to these results.
  // replaceState fires no hashchange, so the page is not rebuilt and the input keeps focus.
  $effect(() => {
    const t = q.trim()
    const hash = t ? '#/search?q=' + encodeURIComponent(t) : '#/search'
    if (location.hash !== hash) history.replaceState(history.state, '', hash)
  })
</script>

<main class="page">
  <section class="head">
    <div class="t-script title-script">Find a</div>
    <h1 class="t-display t-hero title-hero">WORD</h1>
  </section>

  <form class="search-form" role="search" onsubmit={(e) => (e.preventDefault(), input?.blur())}>
    <input
      class="input"
      type="search"
      bind:this={input}
      bind:value={q}
      placeholder="German or English"
      aria-label="Search words"
      autocomplete="off"
      autocapitalize="none"
      autocorrect="off"
      spellcheck="false"
      enterkeyhint="search"
    />
  </form>

  {#if !q.trim()}
    <p class="hint">Umlauts are optional: strasse finds Straße.</p>
  {:else if results.length === 0}
    <p class="hint">No words match "{q.trim()}".</p>
  {:else}
    <ul class="word-list">
      {#each results as w (w.id)}
        <li>
          <a class="word-row g-{genderOf(w.de) ?? 'none'}" href={'#/word/' + w.id}>
            <span class="status-dot" class:known={w.status === 'known'}></span>
            <span class="word-text">
              <span class="word-de">{w.de}</span>
              <span class="word-en">{w.en}</span>
              <span class="word-chapter">{chapterTitle(w.chapterId)}</span>
            </span>
          </a>
        </li>
      {/each}
    </ul>
    {#if results.length === 50}<p class="hint">Showing the best 50 matches.</p>{/if}
  {/if}
</main>
