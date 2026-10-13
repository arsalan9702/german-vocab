<script>
  let { de, deExample = '', en, enExample = '', flipped = $bindable(false) } = $props()

  // Longer terms get a smaller size so they stay on screen.
  const size = (s) => (s.length <= 12 ? '2.6rem' : s.length <= 22 ? '2.1rem' : '1.6rem')

  const toggle = () => (flipped = !flipped)
  const onkey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle()
    }
  }
</script>

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
      <div class="face front">
        <div class="face-body">
          <span class="tag">German</span>
          <div class="t-display term" style="font-size: {size(de)}">{de}</div>
          {#if deExample}<p class="t-serif example">{deExample}</p>{/if}
        </div>
      </div>
      <div class="face back">
        <div class="face-body">
          <span class="tag">English</span>
          <div class="t-display term" style="font-size: {size(en)}">{en}</div>
          {#if enExample}<p class="t-serif example">{enExample}</p>{/if}
        </div>
      </div>
    </div>
  </div>
</div>