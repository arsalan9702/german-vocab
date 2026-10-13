<script>
   import { chapterList as chapters, wordById, hasChapter, wordUpdatedAt, until } from '../lib/data.svelte.js'
   import { back } from '../lib/router.svelte.js'
   import { toast } from '../lib/toast.svelte.js'
   import Smiley from '../components/Smiley.svelte'
   import { createChapter, addWord, updateWord, findDuplicates, ValidationError } from '../lib/store.js'
 
   let { editId = null, presetChapter = null } = $props()
 
   const NEW = '__new__'
   const LAST_KEY = 'gv:lastChapter'
   const FIELDS = ['chapterId', 'de', 'deExample', 'en', 'enExample']
 
   // Everything is read synchronously from memory, so the form is complete on its first frame.
   const existing = editId ? wordById(editId).value : null
   const missing = !!editId && !existing
 
   const options = $derived(chapters.value)
   const chapterTitle = (id) => options.find((c) => c.id === id)?.title ?? ''
 
   function initialChoice() {
     if (editId) return existing?.chapterId ?? ''
     const ids = new Set(chapters.value.map((c) => c.id))
     let last = null
     try {
       last = localStorage.getItem(LAST_KEY)
     } catch {}
     return [presetChapter, last].find((id) => id && ids.has(id)) ?? (ids.size === 0 ? NEW : '')
   }
 
   let choice = $state(initialChoice())
   let newName = $state('')
   let creating = $state(false)
 
   let de = $state(existing?.de ?? '')
   let deExample = $state(existing?.deExample ?? '')
   let en = $state(existing?.en ?? '')
   let enExample = $state(existing?.enExample ?? '')
 
   let errors = $state({})
   let saving = $state(false)
   let dupes = $state([])
   let deInput = $state()
 
   // Duplicate warning on the German term (debounced).
   $effect(() => {
     const term = de
     const handle = setTimeout(async () => {
       dupes = await findDuplicates(term, editId)
     }, 250)
     return () => clearTimeout(handle)
   })
 
   async function makeChapter() {
     if (creating) return
     creating = true
     errors.newChapter = ''
     try {
       const c = await createChapter(newName)
       await until(() => hasChapter(c.id))
       choice = c.id
       newName = ''
       toast(`Chapter created: ${c.title}`)
     } catch (e) {
       if (e instanceof ValidationError) errors.newChapter = e.message
       else {
         console.error(e)
         errors.newChapter = 'Could not create the chapter.'
       }
     } finally {
       creating = false
     }
   }
 
   function remember(id) {
     try {
       localStorage.setItem(LAST_KEY, id)
     } catch {}
   }
 
   async function save(e) {
     e.preventDefault()
     if (saving) return
     errors = {}
     if (choice === NEW) {
       errors.chapterId = 'Tap "Create chapter" first.'
       return
     }
     saving = true
     const input = { chapterId: choice, de, deExample, en, enExample }
     try {
       if (editId) {
         const updated = await updateWord(editId, input)
         await until(() => wordUpdatedAt(editId) === updated.updatedAt)
         toast('Changes saved')
         back(`/word/${editId}`)
       } else {
         const w = await addWord(input)
         remember(choice)
         toast(`Added: ${w.de}`)
         de = ''
         deExample = ''
         en = ''
         enExample = ''
         dupes = []
         deInput?.focus()
       }
     } catch (err) {
       if (err instanceof ValidationError && FIELDS.includes(err.field)) {
         errors[err.field] = err.message
       } else {
         console.error(err)
         toast(err instanceof ValidationError ? err.message : 'Something went wrong', 'error')
       }
     } finally {
       saving = false
     }
   }
</script>

{#if missing}
  <main class="page">
    <section class="empty">
      <Smiley size={96} />
      <p class="t-serif">Word not found</p>
      <a class="btn" href="#/">Back to chapters</a>
    </section>
  </main>
{:else}
  <main class="page">
    <section class="head">
      <div class="t-script title-script">{editId ? 'Edit' : 'New'}</div>
      <h1 class="t-display t-hero title-hero">WORD</h1>
    </section>

    <form class="form" onsubmit={save}>
      <label class="field">
        <span>Chapter</span>
        <select class="input select" bind:value={choice}>
          <option value="" disabled>Choose a chapter…</option>
          {#each options as c (c.id)}
            <option value={c.id}>{c.title}</option>
          {/each}
          <option value={NEW}>+ New chapter</option>
        </select>
        {#if errors.chapterId}<small class="field-error">{errors.chapterId}</small>{/if}
      </label>

      {#if choice === NEW}
        <div class="card accent-yellow inline-new">
          <label class="field">
            <span>New chapter name</span>
            <input
              class="input"
              bind:value={newName}
              maxlength="80"
              placeholder="e.g. Chapter 2"
              autocomplete="off"
              enterkeyhint="done"
              onkeydown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  makeChapter()
                }
              }}
            />
          </label>
          {#if errors.newChapter}<small class="field-error">{errors.newChapter}</small>{/if}
          <button type="button" class="btn sm" onclick={makeChapter} disabled={creating}>
            Create chapter
          </button>
        </div>
      {/if}

      <label class="field">
        <span>German term</span>
        <input
          class="input"
          bind:this={deInput}
          bind:value={de}
          lang="de"
          placeholder="e.g. die Straße"
          maxlength="200"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="next"
        />
        {#if errors.de}<small class="field-error">{errors.de}</small>{/if}
      </label>

      {#if dupes.length}
        <div class="warn" role="status">
          <strong>Already in your vocab:</strong>
          {#each dupes as d (d.id)}
            <div>{d.de} · {d.en} <span class="muted">({chapterTitle(d.chapterId)})</span></div>
          {/each}
          <div class="muted">You can still save it.</div>
        </div>
      {/if}

      <label class="field">
        <span>German example sentence</span>
        <textarea
          class="input area"
          bind:value={deExample}
          lang="de"
          rows="2"
          maxlength="500"
          placeholder="e.g. Die Straße ist sehr ruhig."
        ></textarea>
        {#if errors.deExample}<small class="field-error">{errors.deExample}</small>{/if}
      </label>

      <label class="field">
        <span>English translation</span>
        <input
          class="input"
          bind:value={en}
          lang="en"
          placeholder="e.g. the street"
          maxlength="200"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="next"
        />
        {#if errors.en}<small class="field-error">{errors.en}</small>{/if}
      </label>

      <label class="field">
        <span>English example sentence</span>
        <textarea
          class="input area"
          bind:value={enExample}
          lang="en"
          rows="2"
          maxlength="500"
          placeholder="e.g. The street is very quiet."
        ></textarea>
        {#if errors.enExample}<small class="field-error">{errors.enExample}</small>{/if}
      </label>

      <div class="row">
        <button type="submit" class="btn cyan" disabled={saving}>
          {editId ? 'Save changes' : 'Add word'}
        </button>
        {#if editId}
          <button type="button" class="btn white" onclick={() => back(`/word/${editId}`)}>
            Cancel
          </button>
        {/if}
      </div>
    </form>
  </main>
{/if}