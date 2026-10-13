import { db } from './db.js'
import { uid } from './ids.js'
import { clean, keyOf } from './text.js'

export const STATUS = { LEARNING: 'learning', KNOWN: 'known' }
const STATUSES = new Set(Object.values(STATUS))

const BACKUP_FORMAT = 'german-vocab-backup'
const BACKUP_VERSION = 1

export class ValidationError extends Error {
  constructor(message, field) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

/* ------------------------------------------------------------------ */
/* Chapters                                                            */
/* ------------------------------------------------------------------ */

function validTitle(title) {
  const t = clean(title)
  if (!t) throw new ValidationError('Chapter name is required.', 'title')
  if (t.length > 80) throw new ValidationError('Chapter name is too long (max 80).', 'title')
  return t
}

export function getChapter(id) {
  return db.chapters.get(id)
}

// Creation order, oldest first.
export function listChapters() {
  return db.chapters.orderBy('createdAt').toArray()
}

// Chapters plus { total, known } counts, for the home screen.
export function listChaptersWithStats() {
  return db.transaction('r', db.chapters, db.words, async () => {
    const chapters = await db.chapters.orderBy('createdAt').toArray()
    return Promise.all(
      chapters.map(async (c) => {
        const [total, known] = await Promise.all([
          db.words.where('chapterId').equals(c.id).count(),
          db.words.where('[chapterId+status]').equals([c.id, STATUS.KNOWN]).count(),
        ])
        return { ...c, total, known }
      }),
    )
  })
}

export function createChapter(title) {
  const t = validTitle(title)
  return db.transaction('rw', db.chapters, async () => {
    const dup = await db.chapters.filter((c) => keyOf(c.title) === keyOf(t)).first()
    if (dup) throw new ValidationError('A chapter with this name already exists.', 'title')
    const now = Date.now()
    const chapter = { id: uid(), title: t, createdAt: now, updatedAt: now }
    await db.chapters.add(chapter)
    return chapter
  })
}

export function renameChapter(id, title) {
  const t = validTitle(title)
  return db.transaction('rw', db.chapters, async () => {
    const existing = await db.chapters.get(id)
    if (!existing) throw new ValidationError('Chapter not found.', 'id')
    const dup = await db.chapters
      .filter((c) => c.id !== id && keyOf(c.title) === keyOf(t))
      .first()
    if (dup) throw new ValidationError('A chapter with this name already exists.', 'title')
    const updated = { ...existing, title: t, updatedAt: Date.now() }
    await db.chapters.put(updated)
    return updated
  })
}

/* ------------------------------------------------------------------ */
/* Words                                                               */
/* ------------------------------------------------------------------ */

function validWordFields(input) {
  const f = {
    chapterId: input.chapterId,
    de: clean(input.de),
    deExample: clean(input.deExample),
    en: clean(input.en),
    enExample: clean(input.enExample),
  }
  if (!f.chapterId) throw new ValidationError('Pick a chapter.', 'chapterId')
  if (!f.de) throw new ValidationError('German term is required.', 'de')
  if (!f.en) throw new ValidationError('English translation is required.', 'en')
  if (f.de.length > 200 || f.en.length > 200)
    throw new ValidationError('Term is too long (max 200).', 'de')
  if (f.deExample.length > 500 || f.enExample.length > 500)
    throw new ValidationError('Example is too long (max 500).', 'deExample')
  return f
}

export function getWord(id) {
  return db.words.get(id)
}

// Words of a chapter in the order they were added.
export function listWords(chapterId) {
  return db.words.where('chapterId').equals(chapterId).sortBy('createdAt')
}

// For global search.
export function listAllWords() {
  return db.words.toArray()
}

// Existing words with the same German term (case-insensitive). The UI warns, it does not block.
export async function findDuplicates(de, excludeId = null) {
  const key = keyOf(de)
  if (!key) return []
  const hits = await db.words.where('deKey').equals(key).toArray()
  return hits.filter((w) => w.id !== excludeId)
}

export function addWord(input) {
  const f = validWordFields(input)
  return db.transaction('rw', db.chapters, db.words, async () => {
    if (!(await db.chapters.get(f.chapterId)))
      throw new ValidationError('Chapter not found.', 'chapterId')
    const now = Date.now()
    const word = {
      id: uid(),
      ...f,
      deKey: keyOf(f.de),
      status: STATUS.LEARNING,
      createdAt: now,
      updatedAt: now,
    }
    await db.words.add(word)
    return word
  })
}

// Full-field update. The form always sends all fields; changing chapterId moves the word.
export function updateWord(id, input) {
  const f = validWordFields(input)
  return db.transaction('rw', db.chapters, db.words, async () => {
    const existing = await db.words.get(id)
    if (!existing) throw new ValidationError('Word not found.', 'id')
    if (!(await db.chapters.get(f.chapterId)))
      throw new ValidationError('Chapter not found.', 'chapterId')
    const updated = { ...existing, ...f, deKey: keyOf(f.de), updatedAt: Date.now() }
    await db.words.put(updated)
    return updated
  })
}

export async function setStatus(id, status) {
  if (!STATUSES.has(status)) throw new ValidationError('Invalid status.', 'status')
  const n = await db.words.update(id, { status, updatedAt: Date.now() })
  if (!n) throw new ValidationError('Word not found.', 'id')
}

/* ------------------------------------------------------------------ */
/* Backup: export / import                                             */
/* ------------------------------------------------------------------ */

export function backupFilename() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `german-vocab-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`
}

