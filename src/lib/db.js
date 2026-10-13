import Dexie from 'dexie'

export const db = new Dexie('german-vocab')

db.version(1).stores({
  chapters: 'id, createdAt',
  words: 'id, chapterId, status, deKey, createdAt, [chapterId+status]',
})