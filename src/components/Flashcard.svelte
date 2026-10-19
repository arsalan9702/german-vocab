<script>
  import { genderOf } from '../lib/gender.js'

  // start: which side faces up first, 'de' or 'en'.
  let { de, deExample = '', en, enExample = '', start = 'de', flipped = $bindable(false) } = $props()

  // Longer terms get a smaller size so they stay on screen.
  const size = (s) => (s.length <= 12 ? '2.6rem' : s.length <= 22 ? '2.1rem' : '1.6rem')

  // The gender colour sits on the German face only, so it never hints on an English prompt.
  const gender = $derived(genderOf(de))
  const sides = $derived(start === 'en' ? ['en', 'de'] : ['de', 'en'])

  const toggle = () => (flipped = !flipped)
  const onkey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle()
    }
  }
</script>

{#snippet face(side, position)}
  <div class="face {position} {side === 'de' ? `de-face g-${gender ?? 'none'}` : 'en-face'}">
    <div class="face-body">
      {#if side === 'de'}
        <span class="tag">German</span>
        <div class="t-display term" style="font-size: {size(de)}">{de}</div>
        {#if deExample}<p class="t-serif example">{deExample}</p>{/if}
      {:else}
        <span class="tag">English</span>
        <div class="t-display term" style="font-size: {size(en)}">{en}</div>
        {#if enExample}<p class="t-serif example">{enExample}</p>{/if}
      {/if}
    </div>
  </div>
{/snippet}

<div class="frame">
  <div class="frame-tab"></div>
  <div
    class="flip"
    class:flipped
    role="button"
    tabindex="0"
    aria-label="Flashcard. Tap to flip."
    onclick={toggle}
    onkeydown={onkey}
  >
    <div class="flip-inner">
      {@render face(sides[0], 'front')}
      {@render face(sides[1], 'back')}
    </div>
  </div>
</div>