export function exportData() {
  return db.transaction('r', db.chapters, db.words, async () => {
    const [chapters, words] = await Promise.all([db.chapters.toArray(), db.words.toArray()])
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      chapters,
      // deKey is derived data, recomputed on import
      words: words.map(({ deKey, ...w }) => w),
    }
  })
}

const isStr = (v) => typeof v === 'string' && v.length > 0
const num = (v, fallback) => (Number.isFinite(v) ? v : fallback)

function sanitizeChapter(c, now) {
  if (!c || !isStr(c.id)) return null
  const title = clean(c.title)
  if (!title) return null
  const createdAt = num(c.createdAt, now)
  return { id: c.id, title, createdAt, updatedAt: num(c.updatedAt, createdAt) }
}

function sanitizeWord(w, now) {
  if (!w || !isStr(w.id) || !isStr(w.chapterId)) return null
  const de = clean(w.de)
  const en = clean(w.en)
  if (!de || !en) return null
  const createdAt = num(w.createdAt, now)
  return {
    id: w.id,
    chapterId: w.chapterId,
    de,
    deExample: clean(w.deExample),
    en,
    enExample: clean(w.enExample),
    deKey: keyOf(de),
    status: STATUSES.has(w.status) ? w.status : STATUS.LEARNING,
    createdAt,
    updatedAt: num(w.updatedAt, createdAt),
  }
}

// Accepts the JSON text of a backup file. Throws ValidationError if it is not one.
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new ValidationError('This file is not valid JSON.')
  }
  if (!data || data.format !== BACKUP_FORMAT || !Array.isArray(data.chapters) || !Array.isArray(data.words))
    throw new ValidationError('This is not a German Vocab backup file.')
  if (data.version > BACKUP_VERSION)
    throw new ValidationError('This backup was made by a newer version of the app.')

  const now = Date.now()
  const chapters = data.chapters.map((c) => sanitizeChapter(c, now))
  const words = data.words.map((w) => sanitizeWord(w, now))
  return {
    chapters: chapters.filter(Boolean),
    words: words.filter(Boolean),
    invalid: chapters.filter((x) => !x).length + words.filter((x) => !x).length,
  }
}

// mode 'merge': match by id, newer updatedAt wins, nothing is deleted.
// mode 'replace': wipe everything first. The UI must download a backup of the current data before calling this.
export async function importBackup(text, mode = 'merge') {
  if (mode !== 'merge' && mode !== 'replace')
    throw new ValidationError('Unknown import mode.')
  const parsed = parseBackup(text)

  return db.transaction('rw', db.chapters, db.words, async () => {
    if (mode === 'replace') {
      await db.words.clear()
      await db.chapters.clear()
    }

    const chapterMap = new Map((await db.chapters.toArray()).map((c) => [c.id, c]))
    const wordMap = new Map((await db.words.toArray()).map((w) => [w.id, w]))

    const s = {
      chaptersAdded: 0,
      chaptersUpdated: 0,
      wordsAdded: 0,
      wordsUpdated: 0,
      unchanged: 0,
      skipped: parsed.invalid,
    }

    const chapterWrites = []
    for (const c of parsed.chapters) {
      const cur = chapterMap.get(c.id)
      if (!cur) {
        chapterWrites.push(c)
        chapterMap.set(c.id, c)
        s.chaptersAdded++
      } else if (c.updatedAt > cur.updatedAt) {
        chapterWrites.push(c)
        chapterMap.set(c.id, c)
        s.chaptersUpdated++
      } else s.unchanged++
    }

    const wordWrites = []
    for (const w of parsed.words) {
      if (!chapterMap.has(w.chapterId)) {
        s.skipped++ // orphan: its chapter is in neither the file nor the app
        continue
      }
      const cur = wordMap.get(w.id)
      if (!cur) {
        wordWrites.push(w)
        s.wordsAdded++
      } else if (w.updatedAt > cur.updatedAt) {
        wordWrites.push(w)
        s.wordsUpdated++
      } else s.unchanged++
    }

    await db.chapters.bulkPut(chapterWrites)
    await db.words.bulkPut(wordWrites)
    return s
  })
}

/* ------------------------------------------------------------------ */
/* Storage persistence                                                 */
/* ------------------------------------------------------------------ */

// Asks the browser not to evict our data under storage pressure. Safe to call repeatedly.
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {}
  return false
}