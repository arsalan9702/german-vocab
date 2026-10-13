<script>
  import Smiley from '../components/Smiley.svelte'

  let { title, note = '', backHref = '/', backLabel = 'Back to chapters' } = $props()
</script>

<main class="page">
  <section class="empty">
    <Smiley size={96} />
    <h1 class="t-display t-hero yellow title-hero sm">{title}</h1>
    <p>{note}</p>
    <a class="btn" href={'#' + backHref}>{backLabel}</a>
  </section>
</main>