// Pure study-session logic, kept out of the component so it can be tested in Node.

// Fisher-Yates. Every session is shuffled, so order never becomes a memory cue.
export function shuffle(list, rand = Math.random) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

let n = 0
const entry = (word, rand) => ({ key: ++n, word, mix: rand() < 0.5 ? 'de' : 'en' })

// A deck is a list of entries: { key, word, mix }. key is unique per entry, so a word that comes
// back for a retry is a new card; mix is the side shown first in Mixed direction.
export const buildDeck = (words, rand = Math.random) => shuffle(words, rand).map((w) => entry(w, rand))

// Puts the missed card at `index` back 3-6 cards later, or at the end if fewer remain.
export function requeue(deck, index, rand = Math.random) {
  const at = Math.min(deck.length, index + 1 + 3 + Math.floor(rand() * 4))
  const again = { ...entry(deck[index].word, rand), mix: deck[index].mix }
  return [...deck.slice(0, at), again, ...deck.slice(at)]
}
