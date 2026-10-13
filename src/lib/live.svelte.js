import { liveQuery } from 'dexie'

// const chapters = live(() => listChaptersWithStats(), [])
// then use chapters.value / chapters.ready in the template
export function live(querier, initial = undefined) {
  let value = $state.raw(initial)
  let ready = $state(false)

  $effect(() => {
    const sub = liveQuery(querier).subscribe({
      next(v) {
        value = v
        ready = true
      },
      error(e) {
        console.error('liveQuery failed', e)
      },
    })
    return () => sub.unsubscribe()
  })

  return {
    get value() {
      return value
    },
    get ready() {
      return ready
    },
  }
}