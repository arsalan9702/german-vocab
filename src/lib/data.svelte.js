import { liveQuery } from 'dexie'
import { db } from './db.js'

// The whole vocab lives in memory. Pages read it synchronously, so they render
// complete on the first frame. Writes go to the database; this follows by itself.
let chapters = $state.raw([])
let words = $state.raw([])
let ready = $state(false)

const EMPTY = Object.freeze([])

const chapterMap = $derived(new Map(chapters.map((c) => [c.id, c])))
const wordMap = $derived(new Map(words.map((w) => [w.id, w])))

const wordsByChapter = $derived.by(() => {
  const m = new Map()
  for (const w of words) {
    const list = m.get(w.chapterId)
    if (list) list.push(w)
    else m.set(w.chapterId, [w])
  }
  for (const list of m.values()) list.sort((a, b) => a.createdAt - b.createdAt)
  return m
})

const stats = $derived(
  chapters.map((c) => {
    const list = wordsByChapter.get(c.id) ?? EMPTY
    let known = 0
    for (const w of list) if (w.status === 'known') known++
    return { ...c, total: list.length, known }
  }),
)

// Load every font face up front, so no page ever swaps fonts on its first paint.
// Capped at 1.5s so a failed font can never block the app.
const fontsReady =
  typeof document !== 'undefined' && document.fonts
    ? Promise.race([
        Promise.all(
          [
            '1em "Lilita One"',
            '1em "Yellowtail"',
            'italic 900 1em "Playfair Display"',
            '400 1em "Poppins"',
            '500 1em "Poppins"',
            '600 1em "Poppins"',
            '700 1em "Poppins"',
          ].map((f) => document.fonts.load(f)),
        ),
        new Promise((r) => setTimeout(r, 1500)),
      ]).catch(() => {})
    : Promise.resolve()

liveQuery(async () => {
  const [c, w] = await Promise.all([
    db.chapters.orderBy('createdAt').toArray(),
    db.words.toArray(),
  ])
  return { c, w }
}).subscribe({
  next({ c, w }) {
    fontsReady.then(() => {
      chapters = c
      words = w
      ready = true
    })
  },
  error(e) {
    console.error('data load failed', e)
    fontsReady.then(() => {
      ready = true
    })
  },
})

// Each export is { value, ready }. ready is true once the first load finished.
export const app = {
  get ready() {
    return ready
  },
}
export const chapterList = {
  get value() {
    return chapters
  },
  get ready() {
    return ready
  },
}
export const chapterStats = {
  get value() {
    return stats
  },
  get ready() {
    return ready
  },
}
export const chapterById = (id) => ({
  get value() {
    return chapterMap.get(id)
  },
  get ready() {
    return ready
  },
})
export const wordById = (id) => ({
  get value() {
    return wordMap.get(id)
  },
  get ready() {
    return ready
  },
})
export const wordsOf = (id) => ({
  get value() {
    return wordsByChapter.get(id) ?? EMPTY
  },
  get ready() {
    return ready
  },
})

export const hasChapter = (id) => chapterMap.has(id)
export const wordUpdatedAt = (id) => wordMap.get(id)?.updatedAt

// After a write, memory catches up a few milliseconds later. Await this before
// navigating to something that was just written, so the page never shows "not found".
export async function until(predicate, ms = 1500) {
  const end = performance.now() + ms
  while (!predicate() && performance.now() < end) {
    await new Promise((r) => setTimeout(r, 8))
  }
}