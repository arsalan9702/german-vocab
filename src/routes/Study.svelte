<script>
  import { chapterById, wordsOf } from '../lib/data.svelte.js'
  import { setStatus, STATUS } from '../lib/store.js'
  import { toast } from '../lib/toast.svelte.js'
  import Flashcard from '../components/Flashcard.svelte'
  import Smiley from '../components/Smiley.svelte'

  let { id } = $props()

  const MODE_KEY = 'gv:studyMode'
  const chapter = chapterById(id)
  const words = wordsOf(id)

  const total = $derived(words.value.length)
  const learningCount = $derived(words.value.filter((w) => w.status !== STATUS.KNOWN).length)

  function savedMode() {
    try {
      return localStorage.getItem(MODE_KEY) === 'learning' ? 'learning' : 'all'
    } catch {
      return 'all'
    }
  }

  // Fisher-Yates. Every session is shuffled, so order never becomes a memory cue.
  function shuffle(list) {
    const a = [...list]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  // The deck is a snapshot: marking a card known never reshuffles the session.
  const build = (m) =>
    shuffle(m === 'learning' ? words.value.filter((w) => w.status !== STATUS.KNOWN) : words.value)

  let mode = $state(savedMode())
  let deck = $state.raw(build(mode))
  let index = $state(0)
  let result = $state({ known: 0, learning: 0 })

  const card = $derived(deck[index])
  const done = $derived(index >= deck.length)

  function start(m) {
    mode = m
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {}
    deck = build(m)
    index = 0
    result = { known: 0, learning: 0 }
    dx = 0
    leaving = false
  }

  /* ---------- Swipe ---------- */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let el = $state()
  let dx = $state(0)
  let dragging = $state(false)
  let leaving = false
  let moved = false
  let x0 = 0
  let y0 = 0
  let lastX = 0
  let lastT = 0
  let vx = 0

  function decide(status) {
    if (leaving || !card) return
    leaving = true
    const w = card
    result[status === STATUS.KNOWN ? 'known' : 'learning']++
    if (w.status !== status) {
      setStatus(w.id, status).catch((e) => {
        console.error(e)
        toast('Could not save', 'error')
      })
    }
    dragging = false
    dx = (status === STATUS.KNOWN ? 1 : -1) * window.innerWidth * 1.2
    setTimeout(
      () => {
        index++
        dx = 0
        leaving = false
      },
      reduced ? 0 : 200,
    )
  }

  // One gesture core. Touch drives it through touch events, which iOS lets us keep by
  // preventing touchmove; pointer events there get cancelled when Safari claims the pan.
  // The mouse drives it through pointer events.
  let axis = null // null until decided, then 'x' (ours) or 'y' (page scroll)
  let active = false

  function begin(x, y, t) {
    if (leaving) return
    active = true
    axis = null
    moved = false
    x0 = lastX = x
    y0 = y
    lastT = t
    vx = 0
  }

  // Returns true while the gesture is a horizontal drag.
  function track(x, y, t) {
    if (!active || axis === 'y') return false
    const d = x - x0
    if (!axis) {
      const ax = Math.abs(d)
      const ay = Math.abs(y - y0)
      if (ax < 8 && ay < 8) return false
      axis = ax > ay ? 'x' : 'y'
      if (axis === 'y') return false
      moved = true
      dragging = true
    }
    if (t > lastT) vx = (x - lastX) / (t - lastT)
    lastX = x
    lastT = t
    dx = d
    return true
  }

  function finish() {
    if (!active) return
    active = false
    if (axis !== 'x') return
    dragging = false
    const far = Math.abs(dx) > el.offsetWidth * 0.3
    const fast = Math.abs(vx) > 0.5 && Math.sign(vx) === Math.sign(dx)
    if (far || fast) decide(dx > 0 ? STATUS.KNOWN : STATUS.LEARNING)
    else dx = 0
  }

  function abort() {
    if (!active) return
    active = false
    dragging = false
    if (!leaving) dx = 0
  }

  // Touch. Attached directly to the card: Svelte's ontouchmove is passive and cannot preventDefault.
  function touch(node) {
    const start = (e) => {
      const t = e.touches[0]
      if (e.touches.length === 1) begin(t.clientX, t.clientY, e.timeStamp)
      else abort()
    }
    const move = (e) => {
      const t = e.touches[0]
      if (track(t.clientX, t.clientY, e.timeStamp)) e.preventDefault()
    }
    node.addEventListener('touchstart', start, { passive: true })
    node.addEventListener('touchmove', move, { passive: false })
    node.addEventListener('touchend', finish)
    node.addEventListener('touchcancel', abort)
    return {
      destroy() {
        node.removeEventListener('touchstart', start)
        node.removeEventListener('touchmove', move)
        node.removeEventListener('touchend', finish)
        node.removeEventListener('touchcancel', abort)
      },
    }
  }

  // Mouse.
  function down(e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    begin(e.clientX, e.clientY, e.timeStamp)
    el.setPointerCapture(e.pointerId)
  }
  function move(e) {
    if (e.pointerType === 'mouse') track(e.clientX, e.clientY, e.timeStamp)
  }
  function up(e) {
    if (e.pointerType === 'mouse') finish()
  }
  function cancel(e) {
    if (e.pointerType === 'mouse') abort()
  }

  // A drag must not also flip the card.
  function swallowClick(e) {
    if (moved) {
      e.stopPropagation()
      e.preventDefault()
      moved = false
    }
  }

  function onkey(e) {
    if (done || e.target.closest?.('input, textarea, select')) return
    if (e.key === 'ArrowRight') decide(STATUS.KNOWN)
    else if (e.key === 'ArrowLeft') decide(STATUS.LEARNING)
  }

  const clamp = (v) => Math.max(0, Math.min(1, v))
</script>

<svelte:window onkeydown={onkey} />

{#if chapter.value}
  <main class="page">
    <section class="head">
      <a class="back" href={'#/chapter/' + id}>‹ {chapter.value.title}</a>
      <div class="t-script title-script">Study</div>
      <h1 class="t-display t-hero yellow title-hero sm">{chapter.value.title}</h1>
    </section>

    {#if total === 0}
      <section class="empty">
        <Smiley size={96} />
        <p class="t-serif">No words in this chapter yet</p>
        <a class="btn cyan" href={'#/add?chapter=' + id}>Add word</a>
      </section>
    {:else}
      <div class="chips" role="group" aria-label="Which words">
        <button class="chip" aria-pressed={mode === 'all'} onclick={() => start('all')}>
          All {total}
        </button>
        <button class="chip" aria-pressed={mode === 'learning'} onclick={() => start('learning')}>
          Learning only {learningCount}
        </button>
      </div>

      {#if deck.length === 0}
        <section class="empty">
          <Smiley size={96} />
          <p class="t-serif">You know every word here</p>
          <button class="btn cyan" onclick={() => start('all')}>Study all words</button>
        </section>
      {:else if done}
        <section class="empty">
          <Smiley size={110} />
          <h2 class="t-display t-hero title-hero sm">DONE!</h2>
          <p class="stat-line">{result.known} known · {result.learning} learning</p>
          <div class="row study-actions">
            <button class="btn cyan" onclick={() => start(mode)}>Study again</button>
            {#if mode === 'all' && learningCount > 0}
              <button class="btn" onclick={() => start('learning')}>Learning only</button>
            {/if}
          </div>
          <a class="btn white" href={'#/chapter/' + id}>Back to chapter</a>
        </section>
      {:else}
        <div class="row between">
          <div class="bar study-bar" role="progressbar" aria-valuemin="0" aria-valuemax={deck.length} aria-valuenow={index} style="--p: {index / deck.length}">
            <i></i>
          </div>
          <span class="tag tilt-r">{index + 1} / {deck.length}</span>
        </div>

        {#key card.id}
          <div
            class="swipe"
            role="group"
            aria-label="Flashcard. Swipe right for known, left for learning."
            class:dragging
            bind:this={el}
            use:touch
            style="transform: translateX({dx}px) rotate({dx / 18}deg)"
            onpointerdown={down}
            onpointermove={move}
            onpointerup={up}
            onpointercancel={cancel}
            onclickcapture={swallowClick}
          >
            <div class="swipe-in">
              <span class="stamp known" style="opacity: {clamp(dx / 90)}">Known</span>
              <span class="stamp learning" style="opacity: {clamp(-dx / 90)}">Learning</span>
              <Flashcard de={card.de} deExample={card.deExample} en={card.en} enExample={card.enExample} />
            </div>
          </div>
        {/key}

        <p class="hint">Tap to flip. Swipe right if you know it, left to keep learning.</p>

        <div class="row study-actions">
          <button class="btn pink" onclick={() => decide(STATUS.LEARNING)}>‹ Learning</button>
          <button class="btn green" onclick={() => decide(STATUS.KNOWN)}>Known ›</button>
        </div>
      {/if}
    {/if}
  </main>
{:else}
  <main class="page">
    <section class="empty">
      <Smiley size={96} />
      <p class="t-serif">Chapter not found</p>
      <a class="btn" href="#/">Back to chapters</a>
    </section>
  </main>
{/if}

