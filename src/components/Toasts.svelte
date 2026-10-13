<script>
  import { toasts } from '../lib/toast.svelte.js'
</script>

<div class="toasts" aria-live="polite">
  {#each toasts.items as t (t.id)}
    <div class="toast {t.kind}">{t.msg}</div>
  {/each}
</div>