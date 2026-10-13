<script>
  import { ValidationError } from '../lib/store.js'

  // action(name) must return a promise and may throw ValidationError.
  let { heading, label = 'Save', initial = '', action, onclose, ondone } = $props()

  let name = $state(initial)
  let error = $state('')
  let busy = $state(false)
  let input = $state()

  $effect(() => {
    input?.focus()
  })

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    busy = true
    error = ''
    try {
      const result = await action(name)
      ondone?.(result)
    } catch (err) {
      if (err instanceof ValidationError) error = err.message
      else {
        console.error(err)
        error = 'Something went wrong. Try again.'
      }
    } finally {
      busy = false
    }
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<button class="scrim" aria-label="Close dialog" tabindex="-1" onclick={onclose}></button>

<div class="dialog card accent-yellow" role="dialog" aria-modal="true" aria-label={heading}>
  <form class="dialog-form" onsubmit={submit}>
    <h2 class="t-display dialog-title">{heading}</h2>
    <label class="field">
      <span>Chapter name</span>
      <input
        class="input"
        bind:this={input}
        bind:value={name}
        maxlength="80"
        placeholder="e.g. Chapter 1"
        enterkeyhint="done"
        autocomplete="off"
      />
    </label>
    {#if error}<div class="field-error">{error}</div>{/if}
    <div class="row">
      <button type="button" class="btn white" onclick={onclose}>Cancel</button>
      <button type="submit" class="btn cyan" disabled={busy}>{label}</button>
    </div>
  </form>
</div>